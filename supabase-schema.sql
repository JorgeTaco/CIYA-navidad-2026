create table if not exists public.ciya_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.ciya_state enable row level security;

drop policy if exists "ciya_anon_select" on public.ciya_state;
create policy "ciya_anon_select" on public.ciya_state for select to anon using (true);

drop policy if exists "ciya_anon_insert" on public.ciya_state;
create policy "ciya_anon_insert" on public.ciya_state for insert to anon with check (true);

drop policy if exists "ciya_anon_update" on public.ciya_state;
create policy "ciya_anon_update" on public.ciya_state for update to anon using (true) with check (true);
