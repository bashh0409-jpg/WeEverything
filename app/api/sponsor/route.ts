import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Polar } from "@polar-sh/sdk";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const minimumSponsorshipAmount = 100;
const maximumSponsorshipAmount = 1_000_000;

const getCanonicalSiteUrl = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configuredUrl) return null;

  try {
    const url = new URL(configuredUrl);
    const isLocalDevelopmentUrl =
      process.env.NODE_ENV !== "production" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");

    if (url.protocol !== "https:" && !isLocalDevelopmentUrl) return null;
    return url.origin;
  } catch {
    return null;
  }
};

const isSameOriginRequest = (request: Request) => {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
};

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const polarAccessToken = process.env.POLAR_ACCESS_TOKEN;
  const polarProductId = process.env.POLAR_SPONSOR_PRODUCT_ID;
  const polarEnvironment =
    process.env.POLAR_ENVIRONMENT === "sandbox" ? "sandbox" : "production";
  const siteUrl = getCanonicalSiteUrl();

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !serviceRoleKey ||
    !polarAccessToken ||
    !polarProductId ||
    !siteUrl
  ) {
    return NextResponse.json(
      { error: "Sponsorship payments are not configured yet." },
      { status: 503 },
    );
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: { amount?: unknown; idempotencyKey?: unknown };
  try {
    body = (await request.json()) as {
      amount?: unknown;
      idempotencyKey?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
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

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: existingPayment } = await admin
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

    const { error: paymentError } = await admin
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
        const { data: duplicatePayment } = await admin
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
    console.error("Could not start sponsorship checkout", error);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 },
    );
  }
}
