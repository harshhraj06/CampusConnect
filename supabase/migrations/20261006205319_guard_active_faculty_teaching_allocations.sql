create or replace function public.guard_active_faculty_teaching_allocation()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if
    coalesce(
      new.status,
      ''
    ) = 'Active'
  then
    if not exists (
      select
        1
      from
        public.profiles profile
      where
        profile.id =
          new.faculty_id
        and profile.role =
          'Faculty'
        and coalesce(
          profile.account_status,
          ''
        ) = 'Active'
    )
    then
      raise exception
        'Only an active Faculty account can have an active teaching allocation.';
    end if;
  end if;

  return new;
end;
$function$;

revoke execute on function public.guard_active_faculty_teaching_allocation()
from public, anon, authenticated;

drop trigger if exists
  trg_guard_active_faculty_teaching_allocation
on public.faculty_teaching_allocations;

create trigger
  trg_guard_active_faculty_teaching_allocation
before insert or update
on public.faculty_teaching_allocations
for each row
execute function
  public.guard_active_faculty_teaching_allocation();

notify pgrst, 'reload schema';
