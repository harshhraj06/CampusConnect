-- ============================================================
-- CAMPUSCONNECT
-- ANNOUNCEMENT + FESTIVAL PERMISSION LOCKDOWN
--
-- FESTIVAL:
--   READ   -> all authenticated users
--   WRITE  -> Main Admin only
--
-- NORMAL ANNOUNCEMENTS:
--   WRITE ->
--     Faculty
--     Coordinator
--     Placement Cell
--     Main Admin
-- ============================================================


-- ============================================================
-- REMOVE EXISTING WRITE POLICIES
--
-- Existing write policies may be OR'ed together by PostgreSQL.
-- Therefore an older permissive policy could bypass the new
-- festival restriction.
--
-- SELECT policies are intentionally preserved.
-- ============================================================

do $$
declare
  policy_record record;
begin

  for policy_record in

    select
      policyname

    from pg_policies

    where
      schemaname = 'public'

      and tablename =
        'announcements'

      and cmd in (
        'INSERT',
        'UPDATE',
        'DELETE'
      )

  loop

    execute format(
      'drop policy if exists %I on public.announcements',
      policy_record.policyname
    );

  end loop;

end;
$$;



-- ============================================================
-- INSERT
-- ============================================================

create policy
"Campus announcement controlled insert"

on public.announcements

for insert

to authenticated

with check (

  case

    -- --------------------------------------------------------
    -- Festival content:
    -- MAIN ADMIN ONLY
    -- --------------------------------------------------------

    when announcement_type = 'Festival'

    then
      public.current_campus_role() =
        'Main Admin'


    -- --------------------------------------------------------
    -- Normal campus announcements
    -- --------------------------------------------------------

    else
      public.current_campus_role() in (
        'Faculty',
        'Coordinator',
        'Placement Cell',
        'Main Admin'
      )

  end

);



-- ============================================================
-- UPDATE
-- ============================================================

create policy
"Campus announcement controlled update"

on public.announcements

for update

to authenticated

using (

  case

    when announcement_type = 'Festival'

    then
      public.current_campus_role() =
        'Main Admin'

    else
      public.current_campus_role() in (
        'Faculty',
        'Coordinator',
        'Placement Cell',
        'Main Admin'
      )

  end

)

with check (

  case

    when announcement_type = 'Festival'

    then
      public.current_campus_role() =
        'Main Admin'

    else
      public.current_campus_role() in (
        'Faculty',
        'Coordinator',
        'Placement Cell',
        'Main Admin'
      )

  end

);



-- ============================================================
-- DELETE
-- ============================================================

create policy
"Campus announcement controlled delete"

on public.announcements

for delete

to authenticated

using (

  case

    when announcement_type = 'Festival'

    then
      public.current_campus_role() =
        'Main Admin'

    else
      public.current_campus_role() in (
        'Faculty',
        'Coordinator',
        'Placement Cell',
        'Main Admin'
      )

  end

);



-- ============================================================
-- FESTIVAL READ RPC
--
-- Keep festival discovery available for every authenticated
-- CampusConnect account.
-- ============================================================

revoke all
on function public.get_active_festival_wishes()
from public;


grant execute
on function public.get_active_festival_wishes()
to authenticated;



-- ============================================================
-- FORCE EXISTING FESTIVALS TO CAMPUS-WIDE VISIBILITY
-- ============================================================

update public.announcements

set
  audience = 'All',
  department = 'All'

where
  announcement_type =
    'Festival';



notify pgrst, 'reload schema';
