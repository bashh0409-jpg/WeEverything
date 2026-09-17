-- Profiles: one row per user, tied to Supabase auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null,
  bio text,
  avatar_url text,
  location text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Links: one-to-many, separate table so we can query/filter by type later
create table links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('portfolio', 'github', 'linkedin', 'instagram', 'dribbble', 'behance', 'awwwards', 'discord', 'facebook', 'youtube', 'tiktok', 'x', 'threads', 'email', 'other')),
  url text not null,
  created_at timestamptz not null default now()
);

-- Tags: normalized lookup table, avoids duplicate/typo'd tag strings across profiles
create table tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- Join table: many-to-many between profiles and tags
create table profile_tags (
  profile_id uuid not null references profiles(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (profile_id, tag_id)
);

-- Indexes: directory page filters on is_published constantly, and joins on these FKs happen every query
create index idx_profiles_is_published on profiles (is_published) where is_published = true;
create index idx_links_profile_id on links (profile_id);
create index idx_profile_tags_tag_id on profile_tags (tag_id);
create index idx_profile_tags_profile_id on profile_tags (profile_id);

-- updated_at auto-bump on any profile edit
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row
  execute function set_updated_at();

  -- Row Level Security
alter table profiles enable row level security;
alter table links enable row level security;
alter table profile_tags enable row level security;

-- Profiles: public can read published rows; owner can read/write their own regardless of publish state
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using (is_published = true or auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users can delete their own profile"
  on profiles for delete
  using (auth.uid() = id);

-- Links: readable if parent profile is published or owned; writable only by the profile owner
create policy "Links are viewable with their profile"
  on links for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = links.profile_id
      and (profiles.is_published = true or profiles.id = auth.uid())
    )
  );

create policy "Users manage their own links"
  on links for insert with check (
    exists (select 1 from profiles where id = profile_id and id = auth.uid())
  );

create policy "Users update their own links"
  on links for update using (
    exists (select 1 from profiles where id = profile_id and id = auth.uid())
  );

create policy "Users delete their own links"
  on links for delete using (
    exists (select 1 from profiles where id = profile_id and id = auth.uid())
  );

-- profile_tags: same ownership pattern
create policy "profile_tags viewable with their profile"
  on profile_tags for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = profile_tags.profile_id
      and (profiles.is_published = true or profiles.id = auth.uid())
    )
  );

create policy "Users manage their own tags"
  on profile_tags for insert with check (
    exists (select 1 from profiles where id = profile_id and id = auth.uid())
  );

create policy "Users delete their own tags"
  on profile_tags for delete using (
    exists (select 1 from profiles where id = profile_id and id = auth.uid())
  );

-- Tags table itself: readable by everyone (needed for autocomplete/filter UI), writable by anyone authenticated (so new tags can be created on the fly)
alter table tags enable row level security;

create policy "Tags are public"
  on tags for select
  using (true);

create policy "Authenticated users can add tags"
  on tags for insert
  with check (auth.role() = 'authenticated');