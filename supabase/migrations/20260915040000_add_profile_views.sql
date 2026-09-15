create table if not exists public.profile_views (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create index if not exists idx_profile_views_profile_id
on public.profile_views (profile_id);

create index if not exists idx_profile_views_viewed_at
on public.profile_views (viewed_at);

alter table public.profile_views enable row level security;

create policy "Published profiles can receive anonymous views"
  on public.profile_views for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = profile_views.profile_id
      and profiles.is_published = true
    )
  );

create policy "Profile owners can view their analytics"
  on public.profile_views for select
  using (profile_id = auth.uid());