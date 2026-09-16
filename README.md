## Environment

Set these server-side variables to enable the shared profile cache:

```bash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

Create a Redis database in Upstash and copy the REST URL and token into your local `.env.local` and Vercel project settings. The profiles API falls back to Supabase when Redis is unavailable.
