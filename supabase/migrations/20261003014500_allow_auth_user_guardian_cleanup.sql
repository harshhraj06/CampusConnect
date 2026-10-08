begin;

create or replace function
public.guard_guardian_contact_admin_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  if
    coalesce(
      auth.role(),
      ''
    ) = 'service_role'

    or coalesce(
      public.current_campus_role(),
      ''
    ) = 'Main Admin'
  then

    if tg_op = 'DELETE' then
      return old;
    end if;

    return new;

  end if;


  if
    tg_op = 'DELETE'
    and session_user = 'supabase_auth_admin'
  then
    return old;
  end if;


  raise exception
    'Parent / Guardian Contact can only be changed by Main Admin'
    using errcode = '42501';

end;
$$;

commit;
