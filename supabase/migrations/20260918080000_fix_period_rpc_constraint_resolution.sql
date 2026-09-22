-- ============================================================
-- CAMPUSCONNECT
-- FIX PERIOD RPC CONSTRAINT RESOLUTION
--
-- The period RPCs intentionally use SECURITY DEFINER.
-- Their previous empty search_path prevented PostgreSQL from
-- resolving the named DEFERRABLE constraint used by
-- SET CONSTRAINTS.
--
-- All application tables/functions inside the RPC bodies are
-- already explicitly schema-qualified.
-- ============================================================

alter function
  public.save_timetable_period_slot(
    uuid,
    uuid,
    text,
    time without time zone,
    time without time zone,
    boolean
  )
set search_path = public;


alter function
  public.delete_timetable_period_slot(uuid)
set search_path = public;


notify pgrst, 'reload schema';
