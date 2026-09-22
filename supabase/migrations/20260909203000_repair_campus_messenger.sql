-- ============================================================
-- CAMPUSCONNECT — MESSENGER REPAIR
-- Existing data is preserved.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Helper: secure membership check
-- ------------------------------------------------------------

create or replace function public.is_chat_member(
  target_conversation uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.chat_members m
    where m.conversation_id = target_conversation
      and m.user_id = auth.uid()
  );
$$;

revoke all
on function public.is_chat_member(uuid)
from public, anon;

grant execute
on function public.is_chat_member(uuid)
to authenticated;


-- ------------------------------------------------------------
-- 2. Permissions
-- ------------------------------------------------------------

grant select, insert, update, delete
on public.chat_connections
to authenticated;

grant select
on public.chat_conversations
to authenticated;

grant select, update
on public.chat_members
to authenticated;

grant select, insert, update
on public.chat_messages
to authenticated;


alter table public.chat_connections
enable row level security;

alter table public.chat_conversations
enable row level security;

alter table public.chat_members
enable row level security;

alter table public.chat_messages
enable row level security;


-- ------------------------------------------------------------
-- 3. CONNECTION REQUEST RLS
-- ------------------------------------------------------------

drop policy if exists
  "Users view own chat connections"
on public.chat_connections;

create policy
  "Users view own chat connections"
on public.chat_connections
for select
to authenticated
using (
  requester_id = auth.uid()
  or receiver_id = auth.uid()
);


drop policy if exists
  "Users send connection requests"
on public.chat_connections;

create policy
  "Users send connection requests"
on public.chat_connections
for insert
to authenticated
with check (
  requester_id = auth.uid()
  and receiver_id <> auth.uid()
);


-- Keep frontend's current accept/reject/cancel model working.
-- Receiver may change requests received by them.
-- Requester may change requests sent by them.
drop policy if exists
  "Users update received connections"
on public.chat_connections;

create policy
  "Participants update own connections"
on public.chat_connections
for update
to authenticated
using (
  requester_id = auth.uid()
  or receiver_id = auth.uid()
)
with check (
  requester_id = auth.uid()
  or receiver_id = auth.uid()
);


-- Existing remove-friend behavior.
drop policy if exists
  "Users remove own chat connections"
on public.chat_connections;

create policy
  "Users remove own chat connections"
on public.chat_connections
for delete
to authenticated
using (
  requester_id = auth.uid()
  or receiver_id = auth.uid()
);


-- ------------------------------------------------------------
-- 4. CONVERSATION READ RLS
-- Conversation creation is done by controlled RPCs.
-- ------------------------------------------------------------

drop policy if exists
  "Members view conversations"
on public.chat_conversations;

create policy
  "Members view conversations"
on public.chat_conversations
for select
to authenticated
using (
  public.is_chat_member(id)
);


-- ------------------------------------------------------------
-- 5. MEMBER RLS
-- ------------------------------------------------------------

drop policy if exists
  "Members view conversation members"
on public.chat_members;

create policy
  "Members view conversation members"
on public.chat_members
for select
to authenticated
using (
  public.is_chat_member(conversation_id)
);


drop policy if exists
  "Members update own membership"
on public.chat_members;

create policy
  "Members update own membership"
on public.chat_members
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);


-- ------------------------------------------------------------
-- 6. MESSAGE RLS
-- ------------------------------------------------------------

drop policy if exists
  "Members view messages"
on public.chat_messages;

create policy
  "Members view messages"
on public.chat_messages
for select
to authenticated
using (
  public.is_chat_member(conversation_id)
);


drop policy if exists
  "Members send messages"
on public.chat_messages;

create policy
  "Members send messages"
on public.chat_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.is_chat_member(conversation_id)
);


drop policy if exists
  "Senders update messages"
on public.chat_messages;

create policy
  "Senders update messages"
on public.chat_messages
for update
to authenticated
using (
  sender_id = auth.uid()
)
with check (
  sender_id = auth.uid()
);


-- ------------------------------------------------------------
-- 7. DIRECT CHAT RPC
-- ------------------------------------------------------------
-- IMPORTANT:
-- The production database already contains
-- get_or_create_direct_chat(uuid) with a different return type.
--
-- Do not replace or drop it here because PostgreSQL does not
-- allow CREATE OR REPLACE to change a function return type,
-- and dropping it without inspecting production dependencies
-- could break existing conversations.
--
-- Existing production RPC is intentionally preserved.


-- ------------------------------------------------------------
-- 8. GROUP CREATION RPC
-- ------------------------------------------------------------

create or replace function public.create_chat_group(
  group_name text,
  group_description text,
  member_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  new_conversation_id uuid;
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  if length(trim(coalesce(group_name, ''))) < 2 then
    raise exception
      'Group name must contain at least 2 characters';
  end if;

  if member_ids is null
     or cardinality(member_ids) < 1 then
    raise exception
      'Select at least one member';
  end if;

  insert into public.chat_conversations (
    conversation_type,
    name,
    description,
    created_by
  )
  values (
    'Group',
    trim(group_name),
    trim(coalesce(group_description, '')),
    me
  )
  returning id
  into new_conversation_id;

  -- Creator becomes group admin.
  insert into public.chat_members (
    conversation_id,
    user_id,
    member_role
  )
  values (
    new_conversation_id,
    me,
    'Admin'
  );

  -- Add valid CampusConnect accounts.
  insert into public.chat_members (
    conversation_id,
    user_id,
    member_role
  )
  select
    new_conversation_id,
    selected.member_id,
    'Member'
  from (
    select distinct unnest(member_ids) member_id
  ) selected
  where selected.member_id is not null
    and selected.member_id <> me
    and exists (
      select 1
      from public.profiles p
      where p.id = selected.member_id
    )
  on conflict (
    conversation_id,
    user_id
  )
  do nothing;

  if (
    select count(*)
    from public.chat_members m
    where m.conversation_id =
      new_conversation_id
  ) < 2 then

    delete
    from public.chat_conversations
    where id = new_conversation_id;

    raise exception
      'No valid members were added';
  end if;

  return new_conversation_id;
end;
$$;

revoke all
on function public.create_chat_group(
  text,
  text,
  uuid[]
)
from public, anon;

grant execute
on function public.create_chat_group(
  text,
  text,
  uuid[]
)
to authenticated;


-- ------------------------------------------------------------
-- 9. Realtime
-- ------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime
    add table public.chat_connections;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime
    add table public.chat_messages;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime
    add table public.chat_members;
exception
  when duplicate_object then null;
end;
$$;
