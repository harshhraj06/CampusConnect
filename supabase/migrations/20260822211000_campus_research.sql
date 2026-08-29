
create table if not exists public.campus_research (
  id uuid primary key default gen_random_uuid(),

  title text not null
    check (char_length(title) between 3 and 200),

  description text not null default '',

  research_type text not null default 'Project'
    check (
      research_type in (
        'Project',
        'Patent',
        'Publication',
        'Research Lab',
        'Startup',
        'Funded Research',
        'Student Innovation',
        'Faculty Research'
      )
    ),

  department text not null default 'All',

  lead_name text not null default '',

  collaborators text not null default '',

  organization text not null default '',

  year text not null default '',

  image_url text,

  external_url text,

  status text not null default 'Active'
    check (
      status in (
        'Active',
        'Completed',
        'Published',
        'Granted',
        'Incubated'
      )
    ),

  is_featured boolean not null default false,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_by_name text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campus_research_type_idx
on public.campus_research(research_type);

create index if not exists campus_research_featured_idx
on public.campus_research(is_featured);

alter table public.campus_research
enable row level security;

grant select, insert, update, delete
on public.campus_research
to authenticated;

drop policy if exists "Campus reads research"
on public.campus_research;

create policy "Campus reads research"
on public.campus_research
for select
to authenticated
using (true);

drop policy if exists "Staff create research"
on public.campus_research;

create policy "Staff create research"
on public.campus_research
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Placement Cell',
    'Main Admin'
  )
);

drop policy if exists "Staff update research"
on public.campus_research;

create policy "Staff update research"
on public.campus_research
for update
to authenticated
using (
  created_by = auth.uid()
  or public.current_campus_role() = 'Main Admin'
)
with check (
  created_by = auth.uid()
  or public.current_campus_role() = 'Main Admin'
);

drop policy if exists "Staff delete research"
on public.campus_research;

create policy "Staff delete research"
on public.campus_research
for delete
to authenticated
using (
  created_by = auth.uid()
  or public.current_campus_role() = 'Main Admin'
);

