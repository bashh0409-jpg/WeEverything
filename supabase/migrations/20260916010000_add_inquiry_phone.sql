alter table public.profile_inquiries
add column if not exists sender_phone text;

notify pgrst, 'reload schema';