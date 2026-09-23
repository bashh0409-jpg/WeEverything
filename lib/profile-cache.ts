export type CachedProfile = {
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
  hover_media: {
    type: "image" | "video";
    url: string;
  } | null;
  socialLinks: {
    id: string;
    type: string;
    url: string;
  }[];
};

const PROFILE_CACHE_KEY = "weeverything:published-profiles:v5";
const PROFILE_CACHE_MAX_AGE = 5 * 60 * 1000;

type ProfileCache = {
  cachedAt: number;
  profiles: CachedProfile[];
};

export const readProfileCache = (): CachedProfile[] | null => {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(PROFILE_CACHE_KEY);
    if (!stored) return null;

    const cache = JSON.parse(stored) as ProfileCache;
    if (
      !Array.isArray(cache.profiles) ||
      Date.now() - cache.cachedAt > PROFILE_CACHE_MAX_AGE
    ) {
      window.localStorage.removeItem(PROFILE_CACHE_KEY);
      return null;
    }

    return cache.profiles;
  } catch {
    window.localStorage.removeItem(PROFILE_CACHE_KEY);
    return null;
  }
};

export const writeProfileCache = (profiles: CachedProfile[]) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      PROFILE_CACHE_KEY,
      JSON.stringify({ cachedAt: Date.now(), profiles }),
    );
  } catch {}
};
