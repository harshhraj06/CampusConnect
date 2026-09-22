-- ============================================================
-- CampusConnect
-- Repair Campus Seva Resolution Pass issuance
--
-- Goals:
-- 1. Preserve existing secure pass architecture.
-- 2. Issue a pass for both Approved and Resolved requests.
-- 3. Repair existing Approved / Resolved requests missing passes.
-- 4. Never expose QR secrets directly.
-- 5. Do not weaken RLS or RPC authorization.
-- ============================================================


-- ------------------------------------------------------------
-- APPROVAL / RESOLUTION METADATA
-- ------------------------------------------------------------

create or replace function
public.prepare_campus_service_approval()
returns trigger
language plpgsql
security definer
set search_path =
  public,
  extensions
as $$
declare
  actor_name_value text;
  actor_role_value text;
begin

  if new.status in (
       'Approved',
       'Resolved'
     )
     and old.status is distinct from
       new.status
     and new.approved_at is null
  then

    select
      nullif(
        trim(
          p.full_name
        ),
        ''
      ),
      nullif(
        trim(
          p.role::text
        ),
        ''
      )
    into
      actor_name_value,
      actor_role_value
    from public.profiles p
    where p.id = auth.uid()
    limit 1;


    new.approved_at :=
      now();

    new.approved_by :=
      coalesce(
        new.approved_by,
        auth.uid()
      );

    new.approved_name :=
      coalesce(
        new.approved_name,
        actor_name_value,
        nullif(
          auth.jwt()
            -> 'user_metadata'
            ->> 'full_name',
          ''
        ),
        new.assigned_name,
        'Campus staff'
      );

    new.approved_role :=
      coalesce(
        new.approved_role,
        actor_role_value,
        public.campus_service_current_role(),
        new.assigned_role,
        'CampusConnect'
      );
  end if;


  if new.status = 'Approved' then
    new.closed_at :=
      null;
  end if;


  if new.status = 'Resolved'
     and new.closed_at is null
  then
    new.closed_at :=
      now();
  end if;


  return new;
end;
$$;


drop trigger if exists
prepare_campus_service_approval_trigger
on public.campus_service_requests;


create trigger
prepare_campus_service_approval_trigger
before update of status
on public.campus_service_requests
for each row
execute function
public.prepare_campus_service_approval();


-- ------------------------------------------------------------
-- SECURE PASS ISSUANCE
-- ------------------------------------------------------------

create or replace function
public.issue_campus_service_resolution_pass()
returns trigger
language plpgsql
security definer
set search_path =
  public,
  extensions
as $$
begin

  if new.status in (
       'Approved',
       'Resolved'
     )
     and old.status is distinct from
       new.status
  then

    insert into
    public.campus_service_resolution_passes (
      request_id,
      issued_by,
      issued_by_name,
      issued_by_role,
      issued_at,
      expires_at
    )
    values (
      new.id,

      coalesce(
        new.approved_by,
        new.assigned_to,
        auth.uid()
      ),

      coalesce(
        new.approved_name,
        new.assigned_name,
        'Campus staff'
      ),

      coalesce(
        new.approved_role,
        new.assigned_role,
        'CampusConnect'
      ),

      coalesce(
        new.approved_at,
        new.updated_at,
        now()
      ),

      coalesce(
        new.approved_at,
        new.updated_at,
        now()
      ) + interval '30 days'
    )
    on conflict (request_id)
    do nothing;


    if found then

      insert into
      public.campus_service_events (
        request_id,
        actor_id,
        actor_name,
        actor_role,
        event_type,
        message
      )
      values (
        new.id,

        coalesce(
          new.approved_by,
          new.assigned_to,
          auth.uid()
        ),

        coalesce(
          new.approved_name,
          new.assigned_name,
          'Campus staff'
        ),

        coalesce(
          new.approved_role,
          new.assigned_role,
          'CampusConnect'
        ),

        'resolution_pass_issued',

        'Seva Resolution Pass and secure QR are ready.'
      );

    end if;

  end if;


  return new;
end;
$$;


drop trigger if exists
issue_campus_service_resolution_pass_trigger
on public.campus_service_requests;


create trigger
issue_campus_service_resolution_pass_trigger
after update of status
on public.campus_service_requests
for each row
execute function
public.issue_campus_service_resolution_pass();


-- ------------------------------------------------------------
-- REPAIR APPROVAL METADATA FOR EXISTING REQUESTS
-- ------------------------------------------------------------

update public.campus_service_requests
set
  approved_at =
    coalesce(
      approved_at,
      updated_at,
      created_at,
      now()
    ),

  approved_by =
    coalesce(
      approved_by,
      assigned_to
    ),

  approved_name =
    coalesce(
      approved_name,
      assigned_name,
      'Campus staff'
    ),

  approved_role =
    coalesce(
      approved_role,
      assigned_role,
      'CampusConnect'
    )

where status in (
  'Approved',
  'Resolved'
)
and approved_at is null;


-- ------------------------------------------------------------
-- REPAIR MISSING PASSES
-- ------------------------------------------------------------

insert into
public.campus_service_resolution_passes (
  request_id,
  issued_by,
  issued_by_name,
  issued_by_role,
  issued_at,
  expires_at
)

select
  request_row.id,

  coalesce(
    request_row.approved_by,
    request_row.assigned_to
  ),

  coalesce(
    request_row.approved_name,
    request_row.assigned_name,
    'Campus staff'
  ),

  coalesce(
    request_row.approved_role,
    request_row.assigned_role,
    'CampusConnect'
  ),

  coalesce(
    request_row.approved_at,
    request_row.updated_at,
    request_row.created_at,
    now()
  ),

  greatest(
    coalesce(
      request_row.approved_at,
      request_row.updated_at,
      request_row.created_at,
      now()
    ) + interval '30 days',

    now() + interval '7 days'
  )

from public.campus_service_requests
  request_row

where request_row.status in (
  'Approved',
  'Resolved'
)

and not exists (
  select 1
  from public.campus_service_resolution_passes
    existing_pass
  where existing_pass.request_id =
    request_row.id
);


-- ------------------------------------------------------------
-- AUDIT REPAIRED PASSES
-- ------------------------------------------------------------

insert into
public.campus_service_events (
  request_id,
  actor_id,
  actor_name,
  actor_role,
  event_type,
  message
)

select
  request_row.id,

  request_row.approved_by,

  coalesce(
    request_row.approved_name,
    request_row.assigned_name,
    'Campus staff'
  ),

  coalesce(
    request_row.approved_role,
    request_row.assigned_role,
    'CampusConnect'
  ),

  'resolution_pass_repaired',

  'Seva Resolution Pass availability was repaired.'

from public.campus_service_requests
  request_row

join public.campus_service_resolution_passes
  pass_row
  on pass_row.request_id =
    request_row.id

where request_row.status in (
  'Approved',
  'Resolved'
)

and not exists (
  select 1
  from public.campus_service_events
    event_row
  where event_row.request_id =
      request_row.id
    and event_row.event_type =
      'resolution_pass_repaired'
);
