create table public.profile_inquiries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sender_name text not null,
  sender_email text not null,
  project_brief text not null,
  budget text,
  timeline text,
  created_at timestamptz not null default now()
);

alter table public.profile_inquiries enable row level security;

create policy "Anyone can send a profile inquiry"
  on public.profile_inquiries for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = profile_inquiries.profile_id
      and profiles.is_published = true
    )
  );

create policy "Profile owners can view their inquiries"
  on public.profile_inquiries for select
  using (profile_id = auth.uid());