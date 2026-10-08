alter table public.profiles
add column if not exists deletion_previous_is_published boolean;
