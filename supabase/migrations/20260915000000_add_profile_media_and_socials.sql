create table public.profile_media (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  position smallint not null check (position in (0, 1)),
  created_at timestamptz not null default now(),
  unique (profile_id, position)
);

alter table public.profile_media enable row level security;

create policy "Profile media is visible with its profile"
  on public.profile_media for select
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where profiles.id = profile_media.profile_id
      and profiles.is_published = true
    )
  );

create policy "Users can add their own profile media"
  on public.profile_media for insert
  with check (profile_id = auth.uid());

create policy "Users can update their own profile media"
  on public.profile_media for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "Users can delete their own profile media"
  on public.profile_media for delete
  using (profile_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  true,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can view profile media files"
  on storage.objects for select
  using (bucket_id = 'profile-media');

create policy "Users can upload their own profile media files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own profile media files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

alter table public.links drop constraint if exists links_type_check;

alter table public.links add constraint links_type_check check (
  type in (
    'portfolio', 'github', 'dribbble', 'behance', 'linkedin', 'instagram',
    'discord', 'facebook', 'youtube', 'tiktok', 'x', 'threads', 'other'
  )
);
