create or replace function public.guard_coordinator_faculty_department_scope()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_role text;
  v_department text;
begin
  if auth.uid() is null then
    return new;
  end if;

  v_role :=
    public.current_campus_role();

  if v_role is distinct from 'Coordinator' then
    return new;
  end if;

  v_department :=
    public.current_campus_department();

  if
    v_department is null
    or btrim(v_department) = ''
  then
    raise exception
      'Coordinator department is not configured.';
  end if;

  if tg_op = 'UPDATE' then
    if not public.same_campus_department(
      old.department,
      v_department
    ) then
      raise exception
        'Coordinators cannot modify faculty records outside their department.';
    end if;
  end if;

  if not public.same_campus_department(
    new.department,
    v_department
  ) then
    raise exception
      'Coordinators can only manage faculty records in their own department.';
  end if;

  return new;
end;
$function$;

drop trigger if exists
  trg_guard_coordinator_faculty_department_scope
on public.campus_faculty;

create trigger
  trg_guard_coordinator_faculty_department_scope
before insert or update
on public.campus_faculty
for each row
execute function
  public.guard_coordinator_faculty_department_scope();

revoke execute on function
  public.guard_coordinator_faculty_department_scope()
from public, anon, authenticated;

notify pgrst, 'reload schema';
