-- =========================================================
-- CAMPUSCONNECT — TOP CAMPUS RECRUITERS
-- =========================================================

create table if not exists public.campus_recruiters (
  id uuid primary key default gen_random_uuid(),

  company_name text not null
    check (char_length(company_name) between 2 and 120),

  logo_url text,
  website_url text,

  industry text not null default '',
  hiring_roles text not null default '',

  highest_package text not null default '',
  average_package text not null default '',

  students_selected integer not null default 0
    check (students_selected >= 0),

  placement_year text not null default '',

  is_featured boolean not null default false,

  display_order integer not null default 0,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_by_name text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists
campus_recruiters_order_idx
on public.campus_recruiters(
  is_featured desc,
  display_order asc,
  created_at desc
);


alter table public.campus_recruiters
enable row level security;


grant select
on public.campus_recruiters
to authenticated;


grant insert, update, delete
on public.campus_recruiters
to authenticated;


drop policy if exists
"Campus users read recruiters"
on public.campus_recruiters;

create policy
"Campus users read recruiters"
on public.campus_recruiters
for select
to authenticated
using (true);


drop policy if exists
"Staff create recruiters"
on public.campus_recruiters;

create policy
"Staff create recruiters"
on public.campus_recruiters
for insert
to authenticated
with check (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Placement Cell',
    'Main Admin'
  )
);


drop policy if exists
"Staff update recruiters"
on public.campus_recruiters;

create policy
"Staff update recruiters"
on public.campus_recruiters
for update
to authenticated
using (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Placement Cell',
    'Main Admin'
  )
)
with check (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Placement Cell',
    'Main Admin'
  )
);


drop policy if exists
"Staff delete recruiters"
on public.campus_recruiters;

create policy
"Staff delete recruiters"
on public.campus_recruiters
for delete
to authenticated
using (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Placement Cell',
    'Main Admin'
  )
);

