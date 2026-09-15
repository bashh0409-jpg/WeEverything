"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type PublicProfile = {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  location: string | null;
};

const Page = ({ params }: { params: Promise<{ id: string }> }) => {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      const { id } = await params;

      if (!supabase) {
        if (isMounted) setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, name, role, bio, location")
        .eq("id", id)
        .eq("is_published", true)
        .maybeSingle();

      if (!isMounted) return;

      setProfile(data as PublicProfile | null);
      setLoading(false);

      if (data) {
        const viewKey = `profile-viewed:${id}:${new Date().toISOString().slice(0, 10)}`;

        if (!window.sessionStorage.getItem(viewKey)) {
          const { error } = await supabase
            .from("profile_views")
            .insert({ profile_id: id });

          if (!error) {
            window.sessionStorage.setItem(viewKey, "1");
          }
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [params]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        Loading profile...
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tighter">
          Profile not found
        </h1>
        <Link
          href="/"
          className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white"
        >
          Return home
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-24 text-black sm:px-10">
      <section className="mx-auto w-full max-w-3xl border-t border-black pt-5">
        <p className="mono text-sm font-semibold text-[#1c40f2]">
          @{profile.name}
        </p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tighter sm:text-7xl">
          {profile.name}
        </h1>
        <p className="mt-4 text-xl font-semibold">{profile.role}</p>
        {profile.location ? (
          <p className="mt-2 text-sm text-[#666]">{profile.location}</p>
        ) : null}
        <p className="mt-12 max-w-2xl text-base leading-relaxed text-[#444]">
          {profile.bio || "This profile has not added a bio yet."}
        </p>
        <Link
          href="/"
          className="mt-10 inline-flex rounded-full bg-black px-4 py-2 text-sm font-semibold text-white"
        >
          Browse profiles
        </Link>
      </section>
    </main>
  );
};

export default Page;
