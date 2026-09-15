create table if not exists public.sponsorship_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  polar_checkout_id text not null unique,
  polar_product_id text not null,
  amount integer not null check (amount > 0),
  currency text not null default 'usd',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_sponsorship_payments_user_id
on public.sponsorship_payments (user_id);

create index if not exists idx_sponsorship_payments_status
on public.sponsorship_payments (status);

alter table public.sponsorship_payments enable row level security;

create policy "Users can view their sponsorship payments"
  on public.sponsorship_payments for select
  using (user_id = auth.uid());

create policy "Users can create their sponsorship payments"
  on public.sponsorship_payments for insert
  with check (user_id = auth.uid() and profile_id = auth.uid());

create or replace function public.set_sponsorship_payment_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sponsorship_payments_updated_at
  on public.sponsorship_payments;

create trigger trg_sponsorship_payments_updated_at
  before update on public.sponsorship_payments
  for each row
  execute function public.set_sponsorship_payment_updated_at();