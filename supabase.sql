-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run
create table if not exists public.planner (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.planner enable row level security;

create policy "read own planner" on public.planner
  for select using (auth.uid() = user_id);
create policy "create own planner" on public.planner
  for insert with check (auth.uid() = user_id);
create policy "update own planner" on public.planner
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
