-- =========================================================
-- CAMPUSCONNECT — REALTIME CHAT SYSTEM
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- PUBLIC CONNECT ID
-- ---------------------------------------------------------

alter table public.profiles
add column if not exists campus_uid text;

create unique index if not exists profiles_campus_uid_idx
on public.profiles(campus_uid)
where campus_uid is not null;


create or replace function public.generate_campus_uid()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
begin
  loop
    candidate :=
      'CC-' ||
      upper(
        substring(
          encode(gen_random_bytes(5), 'hex')
          from 1 for 8
        )
      );

    exit when not exists (
      select 1
      from public.profiles
      where campus_uid = candidate
    );
  end loop;

  return candidate;
end;
$$;


update public.profiles
set campus_uid = public.generate_campus_uid()
where campus_uid is null;


create or replace function public.ensure_campus_uid()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.campus_uid is null or trim(new.campus_uid) = '' then
    new.campus_uid := public.generate_campus_uid();
  end if;

  return new;
end;
$$;


drop trigger if exists ensure_profile_campus_uid
on public.profiles;

create trigger ensure_profile_campus_uid
before insert or update
on public.profiles
for each row
execute procedure public.ensure_campus_uid();


-- ---------------------------------------------------------
-- CONTACT CONNECTIONS
-- ---------------------------------------------------------

create table if not exists public.chat_connections (
  id uuid primary key default gen_random_uuid(),

  requester_id uuid not null
    references auth.users(id)
    on delete cascade,

  receiver_id uuid not null
    references auth.users(id)
    on delete cascade,

  status text not null default 'Pending'
    check (
      status in (
        'Pending',
        'Accepted',
        'Rejected',
        'Blocked'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (requester_id <> receiver_id),

  unique(requester_id, receiver_id)
);

create index if not exists chat_connections_requester_idx
on public.chat_connections(requester_id);

create index if not exists chat_connections_receiver_idx
on public.chat_connections(receiver_id);


-- ---------------------------------------------------------
-- CONVERSATIONS
-- ---------------------------------------------------------

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),

  conversation_type text not null
    default 'Direct'
    check (
      conversation_type in (
        'Direct',
        'Group'
      )
    ),

  name text not null default '',
  description text not null default '',

  avatar_url text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ---------------------------------------------------------
-- CONVERSATION MEMBERS
-- ---------------------------------------------------------

create table if not exists public.chat_members (
  conversation_id uuid not null
    references public.chat_conversations(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  member_role text not null default 'Member'
    check (
      member_role in (
        'Member',
        'Admin'
      )
    ),

  joined_at timestamptz not null default now(),

  last_read_at timestamptz,

  is_muted boolean not null default false,

  primary key (
    conversation_id,
    user_id
  )
);

create index if not exists chat_members_user_idx
on public.chat_members(user_id);


-- ---------------------------------------------------------
-- MESSAGES
-- ---------------------------------------------------------

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),

  conversation_id uuid not null
    references public.chat_conversations(id)
    on delete cascade,

  sender_id uuid not null
    references auth.users(id)
    on delete cascade,

  sender_name text not null default '',

  message_type text not null default 'Text'
    check (
      message_type in (
        'Text',
        'Image',
        'File',
        'System'
      )
    ),

  body text not null default '',

  file_path text,
  file_name text,
  file_size bigint,
  file_type text,

  reply_to uuid
    references public.chat_messages(id)
    on delete set null,

  edited_at timestamptz,
  deleted_at timestamptz,

  created_at timestamptz not null default now()
);

create index if not exists chat_messages_conversation_idx
on public.chat_messages(
  conversation_id,
  created_at
);


-- ---------------------------------------------------------
-- REACTIONS
-- ---------------------------------------------------------

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


-- ---------------------------------------------------------
-- HELPER
-- ---------------------------------------------------------

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
    from public.chat_members member
    where
      member.conversation_id = target_conversation
      and member.user_id = auth.uid()
  );
$$;

grant execute
on function public.is_chat_member(uuid)
to authenticated;


-- ---------------------------------------------------------
-- RLS
-- ---------------------------------------------------------

alter table public.chat_connections
enable row level security;

alter table public.chat_conversations
enable row level security;

alter table public.chat_members
enable row level security;

alter table public.chat_messages
enable row level security;

alter table public.chat_message_reactions
enable row level security;


grant select, insert, update, delete
on public.chat_connections
to authenticated;

grant select, insert, update, delete
on public.chat_conversations
to authenticated;

grant select, insert, update, delete
on public.chat_members
to authenticated;

grant select, insert, update, delete
on public.chat_messages
to authenticated;

grant select, insert, update, delete
on public.chat_message_reactions
to authenticated;


-- Connections

drop policy if exists "Users view own chat connections"
on public.chat_connections;

create policy "Users view own chat connections"
on public.chat_connections
for select
to authenticated
using (
  requester_id = auth.uid()
  or receiver_id = auth.uid()
);


drop policy if exists "Users send connection requests"
on public.chat_connections;

create policy "Users send connection requests"
on public.chat_connections
for insert
to authenticated
with check (
  requester_id = auth.uid()
  and requester_id <> receiver_id
);


drop policy if exists "Users update received connections"
on public.chat_connections;

create policy "Users update received connections"
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


-- Conversations

drop policy if exists "Members view conversations"
on public.chat_conversations;

create policy "Members view conversations"
on public.chat_conversations
for select
to authenticated
using (
  public.is_chat_member(id)
);


drop policy if exists "Authenticated create conversations"
on public.chat_conversations;

create policy "Authenticated create conversations"
on public.chat_conversations
for insert
to authenticated
with check (
  created_by = auth.uid()
);


drop policy if exists "Conversation admins update"
on public.chat_conversations;

create policy "Conversation admins update"
on public.chat_conversations
for update
to authenticated
using (
  exists (
    select 1
    from public.chat_members m
    where
      m.conversation_id = id
      and m.user_id = auth.uid()
      and m.member_role = 'Admin'
  )
);


-- Members

drop policy if exists "Members view conversation members"
on public.chat_members;

create policy "Members view conversation members"
on public.chat_members
for select
to authenticated
using (
  public.is_chat_member(conversation_id)
);


drop policy if exists "Users join created conversation"
on public.chat_members;

create policy "Users join created conversation"
on public.chat_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.chat_members admin_member
    where
      admin_member.conversation_id = conversation_id
      and admin_member.user_id = auth.uid()
      and admin_member.member_role = 'Admin'
  )
);


drop policy if exists "Members update own membership"
on public.chat_members;

create policy "Members update own membership"
on public.chat_members
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);


-- Messages

drop policy if exists "Members view messages"
on public.chat_messages;

create policy "Members view messages"
on public.chat_messages
for select
to authenticated
using (
  public.is_chat_member(conversation_id)
);


drop policy if exists "Members send messages"
on public.chat_messages;

create policy "Members send messages"
on public.chat_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.is_chat_member(conversation_id)
);


drop policy if exists "Senders update messages"
on public.chat_messages;

create policy "Senders update messages"
on public.chat_messages
for update
to authenticated
using (
  sender_id = auth.uid()
)
with check (
  sender_id = auth.uid()
);


-- Reactions

drop policy if exists "Members view reactions"
on public.chat_message_reactions;

create policy "Members view reactions"
on public.chat_message_reactions
for select
to authenticated
using (
  exists (
    select 1
    from public.chat_messages message
    where
      message.id = message_id
      and public.is_chat_member(
        message.conversation_id
      )
  )
);


drop policy if exists "Members add reactions"
on public.chat_message_reactions;

create policy "Members add reactions"
on public.chat_message_reactions
for insert
to authenticated
with check (
  user_id = auth.uid()
);


drop policy if exists "Users remove reactions"
on public.chat_message_reactions;

create policy "Users remove reactions"
on public.chat_message_reactions
for delete
to authenticated
using (
  user_id = auth.uid()
);

-- =========================================================
-- CAMPUSCONNECT CHAT FILE STORAGE
-- =========================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit
)
values (
  'chat-files',
  'chat-files',
  false,
  15728640
)
on conflict (id)
do update set
  public = false,
  file_size_limit = 15728640;


-- ---------------------------------------------------------
-- UPLOAD
-- Users can upload only inside their own top-level folder:
-- <auth-user-id>/<conversation-id>/<filename>
-- ---------------------------------------------------------

drop policy if exists
  "Chat users upload files"
on storage.objects;

create policy
  "Chat users upload files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-files'
  and (storage.foldername(name))[1] =
      auth.uid()::text
);


-- ---------------------------------------------------------
-- READ
-- Authenticated CampusConnect users may request files.
-- The bucket remains private, so the frontend uses signed URLs.
-- ---------------------------------------------------------

drop policy if exists
  "Chat users read files"
on storage.objects;

create policy
  "Chat users read files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-files'
);


-- ---------------------------------------------------------
-- DELETE
-- Only the user who uploaded the file can remove it.
-- ---------------------------------------------------------

drop policy if exists
  "Chat users delete own files"
on storage.objects;

create policy
  "Chat users delete own files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-files'
  and (storage.foldername(name))[1] =
      auth.uid()::text
);

