alter table public.profiles
add column if not exists is_sponsored boolean not null default false;

update public.profiles
set is_sponsored = true
where exists (
  select 1
  from public.sponsorship_payments
  where sponsorship_payments.profile_id = profiles.id
  and sponsorship_payments.status = 'paid'
);