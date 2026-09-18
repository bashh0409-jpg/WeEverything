"use client";

import { useState } from "react";
import { useEffect } from "react";
import Navbar from "./components/Navbar";
import PersonCard from "./components/PersonCard";
import ProfileModal from "./components/ProfileModal";
import Footer from "./components/Footer";
import { getProfileHandle } from "@/lib/profile-handle";
import { readProfileCache, writeProfileCache } from "@/lib/profile-cache";

const roles = [
  "All",
  "Developers",
  "Designers",
  "Animators",
  "Photographers",
  "Other",
] as const;

type RoleFilter = (typeof roles)[number];

type Profile = {
  id: string;
  handle: string | null;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  role: string;
  location: string | null;
  awards: string | null;
  is_sponsored: boolean;
  uploaded_image: string | null;
  hover_media: { type: "image" | "video"; url: string } | null;
  socialLinks: { id: string; type: string; url: string }[];
};
const PROFILE_PAGE_SIZE = 40;
const SAVED_PROFILES_KEY = "weeverything:saved-profiles";

const normalizeRole = (role: string): RoleFilter => {
  const roleLabels: Record<string, RoleFilter> = {
    developer: "Developers",
    designer: "Designers",
    animator: "Animators",
    photographer: "Photographers",
  };

  const matchedRole = role
    .split("|")
    .map((value) => roleLabels[value.trim().toLowerCase()])
    .find(Boolean);

  return matchedRole ?? "Other";
};

const Page = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("All");

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [savedProfileIds, setSavedProfileIds] = useState<string[]>([]);
  const [showSavedProfiles, setShowSavedProfiles] = useState(false);

  const toggleSavedProfile = (profileId: string) => {
    setSavedProfileIds((currentIds) => {
      const nextIds = currentIds.includes(profileId)
        ? currentIds.filter((id) => id !== profileId)
        : [...currentIds, profileId];

      window.localStorage.setItem(SAVED_PROFILES_KEY, JSON.stringify(nextIds));
      return nextIds;
    });
  };

  const openProfile = (profile: Profile) => {
    setSelectedProfile(profile);
    const profileHandle =
      profile.handle || getProfileHandle(profile.name) || profile.id;
    window.history.pushState(
      {},
      "",
      `/?profile=${encodeURIComponent(profileHandle)}`,
    );

    void fetch(`/api/profiles?profile=${encodeURIComponent(profileHandle)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          profiles?: Profile[];
        };

        if (response.ok && result.profiles?.[0]) {
          setSelectedProfile(result.profiles[0]);
        }
      })
      .catch(() => undefined);
  };

  const closeProfile = () => {
    setSelectedProfile(null);
    window.history.replaceState({}, "", window.location.pathname);
  };

  useEffect(() => {
    let timeoutId: number | undefined;

    try {
      const storedIds = window.localStorage.getItem(SAVED_PROFILES_KEY);
      const parsedIds = storedIds ? JSON.parse(storedIds) : [];

      if (Array.isArray(parsedIds)) {
        const savedIds = parsedIds.filter(
          (id): id is string => typeof id === "string",
        );
        timeoutId = window.setTimeout(() => setSavedProfileIds(savedIds), 0);
      }
    } catch {
      window.localStorage.removeItem(SAVED_PROFILES_KEY);
    }

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const profileId = new URLSearchParams(window.location.search).get(
      "profile",
    );
    if (!profileId || selectedProfile) return;

    let isMounted = true;

    void fetch(`/api/profiles?profile=${encodeURIComponent(profileId)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          profiles?: Profile[];
        };

        if (isMounted && response.ok && result.profiles?.[0]) {
          setSelectedProfile(result.profiles[0]);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [profiles, selectedProfile]);

  useEffect(() => {
    let isMounted = true;
    const cachedProfiles = readProfileCache();
    const hasCachedProfiles = Boolean(cachedProfiles?.length);

    if (cachedProfiles && hasCachedProfiles) {
      setProfiles(cachedProfiles as Profile[]);
      setError("");
      setLoading(false);
    }

    const fetchProfilePage = async (offset: number) => {
      const response = await fetch(`/api/profiles?offset=${offset}`, {
        cache: "no-store",
      });
      const result = (await response.json()) as {
        profiles?: Profile[];
        hasMore?: boolean;
        error?: string;
      };

      if (!response.ok || !result.profiles) {
        throw new Error(result.error ?? "Could not load profiles.");
      }

      return { profiles: result.profiles, hasMore: result.hasMore ?? false };
    };

    const loadProfiles = async () => {
      try {
        const firstPage = await fetchProfilePage(0);
        if (!isMounted) return;

        const profilesById = new Map<string, Profile>();
        firstPage.profiles.forEach((profile) => {
          profilesById.set(profile.id, profile);
        });

        let loadedProfiles = Array.from(profilesById.values());
        writeProfileCache(loadedProfiles);

        setError("");
        setProfiles(loadedProfiles);
        setLoading(false);

        let offset = PROFILE_PAGE_SIZE;
        let hasMore = firstPage.hasMore;

        while (hasMore && isMounted) {
          const nextPage = await fetchProfilePage(offset);
          if (!isMounted) return;

          nextPage.profiles.forEach((profile) => {
            profilesById.set(profile.id, profile);
          });
          loadedProfiles = Array.from(profilesById.values());
          writeProfileCache(loadedProfiles);
          setProfiles(loadedProfiles);
          hasMore = nextPage.hasMore;
          offset += PROFILE_PAGE_SIZE;
        }
      } catch (loadError) {
        if (!isMounted) return;

        if (hasCachedProfiles) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load profiles.",
        );
        setProfiles([]);
        setLoading(false);
      }
    };

    void loadProfiles();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredProfiles = [...profiles]
    .filter(
      (profile) =>
        (roleFilter === "All" || normalizeRole(profile.role) === roleFilter) &&
        (!showSavedProfiles || savedProfileIds.includes(profile.id)),
    )
    .sort(
      (firstProfile, secondProfile) =>
        Number(secondProfile.is_sponsored) - Number(firstProfile.is_sponsored),
    );

  return (
    <div>
      <Navbar />

      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-2">
        <section className="mt-60 text-lg leading-tight flex max-w-xl flex-col items-center justify-center text-center uppercase">
          Find the best developers, photographers, illustrators, stylists and
          designers for your project.
        </section>
        <section className="w-full">
          <div className="mt-20 w-full max-w-lg">
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
                <button
                  type="button"
                  onClick={() => setShowSavedProfiles((current) => !current)}
                  className={
                    showSavedProfiles
                      ? "cursor-pointer text-black transition-all duration-500"
                      : "cursor-pointer transition-all duration-400 hover:text-black"
                  }
                >
                  Saved ({savedProfileIds.length})
                </button>
                {roles.slice(1, 6).map((role) => (
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
              {showSavedProfiles
                ? "No saved profiles yet."
                : "No published profiles yet."}
            </p>
          ) : (
            filteredProfiles.map((profile) => (
              <PersonCard
                key={profile.id}
                name={profile.name}
                bio={profile.bio ?? ""}
                image={profile.uploaded_image ?? profile.avatar_url ?? ""}
                hoverMedia={profile.hover_media}
                sponsored={profile.is_sponsored}
                role={normalizeRole(profile.role)}
                onOpen={() => openProfile(profile)}
              />
            ))
          )}
        </section>
      </main>
      <Footer />
      {selectedProfile ? (
        <ProfileModal
          profileId={selectedProfile.id}
          handle={selectedProfile.handle}
          name={selectedProfile.name}
          role={selectedProfile.role}
          bio={selectedProfile.bio}
          location={selectedProfile.location}
          awards={selectedProfile.awards}
          image={selectedProfile.uploaded_image ?? selectedProfile.avatar_url}
          hoverMedia={selectedProfile.hover_media}
          socialLinks={selectedProfile.socialLinks}
          isSaved={savedProfileIds.includes(selectedProfile.id)}
          onToggleSave={toggleSavedProfile}
          onClose={closeProfile}
        />
      ) : null}
    </div>
  );
};

export default Page;
