# Supabase Egress Cost Audit Report

> This report captures the audit baseline before the follow-up optimizations. Since then, profile media uploads have been limited to 8 MB, image requests are deferred until near the viewport, and profile videos use `preload="none"`.

## Executive summary

The strongest evidence shows that the dominant Supabase egress source is not ordinary database row transfer. It is the transfer of large media files from the `profile-media` Supabase Storage bucket to end-user browsers.

The key patterns in this codebase are:

- Published profile metadata is fetched from Supabase Postgres
- Media rows are loaded from `profile_media`
- Signed storage URLs are generated server-side for each media entry
- Those signed URLs are returned to the browser
- Browser clients then download the asset from Supabase Storage directly
- The app also loads multiple pages of profiles and many cards with primary/secondary media
- Some media is video, which is much more expensive than images
- Files can be up to 15 MB per upload
- There is no asset resizing optimization layer before delivery

This is a classic high-egress pattern for Supabase.

## Architecture overview

```text
User
  → Browser / Next.js client app
  → Vercel
  → Supabase Auth (session flow)
  → Supabase Postgres (profile data, links, media metadata)
  → Supabase Storage (`profile-media` bucket) for images/videos
  → Browser downloads signed storage URLs directly from Supabase

Also present:
- Supabase → Vercel server API routes
- Supabase → Browser for public profile data
- Supabase Storage → Browser for signed media assets
- Browser → Supabase Storage for uploads
```

## Tech stack and app structure

This repo is using:

- Next.js App Router
- TypeScript
- Supabase client SDK
- Supabase Storage
- Supabase Auth
- Vercel deployment

Important files reviewed:

- `app/api/profiles/route.ts`
- `app/page.tsx`
- `app/profile/page.tsx`
- `app/components/PersonCard.tsx`
- `app/components/CachedImage.tsx`
- `lib/supabase/client.ts`
- `supabase/migrations/20260915000000_add_profile_media_and_socials.sql`
- `supabase/migrations/20260917020000_harden_public_data_access.sql`

## 1) Supabase database usage and egress risk

### Relevant DB access patterns

The app does issue queries against Postgres, but the DB traffic is not the main egress risk compared to media delivery.

#### 1.1 `published_profiles` fetch

Found in `app/api/profiles/route.ts`.

This route does:

- `.from("published_profiles")`
- `.select("id, handle, name, bio, avatar_url, role, location, awards, experience, is_sponsored")`
- `.order("is_sponsored", { ascending: false })`
- `.order("created_at", { ascending: false })`
- `.range(offset, offset + PROFILE_PAGE_SIZE - 1)`

This is a bounded list, but the frontend loads multiple pages automatically in `app/page.tsx`:

- fetch first page at offset `0`
- continue while `hasMore` is true
- increments offset by `PROFILE_PAGE_SIZE` (`40`)

That means profile directory pages can fetch many profiles sequentially. This is more expensive than a single page fetch, but it is still much smaller than storage egress when media is included.

#### 1.2 `profile_media` fetch

Found in `app/api/profiles/route.ts` and `app/profile/page.tsx`.

This route loads:

- `profile_id`
- `storage_path`
- `media_type`
- `position`

Then it converts those storage paths into signed URLs using:

```ts
admin.storage
  .from("profile-media")
  .createSignedUrl(media.storage_path, MEDIA_URL_TTL_SECONDS);
```

This is a direct storage transfer path.

#### 1.3 `links` query

Also in `app/api/profiles/route.ts`, the app fetches social links and filters unsafe external URLs. This is low-risk relative to media size.

#### 1.4 `profile_views` and other metadata queries

In the profile editing page, queries are done for the current user only, and are generally not large enough to explain a major egress bill by themselves.

#### 1.5 `.select("*")` found in `BottomStrip`

Found in:

- `app/components/BottomStrip.tsx`

This does:

```ts
await supabase.from("events").select("*")
```

This is not the main source of the egress issue, because the table is small and the result is limited to 10 rows:

```ts
.limit(10)
```

It is still worth tightening to explicit columns, but it is not likely to explain a major Supabase bill by itself.

### DB query risk summary

The database queries are not obviously excessive in a way that would create huge egress on their own. The app does some repeated loads, but the real egress risk is from media objects being served from storage.

## 2) Supabase Storage egress: the most likely root cause

### Storage bucket configuration

The relevant migration is:

- `supabase/migrations/20260915000000_add_profile_media_and_socials.sql`

It creates the bucket:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  true,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
```

Later, `supabase/migrations/20260917020000_harden_public_data_access.sql` changes the bucket to `public = false` and adds access policies for owner or published profiles.

### Current media delivery path

The app signs media URLs in `app/api/profiles/route.ts`:

```ts
const { data, error } = await admin.storage
  .from("profile-media")
  .createSignedUrl(media.storage_path, MEDIA_URL_TTL_SECONDS);
```

Then it sends that URL to the browser. The browser downloads it directly from Supabase Storage.

This is exactly the type of asset transfer that registers as storage egress.

### Why this matters

The app is serving portfolio images and optional hover media for each profile. The payload is not just a tiny icon; it can be multi-megabyte media. If a page loads 20–60 profiles, the browser can fetch many large files.

Even after the first request, browser cache helps somewhat, but repeated page views and sessions can still drive consistent egress.

## 3) Image and video file characteristics

### File upload validation

In `app/profile/page.tsx`:

```ts
const MAX_MEDIA_BYTES = 15 * 1024 * 1024;
const acceptedMediaTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "video/mp4",
  "video/webm",
];
```

And:

```ts
if (file.size > MAX_MEDIA_BYTES) {
  setMessage("Media files must be 15 MB or smaller.");
  return;
}
```

This means the system allows up to 15 MB per asset, which is large enough to cause meaningful transfer cost when many users browse profiles.

### File types in use

- images: JPG, PNG, WebP, AVIF
- video: MP4, WebM

This is a high-cost combination because browser gallery pages can include both still images and videos. Video, especially, is much more expensive than still images.

## 4) Homepage profile directory is a multiplier

The directory page in `app/page.tsx` does this:

```ts
const fetchProfilePage = async (offset: number) => {
  const response = await fetch(`/api/profiles?offset=${offset}`, {
    cache: "no-store",
  });
  ...
};
```

Then it loops:

```ts
while (hasMore && isMounted) {
  const nextPage = await fetchProfilePage(offset);
  ...
  offset += PROFILE_PAGE_SIZE;
}
```

So the browser can fetch many pages of profile data. Every profile can include:

- `uploaded_image`
- `hover_media`
- `avatar_url`

That means a single user session may cause many downloaded bytes from Supabase Storage.

## 5) Image delivery pattern

### Direct image path

`app/components/CachedImage.tsx`:

```tsx
return <img src={imageUrl} alt={alt} className={className} />;
```

`app/components/PersonCard.tsx`:

```tsx
<video src={hoverMedia.url} ... />
```

This is raw browser delivery of signed file URLs. No transform step, no resize, no CDN optimization. That is the direct egress path.

### Browser cache wrapper does not reduce first transfer cost

`CachedImage.tsx` caches downloaded images in the browser cache, but only after the first fetch. This is good UX, but it does not eliminate the initial Supabase egress.

## 6) What is likely contributing most to the bill

Based on the code, the largest contributors are likely:

1. Large profile images in `profile-media`
2. Secondary hover media, including video
3. Many published profiles being loaded per session
4. Signed URLs generated for each profile card
5. Large media files that are not resized before upload
6. Raw browser delivery without a transformation or CDN optimization layer

## 7) What is not the main issue

These are not the primary explanations for a large Supabase bill:

- Normal auth session logic
- Basic profile row reads
- Small social link queries
- The events strip query with `.limit(10)`

These can be cleaned up and tightened, but they are not the likely dominant source of wasted egress.

## 8) Best realistic remediation options

### Option A: Reduce asset size before upload

Most effective, lowest risk.

Actions:

- Resize profile images to a tighter max dimension (for example 1200px or less)
- Convert to WebP/JPEG before upload
- Keep video previews tiny or avoid full-size hover videos
- Lower the 15 MB limit substantially

### Option B: Do not prefetch all profile media at once

Current homepage behavior is too broad.

Action:

- Load media only for currently visible cards
- Lazy-load images/videos when they enter view
- Do not generate signed URLs for every profile in the directory at once

### Option C: Replace raw original media with generated thumbnails

Use:

- a CDN image pipeline
- a thumbnail bucket
- optimized variants for cards and hover state

This reduces transfer size and improves page performance.

### Option D: Use a public CDN or caching layer for non-sensitive images

If public portfolio images are acceptable to render without signed URLs, a CDN can reduce the egress load on Supabase.

### Option E: Keep video to a small preview only

Video is a major cost multiplier.

Action:

- use a static poster image instead of autoplay video preview
- or generate a very small MP4/WebM preview

### Option F: Tighten query payloads

This is worth doing, but it is secondary.

Action:

- avoid `.select("*")` when possible
- select only required columns
- keep pagination bounded

## 9) Recommended priority order

1. Reduce media sizes and limits on upload
2. Stop loading full profile media for all cards at once
3. Replace hover video with poster or lightweight preview
4. Store and serve optimized thumbnails rather than original files
5. Consider moving static/public images to a CDN
6. Tighten query payloads and remove broad selects

## 10) Final conclusion

The most plausible explanation for the unexpected Supabase egress bill is the direct delivery of user-uploaded portfolio media from the `profile-media` bucket to browser clients via signed URLs.

This app is not merely reading metadata from Postgres. It is actively sending large image and video files from Supabase Storage to end users as part of the profile directory and profile gallery experience.

The likely main offender is the combination of:

- large uploaded media files,
- multiple profile cards loaded per page,
- hover video previews,
- raw storage URLs,
- no optimization pipeline.

This is the pattern most likely to generate a substantial egress bill.

## Appendix: key code references

- `app/api/profiles/route.ts` — fetches published profiles and signs media URLs
- `app/page.tsx` — loads multiple profile pages and includes media in the UI payload
- `app/components/PersonCard.tsx` — renders raw image/video media
- `app/components/CachedImage.tsx` — browser-side image cache wrapper
- `app/profile/page.tsx` — uploads media files and creates signed URLs
- `supabase/migrations/20260915000000_add_profile_media_and_socials.sql` — stores media in `profile-media` with 15 MB limit
- `supabase/migrations/20260917020000_harden_public_data_access.sql` — tightens access and confirms private bucket rules
