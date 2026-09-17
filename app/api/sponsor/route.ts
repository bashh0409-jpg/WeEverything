import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Polar } from "@polar-sh/sdk";
import { createServerClient } from "@supabase/ssr";

const minimumSponsorshipAmount = 100;
const maximumSponsorshipAmount = 1_000_000;

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const polarAccessToken = process.env.POLAR_ACCESS_TOKEN;
  const polarProductId = process.env.POLAR_SPONSOR_PRODUCT_ID;
  const polarEnvironment =
    process.env.POLAR_ENVIRONMENT === "sandbox" ? "sandbox" : "production";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !polarAccessToken ||
    !polarProductId
  ) {
    return NextResponse.json(
      { error: "Sponsorship payments are not configured yet." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    amount?: unknown;
    idempotencyKey?: unknown;
  };
  const amount = body.amount;
  const idempotencyKey = body.idempotencyKey;

  if (
    typeof amount !== "number" ||
    !Number.isInteger(amount) ||
    amount < minimumSponsorshipAmount ||
    amount > maximumSponsorshipAmount
  ) {
    return NextResponse.json(
      {
        error: "Choose a sponsorship amount between $1 and $10,000.",
      },
      { status: 400 },
    );
  }

  if (
    typeof idempotencyKey !== "string" ||
    idempotencyKey.length === 0 ||
    idempotencyKey.length > 100
  ) {
    return NextResponse.json(
      { error: "A valid checkout request key is required." },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in before sponsoring a profile." },
      { status: 401 },
    );
  }

  try {
    const { data: existingPayment } = await supabase
      .from("sponsorship_payments")
      .select("polar_checkout_id, amount, status, metadata")
      .eq("user_id", user.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingPayment) {
      if (existingPayment.amount !== amount) {
        return NextResponse.json(
          {
            error: "This checkout request was already used for another amount.",
          },
          { status: 409 },
        );
      }

      const existingCheckout = await new Polar({
        accessToken: polarAccessToken,
        server: polarEnvironment,
      }).checkouts.get({ id: existingPayment.polar_checkout_id });

      return NextResponse.json({ url: existingCheckout.url });
    }

    const polar = new Polar({
      accessToken: polarAccessToken,
      server: polarEnvironment,
    });
    const checkout = await polar.checkouts.create(
      {
        products: [polarProductId],
        prices: {
          [polarProductId]: [
            {
              amountType: "custom",
              priceCurrency: "usd",
              minimumAmount: amount,
              presetAmount: amount,
            },
          ],
        },
        customerEmail: user.email,
        externalCustomerId: user.id,
        metadata: { user_id: user.id, sponsorship_amount: amount },
        successUrl: `${siteUrl}/profile/success?checkout_id={CHECKOUT_ID}`,
        returnUrl: `${siteUrl}/profile`,
      },
      { headers: { "Idempotency-Key": idempotencyKey } },
    );

    const { error: paymentError } = await supabase
      .from("sponsorship_payments")
      .insert({
        user_id: user.id,
        profile_id: user.id,
        polar_checkout_id: checkout.id,
        idempotency_key: idempotencyKey,
        polar_product_id: checkout.productId ?? polarProductId,
        amount: checkout.amount,
        currency: checkout.currency,
        status: "pending",
        metadata: {
          polar_environment: polarEnvironment,
          sponsorship_amount: amount,
        },
      });

    if (paymentError) {
      if (paymentError.code === "23505") {
        const { data: duplicatePayment } = await supabase
          .from("sponsorship_payments")
          .select("polar_checkout_id")
          .eq("user_id", user.id)
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();

        if (duplicatePayment) {
          const duplicateCheckout = await polar.checkouts.get({
            id: duplicatePayment.polar_checkout_id,
          });
          return NextResponse.json({ url: duplicateCheckout.url });
        }
      }

      return NextResponse.json(
        { error: "Checkout created, but the payment could not be recorded." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not start checkout.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
