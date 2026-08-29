-- =========================================================
-- CAMPUSCONNECT CHAT MESSAGE RECEIPTS
-- =========================================================

create table if not exists public.chat_message_receipts (
  message_id uuid not null
    references public.chat_messages(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  delivered_at timestamptz,
  read_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (
    message_id,
    user_id
  )
);

create index if not exists chat_message_receipts_user_idx
on public.chat_message_receipts(
  user_id,
  message_id
);

alter table public.chat_message_receipts
enable row level security;

grant select, insert, update
on public.chat_message_receipts
to authenticated;


-- ---------------------------------------------------------
-- Users may view receipts for messages in conversations
-- they belong to.
-- ---------------------------------------------------------

drop policy if exists
  "Chat members view receipts"
on public.chat_message_receipts;

create policy
  "Chat members view receipts"
on public.chat_message_receipts
for select
to authenticated
using (
  exists (
    select 1
    from public.chat_messages m
    where
      m.id = message_id
      and public.is_chat_member(
        m.conversation_id
      )
  )
);


-- ---------------------------------------------------------
-- A user may create only THEIR OWN receipt.
-- ---------------------------------------------------------

drop policy if exists
  "Users create own receipts"
on public.chat_message_receipts;

create policy
  "Users create own receipts"
on public.chat_message_receipts
for insert
to authenticated
with check (
  user_id = auth.uid()
);


-- ---------------------------------------------------------
-- A user may update only THEIR OWN receipt.
-- ---------------------------------------------------------

drop policy if exists
  "Users update own receipts"
on public.chat_message_receipts;

create policy
  "Users update own receipts"
on public.chat_message_receipts
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);
