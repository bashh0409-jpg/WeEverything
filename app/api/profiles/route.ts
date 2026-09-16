import { Redis } from "@upstash/redis";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PROFILE_CACHE_KEY = "published-profiles:v1";
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

export async function GET() {
  const redis = getRedis();

  if (redis) {
    try {
      const cachedProfiles = await redis.get<Profile[]>(PROFILE_CACHE_KEY);

      if (cachedProfiles) {
        return NextResponse.json(
          { profiles: cachedProfiles },
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
  const [profilesResult, mediaResult, linksResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, bio, avatar_url, role, location, is_sponsored")
      .eq("is_published", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("profile_media")
      .select("profile_id, storage_path, media_type, position")
      .in("position", [0, 1])
      .order("position"),
    supabase.from("links").select("id, profile_id, type, url"),
  ]);

  if (profilesResult.error || mediaResult.error || linksResult.error) {
    return NextResponse.json(
      {
        error:
          profilesResult.error?.message ??
          mediaResult.error?.message ??
          linksResult.error?.message ??
          "Could not load profiles.",
      },
      { status: 502 },
    );
  }

  const mediaByProfile = new Map<string, ProfileMedia[]>();
  const linksByProfile = new Map<string, SocialLink[]>();

  (mediaResult.data as ProfileMedia[]).forEach((media) => {
    const profileMedia = mediaByProfile.get(media.profile_id) ?? [];
    profileMedia.push(media);
    mediaByProfile.set(media.profile_id, profileMedia);
  });

  (linksResult.data as (SocialLink & { profile_id: string })[]).forEach(
    (link) => {
      const profileLinks = linksByProfile.get(link.profile_id) ?? [];
      profileLinks.push({ id: link.id, type: link.type, url: link.url });
      linksByProfile.set(link.profile_id, profileLinks);
    },
  );

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
      await redis.set(PROFILE_CACHE_KEY, profiles, {
        ex: getProfileCacheTtl(),
      });
    } catch {}
  }

  return NextResponse.json(
    { profiles },
    {
      headers: {
        "Cache-Control": `public, s-maxage=${getProfileCacheTtl()}, stale-while-revalidate=300`,
        "X-Profile-Cache": "MISS",
      },
    },
  );
}
