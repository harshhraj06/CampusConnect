create table if not exists
public.campus_operational_tasks (
  id uuid primary key
    default gen_random_uuid(),

  title text not null,

  description text not null
    default '',

  category text not null
    default 'Operations',

  priority text not null
    default 'Normal',

  status text not null
    default 'Open',

  due_at timestamptz,

  action_url text,

  target_role text,

  assignee_id uuid
    references auth.users(id)
    on delete set null,

  assignee_name text,

  assignee_campus_uid text,

  created_by uuid not null
    default auth.uid()
    references auth.users(id)
    on delete cascade,

  creator_name text not null
    default '',

  creator_role text not null
    default '',

  completed_at timestamptz,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint
    campus_operational_tasks_title_length
  check (
    char_length(trim(title))
    between 3 and 160
  ),

  constraint
    campus_operational_tasks_description_length
  check (
    char_length(description)
    <= 3000
  ),

  constraint
    campus_operational_tasks_category_check
  check (
    category in (
      'Operations',
      'Academic',
      'Placement',
      'Event',
      'Communication',
      'Administration',
      'Other'
    )
  ),

  constraint
    campus_operational_tasks_priority_check
  check (
    priority in (
      'Low',
      'Normal',
      'High',
      'Critical'
    )
  ),

  constraint
    campus_operational_tasks_status_check
  check (
    status in (
      'Open',
      'In Progress',
      'Blocked',
      'Completed',
      'Cancelled'
    )
  ),

  constraint
    campus_operational_tasks_target_role_check
  check (
    target_role is null
    or target_role in (
      'Faculty',
      'Placement Cell',
      'Coordinator',
      'Volunteer',
      'Main Admin'
    )
  ),

  constraint
    campus_operational_tasks_url_check
  check (
    action_url is null
    or action_url ~* '^https?://'
  )
);


create index if not exists
campus_operational_tasks_created_by_idx

on public.campus_operational_tasks (
  created_by,
  created_at desc
);


create index if not exists
campus_operational_tasks_assignee_idx

on public.campus_operational_tasks (
  assignee_id,
  status,
  due_at
);


create index if not exists
campus_operational_tasks_target_role_idx

on public.campus_operational_tasks (
  target_role,
  status,
  due_at
);


create or replace function
public.prepare_campus_operational_task()

returns trigger

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

  v_assignee_name text;

  v_assignee_role text;

  v_assignee_uid text;

  v_self_claim boolean :=
    false;

begin

  if v_actor_id is null then
    raise exception
      'Authentication required.';
  end if;


  select
    nullif(trim(full_name), ''),
    role

  into
    v_actor_name,
    v_actor_role

  from public.profiles

  where id =
    v_actor_id

  limit 1;


  if v_actor_role not in (
    'Faculty',
    'Placement Cell',
    'Coordinator',
    'Volunteer',
    'Main Admin'
  ) then

    raise exception
      'A verified professional role is required.';

  end if;


  new.title :=
    trim(new.title);

  new.description :=
    trim(
      coalesce(
        new.description,
        ''
      )
    );


  if new.action_url is not null then

    new.action_url :=
      nullif(
        trim(new.action_url),
        ''
      );

  end if;


  if
    new.action_url is not null
    and new.action_url
      !~* '^https?://'
  then

    raise exception
      'Only HTTP or HTTPS links are allowed.';

  end if;


  if tg_op =
    'INSERT'
  then

    new.created_by :=
      v_actor_id;

    new.creator_name :=
      coalesce(
        v_actor_name,
        'Campus professional'
      );

    new.creator_role :=
      v_actor_role;

    new.created_at :=
      now();

  else

    new.created_by :=
      old.created_by;

    new.creator_name :=
      old.creator_name;

    new.creator_role :=
      old.creator_role;

    new.created_at :=
      old.created_at;


    v_self_claim :=
      old.assignee_id is null
      and new.assignee_id =
        v_actor_id
      and (
        old.target_role is null
        or old.target_role =
          v_actor_role
      );


    if
      v_actor_id <>
        old.created_by
      and v_actor_role <>
        'Main Admin'
    then

      new.title :=
        old.title;

      new.description :=
        old.description;

      new.category :=
        old.category;

      new.priority :=
        old.priority;

      new.due_at :=
        old.due_at;

      new.action_url :=
        old.action_url;

      new.target_role :=
        old.target_role;


      if not v_self_claim then

        new.assignee_id :=
          old.assignee_id;

      end if;

    end if;

  end if;


  if new.assignee_id is not null then

    select
      nullif(
        trim(full_name),
        ''
      ),
      role,
      nullif(
        trim(campus_uid),
        ''
      )

    into
      v_assignee_name,
      v_assignee_role,
      v_assignee_uid

    from public.profiles

    where id =
      new.assignee_id

    limit 1;


    if v_assignee_role not in (
      'Faculty',
      'Placement Cell',
      'Coordinator',
      'Volunteer',
      'Main Admin'
    ) then

      raise exception
        'Tasks can only be assigned to verified professional accounts.';

    end if;


    new.assignee_name :=
      coalesce(
        v_assignee_name,
        'Campus professional'
      );

    new.assignee_campus_uid :=
      v_assignee_uid;

  else

    new.assignee_name :=
      null;

    new.assignee_campus_uid :=
      null;

  end if;


  if new.status =
    'Completed'
  then

    if tg_op =
      'UPDATE'
    then

      new.completed_at :=
        coalesce(
          old.completed_at,
          now()
        );

    else

      new.completed_at :=
        now();

    end if;

  else

    new.completed_at :=
      null;

  end if;


  new.updated_at :=
    now();


  return new;

end;

$$;


drop trigger if exists
prepare_campus_operational_task_trigger

on public.campus_operational_tasks;


create trigger
prepare_campus_operational_task_trigger

before insert or update

on public.campus_operational_tasks

for each row

execute function
public.prepare_campus_operational_task();


alter table
public.campus_operational_tasks

enable row level security;


drop policy if exists
  "Professional users read operational tasks"

on public.campus_operational_tasks;


create policy
  "Professional users read operational tasks"

on public.campus_operational_tasks

for select

to authenticated

using (
  public.current_campus_role()
    in (
      'Faculty',
      'Placement Cell',
      'Coordinator',
      'Volunteer',
      'Main Admin'
    )

  and (
    created_by =
      (select auth.uid())

    or assignee_id =
      (select auth.uid())

    or public.current_campus_role() =
      'Main Admin'

    or (
      assignee_id is null

      and (
        target_role is null
        or target_role =
          public.current_campus_role()
      )
    )
  )
);


drop policy if exists
  "Professional users create operational tasks"

on public.campus_operational_tasks;


create policy
  "Professional users create operational tasks"

on public.campus_operational_tasks

for insert

to authenticated

with check (
  created_by =
    (select auth.uid())

  and public.current_campus_role()
    in (
      'Faculty',
      'Placement Cell',
      'Coordinator',
      'Volunteer',
      'Main Admin'
    )
);


drop policy if exists
  "Authorized professionals update operational tasks"

on public.campus_operational_tasks;


create policy
  "Authorized professionals update operational tasks"

on public.campus_operational_tasks

for update

to authenticated

using (
  public.current_campus_role()
    in (
      'Faculty',
      'Placement Cell',
      'Coordinator',
      'Volunteer',
      'Main Admin'
    )

  and (
    created_by =
      (select auth.uid())

    or assignee_id =
      (select auth.uid())

    or public.current_campus_role() =
      'Main Admin'

    or (
      assignee_id is null

      and (
        target_role is null
        or target_role =
          public.current_campus_role()
      )
    )
  )
)

with check (
  public.current_campus_role()
    in (
      'Faculty',
      'Placement Cell',
      'Coordinator',
      'Volunteer',
      'Main Admin'
    )
);


drop policy if exists
  "Task creators and admins delete operational tasks"

on public.campus_operational_tasks;


create policy
  "Task creators and admins delete operational tasks"

on public.campus_operational_tasks

for delete

to authenticated

using (
  created_by =
    (select auth.uid())

  or public.current_campus_role() =
    'Main Admin'
);


revoke all

on function
public.prepare_campus_operational_task()

from public;


grant select,
      insert,
      update,
      delete

on public.campus_operational_tasks

to authenticated;


notify pgrst,
  'reload schema';
