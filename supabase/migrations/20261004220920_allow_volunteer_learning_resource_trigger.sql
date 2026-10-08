create or replace function public.enforce_learning_resource_department()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_role text;
  canonical_department text;
  caller_name text;
  caller_department text;
begin
  if auth.uid() is null then
    return new;
  end if;

  caller_role :=
    coalesce(
      public.current_campus_role(),
      ''
    );

  select
    branch.name
  into
    canonical_department
  from
    public.campus_branches branch
  where
    branch.is_active = true
    and
    public.normalize_campus_department(
      new.department
    ) in (
      public.normalize_campus_department(
        branch.name
      ),
      public.normalize_campus_department(
        branch.code
      )
    )
  order by
    branch.name
  limit 1;

  if canonical_department is null then
    raise exception
      'Select a valid active campus department.';
  end if;

  if caller_role = 'Faculty' then
    if not public.faculty_has_department(
      auth.uid(),
      canonical_department
    ) then
      raise exception
        'You are not assigned to this department.';
    end if;

  elsif caller_role = 'Volunteer' then
    select
      profile.department
    into
      caller_department
    from
      public.profiles profile
    where
      profile.id = auth.uid();

    if
      caller_department is null
      or not public.same_campus_department(
        canonical_department,
        caller_department
      )
    then
      raise exception
        'Volunteers can publish learning resources only for their own department.';
    end if;

  elsif caller_role <> 'Main Admin' then
    raise exception
      'Only Faculty, Volunteer, and Main Admin can publish learning resources.';
  end if;

  new.department :=
    canonical_department;

  if tg_op = 'INSERT' then
    new.added_by :=
      auth.uid();

    select
      profile.full_name
    into
      caller_name
    from
      public.profiles profile
    where
      profile.id = auth.uid();

    new.contributor_name :=
      coalesce(
        caller_name,
        new.contributor_name
      );

    new.contributor_role :=
      caller_role;
  else
    new.added_by :=
      old.added_by;
  end if;

  return new;
end;
$function$;
