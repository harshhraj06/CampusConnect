alter table public.chat_conversations
  add constraint chat_conversations_name_length_check
  check (
    (
      conversation_type = 'Direct'
      and char_length(name) <= 120
    )
    or
    (
      conversation_type = 'Group'
      and char_length(name) between 1 and 120
    )
  );

alter table public.chat_conversations
  add constraint chat_conversations_description_length_check
  check (
    char_length(description) <= 1000
  );

alter table public.chat_conversations
  add constraint chat_conversations_avatar_url_length_check
  check (
    avatar_url is null
    or char_length(avatar_url) <= 2000
  );

create or replace function public.add_chat_group_members(
  target_conversation uuid,
  target_users uuid[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
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

  if cardinality(
    target_users
  ) > 100 then
    raise exception
      'You can add at most 100 members at a time';
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
$function$;

revoke execute on function
public.add_chat_group_members(
  uuid,
  uuid[]
)
from public, anon;

grant execute on function
public.add_chat_group_members(
  uuid,
  uuid[]
)
to authenticated, service_role;

notify pgrst, 'reload schema';
