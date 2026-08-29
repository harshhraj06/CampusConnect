-- ============================================================
-- CampusConnect secure Direct Messaging
-- ============================================================

create or replace function public.get_or_create_direct_chat(
  other_user_id uuid
)
returns public.chat_conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid;
  existing_conversation public.chat_conversations;
  new_conversation public.chat_conversations;
begin
  me := auth.uid();

  if me is null then
    raise exception 'Authentication required';
  end if;

  if other_user_id is null then
    raise exception 'User is required';
  end if;

  if me = other_user_id then
    raise exception 'You cannot start a direct chat with yourself';
  end if;

  -- Messaging is allowed only after a connection was accepted.
  if not exists (
    select 1
    from public.chat_connections c
    where c.status = 'Accepted'
      and (
        (
          c.requester_id = me
          and c.receiver_id = other_user_id
        )
        or
        (
          c.requester_id = other_user_id
          and c.receiver_id = me
        )
      )
  ) then
    raise exception 'Connect with this user before starting a private chat';
  end if;

  -- Reuse an existing DM between these exact two users.
  select c.*
  into existing_conversation
  from public.chat_conversations c
  where c.conversation_type = 'Direct'
    and exists (
      select 1
      from public.chat_members m
      where m.conversation_id = c.id
        and m.user_id = me
    )
    and exists (
      select 1
      from public.chat_members m
      where m.conversation_id = c.id
        and m.user_id = other_user_id
    )
    and (
      select count(*)
      from public.chat_members m
      where m.conversation_id = c.id
    ) = 2
  order by c.created_at
  limit 1;

  if existing_conversation.id is not null then
    return existing_conversation;
  end if;

  insert into public.chat_conversations (
    conversation_type,
    name,
    description,
    created_by
  )
  values (
    'Direct',
    '',
    '',
    me
  )
  returning *
  into new_conversation;

  insert into public.chat_members (
    conversation_id,
    user_id,
    member_role
  )
  values
    (
      new_conversation.id,
      me,
      'Admin'
    ),
    (
      new_conversation.id,
      other_user_id,
      'Member'
    )
  on conflict (conversation_id, user_id)
  do nothing;

  return new_conversation;
end;
$$;

revoke all
on function public.get_or_create_direct_chat(uuid)
from public;

grant execute
on function public.get_or_create_direct_chat(uuid)
to authenticated;
