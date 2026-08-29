-- ==========================================================
-- CampusConnect Messenger
-- Secure group administration
-- ==========================================================

create or replace function public.is_chat_admin(
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
      and m.member_role = 'Admin'
  );
$$;

revoke all
on function public.is_chat_admin(uuid)
from public;

grant execute
on function public.is_chat_admin(uuid)
to authenticated;


-- ----------------------------------------------------------
-- Update group name / description
-- ----------------------------------------------------------

create or replace function public.update_chat_group(
  target_conversation uuid,
  next_name text,
  next_description text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_chat_admin(target_conversation) then
    raise exception 'Only group admins can update group information';
  end if;

  if not exists (
    select 1
    from public.chat_conversations c
    where c.id = target_conversation
      and c.conversation_type = 'Group'
  ) then
    raise exception 'Group conversation not found';
  end if;

  if length(trim(next_name)) < 2 then
    raise exception 'Group name must contain at least 2 characters';
  end if;

  update public.chat_conversations
  set
    name = trim(next_name),
    description = trim(coalesce(next_description, '')),
    updated_at = now()
  where id = target_conversation;
end;
$$;

revoke all
on function public.update_chat_group(uuid, text, text)
from public;

grant execute
on function public.update_chat_group(uuid, text, text)
to authenticated;


-- ----------------------------------------------------------
-- Add member
-- ----------------------------------------------------------

create or replace function public.add_chat_group_member(
  target_conversation uuid,
  target_user uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_chat_admin(target_conversation) then
    raise exception 'Only group admins can add members';
  end if;

  if not exists (
    select 1
    from public.chat_conversations c
    where c.id = target_conversation
      and c.conversation_type = 'Group'
  ) then
    raise exception 'Group conversation not found';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = target_user
  ) then
    raise exception 'CampusConnect user not found';
  end if;

  insert into public.chat_members (
    conversation_id,
    user_id,
    member_role
  )
  values (
    target_conversation,
    target_user,
    'Member'
  )
  on conflict (conversation_id, user_id)
  do nothing;

  update public.chat_conversations
  set updated_at = now()
  where id = target_conversation;
end;
$$;

revoke all
on function public.add_chat_group_member(uuid, uuid)
from public;

grant execute
on function public.add_chat_group_member(uuid, uuid)
to authenticated;


-- ----------------------------------------------------------
-- Remove member
-- ----------------------------------------------------------

create or replace function public.remove_chat_group_member(
  target_conversation uuid,
  target_user uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_count integer;
begin
  if not public.is_chat_admin(target_conversation) then
    raise exception 'Only group admins can remove members';
  end if;

  if target_user = auth.uid() then
    raise exception 'Use Leave group to remove yourself';
  end if;

  select count(*)
  into admin_count
  from public.chat_members
  where conversation_id = target_conversation
    and member_role = 'Admin';

  if exists (
    select 1
    from public.chat_members
    where conversation_id = target_conversation
      and user_id = target_user
      and member_role = 'Admin'
  )
  and admin_count <= 1 then
    raise exception 'The group must keep at least one admin';
  end if;

  delete from public.chat_members
  where conversation_id = target_conversation
    and user_id = target_user;

  update public.chat_conversations
  set updated_at = now()
  where id = target_conversation;
end;
$$;

revoke all
on function public.remove_chat_group_member(uuid, uuid)
from public;

grant execute
on function public.remove_chat_group_member(uuid, uuid)
to authenticated;


-- ----------------------------------------------------------
-- Promote / demote
-- ----------------------------------------------------------

create or replace function public.set_chat_group_member_role(
  target_conversation uuid,
  target_user uuid,
  next_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_count integer;
begin
  if not public.is_chat_admin(target_conversation) then
    raise exception 'Only group admins can change member roles';
  end if;

  if next_role not in ('Admin', 'Member') then
    raise exception 'Invalid group role';
  end if;

  if not exists (
    select 1
    from public.chat_members
    where conversation_id = target_conversation
      and user_id = target_user
  ) then
    raise exception 'User is not a member of this group';
  end if;

  select count(*)
  into admin_count
  from public.chat_members
  where conversation_id = target_conversation
    and member_role = 'Admin';

  if next_role = 'Member'
     and exists (
       select 1
       from public.chat_members
       where conversation_id = target_conversation
         and user_id = target_user
         and member_role = 'Admin'
     )
     and admin_count <= 1
  then
    raise exception 'The group must keep at least one admin';
  end if;

  update public.chat_members
  set member_role = next_role
  where conversation_id = target_conversation
    and user_id = target_user;
end;
$$;

revoke all
on function public.set_chat_group_member_role(uuid, uuid, text)
from public;

grant execute
on function public.set_chat_group_member_role(uuid, uuid, text)
to authenticated;


-- ----------------------------------------------------------
-- Leave group
-- ----------------------------------------------------------

create or replace function public.leave_chat_group(
  target_conversation uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  my_role text;
  admin_count integer;
  member_count integer;
begin
  select member_role
  into my_role
  from public.chat_members
  where conversation_id = target_conversation
    and user_id = auth.uid();

  if my_role is null then
    raise exception 'You are not a member of this group';
  end if;

  select count(*)
  into member_count
  from public.chat_members
  where conversation_id = target_conversation;

  if member_count <= 1 then
    delete from public.chat_conversations
    where id = target_conversation;

    return;
  end if;

  if my_role = 'Admin' then
    select count(*)
    into admin_count
    from public.chat_members
    where conversation_id = target_conversation
      and member_role = 'Admin';

    if admin_count <= 1 then
      raise exception 'Promote another member to admin before leaving';
    end if;
  end if;

  delete from public.chat_members
  where conversation_id = target_conversation
    and user_id = auth.uid();

  update public.chat_conversations
  set updated_at = now()
  where id = target_conversation;
end;
$$;

revoke all
on function public.leave_chat_group(uuid)
from public;

grant execute
on function public.leave_chat_group(uuid)
to authenticated;

-- ----------------------------------------------------------
-- Delete group
-- ----------------------------------------------------------

create or replace function public.delete_chat_group(
  target_conversation uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_chat_admin(target_conversation) then
    raise exception 'Only group admins can delete this group';
  end if;

  if not exists (
    select 1
    from public.chat_conversations c
    where c.id = target_conversation
      and c.conversation_type = 'Group'
  ) then
    raise exception 'Group conversation not found';
  end if;

  delete from public.chat_conversations
  where id = target_conversation;
end;
$$;

revoke all
on function public.delete_chat_group(uuid)
from public;

grant execute
on function public.delete_chat_group(uuid)
to authenticated;
