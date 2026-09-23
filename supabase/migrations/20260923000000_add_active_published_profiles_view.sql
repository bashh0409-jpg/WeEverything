-- The public directory must not need to update payments in order to expire a
-- sponsorship. Derive the active state from the authoritative payment time
-- instead, so a sponsorship stops ranking at the 30-day boundary.
create index if not exists idx_sponsorship_payments_active_profile
  on public.sponsorship_payments (profile_id, paid_at desc)
  where status = 'paid' and paid_at is not null;

create or replace view public.published_profiles
with (security_invoker = true)
as
select
  p.id,
  p.handle,
  p.name,
  p.bio,
  p.avatar_url,
  p.role,
  p.location,
  p.awards,
  p.created_at,
  exists (
    select 1
    from public.sponsorship_payments s
    where s.profile_id = p.id
      and s.status = 'paid'
      and s.paid_at is not null
      and s.paid_at >= now() - interval '30 days'
  ) as is_sponsored
from public.profiles p
where p.is_published = true;

revoke all on public.published_profiles from public, anon, authenticated;
