## Environment

Set these server-side variables to enable the shared profile cache:

```bash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
PROFILE_CACHE_TTL_SECONDS=3600

# Inquiry protection
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET_KEY=...
```

Inquiry submissions are limited to 5 per IP address per hour through Upstash
Redis. Configure the Cloudflare Turnstile site and secret keys to require
CAPTCHA verification in production.

Create a Redis database in Upstash and copy the REST URL and token into your local `.env.local` and Vercel project settings. Profile data is cached for one hour by default; adjust `PROFILE_CACHE_TTL_SECONDS` when needed. The profiles API falls back to Supabase when Redis is unavailable.
