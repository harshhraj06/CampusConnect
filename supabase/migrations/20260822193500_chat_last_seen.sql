-- =========================================================
-- CAMPUSCONNECT CHAT LAST SEEN
-- =========================================================

create table if not exists public.chat_user_presence (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chat_user_presence
enable row level security;

grant select, insert, update
on public.chat_user_presence
to authenticated;


drop policy if exists
  "Campus users view presence"
on public.chat_user_presence;

create policy
  "Campus users view presence"
on public.chat_user_presence
for select
to authenticated
using (true);


drop policy if exists
  "Users create own presence"
on public.chat_user_presence;

create policy
  "Users create own presence"
on public.chat_user_presence
for insert
to authenticated
with check (
  user_id = auth.uid()
);


drop policy if exists
  "Users update own presence"
on public.chat_user_presence;

create policy
  "Users update own presence"
on public.chat_user_presence
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);


-- Enable realtime where possible.
do $$
begin
  alter publication supabase_realtime
  add table public.chat_user_presence;
exception
  when duplicate_object then
    null;
end;
$$;
