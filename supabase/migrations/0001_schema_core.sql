begin;
create schema if not exists ciya;
revoke all on schema ciya from public, anon, authenticated;

-- Disable the legacy public document before exposing the new routes.
do $$
begin
  if to_regclass('public.ciya_state') is not null then
    execute 'drop policy if exists ciya_anon_select on public.ciya_state';
    execute 'drop policy if exists ciya_anon_insert on public.ciya_state';
    execute 'drop policy if exists ciya_anon_update on public.ciya_state';
    execute 'revoke all on public.ciya_state from public, anon, authenticated';
  end if;
end $$;

create table if not exists ciya.roles (
  user_id uuid references auth.users(id) on delete cascade,
  panel text check (panel in ('recepcion','escenario','admin')),
  primary key (user_id, panel)
);
create table if not exists ciya.carreras (
  id text primary key, nombre text not null, color text not null
);
insert into ciya.carreras values ('electricidad','Electricidad','#ffd166'),
  ('electromecanica','Electromecánica','#ff8c42'), ('industrial','Industrial','#ef476f'),
  ('hidraulica','Hidráulica','#4cc9f0'), ('sistemas','Sistemas y Software','#06d6a0')
on conflict (id) do nothing;

create table if not exists ciya.attendees (
  id uuid primary key default gen_random_uuid(),
  cedula text not null unique,
  nombre text,
  email text unique,
  carrera text references ciya.carreras,
  wall_message text,
  checked_in_at timestamptz,
  previous_winner boolean not null default false
);
create table if not exists ciya.donations (
  id uuid primary key default gen_random_uuid(),
  attendee uuid not null references ciya.attendees,
  carrera text not null references ciya.carreras,
  tipo text not null check (tipo in ('juguete','caramelos')),
  cantidad integer not null check (cantidad between 1 and 1000),
  creado timestamptz not null default now()
);
create table if not exists ciya.gold (
  slot integer primary key check (slot between 1 and 3),
  secret uuid not null unique default gen_random_uuid(),
  winner uuid unique references ciya.attendees,
  claimed_at timestamptz
);
insert into ciya.gold(slot) values (1),(2),(3) on conflict do nothing;
create table if not exists ciya.gold_keys (
  code text primary key,
  slot integer not null references ciya.gold,
  expires_at timestamptz not null
);
create index if not exists ciya_gold_expiration on ciya.gold_keys(expires_at);
create table if not exists ciya.tickets (
  id bigint generated always as identity primary key,
  attendee uuid not null references ciya.attendees,
  source text not null,
  item integer not null,
  unique (source,item)
);
create index if not exists ciya_tickets_attendee on ciya.tickets(attendee);
create table if not exists ciya.receipts (
  id uuid primary key default gen_random_uuid(),
  attendee uuid not null references ciya.attendees,
  email text not null,
  nombre text not null,
  tickets jsonb not null,
  status text not null default 'pending' check (status in ('pending','sending','accepted','failed','uncertain')),
  created_at timestamptz not null default now(),
  next_attempt timestamptz not null default now(),
  attempts integer not null default 0,
  first_attempt timestamptz
);
create table if not exists ciya.groups (
  id uuid primary key default gen_random_uuid(),
  orden integer generated always as identity,
  data jsonb not null
);
create table if not exists ciya.deseos (
  id uuid primary key default gen_random_uuid(), data jsonb not null,
  aprobado boolean not null default false, creado timestamptz not null default now()
);
create table if not exists ciya.evaluations (
  kind text, subject text, data jsonb not null, primary key (kind,subject)
);
create table if not exists ciya.event (
  singleton boolean primary key default true check (singleton),
  snapshot jsonb,
  legacy_import uuid,
  donations_start timestamptz not null default '2026-12-04 08:00:00-05',
  checkin_start timestamptz not null default '2026-12-04 17:00:00-05',
  reception_end timestamptz not null default '2026-12-04 17:45:00-05',
  group_deadline timestamptz not null default '2026-12-03 17:30:00-05',
  check (donations_start <= checkin_start and checkin_start < reception_end)
);
insert into ciya.event default values on conflict do nothing;
create table if not exists ciya.requests (
  id uuid primary key, owner uuid, action text not null, payload jsonb not null, result jsonb NOT NULL
);
commit;
