alter table public.profiles
add column if not exists awards text;

notify pgrst, 'reload schema';