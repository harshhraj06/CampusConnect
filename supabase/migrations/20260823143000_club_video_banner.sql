alter table public.campus_clubs
  add column if not exists video_banner_url text;

notify pgrst, 'reload schema';
