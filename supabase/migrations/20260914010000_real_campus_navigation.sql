create extension if not exists pgcrypto;

create table if not exists public.campus_map_buildings (
  id uuid primary key default gen_random_uuid(),

  name text not null
    check (char_length(trim(name)) between 2 and 120),

  short_name text not null default '',

  description text not null default '',

  category text not null default 'Academic'
    check (
      category in (
        'Academic',
        'Administration',
        'Library',
        'Food',
        'Hostel',
        'Sports',
        'Medical',
        'Parking',
        'Entrance',
        'Facility',
        'Other'
      )
    ),

  latitude double precision,
  longitude double precision,

  entrance_latitude double precision,
  entrance_longitude double precision,

  map_x double precision,
  map_y double precision,

  floor_count integer not null default 1
    check (floor_count >= 1),

  is_accessible boolean not null default true,

  is_active boolean not null default true,

  display_order integer not null default 0,

  created_by uuid references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create table if not exists public.campus_map_nodes (
  id uuid primary key default gen_random_uuid(),

  name text not null default '',

  latitude double precision not null,

  longitude double precision not null,

  map_x double precision,
  map_y double precision,

  node_type text not null default 'Path'
    check (
      node_type in (
        'Path',
        'Entrance',
        'Junction',
        'Building',
        'Gate',
        'Shortcut',
        'Landmark'
      )
    ),

  building_id uuid
    references public.campus_map_buildings(id)
    on delete set null,

  is_active boolean not null default true,

  created_by uuid references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create table if not exists public.campus_map_edges (
  id uuid primary key default gen_random_uuid(),

  from_node uuid not null
    references public.campus_map_nodes(id)
    on delete cascade,

  to_node uuid not null
    references public.campus_map_nodes(id)
    on delete cascade,

  name text not null default '',

  path_type text not null default 'Walkway'
    check (
      path_type in (
        'Walkway',
        'Road',
        'Stairs',
        'Ramp',
        'Shortcut',
        'Indoor',
        'Covered'
      )
    ),

  distance_m double precision
    check (
      distance_m is null
      or distance_m >= 0
    ),

  estimated_seconds integer
    check (
      estimated_seconds is null
      or estimated_seconds >= 0
    ),

  is_bidirectional boolean not null default true,

  is_shortcut boolean not null default false,

  is_accessible boolean not null default true,

  is_closed boolean not null default false,

  path_points jsonb not null default '[]'::jsonb,

  created_by uuid references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  check (from_node <> to_node)
);

create index if not exists
campus_map_buildings_active_idx
on public.campus_map_buildings(
  is_active,
  display_order
);

create index if not exists
campus_map_nodes_active_idx
on public.campus_map_nodes(
  is_active
);

create index if not exists
campus_map_edges_nodes_idx
on public.campus_map_edges(
  from_node,
  to_node
);

create index if not exists
campus_map_edges_shortcut_idx
on public.campus_map_edges(
  is_shortcut,
  is_closed
);

create or replace function
public.can_manage_campus_map()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and public.current_campus_role() = 'Main Admin';
$$;

revoke all
on function public.can_manage_campus_map()
from public;

grant execute
on function public.can_manage_campus_map()
to authenticated;

alter table public.campus_map_buildings
enable row level security;

alter table public.campus_map_nodes
enable row level security;

alter table public.campus_map_edges
enable row level security;

drop policy if exists
"campus map buildings authenticated read"
on public.campus_map_buildings;

create policy
"campus map buildings authenticated read"
on public.campus_map_buildings
for select
to authenticated
using (
  is_active
  or public.can_manage_campus_map()
);

drop policy if exists
"campus map buildings admin insert"
on public.campus_map_buildings;

create policy
"campus map buildings admin insert"
on public.campus_map_buildings
for insert
to authenticated
with check (
  public.can_manage_campus_map()
  and created_by = auth.uid()
);

drop policy if exists
"campus map buildings admin update"
on public.campus_map_buildings;

create policy
"campus map buildings admin update"
on public.campus_map_buildings
for update
to authenticated
using (
  public.can_manage_campus_map()
)
with check (
  public.can_manage_campus_map()
);

drop policy if exists
"campus map buildings admin delete"
on public.campus_map_buildings;

create policy
"campus map buildings admin delete"
on public.campus_map_buildings
for delete
to authenticated
using (
  public.can_manage_campus_map()
);

drop policy if exists
"campus map nodes authenticated read"
on public.campus_map_nodes;

create policy
"campus map nodes authenticated read"
on public.campus_map_nodes
for select
to authenticated
using (
  is_active
  or public.can_manage_campus_map()
);

drop policy if exists
"campus map nodes admin insert"
on public.campus_map_nodes;

create policy
"campus map nodes admin insert"
on public.campus_map_nodes
for insert
to authenticated
with check (
  public.can_manage_campus_map()
  and created_by = auth.uid()
);

drop policy if exists
"campus map nodes admin update"
on public.campus_map_nodes;

create policy
"campus map nodes admin update"
on public.campus_map_nodes
for update
to authenticated
using (
  public.can_manage_campus_map()
)
with check (
  public.can_manage_campus_map()
);

drop policy if exists
"campus map nodes admin delete"
on public.campus_map_nodes;

create policy
"campus map nodes admin delete"
on public.campus_map_nodes
for delete
to authenticated
using (
  public.can_manage_campus_map()
);

drop policy if exists
"campus map edges authenticated read"
on public.campus_map_edges;

create policy
"campus map edges authenticated read"
on public.campus_map_edges
for select
to authenticated
using (
  not is_closed
  or public.can_manage_campus_map()
);

drop policy if exists
"campus map edges admin insert"
on public.campus_map_edges;

create policy
"campus map edges admin insert"
on public.campus_map_edges
for insert
to authenticated
with check (
  public.can_manage_campus_map()
  and created_by = auth.uid()
);

drop policy if exists
"campus map edges admin update"
on public.campus_map_edges;

create policy
"campus map edges admin update"
on public.campus_map_edges
for update
to authenticated
using (
  public.can_manage_campus_map()
)
with check (
  public.can_manage_campus_map()
);

drop policy if exists
"campus map edges admin delete"
on public.campus_map_edges;

create policy
"campus map edges admin delete"
on public.campus_map_edges
for delete
to authenticated
using (
  public.can_manage_campus_map()
);

grant select
on public.campus_map_buildings,
   public.campus_map_nodes,
   public.campus_map_edges
to authenticated;

grant insert, update, delete
on public.campus_map_buildings,
   public.campus_map_nodes,
   public.campus_map_edges
to authenticated;

create or replace function
public.touch_campus_map_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists
campus_map_buildings_updated_at
on public.campus_map_buildings;

create trigger
campus_map_buildings_updated_at
before update
on public.campus_map_buildings
for each row
execute function
public.touch_campus_map_updated_at();

drop trigger if exists
campus_map_nodes_updated_at
on public.campus_map_nodes;

create trigger
campus_map_nodes_updated_at
before update
on public.campus_map_nodes
for each row
execute function
public.touch_campus_map_updated_at();

drop trigger if exists
campus_map_edges_updated_at
on public.campus_map_edges;

create trigger
campus_map_edges_updated_at
before update
on public.campus_map_edges
for each row
execute function
public.touch_campus_map_updated_at();
