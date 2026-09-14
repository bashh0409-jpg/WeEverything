"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import {
  getAuthRedirectUrl,
  isSupabaseConfigured,
  supabase,
} from "@/lib/supabase/client";

const SignInPage = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const client = supabase;

    if (!client) {
      setLoading(false);
      setMessage(
        "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable Google sign-in.",
      );
      return;
    }

    const loadSession = async () => {
      const {
        data: { session },
      } = await client.auth.getSession();

      setUser(session?.user ?? null);
      setLoading(false);
    };

    loadSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      setMessage(
        "Supabase is not configured yet. Add your public environment variables first.",
      );
      return;
    }

    setMessage("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectUrl(),
      },
    });

    if (error) {
      setMessage(error.message);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
      return;
    }

    setUser(null);
  };

  return (
    <div>
      <Navbar />

      <main className="flex min-h-screen items-center justify-center px-6 py-20">
        <section className="w-full max-w-xl rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#999]">
            Authentication
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tighter text-black">
            {user ? "You are signed in" : "Sign in to submit your profile"}
          </h1>

          {message ? (
            <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {message}
            </p>
          ) : null}

          {loading ? (
            <div className="mt-6 text-sm text-[#666]">Loading session...</div>
          ) : user ? (
            <div className="mt-6 space-y-4">
              <div className="rounded border border-black/10 bg-[#f7f7f7] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#999]">
                  Signed in as
                </p>
                <p className="mt-2 text-base font-semibold text-black">
                  {user.email}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/submit"
                  className="cursor-pointer rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1c40f2]"
                >
                  Go to submit page
                </Link>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="cursor-pointer rounded-full border border-black/20 px-4 py-2 text-sm font-semibold text-black transition hover:border-black"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-[#666]">
                Use your Google account to sign in and submit or update your
                profile.
              </p>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={!isSupabaseConfigured}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#1c40f2] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1636d4] disabled:cursor-not-allowed disabled:bg-[#c2ccff]"
              >
                Continue with Google
              </button>

              {!isSupabaseConfigured ? (
                <p className="text-sm text-[#666]">
                  Configure your Supabase environment variables to enable the
                  sign-in flow.
                </p>
              ) : null}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default SignInPage;
