-- =========================================================
-- CAMPUSCONNECT — ACCOUNT / ROLE SECURITY
-- =========================================================

-- Normal authenticated users may update only their own
-- profile row, but privileged fields are protected separately
-- by the RPC/admin flow.

grant update (
  full_name,
  department,
  graduation_year,
  bio,
  skills,
  phone,
  usn
)
on public.profiles
to authenticated;


drop policy if exists "Users update own campus profile"
on public.profiles;

create policy "Users update own campus profile"
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  and account_status = 'Active'
)
with check (
  id = auth.uid()
);


-- =========================================================
-- ADMIN ROLE MANAGEMENT RPC
-- Only Main Admin may change another account's role/status.
-- =========================================================

create or replace function public.admin_update_campus_account(
  p_user_id uuid,
  p_role text,
  p_account_status text,
  p_employee_id text default null,
  p_coordinator_scope text default null,
  p_volunteer_scope text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if public.current_campus_role() <> 'Main Admin' then
    raise exception 'Main Admin permission required';
  end if;

  if p_role not in (
    'Student',
    'Faculty',
    'Placement Cell',
    'Coordinator',
    'Volunteer',
    'Main Admin'
  ) then
    raise exception 'Invalid CampusConnect role';
  end if;

  if p_account_status not in (
    'Active',
    'Suspended',
    'Disabled'
  ) then
    raise exception 'Invalid account status';
  end if;

  update public.profiles
  set
    role = p_role,
    account_status = p_account_status,
    employee_id = p_employee_id,
    coordinator_scope = p_coordinator_scope,
    volunteer_scope = p_volunteer_scope,
    updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception 'Campus account not found';
  end if;

end;
$$;

revoke all
on function public.admin_update_campus_account(
  uuid,
  text,
  text,
  text,
  text,
  text
)
from public;

grant execute
on function public.admin_update_campus_account(
  uuid,
  text,
  text,
  text,
  text,
  text
)
to authenticated;
