-- =========================================================
-- CAMPUSCONNECT — REMOVE FRIEND
-- =========================================================

drop policy if exists
  "Users remove own chat connections"
on public.chat_connections;

create policy
  "Users remove own chat connections"
on public.chat_connections
for delete
to authenticated
using (
  requester_id = auth.uid()
  or
  receiver_id = auth.uid()
);

grant delete
on public.chat_connections
to authenticated;
