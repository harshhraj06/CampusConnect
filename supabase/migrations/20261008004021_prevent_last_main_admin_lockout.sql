create or replace function public.admin_update_campus_account(
  p_user_id uuid,
  p_role text,
  p_account_status text,
  p_employee_id text default null::text,
  p_coordinator_scope text default null::text,
  p_volunteer_scope text default null::text
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  clean_employee_id text;
  v_target_role text;
  v_target_status text;
  v_active_main_admin_count integer;
begin
  if auth.uid() is null then
    raise exception
      'Authentication required';
  end if;

  if public.current_campus_role() <>
     'Main Admin'
  then
    raise exception
      'Active Main Admin permission required';
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

  select
    target.role::text,
    coalesce(
      target.account_status::text,
      'Active'
    )
  into
    v_target_role,
    v_target_status
  from public.profiles target
  where
    target.id =
      p_user_id
  for update;

  if not found then
    raise exception
      'Campus account not found';
  end if;

  if
    v_target_role = 'Main Admin'
    and v_target_status = 'Active'
    and (
      p_role <> 'Main Admin'
      or p_account_status <> 'Active'
    )
  then
    select
      count(*)
    into
      v_active_main_admin_count
    from public.profiles profile
    where
      profile.role::text =
        'Main Admin'
      and coalesce(
        profile.account_status::text,
        'Active'
      ) = 'Active';

    if v_active_main_admin_count <= 1 then
      raise exception
        'Cannot demote, suspend, or disable the last active Main Admin.';
    end if;
  end if;

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

    if length(
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
        when p_employee_id is null
        then employee_id
        else clean_employee_id
      end,

    usn =
      case
        when
          p_employee_id is not null
          and p_role = 'Faculty'
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
$function$;


revoke execute on function
public.admin_update_campus_account(
  uuid,
  text,
  text,
  text,
  text,
  text
)
from public, anon;

grant execute on function
public.admin_update_campus_account(
  uuid,
  text,
  text,
  text,
  text,
  text
)
to authenticated, service_role;

notify pgrst, 'reload schema';
