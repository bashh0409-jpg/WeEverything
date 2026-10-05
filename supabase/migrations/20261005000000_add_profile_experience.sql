alter table public.profiles
  add column if not exists experience text;

alter table public.profiles
  add constraint profiles_experience_length_check
    check (experience is null or char_length(experience) <= 4000) not valid;

grant insert (id, handle, name, role, bio, avatar_url, location, is_published, awards, experience)
  on public.profiles to authenticated;
grant update (handle, name, role, bio, avatar_url, location, is_published, awards, experience)
  on public.profiles to authenticated;

drop view if exists public.published_profiles;

create view public.published_profiles
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
      and s.paid_at >= now() - interval '30 days'
  ) as is_sponsored
from public.profiles p
where p.is_published = true;

notify pgrst, 'reload schema';
