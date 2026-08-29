-- =========================================================
-- CAMPUSCONNECT MESSENGER PRESENCE
-- =========================================================

create table if not exists public.chat_user_presence (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  last_seen_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);

alter table public.chat_user_presence
enable row level security;


-- ---------------------------------------------------------
-- PERMISSIONS
-- ---------------------------------------------------------

grant select
on public.chat_user_presence
to authenticated;

grant insert, update
on public.chat_user_presence
to authenticated;


-- ---------------------------------------------------------
-- READ
-- Campus users may read last-seen information.
-- ---------------------------------------------------------

drop policy if exists
  "Authenticated users read chat presence"
on public.chat_user_presence;

create policy
  "Authenticated users read chat presence"
on public.chat_user_presence
for select
to authenticated
using (
  true
);


-- ---------------------------------------------------------
-- INSERT OWN PRESENCE
-- ---------------------------------------------------------

drop policy if exists
  "Users insert own chat presence"
on public.chat_user_presence;

create policy
  "Users insert own chat presence"
on public.chat_user_presence
for insert
to authenticated
with check (
  user_id = auth.uid()
);


-- ---------------------------------------------------------
-- UPDATE OWN PRESENCE
-- ---------------------------------------------------------

drop policy if exists
  "Users update own chat presence"
on public.chat_user_presence;

create policy
  "Users update own chat presence"
on public.chat_user_presence
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);
