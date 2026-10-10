"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import posthog from "posthog-js";
import type { User } from "@supabase/supabase-js";
import { FaDiscord, FaGithub, FaGoogle } from "react-icons/fa6";
import {
  getAuthRedirectUrl,
  isSupabaseConfigured,
  supabase,
} from "@/lib/supabase/client";

type SignInModalProps = {
  onClose: () => void;
};

const subscribeToLocation = (callback: () => void) => {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);

  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
  };
};

const getIsBannedFromLocation = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.slice(1));

  return (
    searchParams.get("error_code") === "user_banned" ||
    hashParams.get("error_code") === "user_banned"
  );
};

const getAuthErrorFromLocation = () => {
  const errorCode = new URLSearchParams(window.location.search).get("error");
  if (errorCode === "mfa_check_failed") {
    return "We could not verify your two-factor settings. Please try signing in again.";
  }
  if (errorCode === "passkey_check_failed") {
    const detail = new URLSearchParams(window.location.search).get("detail");
    return detail
      ? `Passkey verification failed: ${detail}. You were signed out; please sign in again.`
      : "Passkey verification failed. You were signed out; please sign in again.";
  }
  return "";
};

const SignInModal = ({ onClose }: SignInModalProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => Boolean(supabase));
  const [signingInProvider, setSigningInProvider] = useState<
    "google" | "github" | "discord" | null
  >(null);
  const isBanned = useSyncExternalStore(
    subscribeToLocation,
    getIsBannedFromLocation,
    () => false,
  );
  const authError = useSyncExternalStore(
    subscribeToLocation,
    getAuthErrorFromLocation,
    () => "",
  );
  const [message, setMessage] = useState(() =>
    supabase
      ? ""
      : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable sign-in.",
  );

  useEffect(() => {
    const client = supabase;

    if (!client) {
      return;
    }

    let isMounted = true;
    const sessionLoadTimeout = window.setTimeout(() => {
      if (!isMounted) return;
      setMessage(
        "Checking your sign-in status is taking longer than expected. You can still try signing in.",
      );
      setLoading(false);
    }, 4_000);

    const loadSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await client.auth.getSession();

        if (!isMounted) return;

        if (error) {
          setMessage(error.message);
        }

        setUser(session?.user ?? null);
      } catch (error) {
        if (!isMounted) return;

        setMessage(
          error instanceof Error
            ? error.message
            : "Could not check your sign-in status.",
        );
      } finally {
        window.clearTimeout(sessionLoadTimeout);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      window.clearTimeout(sessionLoadTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async (
    provider: "google" | "github" | "discord",
  ) => {
    if (!supabase) {
      setMessage(
        "Supabase is not configured yet. Add your public environment variables first.",
      );
      return;
    }

    setMessage("");
    setSigningInProvider(provider);

    try {
      posthog.capture("sign_in_started", { provider });
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getAuthRedirectUrl("/profile"),
        },
      });

      if (error) {
        setMessage(error.message);
        setSigningInProvider(null);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not start sign-in. Please try again.",
      );
      setSigningInProvider(null);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) {
      setMessage("Supabase is not configured, so you could not be signed out.");
      return;
    }

    setMessage("");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setMessage(error.message);
        return;
      }

      setUser(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not sign out.",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white px-4 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl text-center bg-white">
        <button
          type="button"
          aria-label="Close sign in modal"
          onClick={onClose}
          className="absolute right-4 hidden top-4 text-xl font-semibold text-[#666] transition hover:text-black"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            viewBox="0 -960 960 960"
            width="24px"
            fill="currentColor"
          >
            <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
          </svg>
        </button>

        <h2 className="mt-3 geist text-3xl font-semibold tracking-tighter text-black"></h2>

        <p className="mon geist  text-center  overflow-hidden text-xl font-semibold tracking-tighter text-black mb-2 ">
          {isBanned
            ? "Your account is banned"
            : user
              ? `You are signed in as ${user.email}`
              : "Sign in or create your profile"}
        </p>
        <p className="text-sm hidden leading-4 max-w-xs my-2 mx-auto text-center geist tracking-tight font-semibold uppercas text-[#999]">
          Sign in with your Google or GitHub
        </p>

        {isBanned ? (
          <div
            role="alert"
            className="mt-4 rounded geist font-medium tracking-tight text-sm text-red-400"
          >
            <p className="">
              If you believe this is a mistake, please contact the WeEverything
              team.
            </p>
          </div>
        ) : message ? (
          <p className="text-sm my-2 rounded mon border border-red-200 bg-red-50 leading-4 px-3 py-2 geist tracking-tight font-medium uppercas text-[#999]">
            {message}
          </p>
        ) : authError ? (
          <p
            className="text-sm my-2 rounded mon border border-red-200 bg-red-50 leading-4 px-3 py-2 geist tracking-tight font-medium text-[#999]"
            role="alert"
          >
            {authError}
          </p>
        ) : null}

        {isBanned ? null : loading ? (
          <div className="mt-6 text-sm text-[#666]">Loading session...</div>
        ) : user ? (
          <div className="mt-4">
            <div className="flex flex-wrap ">
              <button
                type="button"
                onClick={handleSignOut}
                className="max-w-full capitalize geist max-h-7 mt-4 rounded-3xl border border-black/10 bg-black/[0.03] px-2 py-1 text-sm font-medium leading-4 tracking-tight text-[#333] [overflow-wrap:anywhere]"
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4 text-center">
            <div className="flex items-center justify-center w-full flex-wrap  gap-1">
              <button
                type="button"
                onClick={() => void handleSignIn("google")}
                disabled={!isSupabaseConfigured || signingInProvider !== null}
                aria-busy={signingInProvider === "google"}
                className="w-fit  flex gap-2 geist capitalize max-h-7 rounded-3xl border border-black/10 bg-black/[0.03] px-2 py-1 text-sm font-medium leading-4 tracking-tight text-[#333] [overflow-wrap:anywhere]"
              >
                <FaGoogle aria-hidden="true" className="text-base" />
                {signingInProvider === "google" ? "Signing in..." : "Google"}
              </button>
              <button
                type="button"
                onClick={() => void handleSignIn("discord")}
                disabled={!isSupabaseConfigured || signingInProvider !== null}
                aria-busy={signingInProvider === "discord"}
                className="w-fit  flex gap-2 geist capitalize max-h-7 rounded-3xl border border-black/10 bg-black/[0.03] px-2 py-1 text-sm font-medium leading-4 tracking-tight text-[#333] [overflow-wrap:anywhere]"
              >
                <FaDiscord aria-hidden="true" className="text-base" />
                {signingInProvider === "discord" ? "Signing in..." : "Discord"}
              </button>
              <button
                type="button"
                onClick={() => void handleSignIn("github")}
                disabled={!isSupabaseConfigured || signingInProvider !== null}
                aria-busy={signingInProvider === "github"}
                className="w-fit  flex gap-2 geist capitalize max-h-7 rounded-3xl border border-black/10 bg-black/[0.03] px-2 py-1 text-sm font-medium leading-4 tracking-tight text-[#333] [overflow-wrap:anywhere]"
              >
                <FaGithub aria-hidden="true" className="text-base" />
                {signingInProvider === "github" ? "Signing in..." : "GitHub"}
              </button>
            </div>

            <p className="geist mx-auto text-center max-w-xs text-center justify-center text-[13px] font-semibold leading-3 tracking-tight text-[#999]">
              By signing in, you agree to our{" "}
              <Link href="/legal" className="underline underline-offset-2">
                Terms and Privacy Policy
              </Link>
            </p>

            <button
              type="button"
              onClick={onClose}
              className="geist text-center  overflow-hidden text-[13px] font-semibold leading-3 tracking-tight text-[#999]"
            >
              Cancel
            </button>

            {!isSupabaseConfigured ? (
              <p className="text-sm text-[#666]">
                Configure your Supabase environment variables to enable the
                sign-in flow.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default SignInModal;
