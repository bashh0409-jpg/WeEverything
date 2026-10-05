alter table public.profiles
  add column if not exists custom_sections jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_custom_sections_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_custom_sections_check
        check (
          case
            when jsonb_typeof(custom_sections) = 'array' then
              jsonb_array_length(custom_sections) <= 5
              and octet_length(custom_sections::text) <= 10000
            else false
          end
        ) not valid;
  end if;
end;
$$;

grant insert (
  id, handle, name, role, bio, avatar_url, location, is_published, awards,
  experience, custom_sections
) on public.profiles to authenticated;
grant update (
  handle, name, role, bio, avatar_url, location, is_published, awards,
  experience, custom_sections
) on public.profiles to authenticated;

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
      and s.paid_at >= now() - interval '30 days'
  ) as is_sponsored,
  p.custom_sections
from public.profiles p
where p.is_published = true;

notify pgrst, 'reload schema';
