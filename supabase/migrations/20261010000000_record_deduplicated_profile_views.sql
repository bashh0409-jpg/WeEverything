create table if not exists public.profile_view_visitors (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  visitor_hash text not null,
  last_viewed_at timestamptz not null default now(),
  primary key (profile_id, visitor_hash),
  constraint profile_view_visitors_hash_check
    check (visitor_hash ~ '^[0-9a-f]{64}$')
);

alter table public.profile_view_visitors enable row level security;
revoke all on public.profile_view_visitors from public, anon, authenticated;

create or replace function public.record_profile_view(
  target_profile_id uuid,
  visitor_hash text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if visitor_hash is null or visitor_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid profile view visitor hash';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = target_profile_id
      and is_published = true
  ) then
    return false;
  end if;

  insert into public.profile_view_visitors (
    profile_id,
    visitor_hash,
    last_viewed_at
  )
  values (target_profile_id, visitor_hash, now())
  on conflict (profile_id, visitor_hash) do update
    set last_viewed_at = excluded.last_viewed_at
    where public.profile_view_visitors.last_viewed_at
      <= excluded.last_viewed_at - interval '24 hours';

  if not found then
    return false;
  end if;

  insert into public.profile_views (profile_id)
  values (target_profile_id);

  delete from public.profile_view_visitors
  where profile_id = target_profile_id
    and last_viewed_at <= now() - interval '24 hours';

  return true;
end;
$$;

revoke all on function public.record_profile_view(uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_profile_view(uuid, text)
  to service_role;
