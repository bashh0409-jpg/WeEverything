Created 3 of 4 detected sources in PostHog.

# PostHog Data Warehouse Setup

## Changes made

- Connected **Supabase** and selected 10 `public` schema tables:
  - Incremental: `events`, `links`, `profile_inquiries`, `profile_media`, `profile_views`, `profiles`, `published_profiles`, `sponsorship_payments`
  - Full refresh: `profile_tags`, `tags`
- Connected **Resend** with the default full-refresh resources: `audiences`, `broadcasts`, `domains`, `emails`, and `contacts`.
- Connected **Upstash** with the default full-refresh resources: `redis_databases`, `redis_stats`, `teams`, `vector_indexes`, and `audit_logs`.
- **Polar** was not created because both supplied Organization Access Tokens were rejected as invalid or expired.
- No application source code or environment files were changed.

## Files created

- `posthog-warehouse-report.md` — this setup report.

## Manual next step

Generate a new Polar Organization Access Token with `benefits:read`, `checkouts:read`, `customers:read`, `orders:read`, `organizations:read`, `products:read`, `refunds:read`, and `subscriptions:read`, then finish the connection in PostHog:

- [Connect Polar in PostHog](https://us.i.posthog.com/project/438460/data-warehouse/new-source?kind=Polar&utm_source=wizard&utm_campaign=warehouse-source)
