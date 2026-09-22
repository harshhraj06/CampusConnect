-- ============================================================
-- CAMPUSCONNECT
-- EVENT OPERATIONS SUMMARY AUTHORIZATION FIX
--
-- Fixes nullable created_by authorization logic without
-- rewriting or changing the existing summary response.
-- ============================================================

begin;

do $$
declare
  original_definition text;
  patched_definition text;
begin

  select pg_get_functiondef(
    'public.get_event_operations_summary(uuid)'::regprocedure
  )
  into original_definition;

  if original_definition is null then
    raise exception
      'get_event_operations_summary(uuid) does not exist.';
  end if;


  patched_definition :=
    regexp_replace(
      original_definition,

      'or[[:space:]]+event_row\.created_by[[:space:]]*=[[:space:]]*auth\.uid\(\)',

      'or (
        event_row.created_by is not null
        and event_row.created_by = auth.uid()
      )',

      'i'
    );


  if patched_definition = original_definition then
    raise exception
      'Authorization pattern was not found. Migration aborted safely.';
  end if;


  execute patched_definition;

end;
$$;


revoke all
on function
public.get_event_operations_summary(uuid)
from public, anon;


grant execute
on function
public.get_event_operations_summary(uuid)
to authenticated;


commit;

notify pgrst, 'reload schema';
