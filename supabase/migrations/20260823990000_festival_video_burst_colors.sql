-- ============================================================
-- CAMPUSCONNECT
-- FESTIVAL VIDEO + CUSTOM BURST COLORS
-- ============================================================

alter table public.announcements
add column if not exists video_banner_url text;

alter table public.announcements
add column if not exists burst_colors text[]
not null
default array[
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#22c55e',
  '#3b82f6'
]::text[];

notify pgrst, 'reload schema';
