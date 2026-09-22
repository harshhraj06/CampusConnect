-- ============================================================
-- CAMPUSCONNECT
-- STUDENT TIMETABLE — DATE-SPECIFIC SUBSTITUTION OVERLAY
--
-- Purpose:
--   Return only substitution information relevant to the
--   authenticated student's own timetable for one date.
--
-- Security:
--   - authenticated students only
--   - membership verified through attendance_batch_students
--   - no coverage reason is exposed
--   - no private offer/request information is exposed
--   - permanent timetable remains unchanged
-- ============================================================


create or replace function
public.get_my_timetable_substitutions(
  target_date date
)
returns table (
  timetable_entry_id uuid,
  class_date date,
  substitute_faculty_name text
)
language sql
stable
security definer
set search_path = ''
as $$

  select
    substitution.timetable_entry_id,
    substitution.class_date,
    substitution.substitute_faculty_name

  from
    public.faculty_substitution_overrides substitution

  join
    public.batch_timetable_entries entry
      on entry.id =
        substitution.timetable_entry_id

  join
    public.attendance_batch_students membership
      on membership.batch_id =
        entry.batch_id

  where
    auth.uid() is not null

    and membership.student_id =
      auth.uid()

    and substitution.class_date =
      target_date

    and substitution.status =
      'Active'

    and substitution.substitute_faculty_name <> ''

    and lower(
      trim(
        entry.day_of_week
      )
    ) =
    lower(
      trim(
        to_char(
          target_date,
          'FMDay'
        )
      )
    )

  order by
    entry.period_order,
    entry.start_time;

$$;


revoke all
on function
public.get_my_timetable_substitutions(date)
from public, anon;


grant execute
on function
public.get_my_timetable_substitutions(date)
to authenticated;


comment on function
public.get_my_timetable_substitutions(date)
is
'Returns active date-specific substitute faculty overlays for timetable entries belonging to the authenticated student. Coverage reasons and private workflow data are not exposed.';


notify pgrst, 'reload schema';
