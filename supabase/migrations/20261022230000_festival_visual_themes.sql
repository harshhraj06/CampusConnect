-- CampusConnect saved festival visual themes.
-- Existing festival announcements and schedules remain intact.

alter table public.announcements
  add column if not exists festival_theme jsonb
  not null default '{}'::jsonb;

drop function if exists public.get_active_festival_wishes();

create function public.get_active_festival_wishes()
returns table (
  id uuid,
  title text,
  body text,
  author_name text,
  category text,
  announcement_type text,
  show_floating_banner boolean,
  banner_url text,
  video_banner_url text,
  banner_start_at timestamptz,
  banner_end_at timestamptz,
  banner_cta_label text,
  banner_cta_url text,
  banner_dismissible boolean,
  burst_colors text[],
  festival_theme jsonb,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    a.id,
    a.title,
    a.body,
    a.author_name,
    a.category,
    a.announcement_type,
    a.show_floating_banner,
    a.banner_url,
    a.video_banner_url,
    a.banner_start_at,
    a.banner_end_at,
    a.banner_cta_label,
    a.banner_cta_url,
    a.banner_dismissible,
    a.burst_colors,
    a.festival_theme,
    a.created_at
  from public.announcements a
  where
    a.announcement_type = 'Festival'
    and (a.banner_start_at is null or a.banner_start_at <= now())
    and (a.banner_end_at is null or a.banner_end_at > now())
  order by a.is_pinned desc, a.created_at desc;
$$;

revoke all
on function public.get_active_festival_wishes()
from public;

grant execute
on function public.get_active_festival_wishes()
to authenticated;

notify pgrst, 'reload schema';
