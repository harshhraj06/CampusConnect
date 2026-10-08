create or replace function public.find_campus_user_by_uid(
  lookup_uid text
)
returns table(
  id uuid,
  full_name text,
  email text,
  role text,
  department text,
  graduation_year text,
  campus_uid text,
  avatar_url text
)
language plpgsql
stable
security definer
set search_path to
  'pg_catalog',
  'public'
as $function$
declare
  v_uid text;
begin
  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.profiles caller
    where
      caller.id = auth.uid()
      and coalesce(
        caller.account_status::text,
        'Active'
      ) = 'Active'
  ) then
    raise exception
      'Active CampusConnect account required.';
  end if;

  v_uid :=
    upper(
      btrim(
        coalesce(
          lookup_uid,
          ''
        )
      )
    );

  if
    v_uid = ''
    or char_length(v_uid) > 80
  then
    return;
  end if;

  return query
  select
    profile.id,
    profile.full_name,
    ''::text as email,
    profile.role::text,
    profile.department,
    ''::text as graduation_year,
    profile.campus_uid,
    profile.avatar_url
  from public.profiles profile
  where
    upper(
      btrim(
        coalesce(
          profile.campus_uid,
          ''
        )
      )
    ) = v_uid
    and coalesce(
      profile.account_status::text,
      'Active'
    ) = 'Active'
  limit 1;
end;
$function$;


create or replace function public.find_campus_users_by_ids(
  user_ids uuid[]
)
returns table(
  id uuid,
  full_name text,
  email text,
  role text,
  department text,
  graduation_year text,
  campus_uid text,
  avatar_url text
)
language plpgsql
stable
security definer
set search_path to
  'pg_catalog',
  'public'
as $function$
declare
  v_user_ids uuid[];
begin
  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.profiles caller
    where
      caller.id = auth.uid()
      and coalesce(
        caller.account_status::text,
        'Active'
      ) = 'Active'
  ) then
    raise exception
      'Active CampusConnect account required.';
  end if;

  v_user_ids :=
    coalesce(
      user_ids,
      array[]::uuid[]
    );

  if cardinality(v_user_ids) > 100 then
    raise exception
      'Too many user profiles requested.';
  end if;

  return query
  select
    profile.id,
    profile.full_name,
    ''::text as email,
    profile.role::text,
    profile.department,
    ''::text as graduation_year,
    profile.campus_uid,
    profile.avatar_url
  from public.profiles profile
  where
    profile.id =
      any(v_user_ids)

    and coalesce(
      profile.account_status::text,
      'Active'
    ) = 'Active'

    and (
      profile.id =
        auth.uid()

      or exists (
        select 1
        from public.chat_connections connection
        where
          (
            connection.requester_id =
              auth.uid()
            and connection.receiver_id =
              profile.id
          )
          or
          (
            connection.receiver_id =
              auth.uid()
            and connection.requester_id =
              profile.id
          )
      )

      or exists (
        select 1
        from public.chat_members caller_member
        join public.chat_members target_member
          on target_member.conversation_id =
             caller_member.conversation_id
        where
          caller_member.user_id =
            auth.uid()
          and target_member.user_id =
            profile.id
      )
    );
end;
$function$;


create or replace function public.find_attendance_student_by_uid(
  target_uid text
)
returns table(
  id uuid,
  full_name text,
  campus_uid text,
  department text,
  graduation_year text,
  email text
)
language plpgsql
stable
security definer
set search_path to
  'pg_catalog',
  'public'
as $function$
declare
  v_uid text;
  v_role text;
begin
  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;

  select
    profile.role::text
  into
    v_role
  from public.profiles profile
  where
    profile.id =
      auth.uid()

    and coalesce(
      profile.account_status::text,
      'Active'
    ) = 'Active';

  if v_role is null then
    raise exception
      'Active CampusConnect account required.';
  end if;

  if v_role not in (
    'Faculty',
    'Main Admin'
  ) then
    raise exception
      'Attendance staff permission required.';
  end if;

  v_uid :=
    upper(
      btrim(
        coalesce(
          target_uid,
          ''
        )
      )
    );

  if
    v_uid = ''
    or char_length(v_uid) > 80
  then
    return;
  end if;

  return query
  select
    profile.id,
    profile.full_name,
    profile.campus_uid,
    profile.department,
    profile.graduation_year,
    profile.email
  from public.profiles profile
  where
    upper(
      btrim(
        coalesce(
          profile.campus_uid,
          ''
        )
      )
    ) = v_uid

    and profile.role::text =
      'Student'

    and coalesce(
      profile.account_status::text,
      'Active'
    ) = 'Active'
  limit 1;
end;
$function$;


revoke execute on function
public.find_campus_user_by_uid(text)
from public, anon;

revoke execute on function
public.find_campus_users_by_ids(uuid[])
from public, anon;

revoke execute on function
public.find_attendance_student_by_uid(text)
from public, anon;

grant execute on function
public.find_campus_user_by_uid(text)
to authenticated, service_role;

grant execute on function
public.find_campus_users_by_ids(uuid[])
to authenticated, service_role;

grant execute on function
public.find_attendance_student_by_uid(text)
to authenticated, service_role;

notify pgrst, 'reload schema';
