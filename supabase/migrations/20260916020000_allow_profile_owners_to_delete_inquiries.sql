create policy "Profile owners can delete their inquiries"
  on public.profile_inquiries for delete
  using (profile_id = auth.uid());

notify pgrst, 'reload schema';
