-- ============================================================
-- CAMPUSCONNECT CAMPUS SEVA KENDRA
-- Real request, approval, comment, attachment and audit system
-- ============================================================

create extension if not exists pgcrypto;


-- ------------------------------------------------------------
-- ROLE HELPER
-- ------------------------------------------------------------

create or replace function
public.campus_service_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select nullif(
        p.role::text,
        ''
      )
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    ),
    nullif(
      auth.jwt()
        -> 'user_metadata'
        ->> 'role',
      ''
    ),
    'Student'
  );
$$;


grant execute
on function
public.campus_service_current_role()
to authenticated;


-- ------------------------------------------------------------
-- REQUEST TABLE
-- ------------------------------------------------------------

create table if not exists
public.campus_service_requests (
  id uuid primary key
    default gen_random_uuid(),

  request_number text
    not null
    unique,

  requester_id uuid
    not null
    references auth.users(id)
    on delete cascade,

  requester_name text
    not null,

  requester_role text
    not null,

  department text
    not null
    default '',

  category text
    not null
    check (
      category in (
        'Bonafide Certificate',
        'Leave Request',
        'ID Card Correction',
        'Attendance Correction',
        'Placement Query',
        'Technical Complaint',
        'Campus Grievance',
        'Event Permission',
        'Other'
      )
    ),

  subject text
    not null
    check (
      char_length(
        trim(subject)
      ) between 4 and 160
    ),

  description text
    not null
    check (
      char_length(
        trim(description)
      ) between 10 and 5000
    ),

  priority text
    not null
    default 'Normal'
    check (
      priority in (
        'Low',
        'Normal',
        'High',
        'Urgent'
      )
    ),

  status text
    not null
    default 'Pending'
    check (
      status in (
        'Pending',
        'Under Review',
        'Changes Required',
        'Approved',
        'Rejected',
        'Resolved'
      )
    ),

  assigned_role text
    not null
    default 'Coordinator'
    check (
      assigned_role in (
        'Faculty',
        'Placement Cell',
        'Coordinator',
        'Volunteer',
        'Main Admin'
      )
    ),

  assigned_to uuid
    references auth.users(id)
    on delete set null,

  assigned_name text,

  resolution_note text
    not null
    default '',

  due_at timestamptz,

  closed_at timestamptz,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);


create index if not exists
campus_service_requests_requester_idx
on public.campus_service_requests(
  requester_id,
  created_at desc
);


create index if not exists
campus_service_requests_queue_idx
on public.campus_service_requests(
  assigned_role,
  assigned_to,
  status,
  created_at desc
);


create index if not exists
campus_service_requests_number_idx
on public.campus_service_requests(
  request_number
);


-- ------------------------------------------------------------
-- COMMENTS
-- ------------------------------------------------------------

create table if not exists
public.campus_service_comments (
  id uuid primary key
    default gen_random_uuid(),

  request_id uuid
    not null
    references
      public.campus_service_requests(id)
    on delete cascade,

  author_id uuid
    not null
    references auth.users(id)
    on delete cascade,

  author_name text
    not null,

  author_role text
    not null,

  body text
    not null
    check (
      char_length(
        trim(body)
      ) between 1 and 2000
    ),

  created_at timestamptz
    not null
    default now()
);


create index if not exists
campus_service_comments_request_idx
on public.campus_service_comments(
  request_id,
  created_at
);


-- ------------------------------------------------------------
-- AUDIT EVENTS
-- ------------------------------------------------------------

create table if not exists
public.campus_service_events (
  id uuid primary key
    default gen_random_uuid(),

  request_id uuid
    not null
    references
      public.campus_service_requests(id)
    on delete cascade,

  actor_id uuid
    references auth.users(id)
    on delete set null,

  actor_name text
    not null
    default 'CampusConnect',

  actor_role text
    not null
    default 'System',

  event_type text
    not null,

  message text
    not null,

  created_at timestamptz
    not null
    default now()
);


create index if not exists
campus_service_events_request_idx
on public.campus_service_events(
  request_id,
  created_at
);


-- ------------------------------------------------------------
-- ATTACHMENT RECORDS
-- ------------------------------------------------------------

create table if not exists
public.campus_service_attachments (
  id uuid primary key
    default gen_random_uuid(),

  request_id uuid
    not null
    references
      public.campus_service_requests(id)
    on delete cascade,

  uploader_id uuid
    not null
    references auth.users(id)
    on delete cascade,

  file_name text
    not null,

  storage_path text
    not null
    unique,

  mime_type text,

  file_size bigint
    not null
    default 0
    check (
      file_size >= 0 and
      file_size <= 10485760
    ),

  created_at timestamptz
    not null
    default now()
);


create index if not exists
campus_service_attachments_request_idx
on public.campus_service_attachments(
  request_id,
  created_at
);


-- ------------------------------------------------------------
-- AUTOMATIC REQUEST NUMBER AND ROUTING
-- ------------------------------------------------------------

create or replace function
public.prepare_campus_service_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.request_number is null
     or trim(new.request_number) = ''
  then
    new.request_number :=
      'CC-SEVA-' ||
      to_char(
        now(),
        'YYYYMMDD'
      ) ||
      '-' ||
      upper(
        substr(
          replace(
            gen_random_uuid()::text,
            '-',
            ''
          ),
          1,
          8
        )
      );
  end if;

  new.requester_id :=
    auth.uid();

  new.requester_role :=
    public.campus_service_current_role();

  new.status :=
    'Pending';

  new.assigned_to :=
    null;

  new.assigned_name :=
    null;

  new.resolution_note :=
    '';

  new.assigned_role :=
    case new.category
      when 'Attendance Correction'
        then 'Faculty'
      when 'Leave Request'
        then 'Faculty'
      when 'Placement Query'
        then 'Placement Cell'
      when 'Bonafide Certificate'
        then 'Coordinator'
      when 'Campus Grievance'
        then 'Coordinator'
      when 'Event Permission'
        then 'Coordinator'
      when 'ID Card Correction'
        then 'Main Admin'
      when 'Technical Complaint'
        then 'Main Admin'
      else 'Coordinator'
    end;

  new.created_at :=
    now();

  new.updated_at :=
    now();

  return new;
end;
$$;


drop trigger if exists
prepare_campus_service_request_trigger
on public.campus_service_requests;


create trigger
prepare_campus_service_request_trigger
before insert
on public.campus_service_requests
for each row
execute function
public.prepare_campus_service_request();


-- ------------------------------------------------------------
-- UPDATE PROTECTION AND TIMESTAMPS
-- ------------------------------------------------------------

create or replace function
public.protect_campus_service_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id
     or new.request_number
        is distinct from
        old.request_number
     or new.requester_id
        is distinct from
        old.requester_id
     or new.created_at
        is distinct from
        old.created_at
  then
    raise exception
      'Protected request identity fields cannot be changed.';
  end if;

  new.updated_at :=
    now();

  if new.status in (
    'Approved',
    'Rejected',
    'Resolved'
  ) then
    new.closed_at :=
      coalesce(
        old.closed_at,
        now()
      );
  else
    new.closed_at :=
      null;
  end if;

  return new;
end;
$$;


drop trigger if exists
protect_campus_service_request_trigger
on public.campus_service_requests;


create trigger
protect_campus_service_request_trigger
before update
on public.campus_service_requests
for each row
execute function
public.protect_campus_service_request();


-- ------------------------------------------------------------
-- ACCESS HELPER
-- ------------------------------------------------------------

create or replace function
public.campus_service_can_access_request(
  target_request_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.campus_service_requests request
    where request.id =
      target_request_id
    and (
      request.requester_id =
        auth.uid()

      or public.campus_service_current_role() =
        'Main Admin'

      or request.assigned_to =
        auth.uid()

      or (
        request.assigned_to is null
        and request.assigned_role =
          public.campus_service_current_role()
        and public.campus_service_current_role()
          in (
            'Faculty',
            'Placement Cell',
            'Coordinator',
            'Volunteer'
          )
      )
    )
  );
$$;


grant execute
on function
public.campus_service_can_access_request(uuid)
to authenticated;


-- ------------------------------------------------------------
-- AUTOMATIC AUDIT HISTORY
-- ------------------------------------------------------------

create or replace function
public.audit_campus_service_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_name text;
  actor_role_value text;
begin
  select
    coalesce(
      nullif(
        profile.full_name,
        ''
      ),
      auth.jwt()
        -> 'user_metadata'
        ->> 'full_name',
      'Campus member'
    )
  into current_name
  from public.profiles profile
  where profile.id =
    auth.uid()
  limit 1;

  current_name :=
    coalesce(
      current_name,
      auth.jwt()
        -> 'user_metadata'
        ->> 'full_name',
      'Campus member'
    );

  actor_role_value :=
    public.campus_service_current_role();

  if tg_op = 'INSERT' then
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
      auth.uid(),
      new.requester_name,
      new.requester_role,
      'created',
      'Request submitted to the ' ||
      new.assigned_role ||
      ' service queue.'
    );

    return new;
  end if;

  if new.status
     is distinct from
     old.status
  then
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
      auth.uid(),
      current_name,
      actor_role_value,
      'status_changed',
      'Status changed from ' ||
      old.status ||
      ' to ' ||
      new.status ||
      '.'
    );
  end if;

  if new.assigned_to
     is distinct from
     old.assigned_to
  then
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
      auth.uid(),
      current_name,
      actor_role_value,
      'assigned',
      case
        when new.assigned_to is null
          then
            'Request returned to the ' ||
            new.assigned_role ||
            ' queue.'
        else
          'Request claimed by ' ||
          coalesce(
            new.assigned_name,
            current_name
          ) ||
          '.'
      end
    );
  end if;

  if new.assigned_role
     is distinct from
     old.assigned_role
  then
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
      auth.uid(),
      current_name,
      actor_role_value,
      'rerouted',
      'Request routed to ' ||
      new.assigned_role ||
      '.'
    );
  end if;

  if trim(
    coalesce(
      new.resolution_note,
      ''
    )
  ) <> trim(
    coalesce(
      old.resolution_note,
      ''
    )
  ) then
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
      auth.uid(),
      current_name,
      actor_role_value,
      'resolution_updated',
      'Resolution note updated.'
    );
  end if;

  return new;
end;
$$;


drop trigger if exists
audit_campus_service_request_trigger
on public.campus_service_requests;


create trigger
audit_campus_service_request_trigger
after insert or update
on public.campus_service_requests
for each row
execute function
public.audit_campus_service_request();


-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table
public.campus_service_requests
enable row level security;

alter table
public.campus_service_comments
enable row level security;

alter table
public.campus_service_events
enable row level security;

alter table
public.campus_service_attachments
enable row level security;


drop policy if exists
"campus service request read"
on public.campus_service_requests;

create policy
"campus service request read"
on public.campus_service_requests
for select
to authenticated
using (
  public.campus_service_can_access_request(
    id
  )
);


drop policy if exists
"campus service request create"
on public.campus_service_requests;

create policy
"campus service request create"
on public.campus_service_requests
for insert
to authenticated
with check (
  requester_id =
    auth.uid()
);


drop policy if exists
"campus service request update"
on public.campus_service_requests;

create policy
"campus service request update"
on public.campus_service_requests
for update
to authenticated
using (
  public.campus_service_can_access_request(
    id
  )
)
with check (
  requester_id =
    auth.uid()

  or assigned_to =
    auth.uid()

  or public.campus_service_current_role() =
    'Main Admin'

  or (
    assigned_to is null
    and assigned_role =
      public.campus_service_current_role()
  )
);


drop policy if exists
"campus service request delete pending"
on public.campus_service_requests;

create policy
"campus service request delete pending"
on public.campus_service_requests
for delete
to authenticated
using (
  requester_id =
    auth.uid()
  and status =
    'Pending'
);


drop policy if exists
"campus service comment read"
on public.campus_service_comments;

create policy
"campus service comment read"
on public.campus_service_comments
for select
to authenticated
using (
  public.campus_service_can_access_request(
    request_id
  )
);


drop policy if exists
"campus service comment create"
on public.campus_service_comments;

create policy
"campus service comment create"
on public.campus_service_comments
for insert
to authenticated
with check (
  author_id =
    auth.uid()
  and public.campus_service_can_access_request(
    request_id
  )
);


drop policy if exists
"campus service event read"
on public.campus_service_events;

create policy
"campus service event read"
on public.campus_service_events
for select
to authenticated
using (
  public.campus_service_can_access_request(
    request_id
  )
);


drop policy if exists
"campus service attachment read"
on public.campus_service_attachments;

create policy
"campus service attachment read"
on public.campus_service_attachments
for select
to authenticated
using (
  public.campus_service_can_access_request(
    request_id
  )
);


drop policy if exists
"campus service attachment create"
on public.campus_service_attachments;

create policy
"campus service attachment create"
on public.campus_service_attachments
for insert
to authenticated
with check (
  uploader_id =
    auth.uid()
  and public.campus_service_can_access_request(
    request_id
  )
);


drop policy if exists
"campus service attachment delete"
on public.campus_service_attachments;

create policy
"campus service attachment delete"
on public.campus_service_attachments
for delete
to authenticated
using (
  uploader_id =
    auth.uid()
  or public.campus_service_current_role() =
    'Main Admin'
);


-- ------------------------------------------------------------
-- PRIVATE STORAGE BUCKET
-- ------------------------------------------------------------

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit
)
values (
  'campus-service-attachments',
  'campus-service-attachments',
  false,
  10485760
)
on conflict (id)
do update set
  public = false,
  file_size_limit = 10485760;


drop policy if exists
"campus service storage read"
on storage.objects;

create policy
"campus service storage read"
on storage.objects
for select
to authenticated
using (
  bucket_id =
    'campus-service-attachments'
  and public.campus_service_can_access_request(
    (
      storage.foldername(name)
    )[1]::uuid
  )
);


drop policy if exists
"campus service storage upload"
on storage.objects;

create policy
"campus service storage upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id =
    'campus-service-attachments'
  and (
    storage.foldername(name)
  )[2] =
    auth.uid()::text
  and public.campus_service_can_access_request(
    (
      storage.foldername(name)
    )[1]::uuid
  )
);


drop policy if exists
"campus service storage delete"
on storage.objects;

create policy
"campus service storage delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id =
    'campus-service-attachments'
  and (
    (
      storage.foldername(name)
    )[2] =
      auth.uid()::text
    or public.campus_service_current_role() =
      'Main Admin'
  )
);


-- ------------------------------------------------------------
-- GRANTS
-- ------------------------------------------------------------

grant select, insert, update, delete
on public.campus_service_requests
to authenticated;

grant select, insert
on public.campus_service_comments
to authenticated;

grant select
on public.campus_service_events
to authenticated;

grant select, insert, delete
on public.campus_service_attachments
to authenticated;


-- ------------------------------------------------------------
-- REALTIME
-- ------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime
    add table
    public.campus_service_requests;
exception
  when duplicate_object then
    null;
end;
$$;

do $$
begin
  alter publication supabase_realtime
    add table
    public.campus_service_comments;
exception
  when duplicate_object then
    null;
end;
$$;

do $$
begin
  alter publication supabase_realtime
    add table
    public.campus_service_events;
exception
  when duplicate_object then
    null;
end;
$$;
