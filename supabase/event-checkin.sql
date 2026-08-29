-- =========================================================
-- CAMPUSCONNECT — SECURE EVENT QR CHECK-IN
-- =========================================================

create extension if not exists pgcrypto;


-- ---------------------------------------------------------
-- Registration check-in fields
-- ---------------------------------------------------------

alter table public.event_registrations
add column if not exists check_in_code text;

alter table public.event_registrations
add column if not exists checked_in boolean
not null default false;

alter table public.event_registrations
add column if not exists checked_in_at timestamptz;

alter table public.event_registrations
add column if not exists checked_in_by uuid
references auth.users(id)
on delete set null;


-- Existing registrations receive a secure random token

update public.event_registrations
set check_in_code = encode(gen_random_bytes(16), 'hex')
where check_in_code is null;


alter table public.event_registrations
alter column check_in_code
set default encode(gen_random_bytes(16), 'hex');

alter table public.event_registrations
alter column check_in_code
set not null;


create unique index if not exists
event_registrations_check_in_code_idx
on public.event_registrations(check_in_code);


create index if not exists
event_registrations_checkin_idx
on public.event_registrations(event_id, checked_in);


-- =========================================================
-- SECURE CHECK-IN RPC
-- Faculty / Placement Cell only
-- =========================================================

create or replace function public.check_in_event_attendee(
  p_event_id uuid,
  p_check_in_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_registration public.event_registrations%rowtype;
begin

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  v_role := public.current_campus_role();

  if v_role not in ('Faculty', 'Placement Cell') then
    raise exception 'Only authorized staff can check in attendees';
  end if;


  select *
  into v_registration
  from public.event_registrations
  where event_id = p_event_id
    and check_in_code = trim(p_check_in_code)
  limit 1;


  if not found then
    raise exception 'Invalid event pass';
  end if;


  if v_registration.status <> 'Going' then
    raise exception 'This registration is not active';
  end if;


  if v_registration.checked_in then
    return jsonb_build_object(
      'success', true,
      'already_checked_in', true,
      'student_name', v_registration.student_name,
      'department', v_registration.department,
      'graduation_year', v_registration.graduation_year,
      'checked_in_at', v_registration.checked_in_at
    );
  end if;


  update public.event_registrations
  set
    checked_in = true,
    checked_in_at = now(),
    checked_in_by = auth.uid(),
    updated_at = now()
  where id = v_registration.id
  returning *
  into v_registration;


  return jsonb_build_object(
    'success', true,
    'already_checked_in', false,
    'student_name', v_registration.student_name,
    'department', v_registration.department,
    'graduation_year', v_registration.graduation_year,
    'checked_in_at', v_registration.checked_in_at
  );

end;
$$;


revoke all
on function public.check_in_event_attendee(uuid, text)
from public;

grant execute
on function public.check_in_event_attendee(uuid, text)
to authenticated;


-- =========================================================
-- OPTIONAL MANUAL UNDO
-- Placement Cell only
-- =========================================================

create or replace function public.undo_event_check_in(
  p_registration_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;


  if public.current_campus_role() <> 'Placement Cell' then
    raise exception 'Only Placement Cell can undo check-in';
  end if;


  update public.event_registrations
  set
    checked_in = false,
    checked_in_at = null,
    checked_in_by = null,
    updated_at = now()
  where id = p_registration_id;


  return found;

end;
$$;


revoke all
on function public.undo_event_check_in(uuid)
from public;

grant execute
on function public.undo_event_check_in(uuid)
to authenticated;
