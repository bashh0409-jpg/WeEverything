alter table public.sponsorship_payments
  add column if not exists polar_event_at timestamptz;

create or replace function public.expire_stale_sponsorships()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sponsorship_payments
  set
    status = 'expired',
    polar_event_at = coalesce(polar_event_at, now())
  where status = 'paid'
    and paid_at is not null
    and paid_at < now() - interval '30 days';

  update public.profiles p
  set is_sponsored = exists (
    select 1
    from public.sponsorship_payments s
    where s.profile_id = p.id
      and s.status = 'paid'
      and s.paid_at is not null
      and s.paid_at >= now() - interval '30 days'
  )
  where p.id is not null;
end;
$$;

revoke all on function public.expire_stale_sponsorships()
  from public, anon, authenticated;
grant execute on function public.expire_stale_sponsorships()
  to service_role;
