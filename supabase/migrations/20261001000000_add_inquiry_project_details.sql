alter table public.profile_inquiries
  add column if not exists project_type text,
  add column if not exists company_name text;