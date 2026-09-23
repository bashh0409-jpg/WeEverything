import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isSafeExternalUrl } from "@/lib/safe-url";

export const dynamic = "force-dynamic";

const PROFILE_PAGE_SIZE = 40;
const MEDIA_URL_TTL_SECONDS = 5 * 60;
const MAX_PROFILE_OFFSET = 10_000;

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

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const profileId = url.searchParams.get("profile");
  const requestedOffset = Number(url.searchParams.get("offset") ?? "0");
  const offset =
    Number.isInteger(requestedOffset) && requestedOffset >= 0
      ? requestedOffset
      : 0;

  if (
    (profileId && profileId.length > 100) ||
    (!profileId && offset > MAX_PROFILE_OFFSET)
  ) {
    return NextResponse.json(
      { error: "Invalid profile target." },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Profiles are not configured yet." },
      { status: 503, headers: noStoreHeaders },
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let profilesQuery = admin
    .from("published_profiles")
    .select(
      "id, handle, name, bio, avatar_url, role, location, awards, is_sponsored",
    )
    .order("is_sponsored", { ascending: false })
    .order("created_at", { ascending: false });

  if (profileId) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        profileId,
      );

    profilesQuery = isUuid
      ? profilesQuery.eq("id", profileId)
      : profilesQuery.eq("handle", profileId.trim().toLowerCase());
  }

  const profilesResult = await profilesQuery.range(
    profileId ? 0 : offset,
    profileId ? 0 : offset + PROFILE_PAGE_SIZE - 1,
  );

  if (profilesResult.error) {
    console.error("Could not load published profiles", profilesResult.error);
    return NextResponse.json(
      { error: "Could not load profiles." },
      { status: 502, headers: noStoreHeaders },
    );
  }

  const profileIds = (profilesResult.data as { id: string }[]).map(
    (profile) => profile.id,
  );
  const [mediaResult, linksResult] = profileIds.length
    ? await Promise.all([
        admin
          .from("profile_media")
          .select("profile_id, storage_path, media_type, position")
          .in("profile_id", profileIds)
          .in("position", [0, 1])
          .order("position"),
        admin
          .from("links")
          .select("id, profile_id, type, url")
          .in("profile_id", profileIds),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (mediaResult.error || linksResult.error) {
    console.error("Could not load published profile details", {
      mediaError: mediaResult.error,
      linksError: linksResult.error,
    });
    return NextResponse.json(
      { error: "Could not load profiles." },
      { status: 502, headers: noStoreHeaders },
    );
  }

  const profileMedia = mediaResult.data as ProfileMedia[];
  const profileLinks = linksResult.data as (SocialLink & {
    profile_id: string;
  })[];
  const signedMediaUrls = new Map(
    (
      await Promise.all(
        profileMedia.map(async (media) => {
          const { data, error } = await admin.storage
            .from("profile-media")
            .createSignedUrl(media.storage_path, MEDIA_URL_TTL_SECONDS);

          if (error || !data?.signedUrl) {
            console.error("Could not sign published profile media", error);
            return null;
          }

          return [media.storage_path, data.signedUrl] as const;
        }),
      )
    ).filter((entry): entry is readonly [string, string] => entry !== null),
  );
  const mediaByProfile = new Map<string, ProfileMedia[]>();
  const linksByProfile = new Map<string, SocialLink[]>();

  profileMedia.forEach((media) => {
    if (!signedMediaUrls.has(media.storage_path)) return;
    const mediaForProfile = mediaByProfile.get(media.profile_id) ?? [];
    mediaForProfile.push(media);
    mediaByProfile.set(media.profile_id, mediaForProfile);
  });

  profileLinks.forEach((link) => {
    if (!isSafeExternalUrl(link.url)) return;
    const links = linksByProfile.get(link.profile_id) ?? [];
    links.push({ id: link.id, type: link.type, url: link.url });
    linksByProfile.set(link.profile_id, links);
  });

  const profiles = (
    profilesResult.data as Omit<Profile, "uploaded_image" | "hover_media">[]
  ).map((profile) => {
    const mediaForProfile = mediaByProfile.get(profile.id) ?? [];
    const primaryMedia = mediaForProfile.find(
      (media) => media.position === 0 && media.media_type === "image",
    );
    const secondaryMedia = mediaForProfile.find(
      (media) => media.position === 1,
    );

    return {
      ...profile,
      avatar_url: isSafeExternalUrl(profile.avatar_url ?? "")
        ? profile.avatar_url
        : null,
      uploaded_image: primaryMedia
        ? (signedMediaUrls.get(primaryMedia.storage_path) ?? null)
        : null,
      hover_media: secondaryMedia
        ? {
            type: secondaryMedia.media_type,
            url: signedMediaUrls.get(secondaryMedia.storage_path) ?? "",
          }
        : null,
      socialLinks: linksByProfile.get(profile.id) ?? [],
    };
  });

  return NextResponse.json(
    { profiles, hasMore: !profileId && profiles.length === PROFILE_PAGE_SIZE },
    { headers: noStoreHeaders },
  );
}
