-- ============================================================
-- CampusConnect Messenger
-- Allow either participant to permanently delete a relationship
-- only after it is no longer an accepted/pending connection.
-- ============================================================

alter table public.chat_connections
enable row level security;

drop policy if exists
  "Participants can delete removed connections"
on public.chat_connections;

create policy
  "Participants can delete removed connections"
on public.chat_connections
for delete
to authenticated
using (
  (
    auth.uid() = requester_id
    or
    auth.uid() = receiver_id
  )
  and status = 'Rejected'
);
