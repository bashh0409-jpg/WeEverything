alter table public.sponsorship_payments
add column if not exists idempotency_key text;

create unique index if not exists idx_sponsorship_payments_idempotency_key
on public.sponsorship_payments (user_id, idempotency_key)
where idempotency_key is not null;
