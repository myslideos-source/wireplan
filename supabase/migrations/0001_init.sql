-- WIREPLAN core schema draft (Phase 1).
-- Not yet applied to a live project — no Supabase credentials exist in
-- this environment. Committed as the schema-of-record so a later phase
-- can `supabase db push` this against a real project without a rewrite.

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  address text,
  geometry_status text not null default 'DRAFT'
    check (geometry_status in ('DRAFT', 'IN_REVIEW', 'VALIDATED', 'CONFIRMED', 'LOCKED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists floors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  name text not null,
  level integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists plan_uploads (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references floors (id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);

-- Coordinates are stored in millimeters, never pixels (§63).
create table if not exists walls (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references floors (id) on delete cascade,
  start_x numeric not null,
  start_y numeric not null,
  end_x numeric not null,
  end_y numeric not null,
  thickness numeric not null default 150,
  height numeric not null default 2500,
  created_at timestamptz not null default now()
);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references floors (id) on delete cascade,
  name text not null,
  type text not null default 'unassigned',
  polygon jsonb not null default '[]'::jsonb,
  area numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Generic smart-home system registry (§56) — Loxone is one row, never
-- hard-coded application logic.
create table if not exists smart_home_systems (
  id text primary key,
  name text not null
);

insert into smart_home_systems (id, name)
values ('loxone', 'Loxone')
on conflict (id) do nothing;

create table if not exists smart_home_devices (
  id uuid primary key default gen_random_uuid(),
  system_id text not null references smart_home_systems (id),
  manufacturer_id text not null,
  room_id uuid references rooms (id) on delete set null,
  wall_id uuid references walls (id) on delete set null,
  wall_offset numeric,
  wall_height numeric,
  created_at timestamptz not null default now()
);

alter table projects enable row level security;
alter table floors enable row level security;
alter table plan_uploads enable row level security;
alter table walls enable row level security;
alter table rooms enable row level security;
alter table smart_home_devices enable row level security;

create policy "Owners manage their projects"
  on projects for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Owners manage their floors"
  on floors for all
  using (exists (select 1 from projects p where p.id = floors.project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = floors.project_id and p.owner_id = auth.uid()));

create policy "Owners manage their plan uploads"
  on plan_uploads for all
  using (exists (
    select 1 from floors f join projects p on p.id = f.project_id
    where f.id = plan_uploads.floor_id and p.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from floors f join projects p on p.id = f.project_id
    where f.id = plan_uploads.floor_id and p.owner_id = auth.uid()
  ));

create policy "Owners manage their walls"
  on walls for all
  using (exists (
    select 1 from floors f join projects p on p.id = f.project_id
    where f.id = walls.floor_id and p.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from floors f join projects p on p.id = f.project_id
    where f.id = walls.floor_id and p.owner_id = auth.uid()
  ));

create policy "Owners manage their rooms"
  on rooms for all
  using (exists (
    select 1 from floors f join projects p on p.id = f.project_id
    where f.id = rooms.floor_id and p.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from floors f join projects p on p.id = f.project_id
    where f.id = rooms.floor_id and p.owner_id = auth.uid()
  ));

create policy "Owners manage their smart home devices"
  on smart_home_devices for all
  using (exists (
    select 1 from rooms r join floors f on f.id = r.floor_id join projects p on p.id = f.project_id
    where r.id = smart_home_devices.room_id and p.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from rooms r join floors f on f.id = r.floor_id join projects p on p.id = f.project_id
    where r.id = smart_home_devices.room_id and p.owner_id = auth.uid()
  ));
