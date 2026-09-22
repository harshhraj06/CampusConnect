-- Repair lowercase email validation for work delegation.

begin;

create or replace function
public.grant_campus_work_by_email(
  p_email text,
  p_permission text,
  p_resource_id uuid,
  p_resource_label text default '',
  p_expires_at timestamptz default (
    now() +
    interval '7 days'
  ),
  p_reason text default ''
)
returns public.campus_work_delegations
language plpgsql
security definer
set search_path =
  pg_catalog,
  public,
  auth
as $$
declare
  normalized_email text;
  normalized_permission text;

  target_id uuid;
  target_email text;
  target_name text;

  admin_name text;

  saved_delegation
    public.campus_work_delegations%rowtype;
begin
  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;


  if coalesce(
    public.current_campus_role()::text,
    ''
  ) <> 'Main Admin'
  then
    raise exception
      'Only Main Admin can delegate campus work.';
  end if;


  normalized_email :=
    lower(
      trim(
        coalesce(
          p_email,
          ''
        )
      )
    );


  if normalized_email = ''
     or normalized_email !~*
       '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
       collate "C"
  then
    raise exception
      'Enter a valid CampusConnect account email.';
  end if;


  normalized_permission :=
    upper(
      trim(
        coalesce(
          p_permission,
          ''
        )
      )
    );


  if normalized_permission not in (
    'EVENT_SCAN',
    'SEVA_PROCESS'
  )
  then
    raise exception
      'Invalid delegated permission.';
  end if;


  if p_resource_id is null then
    raise exception
      'A specific event or Seva request is required.';
  end if;


  if p_expires_at is null
     or p_expires_at <= now()
  then
    raise exception
      'Delegation expiry must be in the future.';
  end if;


  if p_expires_at >
     now() + interval '90 days'
  then
    raise exception
      'Delegated access cannot exceed 90 days.';
  end if;


  if normalized_permission =
       'EVENT_SCAN'
     and not exists (
       select 1
       from public.campus_events event
       where event.id =
         p_resource_id
     )
  then
    raise exception
      'The selected event does not exist.';
  end if;


  if normalized_permission =
       'SEVA_PROCESS'
     and not exists (
       select 1
       from public.campus_service_requests request
       where request.id =
         p_resource_id
     )
  then
    raise exception
      'The selected Seva request does not exist.';
  end if;


  select
    profile.id,
    lower(
      coalesce(
        nullif(
          trim(
            profile.email
          ),
          ''
        ),
        campus_user.email
      )
    ),
    coalesce(
      nullif(
        trim(
          profile.full_name
        ),
        ''
      ),
      split_part(
        campus_user.email,
        '@',
        1
      )
    )
  into
    target_id,
    target_email,
    target_name
  from public.profiles profile
  join auth.users campus_user
    on campus_user.id =
      profile.id
  where
    lower(
      coalesce(
        nullif(
          trim(
            profile.email
          ),
          ''
        ),
        campus_user.email
      )
    ) =
      normalized_email

    and campus_user.email_confirmed_at
      is not null

    and coalesce(
      profile.account_status::text,
      'Active'
    ) =
      'Active'
  limit 1;


  if target_id is null then
    raise exception
      'No active verified CampusConnect account uses this email.';
  end if;


  select
    coalesce(
      nullif(
        trim(
          profile.full_name
        ),
        ''
      ),
      'Main Admin'
    )
  into admin_name
  from public.profiles profile
  where profile.id =
    auth.uid()
  limit 1;


  update
    public.campus_work_delegations
  set
    assignee_email =
      target_email,

    assignee_name =
      target_name,

    resource_label =
      trim(
        coalesce(
          p_resource_label,
          ''
        )
      ),

    reason =
      trim(
        coalesce(
          p_reason,
          ''
        )
      ),

    starts_at =
      now(),

    expires_at =
      p_expires_at,

    granted_by =
      auth.uid(),

    granted_by_name =
      coalesce(
        admin_name,
        'Main Admin'
      ),

    updated_at =
      now()
  where
    assignee_id =
      target_id

    and permission =
      normalized_permission

    and resource_id =
      p_resource_id

    and revoked_at is null
  returning *
  into saved_delegation;


  if found then
    return saved_delegation;
  end if;


  insert into
    public.campus_work_delegations (
      assignee_id,
      assignee_email,
      assignee_name,
      permission,
      resource_id,
      resource_label,
      reason,
      expires_at,
      granted_by,
      granted_by_name
    )
  values (
    target_id,
    target_email,
    target_name,
    normalized_permission,
    p_resource_id,
    trim(
      coalesce(
        p_resource_label,
        ''
      )
    ),
    trim(
      coalesce(
        p_reason,
        ''
      )
    ),
    p_expires_at,
    auth.uid(),
    coalesce(
      admin_name,
      'Main Admin'
    )
  )
  returning *
  into saved_delegation;


  return saved_delegation;
end;
$$;

revoke all
on function public.grant_campus_work_by_email(
  text,
  text,
  uuid,
  text,
  timestamptz,
  text
)
from public, anon;

grant execute
on function public.grant_campus_work_by_email(
  text,
  text,
  uuid,
  text,
  timestamptz,
  text
)
to authenticated;

commit;

notify pgrst, 'reload schema';
