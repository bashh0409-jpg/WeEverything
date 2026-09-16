import { Redis } from "@upstash/redis";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PROFILE_CACHE_KEY = "published-profiles:v2";
const PROFILE_PAGE_SIZE = 40;
const DEFAULT_PROFILE_CACHE_TTL = 60 * 60;

const getProfileCacheTtl = () => {
  const configuredTtl = Number(process.env.PROFILE_CACHE_TTL_SECONDS);

  return Number.isFinite(configuredTtl) && configuredTtl > 0
    ? Math.floor(configuredTtl)
    : DEFAULT_PROFILE_CACHE_TTL;
};

type Profile = {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  role: string;
  location: string | null;
  is_sponsored: boolean;
  uploaded_image: string | null;
  hover_media: {
    type: "image" | "video";
    url: string;
  } | null;
  socialLinks: SocialLink[];
};

type SocialLink = {
  id: string;
  type: string;
  url: string;
};

type ProfileMedia = {
  profile_id: string;
  storage_path: string;
  media_type: "image" | "video";
  position: number;
};

const getRedis = () => {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }

  return Redis.fromEnv();
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedOffset = Number(url.searchParams.get("offset") ?? "0");
  const offset =
    Number.isInteger(requestedOffset) && requestedOffset >= 0
      ? requestedOffset
      : 0;
  const cacheKey = `${PROFILE_CACHE_KEY}:${offset}`;
  const redis = getRedis();

  if (redis) {
    try {
      const cachedProfiles = await redis.get<Profile[]>(cacheKey);

      if (cachedProfiles) {
        return NextResponse.json(
          {
            profiles: cachedProfiles,
            hasMore: cachedProfiles.length === PROFILE_PAGE_SIZE,
          },
          {
            headers: {
              "Cache-Control": `public, s-maxage=${getProfileCacheTtl()}, stale-while-revalidate=300`,
              "X-Profile-Cache": "HIT",
            },
          },
        );
      }
    } catch {}
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Supabase is not configured yet." },
      { status: 503 },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const profilesResult = await supabase
    .from("profiles")
    .select("id, name, bio, avatar_url, role, location, is_sponsored")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .range(offset, offset + PROFILE_PAGE_SIZE - 1);

  if (profilesResult.error) {
    return NextResponse.json(
      {
        error: profilesResult.error.message,
      },
      { status: 502 },
    );
  }

  const profileIds = (profilesResult.data as { id: string }[]).map(
    (profile) => profile.id,
  );
  const mediaByProfile = new Map<string, ProfileMedia[]>();
  const linksByProfile = new Map<string, SocialLink[]>();

  const [mediaResult, linksResult] = profileIds.length
    ? await Promise.all([
        supabase
          .from("profile_media")
          .select("profile_id, storage_path, media_type, position")
          .in("profile_id", profileIds)
          .in("position", [0, 1])
          .order("position"),
        supabase
          .from("links")
          .select("id, profile_id, type, url")
          .in("profile_id", profileIds),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (mediaResult.error || linksResult.error) {
    return NextResponse.json(
      { error: mediaResult.error?.message ?? linksResult.error?.message },
      { status: 502 },
    );
  }

  const profileMedia = mediaResult.data as ProfileMedia[];
  const profileLinks = linksResult.data as (SocialLink & {
    profile_id: string;
  })[];

  profileMedia.forEach((media) => {
    const profileMedia = mediaByProfile.get(media.profile_id) ?? [];
    profileMedia.push(media);
    mediaByProfile.set(media.profile_id, profileMedia);
  });

  profileLinks.forEach((link) => {
    const links = linksByProfile.get(link.profile_id) ?? [];
    links.push({ id: link.id, type: link.type, url: link.url });
    linksByProfile.set(link.profile_id, links);
  });

  const profiles = (
    profilesResult.data as Omit<Profile, "uploaded_image" | "hover_media">[]
  ).map((profile) => {
    const profileMedia = mediaByProfile.get(profile.id) ?? [];
    const primaryMedia = profileMedia.find(
      (media) => media.position === 0 && media.media_type === "image",
    );
    const secondaryMedia = profileMedia.find((media) => media.position === 1);

    return {
      ...profile,
      uploaded_image: primaryMedia
        ? supabase.storage
            .from("profile-media")
            .getPublicUrl(primaryMedia.storage_path).data.publicUrl
        : null,
      hover_media: secondaryMedia
        ? {
            type: secondaryMedia.media_type,
            url: supabase.storage
              .from("profile-media")
              .getPublicUrl(secondaryMedia.storage_path).data.publicUrl,
          }
        : null,
      socialLinks: linksByProfile.get(profile.id) ?? [],
    };
  });

  if (redis) {
    try {
      await redis.set(cacheKey, profiles, {
        ex: getProfileCacheTtl(),
      });
    } catch {}
  }

  return NextResponse.json(
    { profiles, hasMore: profiles.length === PROFILE_PAGE_SIZE },
    {
      headers: {
        "Cache-Control": `public, s-maxage=${getProfileCacheTtl()}, stale-while-revalidate=300`,
        "X-Profile-Cache": "MISS",
      },
    },
  );
}
