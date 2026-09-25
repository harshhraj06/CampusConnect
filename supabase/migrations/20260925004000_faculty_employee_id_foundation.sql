-- ============================================================
-- CAMPUSCONNECT — FACULTY EMPLOYEE ID FOUNDATION
--
-- Goals:
-- 1. Establish employee_id through migration history.
-- 2. Allow Main Admin to manage Faculty Employee IDs.
-- 3. Prevent Faculty/Student self-edit of employee_id.
-- 4. Preserve employee_id when normal role updates pass NULL.
-- 5. Keep legacy Faculty profile UI compatible by syncing
--    Faculty Employee ID into usn temporarily.
-- ============================================================


-- ------------------------------------------------------------
-- REQUIRED PROFILE COLUMNS
-- ------------------------------------------------------------

alter table public.profiles
add column if not exists
account_status text
not null
default 'Active';


alter table public.profiles
add column if not exists
employee_id text;


alter table public.profiles
add column if not exists
coordinator_scope text;


alter table public.profiles
add column if not exists
volunteer_scope text;



-- ------------------------------------------------------------
-- BACKFILL EXISTING FACULTY IDS
--
-- Existing Faculty profiles currently display Employee ID
-- through profiles.usn. Preserve those values.
-- ------------------------------------------------------------

update public.profiles
set employee_id =
  upper(
    trim(usn)
  )
where
  role::text = 'Faculty'

  and nullif(
    trim(
      coalesce(
        employee_id,
        ''
      )
    ),
    ''
  ) is null

  and nullif(
    trim(
      coalesce(
        usn,
        ''
      )
    ),
    ''
  ) is not null;



-- Normalize existing employee IDs.
update public.profiles
set employee_id =
  upper(
    trim(employee_id)
  )
where
  nullif(
    trim(
      coalesce(
        employee_id,
        ''
      )
    ),
    ''
  ) is not null;



-- ------------------------------------------------------------
-- PROTECT EMPLOYEE ID FROM NORMAL PROFILE EDITING
-- ------------------------------------------------------------

create or replace function
public.protect_faculty_employee_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  if
    new.employee_id
      is not distinct from
    old.employee_id
  then
    return new;
  end if;


  /*
   * Server/service-role operations have no authenticated
   * end-user UID and remain allowed.
   */
  if auth.uid() is null then
    return new;
  end if;


  if not exists (

    select 1

    from public.profiles caller

    where
      caller.id = auth.uid()

      and caller.role::text =
        'Main Admin'

  ) then

    raise exception
      'Only Main Admin can change Faculty Employee ID';

  end if;


  return new;

end;
$$;


drop trigger if exists
protect_faculty_employee_id_trigger
on public.profiles;


create trigger
protect_faculty_employee_id_trigger

before update of employee_id
on public.profiles

for each row

execute function
public.protect_faculty_employee_id();



-- ------------------------------------------------------------
-- MAIN ADMIN ACCOUNT UPDATE RPC
-- ------------------------------------------------------------

create or replace function
public.admin_update_campus_account(
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
set search_path = ''
as $$
declare

  clean_employee_id text;

begin


  if auth.uid() is null then

    raise exception
      'Authentication required';

  end if;



  if not exists (

    select 1

    from public.profiles caller

    where
      caller.id =
        auth.uid()

      and caller.role::text =
        'Main Admin'

  ) then

    raise exception
      'Main Admin permission required';

  end if;



  if p_role not in (
    'Student',
    'Faculty',
    'Placement Cell',
    'Coordinator',
    'Volunteer',
    'Main Admin'
  ) then

    raise exception
      'Invalid CampusConnect role';

  end if;



  if p_account_status not in (
    'Active',
    'Suspended',
    'Disabled'
  ) then

    raise exception
      'Invalid account status';

  end if;



  if not exists (

    select 1

    from public.profiles target

    where
      target.id =
        p_user_id

  ) then

    raise exception
      'Campus account not found';

  end if;



  /*
   * NULL means:
   * preserve the existing Employee ID.
   *
   * This is important because the existing role dropdown
   * calls this RPC with p_employee_id = NULL.
   */
  if p_employee_id is not null then

    if p_role <> 'Faculty' then

      raise exception
        'Employee ID can only be assigned to Faculty accounts';

    end if;


    clean_employee_id :=
      upper(
        trim(
          p_employee_id
        )
      );


    if
      clean_employee_id = ''
      or length(
        clean_employee_id
      ) < 2
    then

      raise exception
        'Employee ID is required';

    end if;


    if
      length(
        clean_employee_id
      ) > 80
    then

      raise exception
        'Employee ID must be 80 characters or fewer';

    end if;


    if exists (

      select 1

      from public.profiles duplicate

      where
        duplicate.id <>
          p_user_id

        and upper(
          trim(
            coalesce(
              duplicate.employee_id,
              ''
            )
          )
        ) =
          clean_employee_id

    ) then

      raise exception
        'This Employee ID is already assigned to another account';

    end if;

  end if;



  update public.profiles

  set

    role =
      p_role,

    account_status =
      p_account_status,


    employee_id =
      case

        when
          p_employee_id
            is null
        then
          employee_id

        else
          clean_employee_id

      end,


    /*
     * Compatibility bridge:
     *
     * Current Faculty Profile UI still reads profiles.usn as
     * "Employee ID". Keep it synchronized until that frontend
     * is migrated to profiles.employee_id.
     */
    usn =
      case

        when
          p_employee_id
            is not null

          and p_role =
            'Faculty'

        then
          clean_employee_id

        else
          usn

      end,


    coordinator_scope =
      p_coordinator_scope,

    volunteer_scope =
      p_volunteer_scope,

    updated_at =
      now()

  where
    id =
      p_user_id;


end;
$$;



revoke all
on function
public.admin_update_campus_account(
  uuid,
  text,
  text,
  text,
  text,
  text
)
from public,
     anon;


grant execute
on function
public.admin_update_campus_account(
  uuid,
  text,
  text,
  text,
  text,
  text
)
to authenticated;



-- ------------------------------------------------------------
-- POSTGREST SCHEMA REFRESH
-- ------------------------------------------------------------

notify pgrst,
  'reload schema';
