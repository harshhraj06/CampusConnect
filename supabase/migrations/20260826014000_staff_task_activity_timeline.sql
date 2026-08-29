alter table
public.campus_operational_tasks

add column if not exists
completion_note text;


do $$

begin

  alter table
  public.campus_operational_tasks

  add constraint
    campus_operational_tasks_completion_note_length

  check (
    completion_note is null
    or char_length(
      trim(
        completion_note
      )
    ) <= 2000
  );

exception

  when duplicate_object then
    null;

end;

$$;


do $$

begin

  alter table
  public.campus_operational_tasks

  add constraint
    campus_operational_tasks_critical_completion_note

  check (
    priority <> 'Critical'
    or status <> 'Completed'
    or char_length(
      trim(
        coalesce(
          completion_note,
          ''
        )
      )
    ) >= 10
  );

exception

  when duplicate_object then
    null;

end;

$$;


create table if not exists
public.campus_operational_task_activity (
  id uuid primary key
    default gen_random_uuid(),

  task_id uuid not null
    references
      public.campus_operational_tasks(id)
    on delete cascade,

  actor_id uuid
    references auth.users(id)
    on delete set null,

  actor_name text not null,

  actor_role text not null,

  activity_type text not null,

  message text not null,

  evidence_url text,

  metadata jsonb not null
    default '{}'::jsonb,

  created_at timestamptz not null
    default now(),

  constraint
    campus_task_activity_type_check
  check (
    activity_type in (
      'Created',
      'Claimed',
      'Assignment Changed',
      'Status Changed',
      'Priority Changed',
      'Deadline Changed',
      'Comment',
      'Evidence'
    )
  ),

  constraint
    campus_task_activity_message_length
  check (
    char_length(
      trim(message)
    )
    between 1 and 2000
  ),

  constraint
    campus_task_activity_evidence_url_check
  check (
    evidence_url is null
    or evidence_url ~* '^https?://'
  )
);


create index if not exists
campus_task_activity_task_created_idx

on public.campus_operational_task_activity (
  task_id,
  created_at desc
);


create table if not exists
public.campus_task_notifications (
  id uuid primary key
    default gen_random_uuid(),

  recipient_id uuid not null
    references auth.users(id)
    on delete cascade,

  task_id uuid not null
    references
      public.campus_operational_tasks(id)
    on delete cascade,

  activity_id uuid
    references
      public.campus_operational_task_activity(id)
    on delete cascade,

  title text not null,

  message text not null,

  read_at timestamptz,

  created_at timestamptz not null
    default now()
);


create index if not exists
campus_task_notifications_recipient_idx

on public.campus_task_notifications (
  recipient_id,
  read_at,
  created_at desc
);


create or replace function
public.can_access_campus_operational_task(
  p_task_id uuid
)

returns boolean

language sql

stable

security definer

set search_path =
  public

as $$

  select exists (
    select 1

    from
      public.campus_operational_tasks
        as task

    where
      task.id =
        p_task_id

      and public.current_campus_role()
        in (
          'Faculty',
          'Placement Cell',
          'Coordinator',
          'Volunteer',
          'Main Admin'
        )

      and (
        task.created_by =
          auth.uid()

        or task.assignee_id =
          auth.uid()

        or public.current_campus_role() =
          'Main Admin'

        or (
          task.assignee_id is null

          and (
            task.target_role is null
            or task.target_role =
              public.current_campus_role()
          )
        )
      )
  );

$$;


create or replace function
public.log_campus_operational_task_activity()

returns trigger

language plpgsql

security definer

set search_path =
  public

as $$

declare
  v_actor_id uuid :=
    auth.uid();

  v_actor_name text :=
    'Campus system';

  v_actor_role text :=
    'System';

  v_activity_id uuid;

  v_message text;

begin

  if v_actor_id is not null then

    select
      coalesce(
        nullif(
          trim(full_name),
          ''
        ),
        'Campus professional'
      ),
      role

    into
      v_actor_name,
      v_actor_role

    from public.profiles

    where id =
      v_actor_id

    limit 1;

  end if;


  if tg_op =
    'INSERT'
  then

    insert into
    public.campus_operational_task_activity (
      task_id,
      actor_id,
      actor_name,
      actor_role,
      activity_type,
      message,
      metadata
    )

    values (
      new.id,
      v_actor_id,
      v_actor_name,
      v_actor_role,
      'Created',
      'Operational task created.',
      jsonb_build_object(
        'status',
        new.status,
        'priority',
        new.priority,
        'category',
        new.category
      )
    )

    returning id
    into v_activity_id;


    if
      new.assignee_id is not null
      and new.assignee_id is distinct
        from v_actor_id
    then

      insert into
      public.campus_task_notifications (
        recipient_id,
        task_id,
        activity_id,
        title,
        message
      )

      values (
        new.assignee_id,
        new.id,
        v_activity_id,
        'New operational task',
        new.title
      );

    elsif
      new.assignee_id is null
      and new.target_role is not null
    then

      insert into
      public.campus_task_notifications (
        recipient_id,
        task_id,
        activity_id,
        title,
        message
      )

      select
        profile.id,
        new.id,
        v_activity_id,
        'Task available for your role',
        new.title

      from public.profiles
        as profile

      where
        profile.role =
          new.target_role

        and profile.id is distinct
          from v_actor_id;

    end if;


    return new;

  end if;


  if
    old.assignee_id is distinct
      from new.assignee_id
  then

    if
      old.assignee_id is null
      and new.assignee_id is not null
    then
      v_message :=
        'Task claimed by ' ||
        coalesce(
          new.assignee_name,
          'a professional user'
        ) ||
        '.';
    else
      v_message :=
        'Task assignment changed.';
    end if;


    insert into
    public.campus_operational_task_activity (
      task_id,
      actor_id,
      actor_name,
      actor_role,
      activity_type,
      message,
      metadata
    )

    values (
      new.id,
      v_actor_id,
      v_actor_name,
      v_actor_role,
      case
        when old.assignee_id is null
        then 'Claimed'
        else 'Assignment Changed'
      end,
      v_message,
      jsonb_build_object(
        'previous_assignee_id',
        old.assignee_id,
        'assignee_id',
        new.assignee_id
      )
    )

    returning id
    into v_activity_id;


    if
      new.assignee_id is not null
      and new.assignee_id is distinct
        from v_actor_id
    then

      insert into
      public.campus_task_notifications (
        recipient_id,
        task_id,
        activity_id,
        title,
        message
      )

      values (
        new.assignee_id,
        new.id,
        v_activity_id,
        'Task assigned to you',
        new.title
      );

    end if;

  end if;


  if
    old.status is distinct
      from new.status
  then

    v_message :=
      'Status changed from ' ||
      old.status ||
      ' to ' ||
      new.status ||
      '.';


    insert into
    public.campus_operational_task_activity (
      task_id,
      actor_id,
      actor_name,
      actor_role,
      activity_type,
      message,
      metadata
    )

    values (
      new.id,
      v_actor_id,
      v_actor_name,
      v_actor_role,
      'Status Changed',
      v_message,
      jsonb_build_object(
        'previous_status',
        old.status,
        'status',
        new.status,
        'completion_note',
        new.completion_note
      )
    )

    returning id
    into v_activity_id;


    if
      new.created_by is distinct
        from v_actor_id
    then

      insert into
      public.campus_task_notifications (
        recipient_id,
        task_id,
        activity_id,
        title,
        message
      )

      values (
        new.created_by,
        new.id,
        v_activity_id,
        'Task status updated',
        new.title ||
        ' · ' ||
        new.status
      );

    end if;


    if
      new.assignee_id is not null
      and new.assignee_id is distinct
        from v_actor_id
      and new.assignee_id is distinct
        from new.created_by
    then

      insert into
      public.campus_task_notifications (
        recipient_id,
        task_id,
        activity_id,
        title,
        message
      )

      values (
        new.assignee_id,
        new.id,
        v_activity_id,
        'Task status updated',
        new.title ||
        ' · ' ||
        new.status
      );

    end if;

  end if;


  if
    old.priority is distinct
      from new.priority
  then

    insert into
    public.campus_operational_task_activity (
      task_id,
      actor_id,
      actor_name,
      actor_role,
      activity_type,
      message,
      metadata
    )

    values (
      new.id,
      v_actor_id,
      v_actor_name,
      v_actor_role,
      'Priority Changed',
      'Priority changed from ' ||
        old.priority ||
        ' to ' ||
        new.priority ||
        '.',
      jsonb_build_object(
        'previous_priority',
        old.priority,
        'priority',
        new.priority
      )
    );

  end if;


  if
    old.due_at is distinct
      from new.due_at
  then

    insert into
    public.campus_operational_task_activity (
      task_id,
      actor_id,
      actor_name,
      actor_role,
      activity_type,
      message,
      metadata
    )

    values (
      new.id,
      v_actor_id,
      v_actor_name,
      v_actor_role,
      'Deadline Changed',
      'Task deadline changed.',
      jsonb_build_object(
        'previous_due_at',
        old.due_at,
        'due_at',
        new.due_at
      )
    );

  end if;


  return new;

end;

$$;


drop trigger if exists
log_campus_operational_task_activity_trigger

on public.campus_operational_tasks;


create trigger
log_campus_operational_task_activity_trigger

after insert or update

on public.campus_operational_tasks

for each row

execute function
public.log_campus_operational_task_activity();


create or replace function
public.add_campus_task_comment(
  p_task_id uuid,
  p_message text,
  p_evidence_url text
)

returns uuid

language plpgsql

security definer

set search_path =
  public

as $$

declare
  v_actor_id uuid :=
    auth.uid();

  v_actor_name text;

  v_actor_role text;

  v_message text :=
    trim(
      coalesce(
        p_message,
        ''
      )
    );

  v_evidence_url text :=
    nullif(
      trim(
        coalesce(
          p_evidence_url,
          ''
        )
      ),
      ''
    );

  v_activity_id uuid;

  v_task
    public.campus_operational_tasks%rowtype;

begin

  if
    v_actor_id is null
    or not public
      .can_access_campus_operational_task(
        p_task_id
      )
  then

    raise exception
      'You do not have access to this task.';

  end if;


  if
    char_length(
      v_message
    ) not between 2 and 2000
  then

    raise exception
      'Enter a progress note between 2 and 2000 characters.';

  end if;


  if
    v_evidence_url is not null
    and v_evidence_url
      !~* '^https?://'
  then

    raise exception
      'Only HTTP or HTTPS evidence links are allowed.';

  end if;


  select *
  into v_task

  from
    public.campus_operational_tasks

  where id =
    p_task_id;


  select
    coalesce(
      nullif(
        trim(full_name),
        ''
      ),
      'Campus professional'
    ),
    role

  into
    v_actor_name,
    v_actor_role

  from public.profiles

  where id =
    v_actor_id

  limit 1;


  insert into
  public.campus_operational_task_activity (
    task_id,
    actor_id,
    actor_name,
    actor_role,
    activity_type,
    message,
    evidence_url
  )

  values (
    p_task_id,
    v_actor_id,
    coalesce(
      v_actor_name,
      'Campus professional'
    ),
    coalesce(
      v_actor_role,
      'Professional'
    ),
    case
      when v_evidence_url is null
      then 'Comment'
      else 'Evidence'
    end,
    v_message,
    v_evidence_url
  )

  returning id
  into v_activity_id;


  if
    v_task.created_by is distinct
      from v_actor_id
  then

    insert into
    public.campus_task_notifications (
      recipient_id,
      task_id,
      activity_id,
      title,
      message
    )

    values (
      v_task.created_by,
      p_task_id,
      v_activity_id,
      'New task update',
      v_task.title
    );

  end if;


  if
    v_task.assignee_id is not null
    and v_task.assignee_id is distinct
      from v_actor_id
    and v_task.assignee_id is distinct
      from v_task.created_by
  then

    insert into
    public.campus_task_notifications (
      recipient_id,
      task_id,
      activity_id,
      title,
      message
    )

    values (
      v_task.assignee_id,
      p_task_id,
      v_activity_id,
      'New task update',
      v_task.title
    );

  end if;


  return v_activity_id;

end;

$$;


alter table
public.campus_operational_task_activity

enable row level security;


alter table
public.campus_task_notifications

enable row level security;


drop policy if exists
  "Authorized professionals read task activity"

on public.campus_operational_task_activity;


create policy
  "Authorized professionals read task activity"

on public.campus_operational_task_activity

for select

to authenticated

using (
  public.can_access_campus_operational_task(
    task_id
  )
);


drop policy if exists
  "Users read own task notifications"

on public.campus_task_notifications;


create policy
  "Users read own task notifications"

on public.campus_task_notifications

for select

to authenticated

using (
  recipient_id =
    (select auth.uid())
);


drop policy if exists
  "Users update own task notifications"

on public.campus_task_notifications;


create policy
  "Users update own task notifications"

on public.campus_task_notifications

for update

to authenticated

using (
  recipient_id =
    (select auth.uid())
)

with check (
  recipient_id =
    (select auth.uid())
);


revoke all

on public.campus_operational_task_activity

from authenticated;


grant select

on public.campus_operational_task_activity

to authenticated;


revoke all

on public.campus_task_notifications

from authenticated;


grant select,
      update

on public.campus_task_notifications

to authenticated;


revoke all

on function
public.can_access_campus_operational_task(uuid)

from public;


revoke all

on function
public.add_campus_task_comment(
  uuid,
  text,
  text
)

from public;


grant execute

on function
public.can_access_campus_operational_task(uuid)

to authenticated;


grant execute

on function
public.add_campus_task_comment(
  uuid,
  text,
  text
)

to authenticated;


notify pgrst,
  'reload schema';
