-- ============================================================
-- CAMPUSCONNECT — SECURE GROUP AVATAR UPDATE
-- Group admins only.
-- ============================================================

drop function if exists
public.update_chat_group_avatar(
  uuid,
  text
);


create function
public.update_chat_group_avatar(
  target_conversation uuid,
  next_avatar_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin

  if auth.uid() is null then
    raise exception
      'Authentication required';
  end if;


  if not public.is_chat_admin(
    target_conversation
  ) then
    raise exception
      'Only group admins can change the group photo';
  end if;


  if not exists (
    select 1
    from public.chat_conversations c
    where
      c.id = target_conversation
      and c.conversation_type = 'Group'
  ) then
    raise exception
      'Group conversation not found';
  end if;


  if
    trim(
      coalesce(
        next_avatar_url,
        ''
      )
    ) = ''
  then
    raise exception
      'Group photo URL is required';
  end if;


  if length(next_avatar_url) > 5000 then
    raise exception
      'Group photo URL is invalid';
  end if;


  update public.chat_conversations

  set
    avatar_url =
      trim(next_avatar_url),

    updated_at =
      now()

  where
    id =
      target_conversation;

end;
$$;


revoke all
on function
public.update_chat_group_avatar(
  uuid,
  text
)
from public,
     anon;


grant execute
on function
public.update_chat_group_avatar(
  uuid,
  text
)
to authenticated;


notify pgrst,
  'reload schema';
