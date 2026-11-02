-- Add attachment fields to student_personal_announcements
alter table public.student_personal_announcements
  add column if not exists attachment_url text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size bigint;

notify pgrst, 'reload schema';
