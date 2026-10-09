"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type GateState =
  | "checking"
  | "required"
  | "verifying"
  | "signing-out"
  | "error";

const getProfileDestination = () => {
  const requestedNext = new URLSearchParams(window.location.search).get("next");
  if (!requestedNext) return "/profile";

  try {
    const destination = new URL(requestedNext, window.location.origin);
    if (
      destination.origin === window.location.origin &&
      destination.pathname === "/profile"
    ) {
      return `${destination.pathname}${destination.search}${destination.hash}`;
    }
  } catch {
    return "/profile";
  }

  return "/profile";
};

const OAuthPasskeyGate = () => {
  const router = useRouter();
  const [state, setState] = useState<GateState>("checking");
  const [message, setMessage] = useState("");
  const [oauthUserId, setOauthUserId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const nextDestination = getProfileDestination();

    const checkForPasskeys = async () => {
      if (!supabase) {
        if (isMounted) {
          setMessage("Sign-in is unavailable. Please try again later.");
          setState("error");
        }
        return;
      }

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session?.user) {
          router.replace("/signin");
          return;
        }

        const { data: passkeys, error: passkeyError } =
          await supabase.auth.passkey.list();
        if (passkeyError) throw passkeyError;
        if (!isMounted) return;

        if (passkeys.length === 0) {
          router.replace(nextDestination);
          return;
        }

        setOauthUserId(session.user.id);
        setState("required");
      } catch (error) {
        if (!isMounted) return;
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not check your account's passkeys.",
        );
        setState("error");
      }
    };

    void checkForPasskeys();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const signOutAfterFailure = async (reason: string) => {
    if (!supabase) {
      setMessage(reason);
      setState("error");
      return;
    }

    setMessage(reason);
    setState("signing-out");
    const { error } = await supabase.auth.signOut();
    if (error) {
      setMessage(
        `${reason} We could not complete sign-out: ${error.message}`,
      );
      setState("error");
      return;
    }

    router.replace("/signin?error=passkey_check_failed");
  };

  const verifyPasskey = async () => {
    if (!supabase || !oauthUserId || state !== "required") return;

    setState("verifying");
    setMessage("");
    try {
      const { data, error } = await supabase.auth.signInWithPasskey();
      if (error || !data.user || !data.session) {
        await signOutAfterFailure(
          error?.message ?? "Passkey verification failed.",
        );
        return;
      }

      if (data.user.id !== oauthUserId) {
        await signOutAfterFailure(
          "That passkey belongs to a different account.",
        );
        return;
      }

      router.replace(getProfileDestination());
    } catch (error) {
      await signOutAfterFailure(
        error instanceof Error
          ? error.message
          : "Passkey verification failed.",
      );
    }
  };

  const retrySignOut = () => {
    void signOutAfterFailure("Passkey verification did not complete.");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="passkey-gate-title"
        className=" items-center flex max-w-[90vw] flex-col gap-2 "
      >
       
                <p className="mon geist  max-w-xs text-center  overflow-hidden text-xl font-semibold tracking-tighter text-black mb-2 ">
          {state === "checking"
            ? "Checking your account"
            : state === "required" || state === "verifying"
              ? "Verify your passkey"
              : state === "signing-out"
                ? "Signing you out"
                : "Sign-in could not continue"}
        </p>
        <p className="geist  max-w-xs text-center  overflow-hidden text-[13px] font-semibold leading-3 tracking-tight text-[#999]">
          {state === "checking"
            ? "One moment while we check your sign-in."
            : state === "required" || state === "verifying"
              ? "This account has a passkey. Verify it to continue to your profile."
              : state === "signing-out"
                ? "Passkey verification is required for this account."
                : message || "Please try signing in again."}
        </p>
        {state === "required" || state === "verifying" ? (
          <button
            type="button"
            onClick={() => void verifyPasskey()}
            disabled={state === "verifying"}
            className="w-fit mt-2 geist capitalize max-h-7 rounded-3xl border border-black/10 bg-black/[0.03] px-2 py-1 text-sm font-medium leading-4 tracking-tight text-[#333] [overflow-wrap:anywhere]"
          >
            {state === "verifying"
              ? "Waiting for passkey…"
              : "Use passkey"}
          </button>
        ) : state === "error" ? (
          <button
            type="button"
            onClick={retrySignOut}
            className="mt-5 flex w-full items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-medium uppercase text-white transition hover:bg-[#333]"
          >
            Sign out and return to sign in
          </button>
        ) : null}
      </section>
    </div>
  );
};

export default OAuthPasskeyGate;
