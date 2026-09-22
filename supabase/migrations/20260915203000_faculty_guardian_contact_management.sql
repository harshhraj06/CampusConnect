-- ============================================================
-- CAMPUSCONNECT
-- FACULTY-MANAGED STUDENT GUARDIAN CONTACTS
--
-- Security model:
--   Student    -> read own guardian contact only
--   Faculty    -> manage guardian contacts only for students
--                 in batches where the faculty is assigned
--                 through attendance_batch_subjects
--   Main Admin -> manage all guardian contacts
--
-- Students can no longer create/update guardian contacts.
-- Existing guardian records are preserved.
-- ============================================================


-- ============================================================
-- 1. REMOVE OLD STUDENT WRITE POLICIES
-- ============================================================

drop policy if exists
  "Students create own guardian contact"
on public.student_guardian_contacts;

drop policy if exists
  "Students update own guardian contact"
on public.student_guardian_contacts;


-- Keep student read-own policy, but recreate it explicitly.
drop policy if exists
  "Students read own guardian contact"
on public.student_guardian_contacts;

create policy
  "Students read own guardian contact"
on public.student_guardian_contacts
for select
to authenticated
using (
  student_id = (select auth.uid())
);


-- ============================================================
-- 2. SECURITY-DEFINER AUTHORIZATION HELPER
-- ============================================================
--
-- We intentionally avoid depending on the caller having direct
-- SELECT permission on attendance_batch_students.
--
-- A Faculty member may manage a student's guardian contact when:
--
--   attendance_batch_subjects.faculty_id = auth.uid()
--
-- AND that student belongs to the same batch.
--
-- Main Admin may manage every student.
-- ============================================================

create or replace function
public.can_manage_student_guardian_contact(
  target_student_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and (
      public.current_campus_role() = 'Main Admin'

      or (
        public.current_campus_role() = 'Faculty'

        and exists (
          select 1
          from public.attendance_batch_students bs

          join public.attendance_batch_subjects abs
            on abs.batch_id = bs.batch_id

          where
            bs.student_id = target_student_id
            and abs.faculty_id = auth.uid()
        )
      )
    );
$$;


revoke all
on function public.can_manage_student_guardian_contact(uuid)
from public, anon;

grant execute
on function public.can_manage_student_guardian_contact(uuid)
to authenticated;


-- ============================================================
-- 3. FACULTY / MAIN ADMIN READ POLICY
-- ============================================================

drop policy if exists
  "Authorized staff read guardian contacts"
on public.student_guardian_contacts;

create policy
  "Authorized staff read guardian contacts"
on public.student_guardian_contacts
for select
to authenticated
using (
  public.can_manage_student_guardian_contact(
    student_id
  )
);


-- ============================================================
-- 4. FACULTY / MAIN ADMIN INSERT POLICY
-- ============================================================

drop policy if exists
  "Authorized staff create guardian contacts"
on public.student_guardian_contacts;

create policy
  "Authorized staff create guardian contacts"
on public.student_guardian_contacts
for insert
to authenticated
with check (
  public.can_manage_student_guardian_contact(
    student_id
  )
);


-- ============================================================
-- 5. FACULTY / MAIN ADMIN UPDATE POLICY
-- ============================================================

drop policy if exists
  "Authorized staff update guardian contacts"
on public.student_guardian_contacts;

create policy
  "Authorized staff update guardian contacts"
on public.student_guardian_contacts
for update
to authenticated
using (
  public.can_manage_student_guardian_contact(
    student_id
  )
)
with check (
  public.can_manage_student_guardian_contact(
    student_id
  )
);


-- ============================================================
-- 6. PRIVILEGES
-- ============================================================
--
-- RLS still determines which rows may actually be accessed.
-- Browser clients cannot bypass these policies.
-- ============================================================

grant select, insert, update
on public.student_guardian_contacts
to authenticated;


notify pgrst, 'reload schema';
