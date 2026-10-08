import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Polar } from "@polar-sh/sdk";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  getActivePromotion,
  getPromotionExpiry,
  getPromotionPackage,
} from "@/lib/sponsorship";

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

  let body: { promotionDays?: unknown; idempotencyKey?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }
  const promotionDays =
    typeof body.promotionDays === "number" ? body.promotionDays : NaN;
  const promotion = getPromotionPackage(promotionDays);
  const idempotencyKey = body.idempotencyKey;

  if (!promotion) {
    return NextResponse.json(
      { error: "Choose one of the available promotion packages." },
      { status: 400 },
    );
  }

  const { amount } = promotion;

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

  const rateLimitResponse = await enforceRateLimit(
    request,
    "sponsorship-checkout",
    5,
    60 * 60,
    user.id,
  );
  if (rateLimitResponse) return rateLimitResponse;

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const polar = new Polar({
    accessToken: polarAccessToken,
    server: polarEnvironment,
  });

  try {
    // Keep the database status in sync before relying on the partial unique
    // index that prevents more than one open or active promotion per profile.
    const { error: expiryError } = await admin.rpc(
      "expire_stale_sponsorships",
    );
    if (expiryError) {
      console.error("Could not expire stale sponsorships", expiryError);
      return NextResponse.json(
        { error: "Could not verify your current promotion status." },
        { status: 502 },
      );
    }

    const { data: existingPayment } = await admin
      .from("sponsorship_payments")
      .select("polar_checkout_id, amount, status, promotion_days")
      .eq("user_id", user.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingPayment) {
      if (
        existingPayment.amount !== amount ||
        existingPayment.promotion_days !== promotionDays
      ) {
        return NextResponse.json(
          {
            error: "This checkout request was already used for another package.",
          },
          { status: 409 },
        );
      }

      if (existingPayment.status !== "pending") {
        return NextResponse.json(
          {
            error:
              "This checkout is already complete or closed. Start a new promotion request.",
          },
          { status: 409 },
        );
      }

      const existingCheckout = await polar.checkouts.get({
        id: existingPayment.polar_checkout_id,
      });
      if (existingCheckout.status !== "open") {
        return NextResponse.json(
          {
            error:
              "This checkout is no longer available. Start a new promotion request.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json({ url: existingCheckout.url });
    }

    const { data: recentPaidPromotions, error: promotionLookupError } =
      await admin
        .from("sponsorship_payments")
        .select("status, paid_at, promotion_days")
        .eq("user_id", user.id)
        .eq("status", "paid")
        .gte(
          "paid_at",
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        );

    if (promotionLookupError) {
      console.error(
        "Could not check existing profile promotions",
        promotionLookupError,
      );
      return NextResponse.json(
        { error: "Could not verify your current promotion status." },
        { status: 502 },
      );
    }

    const activePromotion = getActivePromotion(
      recentPaidPromotions ?? [],
      Date.now(),
    );
    if (activePromotion) {
      const expiresAt = getPromotionExpiry(
        activePromotion.paid_at,
        activePromotion.promotion_days,
      );
      return NextResponse.json(
        {
          error: `Your profile is already promoted through ${expiresAt?.toLocaleDateString()}. You can purchase another package after it expires.`,
        },
        { status: 409 },
      );
    }

    const { data: pendingPayment, error: pendingPaymentError } = await admin
      .from("sponsorship_payments")
      .select("id, polar_checkout_id")
      .eq("profile_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingPaymentError) {
      console.error("Could not check pending sponsorship checkout", pendingPaymentError);
      return NextResponse.json(
        { error: "Could not verify your current promotion status." },
        { status: 502 },
      );
    }

    if (pendingPayment) {
      const pendingCheckout = await polar.checkouts.get({
        id: pendingPayment.polar_checkout_id,
      });

      if (pendingCheckout.status === "open") {
        return NextResponse.json({ url: pendingCheckout.url });
      }

      if (pendingCheckout.status === "confirmed") {
        return NextResponse.json(
          { error: "Your previous payment is still being confirmed." },
          { status: 409 },
        );
      }

      const { error: expirePendingError } = await admin.rpc(
        "apply_polar_sponsorship_event",
        {
          p_payment_id: pendingPayment.id,
          p_status: "expired",
          p_polar_order_id: null,
          p_event_at: new Date().toISOString(),
        },
      );
      if (expirePendingError) {
        console.error(
          "Could not close an unavailable sponsorship checkout",
          expirePendingError,
        );
        return NextResponse.json(
          { error: "Could not prepare a new checkout. Please try again." },
          { status: 502 },
        );
      }
    }

    const checkout = await polar.checkouts.create(
      {
        products: [polarProductId],
        prices: {
          [polarProductId]: [
            {
              amountType: "fixed",
              priceCurrency: "usd",
              priceAmount: amount,
            },
          ],
        },
        customerEmail: user.email,
        externalCustomerId: user.id,
        metadata: {
          user_id: user.id,
          promotion_days: promotionDays,
          sponsorship_amount: amount,
        },
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
        promotion_days: promotionDays,
        currency: checkout.currency,
        status: "pending",
        metadata: {
          polar_environment: polarEnvironment,
          promotion_days: promotionDays,
          sponsorship_amount: amount,
        },
      });

    if (paymentError) {
      if (paymentError.code === "23505") {
        const { data: duplicatePayment } = await admin
          .from("sponsorship_payments")
          .select("polar_checkout_id, amount, promotion_days, status")
          .eq("profile_id", user.id)
          .in("status", ["pending", "paid"])
          .maybeSingle();

        if (duplicatePayment) {
          if (
            duplicatePayment.amount !== amount ||
            duplicatePayment.promotion_days !== promotionDays
          ) {
            return NextResponse.json(
              {
                error:
                  "This checkout request was already used for another package.",
              },
              { status: 409 },
            );
          }

          if (duplicatePayment.status !== "pending") {
            return NextResponse.json(
              {
                error:
                  "Your profile is already promoted. You can purchase another package after it expires.",
              },
              { status: 409 },
            );
          }

          const duplicateCheckout = await polar.checkouts.get({
            id: duplicatePayment.polar_checkout_id,
          });
          if (duplicateCheckout.status === "open") {
            return NextResponse.json({ url: duplicateCheckout.url });
          }
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
