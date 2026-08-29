create table if not exists
public.campus_action_states (
  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  action_key text not null,

  read_at timestamptz,
  dismissed_at timestamptz,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  primary key (
    user_id,
    action_key
  ),

  constraint
    campus_action_states_key_length
  check (
    char_length(action_key)
    between 1 and 240
  )
);


create index if not exists
campus_action_states_user_updated_idx

on public.campus_action_states (
  user_id,
  updated_at desc
);


alter table
public.campus_action_states

enable row level security;


drop policy if exists
  "Users read own action states"

on public.campus_action_states;


create policy
  "Users read own action states"

on public.campus_action_states

for select

to authenticated

using (
  user_id =
    (select auth.uid())
);


drop policy if exists
  "Users create own action states"

on public.campus_action_states;


create policy
  "Users create own action states"

on public.campus_action_states

for insert

to authenticated

with check (
  user_id =
    (select auth.uid())
);


drop policy if exists
  "Users update own action states"

on public.campus_action_states;


create policy
  "Users update own action states"

on public.campus_action_states

for update

to authenticated

using (
  user_id =
    (select auth.uid())
)

with check (
  user_id =
    (select auth.uid())
);


drop policy if exists
  "Users delete own action states"

on public.campus_action_states;


create policy
  "Users delete own action states"

on public.campus_action_states

for delete

to authenticated

using (
  user_id =
    (select auth.uid())
);


grant select,
      insert,
      update,
      delete

on public.campus_action_states

to authenticated;


notify pgrst,
  'reload schema';
