create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  description text,
  city text,
  date timestamptz not null,
  price text default 'Free',
  url text,
  image_url text,
  created_at timestamptz default now()
);

create index idx_events_date on public.events (date);

alter table public.events enable row level security;

create policy "Public events are viewable"
  on public.events for select
  using (true);