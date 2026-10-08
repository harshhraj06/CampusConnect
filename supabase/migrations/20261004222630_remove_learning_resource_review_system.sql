create or replace function public.secure_learning_resource()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_role text;
begin
  v_role := public.current_campus_role();

  if tg_op = 'INSERT' then
    new.added_by := auth.uid();
  else
    new.added_by := old.added_by;
  end if;

  new.contributor_role :=
    coalesce(
      v_role,
      'Student'
    );

  if v_role in (
    'Faculty',
    'Volunteer',
    'Coordinator',
    'Placement Cell',
    'Main Admin'
  ) then
    new.is_verified := true;
  end if;

  return new;
end;
$function$;

update public.learning_resources
set is_verified = true
where is_verified = false;

notify pgrst, 'reload schema';
