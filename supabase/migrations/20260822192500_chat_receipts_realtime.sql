-- =========================================================
-- CAMPUSCONNECT MESSAGE RECEIPTS REALTIME
-- =========================================================

do $$
begin
  alter publication supabase_realtime
  add table public.chat_message_receipts;
exception
  when duplicate_object then
    null;
end;
$$;
