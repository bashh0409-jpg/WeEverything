"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export default function BillingSuccess() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setUser(null);
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

  const avatarUrl =
    typeof user?.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : typeof user?.user_metadata.picture === "string"
        ? user.user_metadata.picture
        : null;
  const avatarInitial = user?.email?.trim().charAt(0).toUpperCase() || "U";

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

      <div className="text-center max-w-md">
        <h1 className="text-xl uppercase tracking-tight mono mb-2">
          Sponsorship successful!
        </h1>

        <p className="mt-2 font-mono tracking-tight uppercase text-black/60">
          Thanks for supporting WeEverything. Your sponsorship payment was
          received successfully.
        </p>

        <Link
          href="/profile"
          className="mt-6 mono uppercase inline-flex items-center justify-center rounded-full border border-black bg-black px-2 py-1 text-xs font-medium uppercase tracking-tighter text-white transition hover:bg-white hover:text-black"
        >
          Go to profile
        </Link>
      </div>
    </div>
  );
}
