alter table public.profiles
add column if not exists handle text;

with profile_handles as (
  select
    profiles.id,
    lower(
      regexp_replace(
        split_part(auth.users.email, '@', 1),
        '[^a-z0-9]+',
        '-',
        'g'
      )
    ) as base_handle
  from public.profiles
  join auth.users on auth.users.id = profiles.id
  where profiles.handle is null
), ranked_handles as (
  select
    id,
    base_handle,
    row_number() over (partition by base_handle order by id) as handle_rank
  from profile_handles
)
update public.profiles
set handle = case
  when ranked_handles.handle_rank = 1 then ranked_handles.base_handle
  else ranked_handles.base_handle || '-' || left(ranked_handles.id::text, 8)
end
from ranked_handles
where profiles.id = ranked_handles.id;

create unique index if not exists idx_profiles_handle
on public.profiles (handle)
where handle is not null;