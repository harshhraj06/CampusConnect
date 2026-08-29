-- =========================================================
-- CAMPUSCONNECT CHAT REACTIONS
-- =========================================================

create table if not exists public.chat_message_reactions (
  message_id uuid not null
    references public.chat_messages(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  emoji text not null,

  created_at timestamptz not null default now(),

  primary key (
    message_id,
    user_id,
    emoji
  )
);

alter table public.chat_message_reactions
enable row level security;

grant select, insert, delete
on public.chat_message_reactions
to authenticated;


drop policy if exists
  "Members view reactions"
on public.chat_message_reactions;

create policy
  "Members view reactions"
on public.chat_message_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.chat_messages m
    where
      m.id = chat_message_reactions.message_id
      and public.is_chat_member(
        m.conversation_id
      )
  )
);


drop policy if exists
  "Members add reactions"
on public.chat_message_reactions;

create policy
  "Members add reactions"
on public.chat_message_reactions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.chat_messages m
    where
      m.id = chat_message_reactions.message_id
      and public.is_chat_member(
        m.conversation_id
      )
  )
);


drop policy if exists
  "Users remove reactions"
on public.chat_message_reactions;

create policy
  "Users remove reactions"
on public.chat_message_reactions
for delete
to authenticated
using (
  user_id = auth.uid()
);


do $$
begin
  alter publication supabase_realtime
  add table public.chat_message_reactions;
exception
  when duplicate_object then
    null;
end;
$$;
