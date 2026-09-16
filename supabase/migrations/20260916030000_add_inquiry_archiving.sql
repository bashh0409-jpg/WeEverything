alter table public.profile_inquiries
add column if not exists archived_at timestamptz;

create policy "Profile owners can archive their inquiries"
  on public.profile_inquiries for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

notify pgrst, 'reload schema';
