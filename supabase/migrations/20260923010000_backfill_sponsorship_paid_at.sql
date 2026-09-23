-- A paid payment without a paid_at value cannot be ranked or expired safely.
-- Repair historical rows, then guarantee the timestamp for every future paid
-- status transition, including payment updates from a webhook.
update public.sponsorship_payments
set paid_at = coalesce(polar_event_at, updated_at, created_at)
where status = 'paid'
  and paid_at is null;

create or replace function public.set_sponsorship_paid_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'paid' and new.paid_at is null then
    new.paid_at = coalesce(new.polar_event_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sponsorship_payments_paid_at
  on public.sponsorship_payments;

create trigger trg_sponsorship_payments_paid_at
  before insert or update of status, paid_at, polar_event_at
  on public.sponsorship_payments
  for each row
  execute function public.set_sponsorship_paid_at();
