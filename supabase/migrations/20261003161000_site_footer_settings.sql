create table if not exists public.site_footer_settings (
  id text primary key
    default 'main'
    check (id = 'main'),

  tagline text not null
    default 'One connected campus for learning, community and opportunity.',

  copyright_text text not null
    default 'CampusConnect. All rights reserved.',

  columns jsonb not null
    default '[]'::jsonb,

  social_links jsonb not null
    default '{}'::jsonb,

  store_links jsonb not null
    default '{}'::jsonb,

  updated_at timestamptz not null
    default now(),

  updated_by uuid null
    references auth.users(id)
    on delete set null
);

alter table
public.site_footer_settings
enable row level security;


drop policy if exists
"Authenticated users read footer settings"
on public.site_footer_settings;

create policy
"Authenticated users read footer settings"
on public.site_footer_settings
for select
to authenticated
using (true);


drop policy if exists
"Main Admin inserts footer settings"
on public.site_footer_settings;

create policy
"Main Admin inserts footer settings"
on public.site_footer_settings
for insert
to authenticated
with check (
  public.current_campus_role() = 'Main Admin'
  and updated_by = auth.uid()
);


drop policy if exists
"Main Admin updates footer settings"
on public.site_footer_settings;

create policy
"Main Admin updates footer settings"
on public.site_footer_settings
for update
to authenticated
using (
  public.current_campus_role() = 'Main Admin'
)
with check (
  public.current_campus_role() = 'Main Admin'
  and updated_by = auth.uid()
);


insert into public.site_footer_settings (
  id,
  tagline,
  copyright_text,
  columns,
  social_links,
  store_links
)
values (
  'main',

  'One connected campus for learning, community and opportunity.',

  'CampusConnect. All rights reserved.',

  '[
    {
      "title": "Company",
      "links": [
        {
          "label": "About CampusConnect",
          "kind": "internal",
          "target": "About CampusConnect"
        },
        {
          "label": "Campus Life",
          "kind": "internal",
          "target": "Campus"
        },
        {
          "label": "Profile",
          "kind": "internal",
          "target": "Profile"
        }
      ]
    },
    {
      "title": "Community",
      "links": [
        {
          "label": "Campus Network",
          "kind": "internal",
          "target": "Network"
        },
        {
          "label": "Campus Calendar",
          "kind": "internal",
          "target": "Calendar"
        },
        {
          "label": "Learning",
          "kind": "internal",
          "target": "Learning"
        }
      ]
    },
    {
      "title": "Support",
      "links": [
        {
          "label": "Seva Kendra",
          "kind": "internal",
          "target": "Seva Kendra"
        },
        {
          "label": "Faculty Directory",
          "kind": "internal",
          "target": "Faculty Directory"
        },
        {
          "label": "Activity Center",
          "kind": "internal",
          "target": "Activity Center"
        }
      ]
    },
    {
      "title": "Resources",
      "links": [
        {
          "label": "Placements",
          "kind": "internal",
          "target": "Placements"
        },
        {
          "label": "Assignments",
          "kind": "internal",
          "target": "Assignments"
        },
        {
          "label": "Attendance",
          "kind": "internal",
          "target": "Attendance"
        }
      ]
    }
  ]'::jsonb,

  '{
    "facebook": "",
    "instagram": "",
    "linkedin": "",
    "twitter": ""
  }'::jsonb,

  '{
    "appStore": "",
    "playStore": ""
  }'::jsonb
)
on conflict (id)
do nothing;
