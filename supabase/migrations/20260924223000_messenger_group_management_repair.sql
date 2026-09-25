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


-- ============================================================
-- CAMPUSCONNECT
-- MESSENGER GROUP MANAGEMENT REPAIR
--
-- Existing group-admin functions above are promoted into
-- migration history so every environment has the same RPCs.
-- ============================================================


-- ============================================================
-- SECURE GROUP USER SEARCH
--
-- Messenger previously queried profiles directly.
-- That makes search dependent on profiles RLS and can result
-- in only the signed-in profile being visible.
--
-- This function exposes only the profile fields Messenger needs.
-- ============================================================

drop function if exists
public.search_chat_group_users(
  text,
  uuid[]
);


create function
public.search_chat_group_users(
  search_term text,
  excluded_ids uuid[]
  default '{}'::uuid[]
)
returns table (
  id uuid,
  full_name text,
  role text,
  department text,
  graduation_year text,
  campus_uid text,
  avatar_url text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid :=
    auth.uid();

  query_text text :=
    trim(
      coalesce(
        search_term,
        ''
      )
    );
begin

  if me is null then
    raise exception
      'Authentication required';
  end if;


  if char_length(
    query_text
  ) < 2 then
    return;
  end if;


  return query

  select
    profile.id,
    coalesce(
      profile.full_name,
      ''
    )::text,
    coalesce(
      profile.role,
      ''
    )::text,
    coalesce(
      profile.department,
      ''
    )::text,
    coalesce(
      profile.graduation_year,
      ''
    )::text,
    coalesce(
      profile.campus_uid,
      ''
    )::text,
    coalesce(
      profile.avatar_url,
      ''
    )::text

  from public.profiles
    as profile

  where
    profile.id <> me

    and not (
      profile.id =
      any(
        coalesce(
          excluded_ids,
          '{}'::uuid[]
        )
      )
    )

    and (
      coalesce(
        profile.full_name,
        ''
      ) ilike
        '%' ||
        query_text ||
        '%'

      or

      coalesce(
        profile.campus_uid,
        ''
      ) ilike
        '%' ||
        query_text ||
        '%'
    )

  order by

    case
      when lower(
        coalesce(
          profile.campus_uid,
          ''
        )
      ) =
      lower(
        query_text
      )
      then 0

      when lower(
        coalesce(
          profile.full_name,
          ''
        )
      ) =
      lower(
        query_text
      )
      then 1

      else 2
    end,

    profile.full_name

  limit 100;

end;
$$;


revoke all
on function
public.search_chat_group_users(
  text,
  uuid[]
)
from public,
     anon;


grant execute
on function
public.search_chat_group_users(
  text,
  uuid[]
)
to authenticated;



-- ============================================================
-- ADD MULTIPLE MEMBERS TO AN EXISTING GROUP
--
-- Group creation already supports uuid[].
-- This gives the existing-group admin workflow the same
-- atomic multi-member capability.
-- ============================================================

drop function if exists
public.add_chat_group_members(
  uuid,
  uuid[]
);


create function
public.add_chat_group_members(
  target_conversation uuid,
  target_users uuid[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid :=
    auth.uid();

  added_count integer :=
    0;
begin

  if me is null then
    raise exception
      'Authentication required';
  end if;


  if target_conversation
    is null then
    raise exception
      'Group is required';
  end if;


  if not public.is_chat_admin(
    target_conversation
  ) then
    raise exception
      'Only group admins can add members';
  end if;


  if not exists (
    select 1

    from public.chat_conversations
      as conversation

    where
      conversation.id =
        target_conversation

      and
      conversation.conversation_type =
        'Group'
  ) then
    raise exception
      'Group conversation not found';
  end if;


  if target_users is null
     or cardinality(
       target_users
     ) < 1 then
    raise exception
      'Select at least one member';
  end if;


  insert into public.chat_members (
    conversation_id,
    user_id,
    member_role
  )

  select
    target_conversation,
    selected.user_id,
    'Member'

  from (
    select distinct
      candidate.user_id

    from unnest(
      target_users
    ) as candidate(
      user_id
    )
  ) as selected

  join public.profiles
    as profile
      on profile.id =
         selected.user_id

  where
    selected.user_id
      is not null

    and
    selected.user_id <>
      me

  on conflict (
    conversation_id,
    user_id
  )
  do nothing;


  get diagnostics
    added_count =
      row_count;


  if added_count > 0 then

    update
      public.chat_conversations

    set
      updated_at =
        now()

    where
      id =
        target_conversation;

  end if;


  return
    added_count;

end;
$$;


revoke all
on function
public.add_chat_group_members(
  uuid,
  uuid[]
)
from public,
     anon;


grant execute
on function
public.add_chat_group_members(
  uuid,
  uuid[]
)
to authenticated;


notify pgrst,
  'reload schema';
