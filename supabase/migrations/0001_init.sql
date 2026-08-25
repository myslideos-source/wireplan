-- WIREPLAN persistence schema — applied to the live "wireplan" Supabase
-- project (§106). One row per project, one row per floor. A floor's
-- entire editable content (rooms, devices, Schaltschrank, Tree bus,
-- cables, ...) is exactly the client's FloorMutableSlice, stored as one
-- JSONB document rather than normalized into ~12 tables — the app
-- already treats it as one atomic unit (undo/redo, floor-switch caching
-- all operate on this same slice), so a relational split would add
-- schema/CRUD surface without a real query need behind it.
--
-- No per-user auth/login exists in the app yet (single-user tool today),
-- so there is no owner_id / auth.uid() scoping — RLS is enabled (so the
-- Supabase linter doesn't flag open tables) but the policy is
-- permissive. Add real auth + owner-scoped policies before this is ever
-- exposed to more than one trusted user.

create extension if not exists "pgcrypto";

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
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
  -- The FloorMutableSlice: rooms, devices, roomCircuits,
  -- technikraumRoomId, distributionBoard, cables, smartHomeDevices,
  -- backgroundImage, treeBranches, audioZones, fixedConsumers,
  -- treeJunctions, treeEdges. Coordinates inside are millimeters (§63).
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists floors_project_id_idx on floors (project_id);

alter table projects enable row level security;
alter table floors enable row level security;

create policy "open access (no auth yet)" on projects for all using (true) with check (true);
create policy "open access (no auth yet)" on floors for all using (true) with check (true);
