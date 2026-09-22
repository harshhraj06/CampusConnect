-- ============================================================
-- CAMPUSCONNECT — BACKFILL EXISTING FACULTY ALLOCATIONS
--
-- Converts existing attendance_batch_subjects faculty mappings
-- into the normalized faculty_teaching_allocations layer.
--
-- Existing data is NOT changed or deleted.
-- ============================================================


insert into public.faculty_teaching_allocations (
  batch_id,
  batch_subject_id,
  faculty_id,
  faculty_name,
  allocation_type,
  subgroup,
  weekly_hours,
  is_primary,
  status,
  notes,
  created_by
)
select
  s.batch_id,
  s.id,
  s.faculty_id,
  s.faculty_name,

  case
    when s.subject_type = 'Lab'
      then 'Lab'
    else 'Theory'
  end,

  '',

  0::numeric,

  true,
  'Active',
  'Migrated from existing batch subject assignment; weekly hours require configuration',
  s.faculty_id

from public.attendance_batch_subjects s

where
  s.faculty_id is not null

on conflict (
  batch_subject_id,
  faculty_id,
  allocation_type,
  subgroup
)
do nothing;


notify pgrst, 'reload schema';
