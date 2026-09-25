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

type EventSuggestion = {
  title: string;
  company: string;
  date: string;
  city: string;
  price: string;
  url: string;
  description: string;
};

const EMPTY_EVENT_SUGGESTION: EventSuggestion = {
  title: "",
  company: "",
  date: "",
  city: "",
  price: "",
  url: "",
  description: "",
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

  const cachedProfiles = readProfileCache();
  const hasCachedProfiles = Boolean(cachedProfiles?.length);

  const [profiles, setProfiles] = useState<Profile[]>(() =>
    hasCachedProfiles ? (cachedProfiles as Profile[]) : [],
  );
  const [loading, setLoading] = useState(!hasCachedProfiles);
  const [error, setError] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [savedProfileIds, setSavedProfileIds] = useState<string[]>([]);
  const [showSavedProfiles, setShowSavedProfiles] = useState(false);
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [eventSuggestion, setEventSuggestion] = useState<EventSuggestion>(
    EMPTY_EVENT_SUGGESTION,
  );
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);
  const [suggestionStatus, setSuggestionStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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
  }, [hasCachedProfiles]);

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

  const handleSuggestionChange = (
    field: keyof EventSuggestion,
    value: string,
  ) => {
    setEventSuggestion((current) => ({
      ...current,
      [field]: value,
    }));
    setSuggestionStatus(null);
  };

  const handleSuggestEvent = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (isSubmittingSuggestion) return;

    const trimmedSuggestion = {
      title: eventSuggestion.title.trim(),
      company: eventSuggestion.company.trim(),
      date: eventSuggestion.date.trim(),
      city: eventSuggestion.city.trim(),
      price: eventSuggestion.price.trim(),
      url: eventSuggestion.url.trim(),
      description: eventSuggestion.description.trim(),
    };

    if (
      !trimmedSuggestion.title ||
      !trimmedSuggestion.company ||
      !trimmedSuggestion.date
    ) {
      setSuggestionStatus({
        type: "error",
        message: "Title, organizer, and date are required.",
      });
      return;
    }

    const parsedDate = new Date(trimmedSuggestion.date);
    if (Number.isNaN(parsedDate.getTime())) {
      setSuggestionStatus({
        type: "error",
        message: "Enter a valid date for the event.",
      });
      return;
    }

    setIsSubmittingSuggestion(true);
    setSuggestionStatus(null);

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trimmedSuggestion),
      });

      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.error ?? "Could not submit your event suggestion.",
        );
      }

      setEventSuggestion(EMPTY_EVENT_SUGGESTION);
      setSuggestionStatus({
        type: "success",
        message:
          "Thanks! Your event suggestion has been added to the database.",
      });
      setIsSuggestionModalOpen(false);
    } catch (error) {
      setSuggestionStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not submit your event suggestion.",
      });
    } finally {
      setIsSubmittingSuggestion(false);
    }
  };

  return (
    <div>
      <Navbar />

      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-2">
        <section className="mt-60 geist leading-8 text-4xl font-bold tracking-tighter capitalize text-[#1c40f2] flex max-w-xl flex-col items-center justify-center text-center uppercas ">
          Find the best developers, photographers, illustrators, stylists and
          designers for your project.
        </section>
        <div className="mt-8 hidden  justify-center">
          <button
            type="button"
            onClick={() => setIsSuggestionModalOpen(true)}
            className="hidden cursor-pointer items-center justify-center rounded-full bg-[#1c40f2] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1535c3]"
          >
            Suggest an event
          </button>
        </div>

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

            <div className="mt-8 flex geist flex-wrap  flex-col  justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs  font-semibold uppercase tracking-tight text-[#999]">
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
                        ? "cursor-pointer tracking-tight text-black transition-all duration-500"
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
        <section className="mt-10 grid w-full  grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {loading ? (
            <p className="text-sm mono w-full text-center font-medium tracking-tight uppercase text-[#999]">
              Loading profiles...
            </p>
          ) : error ? (
            <p className="text-sm mono w-full text-center font-medium tracking-tight uppercase text-[#999]">
              {error}
            </p>
          ) : filteredProfiles.length === 0 ? (
            <p className="text-sm mono w-full text-center font-medium tracking-tight uppercase text-[#999]">
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
      {isSuggestionModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1c40f2]">
                  Community
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tighter text-black">
                  Suggest an event
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsSuggestionModalOpen(false)}
                aria-label="Close event suggestion modal"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-black/10 text-xl text-black transition hover:bg-black/5"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSuggestEvent} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-[#222]">
                  Event name
                  <input
                    value={eventSuggestion.title}
                    onChange={(event) =>
                      handleSuggestionChange("title", event.target.value)
                    }
                    placeholder="Awwwards x Designers Meetup"
                    className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-[#1c40f2]"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-[#222]">
                  Organizer
                  <input
                    value={eventSuggestion.company}
                    onChange={(event) =>
                      handleSuggestionChange("company", event.target.value)
                    }
                    placeholder="WeEverything"
                    className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-[#1c40f2]"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-[#222]">
                  Date
                  <input
                    type="date"
                    value={eventSuggestion.date}
                    onChange={(event) =>
                      handleSuggestionChange("date", event.target.value)
                    }
                    className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-[#1c40f2]"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-[#222]">
                  City
                  <input
                    value={eventSuggestion.city}
                    onChange={(event) =>
                      handleSuggestionChange("city", event.target.value)
                    }
                    placeholder="New York, NY"
                    className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-[#1c40f2]"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-[#222]">
                  Ticket price
                  <input
                    value={eventSuggestion.price}
                    onChange={(event) =>
                      handleSuggestionChange("price", event.target.value)
                    }
                    placeholder="Free"
                    className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-[#1c40f2]"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-[#222]">
                  Event URL
                  <input
                    type="url"
                    value={eventSuggestion.url}
                    onChange={(event) =>
                      handleSuggestionChange("url", event.target.value)
                    }
                    placeholder="https://example.com/event"
                    className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-[#1c40f2]"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-2 text-sm font-medium text-[#222]">
                Description
                <textarea
                  value={eventSuggestion.description}
                  onChange={(event) =>
                    handleSuggestionChange("description", event.target.value)
                  }
                  rows={4}
                  placeholder="Tell people what the event is about, who it’s for, and why it matters."
                  className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-[#1c40f2]"
                />
              </label>

              {suggestionStatus ? (
                <p
                  className={`text-sm ${
                    suggestionStatus.type === "success"
                      ? "text-green-700"
                      : "text-red-600"
                  }`}
                  aria-live="polite"
                >
                  {suggestionStatus.message}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-[#666]">
                  We’ll add the approved submission to the community event feed.
                </p>

                <button
                  type="submit"
                  disabled={isSubmittingSuggestion}
                  className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[#1c40f2] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1535c3] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmittingSuggestion ? "Submitting..." : "Submit event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

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
