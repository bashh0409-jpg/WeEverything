# WeEverything

WeEverything is a directory for creative professionals to publish a profile,
showcase work, and receive project inquiries.

## Local development

Use Node.js 20.9 or newer.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Add the local Supabase, Upstash, and Turnstile settings to `.env.local` before
testing sign-in, profile APIs, or inquiry submissions. Never commit `.env.local`
or production credentials.

## Validation

```bash
npm run lint
npm run typecheck
npx playwright install chromium
npm run test:e2e
npm run build
```

The Playwright suite starts a production build automatically. Set
`PLAYWRIGHT_PORT` to use another available local port.

## First-launch checklist

### Vercel

- Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin for the production
  deployment.
- Set the required Supabase, Upstash, and Cloudflare Turnstile variables from
  `.env.example` in the production environment. Keep service-role, cron,
  webhook, and provider secrets server-only.
- Configure the Resend sender address with a verified domain if email
  notifications should be delivered.
- Add Polar production credentials and confirm the webhook endpoint is
  `https://<your-domain>/api/webhooks/polar`.
- Verify the scheduled `/api/account/purge` cron is present after deployment.
- Run the GitHub Actions CI workflow and confirm the production build and
  browser smoke test pass.

### Supabase and provider dashboards

- Apply and verify all reviewed migrations, including the profile-media bucket
  configuration, RLS policies, and latest schema changes. Confirm the
  `profile-media` bucket allows QuickTime videos if `.mov` uploads are enabled.
- Set the Supabase Auth site URL and redirect allowlist for the production
  domain and any intended preview domains.
- Allow the production domain in Cloudflare Turnstile and set its matching
  public and secret keys.
- In Polar, use the production product/token and configure the webhook secret
  from that exact endpoint. Enable the `order.paid`, `order.refunded`, and
  `checkout.expired` events.
- Verify the Resend sender domain and delivery before relying on inquiry
  notifications.

### Production smoke test

- Sign in and complete a profile; publish it and verify its public profile and
  media.
- Submit an inquiry from a different account and verify both persistence and
  owner notification.
- Test sponsorship with a low-value production checkout, then verify its paid
  state, expiry, and refund handling.
- Confirm scheduled account deletion is authenticated and runs as configured.
- Check the live site on mobile and desktop, including consent controls,
  directory search, links, and error states.

Do not run production payment, deletion, or migration actions until their
provider configuration and the intended target project have been confirmed.