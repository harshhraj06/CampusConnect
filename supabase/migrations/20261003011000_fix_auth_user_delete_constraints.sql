begin;

alter table public.batch_timetable_breaks
  alter column created_by drop not null;

alter table public.batch_timetable_breaks
  drop constraint if exists batch_timetable_breaks_created_by_fkey;

alter table public.batch_timetable_breaks
  add constraint batch_timetable_breaks_created_by_fkey
  foreign key (created_by)
  references auth.users(id)
  on delete set null;


alter table public.batch_timetable_documents
  alter column uploaded_by drop not null;

alter table public.batch_timetable_documents
  drop constraint if exists batch_timetable_documents_uploaded_by_fkey;

alter table public.batch_timetable_documents
  add constraint batch_timetable_documents_uploaded_by_fkey
  foreign key (uploaded_by)
  references auth.users(id)
  on delete set null;


alter table public.batch_timetable_entries
  alter column created_by drop not null;

alter table public.batch_timetable_entries
  drop constraint if exists batch_timetable_entries_created_by_fkey;

alter table public.batch_timetable_entries
  add constraint batch_timetable_entries_created_by_fkey
  foreign key (created_by)
  references auth.users(id)
  on delete set null;


alter table public.campus_branches
  alter column created_by drop not null;

alter table public.campus_branches
  drop constraint if exists campus_branches_created_by_fkey;

alter table public.campus_branches
  add constraint campus_branches_created_by_fkey
  foreign key (created_by)
  references auth.users(id)
  on delete set null;


alter table public.campus_work_delegations
  alter column granted_by drop not null;

alter table public.campus_work_delegations
  drop constraint if exists campus_work_delegations_granted_by_fkey;

alter table public.campus_work_delegations
  add constraint campus_work_delegations_granted_by_fkey
  foreign key (granted_by)
  references auth.users(id)
  on delete set null;


alter table public.faculty_coverage_offers
  drop constraint if exists faculty_coverage_offers_candidate_faculty_id_fkey;

alter table public.faculty_coverage_offers
  add constraint faculty_coverage_offers_candidate_faculty_id_fkey
  foreign key (candidate_faculty_id)
  references auth.users(id)
  on delete cascade;


alter table public.faculty_coverage_requests
  drop constraint if exists faculty_coverage_requests_original_faculty_id_fkey;

alter table public.faculty_coverage_requests
  add constraint faculty_coverage_requests_original_faculty_id_fkey
  foreign key (original_faculty_id)
  references auth.users(id)
  on delete cascade;


alter table public.faculty_coverage_requests
  alter column requested_by drop not null;

alter table public.faculty_coverage_requests
  drop constraint if exists faculty_coverage_requests_requested_by_fkey;

alter table public.faculty_coverage_requests
  add constraint faculty_coverage_requests_requested_by_fkey
  foreign key (requested_by)
  references auth.users(id)
  on delete set null;


alter table public.faculty_substitution_overrides
  drop constraint if exists faculty_substitution_overrides_original_faculty_id_fkey;

alter table public.faculty_substitution_overrides
  add constraint faculty_substitution_overrides_original_faculty_id_fkey
  foreign key (original_faculty_id)
  references auth.users(id)
  on delete cascade;


alter table public.faculty_substitution_overrides
  drop constraint if exists faculty_substitution_overrides_substitute_faculty_id_fkey;

alter table public.faculty_substitution_overrides
  add constraint faculty_substitution_overrides_substitute_faculty_id_fkey
  foreign key (substitute_faculty_id)
  references auth.users(id)
  on delete cascade;


alter table public.faculty_syllabus_calendars
  alter column updated_by drop not null;

alter table public.faculty_syllabus_calendars
  drop constraint if exists faculty_syllabus_calendars_updated_by_fkey;

alter table public.faculty_syllabus_calendars
  add constraint faculty_syllabus_calendars_updated_by_fkey
  foreign key (updated_by)
  references auth.users(id)
  on delete set null;


alter table public.faculty_teaching_allocations
  alter column created_by drop not null;

alter table public.faculty_teaching_allocations
  drop constraint if exists faculty_teaching_allocations_created_by_fkey;

alter table public.faculty_teaching_allocations
  add constraint faculty_teaching_allocations_created_by_fkey
  foreign key (created_by)
  references auth.users(id)
  on delete set null;


alter table public.timetable_batch_profiles
  alter column created_by drop not null;

alter table public.timetable_batch_profiles
  drop constraint if exists timetable_batch_profiles_created_by_fkey;

alter table public.timetable_batch_profiles
  add constraint timetable_batch_profiles_created_by_fkey
  foreign key (created_by)
  references auth.users(id)
  on delete set null;


alter table public.timetable_builder_drafts
  drop constraint if exists timetable_builder_drafts_coordinator_id_fkey;

alter table public.timetable_builder_drafts
  add constraint timetable_builder_drafts_coordinator_id_fkey
  foreign key (coordinator_id)
  references auth.users(id)
  on delete cascade;


alter table public.timetable_coordinator_assignments
  alter column assigned_by drop not null;

alter table public.timetable_coordinator_assignments
  drop constraint if exists timetable_coordinator_assignments_assigned_by_fkey;

alter table public.timetable_coordinator_assignments
  add constraint timetable_coordinator_assignments_assigned_by_fkey
  foreign key (assigned_by)
  references auth.users(id)
  on delete set null;


alter table public.timetable_coordinator_assignments
  drop constraint if exists timetable_coordinator_assignments_coordinator_id_fkey;

alter table public.timetable_coordinator_assignments
  add constraint timetable_coordinator_assignments_coordinator_id_fkey
  foreign key (coordinator_id)
  references auth.users(id)
  on delete cascade;


alter table public.timetable_publications
  alter column created_by drop not null;

alter table public.timetable_publications
  drop constraint if exists timetable_publications_created_by_fkey;

alter table public.timetable_publications
  add constraint timetable_publications_created_by_fkey
  foreign key (created_by)
  references auth.users(id)
  on delete set null;


alter table public.timetable_resources
  alter column created_by drop not null;

alter table public.timetable_resources
  drop constraint if exists timetable_resources_created_by_fkey;

alter table public.timetable_resources
  add constraint timetable_resources_created_by_fkey
  foreign key (created_by)
  references auth.users(id)
  on delete set null;


alter table public.timetable_scheduling_profiles
  alter column created_by drop not null;

alter table public.timetable_scheduling_profiles
  drop constraint if exists timetable_scheduling_profiles_created_by_fkey;

alter table public.timetable_scheduling_profiles
  add constraint timetable_scheduling_profiles_created_by_fkey
  foreign key (created_by)
  references auth.users(id)
  on delete set null;

commit;
