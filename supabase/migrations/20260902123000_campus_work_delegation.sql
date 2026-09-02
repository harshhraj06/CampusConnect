
-- ============================================================
-- CAMPUSCONNECT SCOPED WORK DELEGATION
-- Main Admin can delegate one Event Scanner or Seva task
-- to an existing verified CampusConnect account.
-- ============================================================

begin;


-- ------------------------------------------------------------
-- DELEGATION RECORDS
-- ------------------------------------------------------------

create table if not exists
public.campus_work_delegations (
  id uuid primary key
    default gen_random_uuid(),

  assignee_id uuid
    not null
    references auth.users(id)
    on delete cascade,

  assignee_email text
    not null,

  assignee_name text
    not null
    default 'Campus member',

  permission text
    not null
    check (
      permission in (
        'EVENT_SCAN',
        'SEVA_PROCESS'
      )
    ),

  resource_id uuid
    not null,

  resource_label text
    not null
    default '',

  reason text
    not null
    default '',

  starts_at timestamptz
    not null
    default now(),

  expires_at timestamptz
    not null,

  granted_by uuid
    not null
    references auth.users(id)
    on delete restrict,

  granted_by_name text
    not null
    default 'Main Admin',

  revoked_at timestamptz,

  revoked_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  check (
    expires_at >
    starts_at
  )
);


create index if not exists
campus_work_delegations_assignee_idx
on public.campus_work_delegations (
  assignee_id,
  permission,
  expires_at desc
);


create index if not exists
campus_work_delegations_resource_idx
on public.campus_work_delegations (
  permission,
  resource_id,
  expires_at desc
);


create unique index if not exists
campus_work_delegations_active_unique_idx
on public.campus_work_delegations (
  assignee_id,
  permission,
  resource_id
)
where revoked_at is null;


alter table
public.campus_work_delegations
enable row level security;


-- ------------------------------------------------------------
-- CHECK ACTIVE DELEGATED ACCESS
-- ------------------------------------------------------------

create or replace function
public.has_campus_delegated_access(
  p_permission text,
  p_resource_id uuid
)
returns boolean
language sql
stable
security definer
set search_path =
  pg_catalog,
  public
as $$
  select
    auth.uid() is not null

    and exists (
      select 1
      from public.campus_work_delegations delegation
      where
        delegation.assignee_id =
          auth.uid()

        and delegation.permission =
          upper(
            trim(
              coalesce(
                p_permission,
                ''
              )
            )
          )

        and delegation.resource_id =
          p_resource_id

        and delegation.revoked_at
          is null

        and delegation.starts_at <=
          now()

        and delegation.expires_at >
          now()
    );
$$;


revoke all
on function
public.has_campus_delegated_access(
  text,
  uuid
)
from public, anon;


grant execute
on function
public.has_campus_delegated_access(
  text,
  uuid
)
to authenticated;


-- ------------------------------------------------------------
-- MAIN ADMIN: GRANT ACCESS BY EMAIL
-- ------------------------------------------------------------

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
     or normalized_email !~
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
on function
public.grant_campus_work_by_email(
  text,
  text,
  uuid,
  text,
  timestamptz,
  text
)
from public, anon;


grant execute
on function
public.grant_campus_work_by_email(
  text,
  text,
  uuid,
  text,
  timestamptz,
  text
)
to authenticated;


-- ------------------------------------------------------------
-- MAIN ADMIN: REVOKE ACCESS
-- ------------------------------------------------------------

create or replace function
public.revoke_campus_work_delegation(
  p_delegation_id uuid
)
returns public.campus_work_delegations
language plpgsql
security definer
set search_path =
  pg_catalog,
  public
as $$
declare
  revoked_delegation
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
      'Only Main Admin can revoke delegated work.';
  end if;


  update
    public.campus_work_delegations
  set
    revoked_at =
      now(),

    revoked_by =
      auth.uid(),

    updated_at =
      now()
  where
    id =
      p_delegation_id

    and revoked_at is null
  returning *
  into revoked_delegation;


  if not found then
    raise exception
      'Active delegation was not found.';
  end if;


  return revoked_delegation;
end;
$$;


revoke all
on function
public.revoke_campus_work_delegation(uuid)
from public, anon;


grant execute
on function
public.revoke_campus_work_delegation(uuid)
to authenticated;


-- ------------------------------------------------------------
-- DELEGATION RECORD VISIBILITY
-- ------------------------------------------------------------

drop policy if exists
  "campus work delegation read"
on public.campus_work_delegations;


create policy
  "campus work delegation read"
on public.campus_work_delegations
for select
to authenticated
using (
  assignee_id =
    auth.uid()

  or coalesce(
    public.current_campus_role()::text,
    ''
  ) =
    'Main Admin'
);


revoke all
on public.campus_work_delegations
from public, anon;


grant select
on public.campus_work_delegations
to authenticated;


-- ------------------------------------------------------------
-- EVENT SCANNER AUTHORIZATION
-- Built-in scanner roles OR event-specific delegation.
-- ------------------------------------------------------------

create or replace function
public.can_scan_event_pass(
  p_event_id uuid
)
returns boolean
language sql
stable
security definer
set search_path =
  pg_catalog,
  public
as $$
  select
    auth.uid() is not null

    and exists (
      select 1
      from public.campus_events event
      where event.id =
        p_event_id
    )

    and (
      coalesce(
        public.current_campus_role()::text,
        ''
      ) in (
        'Volunteer',
        'Coordinator',
        'Main Admin'
      )

      or public.has_campus_delegated_access(
        'EVENT_SCAN',
        p_event_id
      )
    );
$$;


revoke all
on function
public.can_scan_event_pass(uuid)
from public, anon;


grant execute
on function
public.can_scan_event_pass(uuid)
to authenticated;


drop policy if exists
  "event_pass_scans_authorized_read"
on public.event_pass_scans;


create policy
  "event_pass_scans_authorized_read"
on public.event_pass_scans
for select
to authenticated
using (
  scanned_by =
    auth.uid()

  or exists (
    select 1
    from public.event_registrations registration
    where
      registration.id =
        event_pass_scans.registration_id

      and registration.student_id =
        auth.uid()
  )

  or coalesce(
    public.current_campus_role()::text,
    ''
  ) in (
    'Volunteer',
    'Coordinator',
    'Main Admin'
  )

  or public.has_campus_delegated_access(
    'EVENT_SCAN',
    event_id
  )
);


-- ------------------------------------------------------------
-- DELEGATED SEVA READ ACCESS
-- Existing Seva policies remain unchanged.
-- ------------------------------------------------------------

drop policy if exists
  "delegated seva request read"
on public.campus_service_requests;


create policy
  "delegated seva request read"
on public.campus_service_requests
for select
to authenticated
using (
  public.has_campus_delegated_access(
    'SEVA_PROCESS',
    id
  )
);


drop policy if exists
  "delegated seva comment read"
on public.campus_service_comments;


create policy
  "delegated seva comment read"
on public.campus_service_comments
for select
to authenticated
using (
  public.has_campus_delegated_access(
    'SEVA_PROCESS',
    request_id
  )
);


drop policy if exists
  "delegated seva event read"
on public.campus_service_events;


create policy
  "delegated seva event read"
on public.campus_service_events
for select
to authenticated
using (
  public.has_campus_delegated_access(
    'SEVA_PROCESS',
    request_id
  )
);


drop policy if exists
  "delegated seva attachment read"
on public.campus_service_attachments;


create policy
  "delegated seva attachment read"
on public.campus_service_attachments
for select
to authenticated
using (
  public.has_campus_delegated_access(
    'SEVA_PROCESS',
    request_id
  )
);


drop policy if exists
  "delegated seva comment create"
on public.campus_service_comments;


create policy
  "delegated seva comment create"
on public.campus_service_comments
for insert
to authenticated
with check (
  author_id =
    auth.uid()

  and public.has_campus_delegated_access(
    'SEVA_PROCESS',
    request_id
  )
);


drop policy if exists
  "delegated seva storage read"
on storage.objects;


create policy
  "delegated seva storage read"
on storage.objects
for select
to authenticated
using (
  bucket_id =
    'campus-service-attachments'

  and public.has_campus_delegated_access(
    'SEVA_PROCESS',
    (
      storage.foldername(name)
    )[1]::uuid
  )
);


-- ------------------------------------------------------------
-- CONTROL WHICH SEVA COLUMNS A DELEGATE MAY CHANGE
-- ------------------------------------------------------------

create or replace function
public.protect_delegated_seva_update()
returns trigger
language plpgsql
security definer
set search_path =
  pg_catalog,
  public
as $$
declare
  native_processor boolean;
  delegated_processor boolean;
begin
  native_processor :=
    coalesce(
      public.campus_service_current_role(),
      ''
    ) =
      'Main Admin'

    or old.assigned_to =
      auth.uid()

    or (
      old.assigned_to is null

      and old.assigned_role =
        public.campus_service_current_role()
    );


  delegated_processor :=
    public.has_campus_delegated_access(
      'SEVA_PROCESS',
      old.id
    );


  if delegated_processor
     and not native_processor
  then
    if
      new.id is distinct from
        old.id

      or new.request_number is distinct from
        old.request_number

      or new.requester_id is distinct from
        old.requester_id

      or new.requester_name is distinct from
        old.requester_name

      or new.requester_role is distinct from
        old.requester_role

      or new.department is distinct from
        old.department

      or new.category is distinct from
        old.category

      or new.subject is distinct from
        old.subject

      or new.description is distinct from
        old.description

      or new.priority is distinct from
        old.priority

      or new.assigned_role is distinct from
        old.assigned_role

      or new.assigned_to is distinct from
        old.assigned_to

      or new.assigned_name is distinct from
        old.assigned_name

      or new.due_at is distinct from
        old.due_at

      or new.created_at is distinct from
        old.created_at
    then
      raise exception
        'Delegated Seva access can only update status and resolution details.';
    end if;
  end if;


  return new;
end;
$$;


drop trigger if exists
protect_delegated_seva_update_trigger
on public.campus_service_requests;


create trigger
protect_delegated_seva_update_trigger
before update
on public.campus_service_requests
for each row
execute function
public.protect_delegated_seva_update();


drop policy if exists
  "delegated seva request update"
on public.campus_service_requests;


create policy
  "delegated seva request update"
on public.campus_service_requests
for update
to authenticated
using (
  public.has_campus_delegated_access(
    'SEVA_PROCESS',
    id
  )
)
with check (
  public.has_campus_delegated_access(
    'SEVA_PROCESS',
    id
  )
);


commit;

notify pgrst, 'reload schema';
