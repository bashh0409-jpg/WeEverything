"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Navbar from "../components/Navbar";
import { supabase } from "@/lib/supabase/client";

type ProfileFormState = {
  name: string;
  role: string;
  bio: string;
  location: string;
  avatar_url: string;
  is_published: boolean;
};

type SessionUser = {
  id: string;
  email?: string | null;
};

const defaultForm: ProfileFormState = {
  name: "",
  role: "Designer",
  bio: "",
  location: "",
  avatar_url: "",
  is_published: false,
};

const SubmitPage = () => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<ProfileFormState>(defaultForm);

  useEffect(() => {
    const client = supabase;

    if (!client) {
      setLoading(false);
      setMessage(
        "Supabase is not configured yet. Add your public environment variables first.",
      );
      return;
    }

    const loadSession = async () => {
      const {
        data: { session },
      } = await client.auth.getSession();

      setUser(session?.user ?? null);

      if (session?.user) {
        const { data, error } = await client
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) {
          setMessage(error.message);
        }

        if (data) {
          setForm({
            name: data.name ?? "",
            role: data.role ?? "Designer",
            bio: data.bio ?? "",
            location: data.location ?? "",
            avatar_url: data.avatar_url ?? "",
            is_published: data.is_published ?? false,
          });
        }
      }

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

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = event.target;

    setForm((current) => ({
      ...current,
      [name]:
        type === "checkbox"
          ? (event.target as HTMLInputElement).checked
          : value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase || !user) {
      setMessage("You must be signed in to submit or update your profile.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      id: user.id,
      name: form.name,
      role: form.role,
      bio: form.bio,
      location: form.location,
      avatar_url: form.avatar_url,
      is_published: form.is_published,
    };

    const { error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Profile saved successfully.");
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center px-6 py-20">
          <p className="text-sm text-[#666]">Loading your profile...</p>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center px-6 py-20">
          <section className="w-full max-w-xl rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#999]">
              Access required
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tighter text-black">
              Sign in to continue
            </h1>
            <p className="mt-4 text-sm text-[#666]">
              Users must be signed in before they can submit or update their
              profile details.
            </p>
            <Link
              href="/signin"
              className="mt-6 inline-flex cursor-pointer rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1c40f2]"
            >
              Go to sign in
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div>
      <Navbar />

      <main className="flex min-h-screen items-center justify-center px-6 py-20">
        <section className="w-full max-w-2xl rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#999]">
            Submit profile
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tighter text-black">
            Update your public profile
          </h1>

          {message ? (
            <p className="mt-4 rounded border border-black/10 bg-[#f7f7f7] px-3 py-2 text-sm text-[#333]">
              {message}
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block text-sm font-medium text-[#333]">
                Name
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="mt-2 w-full rounded border border-black/10 bg-[#f7f7f7] px-3 py-2 text-black outline-none transition focus:border-[#1c40f2]"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-[#333]">
                Role
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="mt-2 w-full rounded border border-black/10 bg-[#f7f7f7] px-3 py-2 text-black outline-none transition focus:border-[#1c40f2]"
                >
                  <option>Designer</option>
                  <option>Developer</option>
                  <option>Illustrator</option>
                  <option>Photographer</option>
                </select>
              </label>
            </div>

            <label className="block text-sm font-medium text-[#333]">
              Bio
              <textarea
                name="bio"
                value={form.bio}
                onChange={handleChange}
                rows={5}
                className="mt-2 w-full rounded border border-black/10 bg-[#f7f7f7] px-3 py-2 text-black outline-none transition focus:border-[#1c40f2]"
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block text-sm font-medium text-[#333]">
                Location
                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  className="mt-2 w-full rounded border border-black/10 bg-[#f7f7f7] px-3 py-2 text-black outline-none transition focus:border-[#1c40f2]"
                />
              </label>

              <label className="block text-sm font-medium text-[#333]">
                Avatar URL
                <input
                  type="url"
                  name="avatar_url"
                  value={form.avatar_url}
                  onChange={handleChange}
                  className="mt-2 w-full rounded border border-black/10 bg-[#f7f7f7] px-3 py-2 text-black outline-none transition focus:border-[#1c40f2]"
                />
              </label>
            </div>

            <label className="flex items-center gap-3 text-sm font-medium text-[#333]">
              <input
                type="checkbox"
                name="is_published"
                checked={form.is_published}
                onChange={handleChange}
                className="h-4 w-4 accent-[#1c40f2]"
              />
              Make profile public
            </label>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="cursor-pointer rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1c40f2] disabled:cursor-not-allowed disabled:bg-[#999]"
              >
                {saving ? "Saving..." : "Save profile"}
              </button>

              <Link
                href="/signin"
                className="cursor-pointer rounded-full border border-black/20 px-5 py-2.5 text-sm font-semibold text-black transition hover:border-black"
              >
                Back to sign in
              </Link>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
};

export default SubmitPage;
