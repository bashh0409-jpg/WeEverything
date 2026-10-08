"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import posthog from "posthog-js";
import type { User } from "@supabase/supabase-js";
import { FaGithub, FaGoogle } from "react-icons/fa6";
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

const SignInModal = ({ onClose }: SignInModalProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => Boolean(supabase));
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isAdultConfirmed, setIsAdultConfirmed] = useState(false);
  const isBanned = useSyncExternalStore(
    subscribeToLocation,
    getIsBannedFromLocation,
    () => false,
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
      subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async (provider: "google" | "github") => {
    if (!isAdultConfirmed) return;

    if (!supabase) {
      setMessage(
        "Supabase is not configured yet. Add your public environment variables first.",
      );
      return;
    }

    setMessage("");
    setIsSigningIn(true);

    try {
      posthog.capture("sign_in_started", { provider });

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getAuthRedirectUrl("/profile"),
        },
      });

      if (error) {
        setMessage(error.message);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not start sign-in. Please try again.",
      );
    } finally {
      setIsSigningIn(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl border border-black/10 bg-white p-4 shadow-2xl">
        <button
          type="button"
          aria-label="Close sign in modal"
          onClick={onClose}
          className="absolute right-4 top-4 text-xl font-semibold text-[#666] transition hover:text-black"
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

        <p className="text-xs font-medium uppercase t mono text-[#999]">
          Welcome to WeEverything
        </p>

        <h2 className="mt-3 geist text-3xl font-semibold tracking-tighter text-black">
          {isBanned
            ? "Your account is banned"
            : user
              ? `You are signed in as ${user.email}`
              : "Sign in or create your profile"}
        </h2>

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
          <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {message}
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
          <div className="mt-4 space-y-4">
            <p className="text-sm mon leading-4 geist tracking-tight font-medium uppercas text-[#999]">
              Continue with Google or GitHub to sign in, or create your profile
              if this is your first visit.
            </p>

            <label className="flex  geist items-start gap-2 text-sm font-medium leading-5 tracking-tight">
              <input
                type="checkbox"
                checked={isAdultConfirmed}
                onChange={(event) =>
                  setIsAdultConfirmed(event.currentTarget.checked)
                }
                className="mt-1"
              />

              <p className="geist  max-w-xs text-justify  overflow-hidden text-[13px] font-semibold leading-3 tracking-tight text-[#999]">
                I confirm that I am at least 18 years old and agree to the{" "}
                <Link href="/legal" className="underline">
                  Terms and Privacy Policy
                </Link>
                .
              </p>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void handleSignIn("google")}
                disabled={
                  !isSupabaseConfigured || !isAdultConfirmed || isSigningIn
                }
                className="flex w-full mono tracking-tight cursor-pointer items-center justify-center gap-2 rounded-full bg-[#1c40f2] px-4 py-2 text-sm font-medium uppercase text-white transition hover:bg-[#1636d4] disabled:cursor-not-allowed disabled:bg-[#c2ccff]"
              >
                <FaGoogle aria-hidden="true" className="text-base" />
                Google
              </button>

              <button
                type="button"
                onClick={() => void handleSignIn("github")}
                disabled={
                  !isSupabaseConfigured || !isAdultConfirmed || isSigningIn
                }
                className="flex w-full mono tracking-tight cursor-pointer items-center justify-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-medium uppercase text-white transition hover:bg-[#333] disabled:cursor-not-allowed disabled:bg-[#aaa]"
              >
                <FaGithub aria-hidden="true" className="text-base" />
                GitHub
              </button>
            </div>

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
