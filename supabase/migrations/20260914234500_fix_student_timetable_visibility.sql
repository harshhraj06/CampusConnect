-- ============================================================
-- CAMPUSCONNECT
-- Fix student timetable document + storage visibility
-- ============================================================

create or replace function
public.is_current_student_in_attendance_batch(
  p_batch_id text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.attendance_batch_students abs
    where abs.student_id = auth.uid()
      and abs.batch_id::text = p_batch_id
  );
$$;

revoke all
on function
public.is_current_student_in_attendance_batch(text)
from public;

grant execute
on function
public.is_current_student_in_attendance_batch(text)
to authenticated;


-- ============================================================
-- TIMETABLE DOCUMENT RLS
-- ============================================================

drop policy if exists
"Students view own batch timetable document"
on public.batch_timetable_documents;

create policy
"Students view own batch timetable document"
on public.batch_timetable_documents
for select
to authenticated
using (
  public.is_current_student_in_attendance_batch(
    batch_id::text
  )
);


-- ============================================================
-- STORAGE READ POLICY
-- Keep Main Admin + Faculty behavior unchanged.
-- Student check now uses the secure helper.
-- ============================================================

drop policy if exists
"Authenticated users view allowed timetable PDFs"
on storage.objects;

create policy
"Authenticated users view allowed timetable PDFs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'campus-timetables'
  and (
    public.current_campus_role() =
      'Main Admin'

    or public.is_current_student_in_attendance_batch(
      (storage.foldername(name))[1]
    )

    or exists (
      select 1
      from public.attendance_batch_subjects abs
      where abs.faculty_id = auth.uid()
        and abs.batch_id::text =
          (storage.foldername(name))[1]
    )
  )
);
