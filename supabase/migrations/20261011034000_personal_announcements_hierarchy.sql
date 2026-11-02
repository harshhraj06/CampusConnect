-- Add recipient_deleted_at column to preserve admin dispatch history when students clear inbox
alter table public.student_personal_announcements
  add column if not exists recipient_deleted_at timestamptz;

create index if not exists student_personal_announcements_recipient_inbox_idx
  on public.student_personal_announcements(student_id, recipient_deleted_at, created_at desc);

-- Allow authenticated recipients to update their recipient_deleted_at
grant update (recipient_deleted_at) on public.student_personal_announcements to authenticated;

notify pgrst, 'reload schema';
