create extension if not exists pgcrypto;

create table if not exists public.personal_notes (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null
    references auth.users(id)
    on delete cascade,

  title text not null
    default ''
    check (
      char_length(title) <= 200
    ),

  body text not null
    default ''
    check (
      char_length(body) <= 20000
    ),

  category text not null
    default 'General'
    check (
      category in (
        'General',
        'Academic',
        'Placement',
        'Project',
        'Personal',
        'Idea'
      )
    ),

  color_key text not null
    default 'Cream'
    check (
      color_key in (
        'Cream',
        'Blue',
        'Sage',
        'Gold',
        'Terracotta',
        'Lavender',
        'Burgundy'
      )
    ),

  tags text[] not null
    default '{}'::text[],

  is_pinned boolean not null
    default false,

  is_archived boolean not null
    default false,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  check (
    char_length(trim(title)) > 0
    or char_length(trim(body)) > 0
  )
);


create table if not exists public.personal_tasks (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null
    references auth.users(id)
    on delete cascade,

  title text not null
    check (
      char_length(trim(title))
      between 1 and 240
    ),

  description text not null
    default ''
    check (
      char_length(description) <= 10000
    ),

  category text not null
    default 'General'
    check (
      category in (
        'General',
        'Academic',
        'Placement',
        'Project',
        'Personal'
      )
    ),

  priority text not null
    default 'Medium'
    check (
      priority in (
        'Low',
        'Medium',
        'High',
        'Urgent'
      )
    ),

  status text not null
    default 'To Do'
    check (
      status in (
        'To Do',
        'In Progress',
        'Completed',
        'Archived'
      )
    ),

  due_at timestamptz,

  is_important boolean not null
    default false,

  is_pinned boolean not null
    default false,

  completed_at timestamptz,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


create table if not exists public.personal_task_subtasks (
  id uuid primary key default gen_random_uuid(),

  task_id uuid not null
    references public.personal_tasks(id)
    on delete cascade,

  owner_id uuid not null
    references auth.users(id)
    on delete cascade,

  title text not null
    check (
      char_length(trim(title))
      between 1 and 240
    ),

  is_completed boolean not null
    default false,

  display_order integer not null
    default 0,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


create table if not exists public.personal_reminders (
  id uuid primary key default gen_random_uuid(),

  owner_id uuid not null
    references auth.users(id)
    on delete cascade,

  title text not null
    check (
      char_length(trim(title))
      between 1 and 240
    ),

  description text not null
    default ''
    check (
      char_length(description) <= 5000
    ),

  remind_at timestamptz not null,

  repeat_rule text not null
    default 'None'
    check (
      repeat_rule in (
        'None',
        'Daily',
        'Weekly',
        'Monthly'
      )
    ),

  status text not null
    default 'Pending'
    check (
      status in (
        'Pending',
        'Completed',
        'Dismissed'
      )
    ),

  is_important boolean not null
    default false,

  completed_at timestamptz,

  last_triggered_at timestamptz,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


create index if not exists
personal_notes_owner_updated_idx
on public.personal_notes(
  owner_id,
  updated_at desc
);


create index if not exists
personal_notes_owner_pinned_idx
on public.personal_notes(
  owner_id,
  is_pinned,
  updated_at desc
);


create index if not exists
personal_tasks_owner_status_idx
on public.personal_tasks(
  owner_id,
  status,
  due_at
);


create index if not exists
personal_tasks_owner_due_idx
on public.personal_tasks(
  owner_id,
  due_at
)
where status not in (
  'Completed',
  'Archived'
);


create index if not exists
personal_task_subtasks_task_idx
on public.personal_task_subtasks(
  task_id,
  display_order
);


create index if not exists
personal_reminders_owner_pending_idx
on public.personal_reminders(
  owner_id,
  remind_at
)
where status = 'Pending';


alter table public.personal_notes
enable row level security;

alter table public.personal_tasks
enable row level security;

alter table public.personal_task_subtasks
enable row level security;

alter table public.personal_reminders
enable row level security;


drop policy if exists
"personal notes owner read"
on public.personal_notes;

create policy
"personal notes owner read"
on public.personal_notes
for select
to authenticated
using (
  owner_id = auth.uid()
);


drop policy if exists
"personal notes owner insert"
on public.personal_notes;

create policy
"personal notes owner insert"
on public.personal_notes
for insert
to authenticated
with check (
  owner_id = auth.uid()
);


drop policy if exists
"personal notes owner update"
on public.personal_notes;

create policy
"personal notes owner update"
on public.personal_notes
for update
to authenticated
using (
  owner_id = auth.uid()
)
with check (
  owner_id = auth.uid()
);


drop policy if exists
"personal notes owner delete"
on public.personal_notes;

create policy
"personal notes owner delete"
on public.personal_notes
for delete
to authenticated
using (
  owner_id = auth.uid()
);


drop policy if exists
"personal tasks owner read"
on public.personal_tasks;

create policy
"personal tasks owner read"
on public.personal_tasks
for select
to authenticated
using (
  owner_id = auth.uid()
);


drop policy if exists
"personal tasks owner insert"
on public.personal_tasks;

create policy
"personal tasks owner insert"
on public.personal_tasks
for insert
to authenticated
with check (
  owner_id = auth.uid()
);


drop policy if exists
"personal tasks owner update"
on public.personal_tasks;

create policy
"personal tasks owner update"
on public.personal_tasks
for update
to authenticated
using (
  owner_id = auth.uid()
)
with check (
  owner_id = auth.uid()
);


drop policy if exists
"personal tasks owner delete"
on public.personal_tasks;

create policy
"personal tasks owner delete"
on public.personal_tasks
for delete
to authenticated
using (
  owner_id = auth.uid()
);


drop policy if exists
"personal subtasks owner read"
on public.personal_task_subtasks;

create policy
"personal subtasks owner read"
on public.personal_task_subtasks
for select
to authenticated
using (
  owner_id = auth.uid()
);


drop policy if exists
"personal subtasks owner insert"
on public.personal_task_subtasks;

create policy
"personal subtasks owner insert"
on public.personal_task_subtasks
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.personal_tasks task
    where
      task.id = task_id
      and task.owner_id = auth.uid()
  )
);


drop policy if exists
"personal subtasks owner update"
on public.personal_task_subtasks;

create policy
"personal subtasks owner update"
on public.personal_task_subtasks
for update
to authenticated
using (
  owner_id = auth.uid()
)
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.personal_tasks task
    where
      task.id = task_id
      and task.owner_id = auth.uid()
  )
);


drop policy if exists
"personal subtasks owner delete"
on public.personal_task_subtasks;

create policy
"personal subtasks owner delete"
on public.personal_task_subtasks
for delete
to authenticated
using (
  owner_id = auth.uid()
);


drop policy if exists
"personal reminders owner read"
on public.personal_reminders;

create policy
"personal reminders owner read"
on public.personal_reminders
for select
to authenticated
using (
  owner_id = auth.uid()
);


drop policy if exists
"personal reminders owner insert"
on public.personal_reminders;

create policy
"personal reminders owner insert"
on public.personal_reminders
for insert
to authenticated
with check (
  owner_id = auth.uid()
);


drop policy if exists
"personal reminders owner update"
on public.personal_reminders;

create policy
"personal reminders owner update"
on public.personal_reminders
for update
to authenticated
using (
  owner_id = auth.uid()
)
with check (
  owner_id = auth.uid()
);


drop policy if exists
"personal reminders owner delete"
on public.personal_reminders;

create policy
"personal reminders owner delete"
on public.personal_reminders
for delete
to authenticated
using (
  owner_id = auth.uid()
);


grant select, insert, update, delete
on public.personal_notes
to authenticated;

grant select, insert, update, delete
on public.personal_tasks
to authenticated;

grant select, insert, update, delete
on public.personal_task_subtasks
to authenticated;

grant select, insert, update, delete
on public.personal_reminders
to authenticated;


create or replace function
public.touch_personal_workspace_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


drop trigger if exists
personal_notes_updated_at
on public.personal_notes;

create trigger
personal_notes_updated_at
before update
on public.personal_notes
for each row
execute function
public.touch_personal_workspace_updated_at();


drop trigger if exists
personal_tasks_updated_at
on public.personal_tasks;

create trigger
personal_tasks_updated_at
before update
on public.personal_tasks
for each row
execute function
public.touch_personal_workspace_updated_at();


drop trigger if exists
personal_task_subtasks_updated_at
on public.personal_task_subtasks;

create trigger
personal_task_subtasks_updated_at
before update
on public.personal_task_subtasks
for each row
execute function
public.touch_personal_workspace_updated_at();


drop trigger if exists
personal_reminders_updated_at
on public.personal_reminders;

create trigger
personal_reminders_updated_at
before update
on public.personal_reminders
for each row
execute function
public.touch_personal_workspace_updated_at();
