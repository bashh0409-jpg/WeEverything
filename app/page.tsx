"use client";

import { useState } from "react";
import { useEffect } from "react";
import Navbar from "./components/Navbar";
import PersonCard from "./components/PersonCard";
import BottomButton from "./components/BottomButton";
import { supabase } from "@/lib/supabase/client";
import Footer from "./components/Footer";

const roles = [
  "All",
  "Designers",
  "Developers",
  "Illustrators",
  "Photographers",
] as const;

const endOfProfilesEmojis = ["🙈", "👀","🥶","🤦🏻‍♂️"];

type RoleFilter = (typeof roles)[number];

type Profile = {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  role: string;
  is_sponsored: boolean;
  uploaded_image: string | null;
  hover_media: {
    type: "image" | "video";
    url: string;
  } | null;
};

type ProfileMedia = {
  profile_id: string;
  storage_path: string;
  media_type: "image" | "video";
  position: number;
};

const normalizeRole = (role: string): RoleFilter => {
  const roleName = `${role.charAt(0).toUpperCase()}${role.slice(1).toLowerCase()}`;
  return roles.includes(`${roleName}s` as RoleFilter)
    ? (`${roleName}s` as RoleFilter)
    : "All";
};

const Page = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("All");
  const [endOfProfilesEmoji, setEndOfProfilesEmoji] = useState(
    endOfProfilesEmojis[0],
  );
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(() => Boolean(supabase));
  const [error, setError] = useState(() =>
    supabase ? "" : "Supabase is not configured yet.",
  );

  useEffect(() => {
    const client = supabase;

    if (!client) return;

    let isMounted = true;

    const loadProfiles = async () => {
      const [profilesResult, mediaResult] = await Promise.all([
        client
          .from("profiles")
          .select("id, name, bio, avatar_url, role, is_sponsored")
          .eq("is_published", true)
          .order("created_at", { ascending: false }),
        client
          .from("profile_media")
          .select("profile_id, storage_path, media_type, position")
          .in("position", [0, 1])
          .order("position"),
      ]);

      if (!isMounted) return;

      if (profilesResult.error || mediaResult.error) {
        setError(
          profilesResult.error?.message ??
            mediaResult.error?.message ??
            "Could not load profiles.",
        );
        setProfiles([]);
      } else {
        setError("");
        const mediaByProfile = new Map<string, ProfileMedia[]>();

        ((mediaResult.data ?? []) as ProfileMedia[]).forEach((media) => {
          const profileMedia = mediaByProfile.get(media.profile_id) ?? [];
          profileMedia.push(media);
          mediaByProfile.set(media.profile_id, profileMedia);
        });

        setProfiles(
          (
            (profilesResult.data ?? []) as Omit<
              Profile,
              "uploaded_image" | "hover_media"
            >[]
          ).map((profile) => {
            const profileMedia = mediaByProfile.get(profile.id) ?? [];
            const primaryMedia = profileMedia.find(
              (media) => media.position === 0 && media.media_type === "image",
            );
            const secondaryMedia = profileMedia.find(
              (media) => media.position === 1,
            );

            return {
              ...profile,
              uploaded_image: primaryMedia
                ? client.storage
                    .from("profile-media")
                    .getPublicUrl(primaryMedia.storage_path).data.publicUrl
                : null,
              hover_media: secondaryMedia
                ? {
                    type: secondaryMedia.media_type,
                    url: client.storage
                      .from("profile-media")
                      .getPublicUrl(secondaryMedia.storage_path).data.publicUrl,
                  }
                : null,
            };
          }),
        );
      }

      setLoading(false);
    };

    void loadProfiles();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let emojiIndex = 0;
    const interval = window.setInterval(() => {
      emojiIndex = (emojiIndex + 1) % endOfProfilesEmojis.length;
      setEndOfProfilesEmoji(endOfProfilesEmojis[emojiIndex]);
    }, 1_500);

    return () => window.clearInterval(interval);
  }, []);

  const filteredProfiles = [...profiles]
    .filter(
      (profile) =>
        roleFilter === "All" || normalizeRole(profile.role) === roleFilter,
    )
    .sort(
      (firstProfile, secondProfile) =>
        Number(secondProfile.is_sponsored) - Number(firstProfile.is_sponsored),
    );

  return (
    <div>
      <Navbar />
    


      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-2">
        <section className="mt-50 text-lg leading-tight flex max-w-xl flex-col items-center justify-center text-center uppercase">
          Find the best developers, photographers, illustrators, stylists and
          designers for your project.
        </section>

        <section className="w-full">
          <div className="mt-8 w-full max-w-lg">
            <button
              onClick={() => {
                setRoleFilter("All");
              }}
              className={
                roleFilter === "All"
                  ? "flex cursor-pointer geist items-center gap-1 text-2xl font-bold tracking-tighter text-black transition-colors duration-500"
                  : "flex cursor-pointer geist items-center gap-1 text-2xl font-bold tracking-tighter text-[#999] transition-colors duration-500 hover:text-black"
              }
            >
              <span aria-hidden="true">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="18px"
                  viewBox="0 -960 960 960"
                  width="18px"
                  fill="currentColor"
                >
                  <path d="m560-120-57-57 144-143H200v-480h80v400h367L503-544l56-57 241 241-240 240Z" />
                </svg>
              </span>
              All Profiles ({profiles.length})
            </button>

            <div className="mt-8 flex flex-wrap  flex-col  justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs  font-semibold uppercase tracking-tighter text-[#999]">
                  View
                </span>
                <button
                  type="button"
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                  onClick={() => {
                    setViewMode("grid");
                  }}
                  className={`cursor-pointer rounded px-1 transition-all duration-400 ${viewMode === "grid" ? "text-black" : "text-[#999] hover:text-black"}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="14px"
                    viewBox="0 -960 960 960"
                    width="14px"
                    fill="currentColor"
                  >
                    <path d="M120-120v-720h720v720H120Zm640-80v-240H520v240h240Zm0-560H520v240h240v-240Zm-560 0v240h240v-240H200Zm0 560h240v-240H200v240Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                  onClick={() => {
                    setViewMode("list");
                  }}
                  className={`cursor-pointer rounded px-1 transition-all duration-400 ${viewMode === "list" ? "text-black" : "text-[#999] hover:text-black"}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="14px"
                    viewBox="0 -960 960 960"
                    width="14px"
                    fill="currentColor"
                  >
                    <path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-wrap gap-4 overflow-y-auto text-xs font-semibold uppercase tracking-tight text-[#999]">
                {roles.slice(1).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setRoleFilter(role);
                    }}
                    className={
                      roleFilter === role
                        ? "cursor-pointer text-black transition-all duration-500"
                        : "cursor-pointer transition-all duration-400 hover:text-black"
                    }
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </div>{" "}
        </section>

        <section className="mt-10 grid w-full grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {loading ? (
            <p className="text-xs font-semibold uppercase text-[#999]">
              Loading profiles...
            </p>
          ) : error ? (
            <p className="text-xs font-semibold uppercase text-[#999]">
              {error}
            </p>
          ) : filteredProfiles.length === 0 ? (
            <p className="text-xs font-semibold uppercase text-[#999]">
              No published profiles yet.
            </p>
          ) : (
            filteredProfiles.map((profile) => (
              <PersonCard
                key={profile.id}
                id={profile.id}
                handle={profile.name}
                bio={profile.bio ?? ""}
                image={profile.uploaded_image ?? profile.avatar_url ?? ""}
                hoverMedia={profile.hover_media}
                sponsored={profile.is_sponsored}
                role={normalizeRole(profile.role)}
              />
            ))
          )}
          
        </section>
        <span>End of profiles </span>{" "}
        <span aria-label="Rotating profile ending" role="img">
          {endOfProfilesEmoji}
        </span>
        
      </main>
      <Footer />
    </div>
  );
};

export default Page;
