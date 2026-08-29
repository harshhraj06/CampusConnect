-- =========================================================
-- CAMPUSCONNECT
-- ANNOUNCEMENT FESTIVAL / FLOATING BANNERS
-- =========================================================

alter table public.announcements
  add column if not exists announcement_type text
  not null default 'Normal';

alter table public.announcements
  add column if not exists show_floating_banner boolean
  not null default false;

alter table public.announcements
  add column if not exists banner_url text;

alter table public.announcements
  add column if not exists banner_start_at timestamptz;

alter table public.announcements
  add column if not exists banner_end_at timestamptz;

alter table public.announcements
  add column if not exists banner_cta_label text
  not null default '';

alter table public.announcements
  add column if not exists banner_cta_url text;

alter table public.announcements
  add column if not exists banner_background text
  not null default '';

alter table public.announcements
  add column if not exists banner_position integer
  not null default 0;

alter table public.announcements
  add column if not exists banner_dismissible boolean
  not null default true;


-- ---------------------------------------------------------
-- VALID ANNOUNCEMENT TYPES
-- ---------------------------------------------------------

alter table public.announcements
drop constraint if exists announcements_announcement_type_check;

alter table public.announcements
add constraint announcements_announcement_type_check
check (
  announcement_type in (
    'Normal',
    'Festival',
    'Featured',
    'Emergency'
  )
);


-- ---------------------------------------------------------
-- VALID BANNER DATE RANGE
-- ---------------------------------------------------------

alter table public.announcements
drop constraint if exists announcements_banner_dates_check;

alter table public.announcements
add constraint announcements_banner_dates_check
check (
  banner_end_at is null
  or banner_start_at is null
  or banner_end_at > banner_start_at
);


-- ---------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------

create index if not exists
announcements_floating_banner_idx
on public.announcements(
  show_floating_banner,
  banner_start_at,
  banner_end_at
);

create index if not exists
announcements_banner_position_idx
on public.announcements(
  banner_position
);


-- ---------------------------------------------------------
-- EXISTING ANNOUNCEMENTS STAY NORMAL
-- ---------------------------------------------------------

update public.announcements
set
  announcement_type = 'Normal',
  show_floating_banner = false
where announcement_type is null;


-- ---------------------------------------------------------
-- HELPER:
-- RETURNS ONLY CURRENTLY ACTIVE FLOATING BANNERS
-- ---------------------------------------------------------

create or replace function public.get_active_announcement_banners()
returns setof public.announcements
language sql
stable
security invoker
set search_path = ''
as $$
  select announcement.*
  from public.announcements announcement
  where
    announcement.show_floating_banner = true

    and (
      announcement.banner_start_at is null
      or announcement.banner_start_at <= now()
    )

    and (
      announcement.banner_end_at is null
      or announcement.banner_end_at > now()
    )

  order by
    announcement.banner_position asc,
    announcement.is_pinned desc,
    announcement.created_at desc;
$$;

grant execute
on function public.get_active_announcement_banners()
to authenticated;

