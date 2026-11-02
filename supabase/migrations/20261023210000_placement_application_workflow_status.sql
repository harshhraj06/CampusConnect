-- CampusConnect: expanded recruitment applicant workflow statuses.
-- Existing statuses and application records are preserved.
alter table public.placement_applications
  drop constraint if exists placement_applications_status_check;

alter table public.placement_applications
  add constraint placement_applications_status_check
  check (
    status in (
      'Applied',
      'Under Review',
      'Shortlisted',
      'Assessment',
      'Interview',
      'On Hold',
      'Offered',
      'Accepted',
      'Rejected'
    )
  );
