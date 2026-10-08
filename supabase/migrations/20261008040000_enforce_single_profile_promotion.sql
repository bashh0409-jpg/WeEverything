-- Reconcile historical rows before adding the active-state constraint. The
-- checkout endpoint repeats this reconciliation before every new checkout.
select public.expire_stale_sponsorships();

-- A profile may have one checkout that can still grant promotion. Expired
-- payments are moved out of this index before a new checkout is created.
create unique index if not exists idx_sponsorship_payments_one_open_or_active_profile
  on public.sponsorship_payments (profile_id)
  where status in ('pending', 'paid');
