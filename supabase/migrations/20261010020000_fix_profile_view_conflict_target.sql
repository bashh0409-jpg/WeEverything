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
  if $2 is null or $2 !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid profile view visitor hash';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = $1
      and is_published = true
  ) then
    return false;
  end if;

  insert into public.profile_view_visitors (
    profile_id,
    visitor_hash,
    last_viewed_at
  )
  values ($1, $2, now())
  on conflict on constraint profile_view_visitors_pkey do update
    set last_viewed_at = excluded.last_viewed_at
    where public.profile_view_visitors.last_viewed_at
      <= excluded.last_viewed_at - interval '24 hours';

  if not found then
    return false;
  end if;

  insert into public.profile_views (profile_id)
  values ($1);

  delete from public.profile_view_visitors
  where profile_id = $1
    and last_viewed_at <= now() - interval '24 hours';

  return true;
end;
$$;

revoke all on function public.record_profile_view(uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_profile_view(uuid, text)
  to service_role;
