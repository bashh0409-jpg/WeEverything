create or replace function public.webauthn_mfa_aal_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    not exists (
      select 1
      from auth.mfa_factors
      where user_id = (select auth.uid())
        and status = 'verified'
    )
    or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2';
$$;

revoke all on function public.webauthn_mfa_aal_satisfied()
  from public, anon;
grant execute on function public.webauthn_mfa_aal_satisfied()
  to authenticated;

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (
    auth.uid() = id
    and public.webauthn_mfa_aal_satisfied()
  );

drop policy if exists "Public profiles are viewable by everyone"
  on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (
    is_published = true
    or (
      auth.uid() = id
      and public.webauthn_mfa_aal_satisfied()
    )
  );

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (
    auth.uid() = id
    and public.webauthn_mfa_aal_satisfied()
  )
  with check (
    auth.uid() = id
    and public.webauthn_mfa_aal_satisfied()
    and (deletion_scheduled_at is null or is_published = false)
  );

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
  on public.profiles for delete
  using (
    auth.uid() = id
    and public.webauthn_mfa_aal_satisfied()
  );

drop policy if exists "Links are viewable with their profile" on public.links;
create policy "Links are viewable with their profile"
  on public.links for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = links.profile_id
        and (
          profiles.is_published = true
          or (
            profiles.id = auth.uid()
            and public.webauthn_mfa_aal_satisfied()
          )
        )
    )
  );

drop policy if exists "Users manage their own links" on public.links;
create policy "Users manage their own links"
  on public.links for insert
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = links.profile_id
        and profiles.id = auth.uid()
        and public.webauthn_mfa_aal_satisfied()
    )
  );

drop policy if exists "Users update their own links" on public.links;
create policy "Users update their own links"
  on public.links for update
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = links.profile_id
        and profiles.id = auth.uid()
        and public.webauthn_mfa_aal_satisfied()
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = links.profile_id
        and profiles.id = auth.uid()
        and public.webauthn_mfa_aal_satisfied()
    )
  );

drop policy if exists "Users delete their own links" on public.links;
create policy "Users delete their own links"
  on public.links for delete
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = links.profile_id
        and profiles.id = auth.uid()
        and public.webauthn_mfa_aal_satisfied()
    )
  );

drop policy if exists "profile_tags viewable with their profile"
  on public.profile_tags;
create policy "profile_tags viewable with their profile"
  on public.profile_tags for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = profile_tags.profile_id
        and (
          profiles.is_published = true
          or (
            profiles.id = auth.uid()
            and public.webauthn_mfa_aal_satisfied()
          )
        )
    )
  );

drop policy if exists "Users manage their own tags" on public.profile_tags;
create policy "Users manage their own tags"
  on public.profile_tags for insert
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = profile_tags.profile_id
        and profiles.id = auth.uid()
        and public.webauthn_mfa_aal_satisfied()
    )
  );

drop policy if exists "Users delete their own tags" on public.profile_tags;
create policy "Users delete their own tags"
  on public.profile_tags for delete
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = profile_tags.profile_id
        and profiles.id = auth.uid()
        and public.webauthn_mfa_aal_satisfied()
    )
  );

drop policy if exists "Profile media is visible with its profile"
  on public.profile_media;
create policy "Profile media is visible with its profile"
  on public.profile_media for select
  using (
    (
      profile_id = auth.uid()
      and public.webauthn_mfa_aal_satisfied()
    )
    or exists (
      select 1
      from public.profiles
      where profiles.id = profile_media.profile_id
        and profiles.is_published = true
    )
  );

drop policy if exists "Users can add their own profile media"
  on public.profile_media;
create policy "Users can add their own profile media"
  on public.profile_media for insert
  with check (
    profile_id = auth.uid()
    and public.webauthn_mfa_aal_satisfied()
    and (storage.foldername(storage_path))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own profile media"
  on public.profile_media;
create policy "Users can update their own profile media"
  on public.profile_media for update
  using (
    profile_id = auth.uid()
    and public.webauthn_mfa_aal_satisfied()
  )
  with check (
    profile_id = auth.uid()
    and public.webauthn_mfa_aal_satisfied()
    and (storage.foldername(storage_path))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own profile media"
  on public.profile_media;
create policy "Users can delete their own profile media"
  on public.profile_media for delete
  using (
    profile_id = auth.uid()
    and public.webauthn_mfa_aal_satisfied()
  );

drop policy if exists "Profile media is readable by its owner or when published"
  on storage.objects;
create policy "Profile media is readable by its owner or when published"
  on storage.objects for select
  using (
    bucket_id = 'profile-media'
    and (
      (
        (storage.foldername(name))[1] = auth.uid()::text
        and public.webauthn_mfa_aal_satisfied()
      )
      or exists (
        select 1
        from public.profile_media
        join public.profiles on profiles.id = profile_media.profile_id
        where profile_media.storage_path = storage.objects.name
          and profiles.is_published = true
      )
    )
  );

drop policy if exists "Users can upload their own profile media files"
  on storage.objects;
create policy "Users can upload their own profile media files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.webauthn_mfa_aal_satisfied()
  );

drop policy if exists "Users can delete their own profile media files"
  on storage.objects;
create policy "Users can delete their own profile media files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.webauthn_mfa_aal_satisfied()
  );

drop policy if exists "Profile owners can view their inquiries"
  on public.profile_inquiries;
create policy "Profile owners can view their inquiries"
  on public.profile_inquiries for select
  using (
    profile_id = auth.uid()
    and public.webauthn_mfa_aal_satisfied()
  );

drop policy if exists "Profile owners can archive their inquiries"
  on public.profile_inquiries;
create policy "Profile owners can archive their inquiries"
  on public.profile_inquiries for update
  using (
    profile_id = auth.uid()
    and public.webauthn_mfa_aal_satisfied()
  )
  with check (
    profile_id = auth.uid()
    and public.webauthn_mfa_aal_satisfied()
  );

drop policy if exists "Profile owners can delete their inquiries"
  on public.profile_inquiries;
create policy "Profile owners can delete their inquiries"
  on public.profile_inquiries for delete
  using (
    profile_id = auth.uid()
    and public.webauthn_mfa_aal_satisfied()
  );

drop policy if exists "Users can view their sponsorship payments"
  on public.sponsorship_payments;
create policy "Users can view their sponsorship payments"
  on public.sponsorship_payments for select
  using (
    user_id = auth.uid()
    and public.webauthn_mfa_aal_satisfied()
  );

drop policy if exists "Profile owners can view their analytics"
  on public.profile_views;
create policy "Profile owners can view their analytics"
  on public.profile_views for select
  using (
    profile_id = auth.uid()
    and public.webauthn_mfa_aal_satisfied()
  );
