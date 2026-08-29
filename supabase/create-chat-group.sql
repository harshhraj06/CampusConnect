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
  new_conversation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if length(trim(coalesce(group_name, ''))) < 2 then
    raise exception 'Group name must contain at least 2 characters';
  end if;

  if member_ids is null or cardinality(member_ids) < 1 then
    raise exception 'Select at least one member';
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
    auth.uid()
  )
  returning id
  into new_conversation_id;

  insert into public.chat_members (
    conversation_id,
    user_id,
    member_role
  )
  values (
    new_conversation_id,
    auth.uid(),
    'Admin'
  );

  insert into public.chat_members (
    conversation_id,
    user_id,
    member_role
  )
  select
    new_conversation_id,
    member_id,
    'Member'
  from (
    select distinct unnest(member_ids) as member_id
  ) selected
  where
    member_id is not null
    and member_id <> auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = member_id
    )
  on conflict (
    conversation_id,
    user_id
  )
  do nothing;

  if (
    select count(*)
    from public.chat_members
    where conversation_id = new_conversation_id
  ) < 2 then
    delete from public.chat_conversations
    where id = new_conversation_id;

    raise exception 'No valid members were added';
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
from public;

grant execute
on function public.create_chat_group(
  text,
  text,
  uuid[]
)
to authenticated;
