alter table public.announcements
  add column if not exists announcement_type text not null default 'Normal';

alter table public.announcements
  add column if not exists show_floating_banner boolean not null default false;

alter table public.announcements
  add column if not exists banner_url text;

alter table public.announcements
  add column if not exists banner_start_at timestamptz;

alter table public.announcements
  add column if not exists banner_end_at timestamptz;

alter table public.announcements
  add column if not exists banner_cta_label text not null default '';

alter table public.announcements
  add column if not exists banner_cta_url text;

alter table public.announcements
  add column if not exists banner_dismissible boolean not null default true;

update public.announcements
set
  audience = 'All',
  department = 'All'
where announcement_type = 'Festival';

alter table public.announcements enable row level security;

drop policy if exists "Festival visible to everyone"
on public.announcements;

drop policy if exists "Authenticated users read festival announcements"
on public.announcements;

create policy "Festival visible to everyone"
on public.announcements
for select
to authenticated
using (
  announcement_type = 'Festival'
);

create index if not exists announcements_festival_dashboard_idx
on public.announcements (
  announcement_type,
  show_floating_banner,
  created_at desc
);
