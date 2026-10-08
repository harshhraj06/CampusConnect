-- =========================================================
-- CAMPUSCONNECT — AUDIT LOGS
-- =========================================================

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  event_type text not null,
  user_id uuid references auth.users(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  target_id uuid references auth.users(id) on delete set null,
  resource_type text,
  resource_id text,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  success boolean not null,
  error_message text,
  created_at timestamptz not null default now()
);

-- Indexes for common queries
create index if not exists audit_logs_event_type_idx
on public.audit_logs(event_type);

create index if not exists audit_logs_user_id_idx
on public.audit_logs(user_id);

create index if not exists audit_logs_actor_id_idx
on public.audit_logs(actor_id);

create index if not exists audit_logs_created_at_idx
on public.audit_logs(created_at desc);

create index if not exists audit_logs_resource_idx
on public.audit_logs(resource_type, resource_id);

-- Enable RLS
alter table public.audit_logs enable row level security;

-- Only Main Admin can read audit logs
drop policy if exists "Main Admin read audit logs" on public.audit_logs;

create policy "Main Admin read audit logs"
on public.audit_logs
for select
to authenticated
using (
  public.current_campus_role() = 'Main Admin'
);

-- Service role can insert (for audit logging)
grant insert on public.audit_logs to service_role;

-- Automatic cleanup of old audit logs (older than 1 year)
-- Run via pg_cron or scheduled job
/*
create or replace function public.cleanup_old_audit_logs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  delete from public.audit_logs
  where created_at < now() - interval '1 year';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Schedule: SELECT cron.schedule('0 3 * * *', 'select public.cleanup_old_audit_logs()');
*/

notify pgrst, 'reload schema';