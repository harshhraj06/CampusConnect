-- ============================================================
-- CAMPUSCONNECT
-- ADMIN-MANAGED STUDENT IDENTITY
--
-- Student-controlled:
--   profile name/bio/skills/phone etc according to existing rules
--
-- Main-Admin-controlled:
--   Student USN
--   Parent / Guardian Contact
--
-- Students may READ their own guardian contact but cannot
-- create, update or delete it.
-- ============================================================


-- ============================================================
-- 1. GUARDIAN CONTACT RLS
-- ============================================================

alter table
public.student_guardian_contacts
enable row level security;


-- Students keep read-only access to their own record.

drop policy if exists
"Students read own guardian contact"
on public.student_guardian_contacts;


create policy
"Students read own guardian contact"
on public.student_guardian_contacts
for select
to authenticated
using (
  student_id =
    (select auth.uid())
);


-- Remove historic Student write permissions.

drop policy if exists
"Students create own guardian contact"
on public.student_guardian_contacts;


drop policy if exists
"Students update own guardian contact"
on public.student_guardian_contacts;


drop policy if exists
"Students delete own guardian contact"
on public.student_guardian_contacts;


-- Main Admin may inspect all guardian records.

drop policy if exists
"Main Admin reads guardian contacts"
on public.student_guardian_contacts;


create policy
"Main Admin reads guardian contacts"
on public.student_guardian_contacts
for select
to authenticated
using (
  public.current_campus_role() =
    'Main Admin'
);


-- Main Admin may create guardian records.

drop policy if exists
"Main Admin creates guardian contacts"
on public.student_guardian_contacts;


create policy
"Main Admin creates guardian contacts"
on public.student_guardian_contacts
for insert
to authenticated
with check (
  public.current_campus_role() =
    'Main Admin'
);


-- Main Admin may update guardian records.

drop policy if exists
"Main Admin updates guardian contacts"
on public.student_guardian_contacts;


create policy
"Main Admin updates guardian contacts"
on public.student_guardian_contacts
for update
to authenticated
using (
  public.current_campus_role() =
    'Main Admin'
)
with check (
  public.current_campus_role() =
    'Main Admin'
);


-- Main Admin may remove guardian records if required.

drop policy if exists
"Main Admin deletes guardian contacts"
on public.student_guardian_contacts;


create policy
"Main Admin deletes guardian contacts"
on public.student_guardian_contacts
for delete
to authenticated
using (
  public.current_campus_role() =
    'Main Admin'
);


-- ============================================================
-- 2. DATABASE GUARD FOR STUDENT USN
-- ============================================================

create or replace function
public.guard_student_usn_admin_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  if
    old.role = 'Student'

    and new.usn is distinct from
      old.usn

    and coalesce(
      auth.role(),
      ''
    ) <> 'service_role'

    and coalesce(
      public.current_campus_role(),
      ''
    ) <> 'Main Admin'
  then

    raise exception
      'Student USN can only be changed by Main Admin'
      using errcode = '42501';

  end if;


  return new;

end;
$$;


drop trigger if exists
guard_student_usn_admin_only_trigger
on public.profiles;


create trigger
guard_student_usn_admin_only_trigger
before update
on public.profiles
for each row
execute function
public.guard_student_usn_admin_only();


-- Remove browser-level authenticated column permission.
-- Main Admin management is performed through the secured
-- server-side Admin API.

revoke update (usn)
on public.profiles
from authenticated;


-- ============================================================
-- 3. DEFENCE-IN-DEPTH GUARDIAN TRIGGER
-- ============================================================

create or replace function
public.guard_guardian_contact_admin_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  if
    coalesce(
      auth.role(),
      ''
    ) = 'service_role'

    or coalesce(
      public.current_campus_role(),
      ''
    ) = 'Main Admin'
  then

    if tg_op = 'DELETE' then
      return old;
    end if;

    return new;

  end if;


  raise exception
    'Parent / Guardian Contact can only be changed by Main Admin'
    using errcode = '42501';

end;
$$;


drop trigger if exists
guard_guardian_contact_admin_only_trigger
on public.student_guardian_contacts;


create trigger
guard_guardian_contact_admin_only_trigger
before insert or update or delete
on public.student_guardian_contacts
for each row
execute function
public.guard_guardian_contact_admin_only();


notify pgrst, 'reload schema';
