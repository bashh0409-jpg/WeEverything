alter table public.profiles
add column if not exists deletion_scheduled_at timestamptz;

create index if not exists idx_profiles_deletion_scheduled_at
on public.profiles (deletion_scheduled_at)
where deletion_scheduled_at is not null;