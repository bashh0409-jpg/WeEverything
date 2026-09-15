alter table public.sponsorship_payments
add column if not exists polar_order_id text;

create unique index if not exists idx_sponsorship_payments_polar_order_id
on public.sponsorship_payments (polar_order_id)
where polar_order_id is not null;