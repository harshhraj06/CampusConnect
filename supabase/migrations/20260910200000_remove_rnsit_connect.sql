-- Remove the abandoned RNSIT / Contineo integration.
--
-- IMPORTANT:
-- Generic CampusConnect academic tables are intentionally preserved.
-- This migration only removes objects introduced specifically for
-- the abandoned RNSIT Connect / extension / fee-sync feature.


-- ---------------------------------------------------------
-- 1. Remove extension pairing RPCs
-- ---------------------------------------------------------

drop function if exists
  public.consume_rnsit_extension_pairing(text, text);

drop function if exists
  public.consume_rnsit_extension_pairing(text);


-- ---------------------------------------------------------
-- 2. Remove RNSIT extension pairing storage
-- ---------------------------------------------------------

drop table if exists
  public.rnsit_extension_pairings;


-- ---------------------------------------------------------
-- 3. Remove RNSIT-specific fee sync tables
--    Child tables must be removed before parents.
-- ---------------------------------------------------------

drop table if exists
  public.college_fee_payment_heads;

drop table if exists
  public.college_fee_payments;

drop table if exists
  public.college_fee_demands;


-- ---------------------------------------------------------
-- 4. Remove RNSIT connection records
-- ---------------------------------------------------------

delete from public.college_connections
where provider = 'RNSIT Contineo';


-- Generic academic data/tables intentionally remain:
--
-- college_connections
-- college_subjects
-- college_attendance
-- college_marks
-- college_results
-- college_result_subjects
-- college_fees
-- college_timetable
-- college_academic_events
--
-- They belong to CampusConnect Academics and are not deleted.
