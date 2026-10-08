"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { getPromotionExpiry } from "@/lib/sponsorship";

type ConfirmationState =
  | { state: "missing" | "waiting" | "error" }
  | { state: "paid"; expiresAt: string | null }
  | { state: "refunded" | "expired" };

export default function BillingSuccess() {
  const [user, setUser] = useState<User | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    state: "waiting",
  });

  useEffect(() => {
    const client = supabase;
    if (!client) {
      return;
    }

    let isMounted = true;

    const loadSession = async () => {
      const {
        data: { session },
      } = await client.auth.getSession();

      if (isMounted) {
        setUser(session?.user ?? null);
      }
    };

    void loadSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const client = supabase;
    const checkoutId = new URLSearchParams(window.location.search).get(
      "checkout_id",
    );

    if (!client || !checkoutId) {
      const missingCheckoutTimer = window.setTimeout(() => {
        setConfirmation({ state: "missing" });
      }, 0);
      return () => window.clearTimeout(missingCheckoutTimer);
    }

    let cancelled = false;
    let retryTimer: number | undefined;

    const confirmPayment = async (attempt: number) => {
      const { data, error } = await client
        .from("sponsorship_payments")
        .select("status, paid_at, promotion_days")
        .eq("polar_checkout_id", checkoutId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setConfirmation({ state: "error" });
        return;
      }

      if (data.status === "paid") {
        setConfirmation({
          state: "paid",
          expiresAt:
            getPromotionExpiry(data.paid_at, data.promotion_days)?.toISOString() ??
            null,
        });
        return;
      }

      if (data.status === "refunded" || data.status === "expired") {
        setConfirmation({ state: data.status });
        return;
      }

      if (attempt >= 9) {
        setConfirmation({ state: "error" });
        return;
      }

      retryTimer = window.setTimeout(() => {
        void confirmPayment(attempt + 1);
      }, 2_000);
    };

    void confirmPayment(0);

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, []);

  const avatarUrl =
    typeof user?.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : typeof user?.user_metadata.picture === "string"
        ? user.user_metadata.picture
        : null;
  const avatarInitial = user?.email?.trim().charAt(0).toUpperCase() || "U";
  const heading =
    confirmation.state === "paid"
      ? "Sponsorship confirmed!"
      : confirmation.state === "waiting"
        ? "Confirming sponsorship…"
        : confirmation.state === "refunded"
          ? "Sponsorship refunded"
          : confirmation.state === "expired"
            ? "Checkout expired"
            : "Could not confirm sponsorship";
  const detail =
    confirmation.state === "paid"
      ? `Your profile is promoted${
          confirmation.expiresAt
            ? ` until ${new Date(confirmation.expiresAt).toLocaleDateString()}.`
            : "."
        }`
      : confirmation.state === "waiting"
        ? "We received your return from checkout and are waiting for Polar to confirm the payment. This normally takes a few moments."
        : confirmation.state === "refunded"
          ? "This payment was refunded, so your profile is not promoted."
          : confirmation.state === "expired"
            ? "This checkout was not completed before it expired."
            : "We could not confirm this checkout yet. Return to your profile and refresh in a moment, or contact support if you were charged.";

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        {user ? (
          <Link
            href="/profile"
            aria-label={`View profile for ${user.email ?? "your account"}`}
            title={user.email ?? "Your profile"}
            className=" transition-colors duration-300 cursor-pointer rounded-full p-0.5"
          >
            <span className="relative hover:border-[#1c40f2] hover:border-2 border-outside flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#dfbf00] text-xs font-bold uppercase text-black">
              <span aria-hidden>{avatarInitial}</span>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
            </span>
          </Link>
        ) : null}
      </div>

      <div className="text-center items-center flex  flex-col gap-2 max-w-md">
        <p className="mon geist  max-w-xs text-center  overflow-hidden text-xl font-semibold tracking-tighter text-black mb-2 ">
          {heading}
        </p>

        <p className="geist  max-w-xs text-center  overflow-hidden text-[13px] font-semibold leading-3 tracking-tight text-[#999]">
          {detail}
        </p>

        <a href="/profile" className="w-fit  geist capitalize max-h-7 rounded-3xl border border-black/10 bg-black/[0.03] px-2 py-1 text-sm font-medium leading-4 tracking-tight text-[#333] [overflow-wrap:anywhere]">
          close
        </a>
      </div>
    </div>
  );
}
