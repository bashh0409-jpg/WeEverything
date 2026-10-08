alter table public.sponsorship_payments
  add column if not exists promotion_days smallint not null default 30;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.sponsorship_payments'::regclass
      and conname = 'sponsorship_payments_promotion_days_check'
  ) then
    alter table public.sponsorship_payments
      add constraint sponsorship_payments_promotion_days_check
      check (promotion_days in (7, 30, 90));
  end if;
end;
$$;

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
    and paid_at + (promotion_days * interval '24 hours') <= now();

  update public.profiles p
  set is_sponsored = exists (
    select 1
    from public.sponsorship_payments s
    where s.profile_id = p.id
      and s.status = 'paid'
      and s.paid_at is not null
      and s.paid_at + (s.promotion_days * interval '24 hours') > now()
  )
  where p.id is not null;
end;
$$;

create or replace function public.apply_polar_sponsorship_event(
  p_payment_id uuid,
  p_status text,
  p_polar_order_id text,
  p_event_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile_id uuid;
begin
  if p_status not in ('paid', 'refunded', 'expired') then
    raise exception 'Unsupported sponsorship status';
  end if;

  update public.sponsorship_payments
  set
    status = p_status,
    polar_order_id = coalesce(p_polar_order_id, polar_order_id),
    paid_at = case when p_status = 'paid' then p_event_at else paid_at end,
    polar_event_at = p_event_at
  where id = p_payment_id
    and (polar_event_at is null or polar_event_at <= p_event_at)
    and not (status = 'paid' and p_status = 'expired')
  returning profile_id into updated_profile_id;

  if updated_profile_id is null then
    return false;
  end if;

  update public.profiles
  set is_sponsored = exists (
    select 1
    from public.sponsorship_payments
    where profile_id = updated_profile_id
      and status = 'paid'
      and paid_at is not null
      and paid_at + (promotion_days * interval '24 hours') > now()
  )
  where id = updated_profile_id;

  return true;
end;
$$;

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
  p.experience,
  p.created_at,
  exists (
    select 1
    from public.sponsorship_payments s
    where s.profile_id = p.id
      and s.status = 'paid'
      and s.paid_at is not null
      and s.paid_at + (s.promotion_days * interval '24 hours') > now()
  ) as is_sponsored,
  p.custom_sections
from public.profiles p
where p.is_published = true;

update public.profiles p
set is_sponsored = exists (
  select 1
  from public.sponsorship_payments s
  where s.profile_id = p.id
    and s.status = 'paid'
    and s.paid_at is not null
    and s.paid_at + (s.promotion_days * interval '24 hours') > now()
);

notify pgrst, 'reload schema';
