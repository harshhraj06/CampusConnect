-- ============================================================
-- CAMPUSCONNECT — SECURE COLLEGE ID BARCODE ENROLLMENT
-- ============================================================

-- Students/authenticated users must NOT be able to bind an
-- arbitrary physical college barcode to their own account.

revoke execute
on function public.register_my_college_id_barcode(text)
from public;

revoke execute
on function public.register_my_college_id_barcode(text)
from anon;

revoke execute
on function public.register_my_college_id_barcode(text)
from authenticated;


-- ============================================================
-- MAIN ADMIN — ASSIGN OFFICIAL BARCODE TO STUDENT
-- ============================================================

create or replace function
public.assign_official_college_id_barcode(
  p_student_id uuid,
  p_barcode_value text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  clean_barcode text;
begin

  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  select p.role::text
  into caller_role
  from public.profiles p
  where p.id = auth.uid();

  if caller_role is distinct from 'Main Admin' then
    raise exception
      'Only Main Admin can assign official college ID barcodes.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_student_id
      and p.role::text = 'Student'
  ) then
    raise exception 'Valid student account required.';
  end if;

  clean_barcode :=
    trim(coalesce(p_barcode_value, ''));

  if length(clean_barcode) < 3 then
    raise exception 'Invalid barcode value.';
  end if;

  insert into public.college_id_barcode_mappings (
    student_id,
    barcode_value,
    is_active,
    updated_at
  )
  values (
    p_student_id,
    clean_barcode,
    true,
    now()
  )

  on conflict (student_id)
  do update set
    barcode_value = excluded.barcode_value,
    is_active = true,
    updated_at = now();
end;
$$;


revoke all
on function
public.assign_official_college_id_barcode(uuid, text)
from public;

revoke all
on function
public.assign_official_college_id_barcode(uuid, text)
from anon;

revoke all
on function
public.assign_official_college_id_barcode(uuid, text)
from authenticated;

grant execute
on function
public.assign_official_college_id_barcode(uuid, text)
to authenticated;


-- ============================================================
-- HARDEN VERIFICATION
-- Only Student profiles may resolve as college IDs.
-- Only safe identity fields are returned.
-- ============================================================

create or replace function
public.verify_college_id_barcode(
  p_barcode_value text
)
returns table (
  student_id uuid,
  full_name text,
  usn text,
  campus_uid text,
  department text,
  graduation_year text,
  avatar_url text,
  role text,
  verified boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  clean_barcode text;
begin

  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  clean_barcode :=
    upper(trim(coalesce(p_barcode_value, '')));

  if length(clean_barcode) < 3 then
    return;
  end if;

  return query

  select
    p.id,
    p.full_name,
    p.usn,
    p.campus_uid,
    p.department,
    p.graduation_year,
    p.avatar_url,
    p.role::text,
    true

  from public.profiles p

  left join public.college_id_barcode_mappings m
    on m.student_id = p.id
    and m.is_active = true

  where
    p.role::text = 'Student'

    and (
      upper(trim(coalesce(p.usn, ''))) =
        clean_barcode

      or

      upper(trim(coalesce(p.campus_uid, ''))) =
        clean_barcode

      or

      upper(trim(coalesce(m.barcode_value, ''))) =
        clean_barcode
    )

  limit 1;
end;
$$;


revoke all
on function
public.verify_college_id_barcode(text)
from public;

revoke all
on function
public.verify_college_id_barcode(text)
from anon;

grant execute
on function
public.verify_college_id_barcode(text)
to authenticated;
