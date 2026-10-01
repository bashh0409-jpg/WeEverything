"use client";

import { gsap } from "gsap";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

export interface DirectoryProfile {
  id: string | number;
  name: string;
  role: string;
  bio: string | null;
  location?: string | null;
  avatarUrl?: string;
}

interface DirectorySearchModalProps<TProfile extends DirectoryProfile> {
  isOpen: boolean;
  onClose: () => void;
  onClearRecents: () => void;
  onSelectProfile: (profile: TProfile) => void;
  profiles: readonly TProfile[];
  recentlyViewedProfileIds: readonly string[];
}

const MAX_RESULTS = 8;

const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 1)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

const normalizeSearchText = (value: string): string =>
  value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export default function DirectorySearchModal<
  TProfile extends DirectoryProfile,
>({
  isOpen,
  onClose,
  onClearRecents,
  onSelectProfile,
  profiles,
  recentlyViewedProfileIds,
}: DirectorySearchModalProps<TProfile>) {
  const [query, setQuery] = useState("");
  const [semanticProfiles, setSemanticProfiles] = useState<TProfile[]>([]);
  const [semanticQuery, setSemanticQuery] = useState("");
  const [isSemanticSearching, setIsSemanticSearching] = useState(false);
  const [semanticSearchError, setSemanticSearchError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isClosingRef = useRef(false);
  const closeHandlerRef = useRef<() => void>(() => {});

  const closeModal = (afterClose?: () => void) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    const dialog = dialogRef.current;
    const content = contentRef.current;
    if (
      !dialog ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      onClose();
      afterClose?.();
      return;
    }

    gsap.set(dialog, { pointerEvents: "none" });
    gsap
      .timeline({
        onComplete: () => {
          onClose();
          afterClose?.();
        },
      })
      .to(content, { y: -12, autoAlpha: 0, duration: 0.2, ease: "power2.in" })
      .to(dialog, { autoAlpha: 0, duration: 0.28, ease: "power2.in" }, 0);
  };

  useLayoutEffect(() => {
    closeHandlerRef.current = () => closeModal();
  });

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const content = contentRef.current;
    if (!dialog || !content) return;

    const context = gsap.context(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.fromTo(
        dialog,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.32, ease: "power2.out" },
      );
      gsap.fromTo(
        content,
        { y: 18, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.48, ease: "power3.out" },
      );
    }, dialog);

    return () => context.revert();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    inputRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeHandlerRef.current();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const searchWithAI = async () => {
    const submittedQuery = query.trim();
    if (!submittedQuery || isSemanticSearching) return;

    setIsSemanticSearching(true);
    setSemanticSearchError("");

    try {
      const response = await fetch("/api/ai/search-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: submittedQuery,
          candidates: profiles.slice(0, 100).map((profile) => ({
            id: String(profile.id),
            name: profile.name,
            role: profile.role,
            bio: profile.bio ?? "",
            location: profile.location ?? "",
          })),
        }),
      });
      const result = (await response.json()) as { ids?: string[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Intelligent search failed.");

      const profilesById = new Map(
        profiles.map((profile) => [String(profile.id), profile]),
      );
      setSemanticProfiles(
        (result.ids ?? [])
          .map((id) => profilesById.get(id))
          .filter((profile): profile is TProfile => Boolean(profile)),
      );
      setSemanticQuery(normalizeSearchText(submittedQuery));
    } catch (error) {
      setSemanticSearchError(
        error instanceof Error
          ? error.message
          : "Intelligent search is unavailable.",
      );
      setSemanticProfiles([]);
      setSemanticQuery("");
    } finally {
      setIsSemanticSearching(false);
    }
  };

  const needle = normalizeSearchText(query);

  const matchingProfiles = useMemo(() => {
    if (!needle) return [];

    return profiles
      .filter((profile) =>
        [profile.name, profile.role, profile.location ?? ""].some((field) =>
          normalizeSearchText(field).includes(needle),
        ),
      )
      .sort(
        (a, b) =>
          Number(!normalizeSearchText(a.name).startsWith(needle)) -
          Number(!normalizeSearchText(b.name).startsWith(needle)),
      );
  }, [profiles, needle]);
  const totalMatches = matchingProfiles.length;
  const matches = matchingProfiles.slice(0, MAX_RESULTS);

  const recentlyViewedProfiles = useMemo(() => {
    const profilesById = new Map(
      profiles.map((profile) => [String(profile.id), profile]),
    );

    return recentlyViewedProfileIds
      .map((id) => profilesById.get(id))
      .filter((profile): profile is TProfile => Boolean(profile))
      .slice(0, MAX_RESULTS);
  }, [profiles, recentlyViewedProfileIds]);

  const isShowingSemanticResults = Boolean(
    needle && semanticQuery === needle && semanticProfiles.length > 0,
  );
  const displayedProfiles = needle
    ? isShowingSemanticResults
      ? semanticProfiles
      : matches
    : recentlyViewedProfiles;
  const displayedMatchCount = isShowingSemanticResults
    ? semanticProfiles.length
    : totalMatches;

  if (!isOpen) return null;

  return (
    <section
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="directory-search-title"
      className="fixed inset-0 geist z-50 min-h-dvh overflow-y-auto bg-[#999] px-6"
    >
      <h2 id="directory-search-title" className="sr-only">
        Search profiles
      </h2>

      <button
        type="button"
        aria-label="Close search"
        onClick={() => closeModal()}
        className="fixed right-6 top-6 flex h-11 w-11 items-center justify-center text-white/70 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>

      <div
        ref={contentRef}
        className="mx-auto min-h-dvh w-full max-w-xl pt-[30vh] pb-12"
      >
        {/* The input stays visually dominant while results remain close enough to scan quickly. */}
        <div className="flex w-full items-center border-b-2 border-white/60 focus-within:border-white/70">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSemanticProfiles([]);
              setSemanticQuery("");
              setSemanticSearchError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void searchWithAI();
              }
            }}
            placeholder="Search"
            aria-label="Search profiles"
            className="directory-search-input w-full min-w-0 border-0 bg-transparent px-0 text-lg font-medium tracking-tight text-white outline-none placeholder:text-white/30 sm:text-6xl"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="ml-4 flex h-11 w-11 shrink-0 items-center justify-center text-white transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="currentColor"
              >
                <path d="m456-320 104-104 104 104 56-56-104-104 104-104-56-56-104 104-104-104-56 56 104 104-104 104 56 56Zm-96 160q-19 0-36-8.5T296-192L80-480l216-288q11-15 28-23.5t36-8.5h440q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H360ZM180-480l180 240h440v-480H360L180-480Zm400 0Z" />
              </svg>
            </button>
          )}
        </div>

        {needle ? (
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs font-medium tracking-tight text-white/60">
              {isSemanticSearching
                ? "Finding the most relevant profiles..."
                : "Press Enter for an intelligent search"}
            </p>
            {semanticSearchError ? (
              <p className="text-xs font-medium text-red-100" role="status">
                {semanticSearchError}
              </p>
            ) : null}
          </div>
        ) : null}

        {(needle || recentlyViewedProfiles.length > 0) && (
          <div className="mt-8">
            {needle && (
              <p
                aria-live="polite"
                className="mb-3 text-sm capitaliz font-medium tracking-tight text-white"
              >
                {displayedMatchCount === 0
                  ? "No results found. Try searching for a different name or role."
                  : `${displayedMatchCount} ${displayedMatchCount === 1 ? "result" : "results"}${isShowingSemanticResults ? " · Intelligent search" : displayedMatchCount > matches.length ? ` · Showing ${matches.length}` : ""}`}
              </p>
            )}
            {!needle && (
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs mono capitalize font-medium tracking-tight uppercase text-white">
                  Recents
                </p>
                <button
                  type="button"
                  onClick={onClearRecents}
                  className="text-xs mono flex items-center font-medium uppercase tracking-tight text-white/60 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="20px"
                    viewBox="0 -960 960 960"
                    width="20px"
                    fill="currentColor"
                  >
                    <path d="m456-320 104-104 104 104 56-56-104-104 104-104-56-56-104 104-104-104-56 56 104 104-104 104 56 56Zm-96 160q-19 0-36-8.5T296-192L80-480l216-288q11-15 28-23.5t36-8.5h440q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H360ZM180-480l180 240h440v-480H360L180-480Zm400 0Z" />
                  </svg>
                </button>
              </div>
            )}
            {displayedProfiles.length > 0 ? (
              <div className="">
                {displayedProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => {
                      closeModal(() => onSelectProfile(profile));
                    }}
                    className="group flex w-full gap-4 py-4 text-left "
                  >
                    {profile.avatarUrl ? (
                      // Remote avatar hosts are intentionally rendered without next/image configuration.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatarUrl}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-8 w-8  shrink-0 items-center justify-center rounded-full bg-white text-x font-semibold text-black">
                        {getInitials(profile.name)}
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text- -mt-1 uppercase mono font-medium tracking-tight text-white">
                        {profile.name}
                      </p>

                      <p className="mon geist text-justify line-clamp-3 overflow-hidden text-[12px] font-semibold leading-3 tracking-tight text-white">
                        {profile.bio}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
