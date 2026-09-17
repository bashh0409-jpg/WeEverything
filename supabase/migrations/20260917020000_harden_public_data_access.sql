-- Keep private media private until its owner explicitly publishes a profile.
update storage.buckets
set public = false,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/avif',
      'video/mp4', 'video/webm'
    ]
where id = 'profile-media';

drop policy if exists "Users can view profile media files" on storage.objects;

create policy "Profile media is readable by its owner or when published"
  on storage.objects for select
  using (
    bucket_id = 'profile-media'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.profile_media
        join public.profiles on profiles.id = profile_media.profile_id
        where profile_media.storage_path = storage.objects.name
          and profiles.is_published = true
      )
    )
  );

drop policy if exists "Users can add their own profile media" on public.profile_media;
create policy "Users can add their own profile media"
  on public.profile_media for insert
  with check (
    profile_id = auth.uid()
    and (storage.foldername(storage_path))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own profile media" on public.profile_media;
create policy "Users can update their own profile media"
  on public.profile_media for update
  using (profile_id = auth.uid())
  with check (
    profile_id = auth.uid()
    and (storage.foldername(storage_path))[1] = auth.uid()::text
  );

-- Do not expose service-controlled fields through Supabase's public API.
revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to anon, authenticated;
grant insert (id, handle, name, role, bio, avatar_url, location, is_published, awards)
  on public.profiles to authenticated;
grant update (handle, name, role, bio, avatar_url, location, is_published, awards)
  on public.profiles to authenticated;

alter policy "Users can update their own profile" on public.profiles
  with check (
    auth.uid() = id
    and (deletion_scheduled_at is null or is_published = false)
  );

-- Sponsorship state may only be created or changed by trusted server code.
revoke all on public.sponsorship_payments from anon;
revoke insert, update, delete on public.sponsorship_payments from authenticated;
grant select on public.sponsorship_payments to authenticated;
drop policy if exists "Users can create their sponsorship payments"
  on public.sponsorship_payments;

alter table public.sponsorship_payments
  add column if not exists polar_event_at timestamptz;

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
  )
  where id = updated_profile_id;

  return true;
end;
$$;

revoke all on function public.apply_polar_sponsorship_event(uuid, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.apply_polar_sponsorship_event(uuid, text, text, timestamptz)
  to service_role;

-- Public callers must go through the protected inquiry endpoint.
revoke all on public.profile_inquiries from anon;
revoke insert on public.profile_inquiries from authenticated;
grant select, update, delete on public.profile_inquiries to authenticated;
drop policy if exists "Anyone can send a profile inquiry" on public.profile_inquiries;

-- View counts are not trustworthy when users can write them directly.
revoke all on public.profile_views from anon;
revoke insert, update, delete on public.profile_views from authenticated;
grant select on public.profile_views to authenticated;
drop policy if exists "Published profiles can receive anonymous views" on public.profile_views;

-- Tags are currently not used by the product, so do not leave a public spam write.
revoke insert, update, delete on public.tags from anon, authenticated;
drop policy if exists "Authenticated users can add tags" on public.tags;

-- Enforce safe bounds for new or changed profile data without invalidating legacy rows.
alter table public.profiles
  add constraint profiles_name_length_check
    check (char_length(name) between 1 and 120) not valid,
  add constraint profiles_role_length_check
    check (char_length(role) between 1 and 300) not valid,
  add constraint profiles_bio_length_check
    check (bio is null or char_length(bio) <= 5000) not valid,
  add constraint profiles_location_length_check
    check (location is null or char_length(location) <= 120) not valid,
  add constraint profiles_awards_length_check
    check (awards is null or char_length(awards) <= 4000) not valid,
  add constraint profiles_avatar_url_check
    check (
      avatar_url is null
      or (char_length(avatar_url) <= 2048 and avatar_url ~* '^https://')
    ) not valid;

alter table public.links
  add constraint links_safe_url_check
    check (
      char_length(url) <= 2048
      and url ~* '^(https://|mailto:)'
    ) not valid;
