-- ============================================================
-- CAMPUSCONNECT — SMART FACULTY SYLLABUS PLANNER FOUNDATION
--
-- Extends the existing syllabus-progress architecture.
--
-- Existing tables remain authoritative for actual syllabus:
--
--   faculty_syllabus_units
--   faculty_syllabus_topics
--   faculty_syllabus_topic_completions
--
-- This migration only adds:
--
--   1. Private syllabus source documents
--   2. Planner configuration / capacity snapshot
--   3. Secure private syllabus storage
--
-- No existing syllabus data is replaced.
-- ============================================================


-- ============================================================
-- PRIVATE SYLLABUS SOURCE STORAGE
--
-- Path convention:
--
--   <batch-subject-id>/<uuid>-<safe-file-name>
--
-- Files remain private.
-- ============================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'faculty-syllabus',
  'faculty-syllabus',
  false,
  20971520,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id)
do update set
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ];


-- ============================================================
-- SYLLABUS SOURCE DOCUMENTS
-- ============================================================

create table if not exists
public.faculty_syllabus_documents (

  id uuid primary key
    default gen_random_uuid(),

  batch_subject_id uuid not null
    references public.attendance_batch_subjects(id)
    on delete cascade,

  source_type text not null
    check (
      source_type in (
        'Upload',
        'Google Drive'
      )
    ),

  file_name text not null
    default ''
    check (
      char_length(
        trim(file_name)
      ) <= 240
    ),

  mime_type text not null
    default ''
    check (
      char_length(
        trim(mime_type)
      ) <= 120
    ),

  file_size bigint not null
    default 0
    check (
      file_size >= 0
      and file_size <= 20971520
    ),

  storage_path text not null
    default ''
    check (
      char_length(
        storage_path
      ) <= 700
    ),

  source_url text not null
    default ''
    check (
      char_length(
        source_url
      ) <= 2000
    ),

  uploaded_by uuid not null
    references auth.users(id)
    on delete cascade,

  created_at timestamptz not null
    default now(),

  constraint faculty_syllabus_document_source_check
    check (
      (
        source_type = 'Upload'
        and trim(storage_path) <> ''
      )
      or
      (
        source_type = 'Google Drive'
        and trim(source_url) <> ''
      )
    )
);


create index if not exists
faculty_syllabus_documents_subject_idx
on public.faculty_syllabus_documents (
  batch_subject_id,
  created_at desc
);


create index if not exists
faculty_syllabus_documents_uploader_idx
on public.faculty_syllabus_documents (
  uploaded_by,
  created_at desc
);


-- ============================================================
-- ACTIVE SYLLABUS PLANNER CONFIGURATION
--
-- There is one current planning configuration for each
-- concrete batch subject.
--
-- weekly_sessions:
--   actual teaching sessions per week.
--
-- Example:
--
--   weekly_hours = 4
--   session_length_periods = 2
--
--   weekly_sessions = 2
--
-- This intentionally matches Faculty Diary coverage events.
-- ============================================================

create table if not exists
public.faculty_syllabus_plans (

  id uuid primary key
    default gen_random_uuid(),

  batch_subject_id uuid not null
    references public.attendance_batch_subjects(id)
    on delete cascade,

  source_document_id uuid
    references public.faculty_syllabus_documents(id)
    on delete set null,

  weekly_sessions numeric(6,2) not null
    check (
      weekly_sessions > 0
      and weekly_sessions <= 60
    ),

  teaching_weeks integer not null
    check (
      teaching_weeks
      between 1 and 60
    ),

  total_planned_classes integer not null
    check (
      total_planned_classes
      between 1 and 1000
    ),

  status text not null
    default 'Draft'
    check (
      status in (
        'Draft',
        'Applied'
      )
    ),

  planning_method text not null
    default 'AI Assisted'
    check (
      planning_method in (
        'AI Assisted',
        'Manual'
      )
    ),

  created_by uuid not null
    references auth.users(id)
    on delete cascade,

  updated_by uuid not null
    references auth.users(id)
    on delete cascade,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint faculty_syllabus_plans_subject_key
    unique (
      batch_subject_id
    )
);


create index if not exists
faculty_syllabus_plans_document_idx
on public.faculty_syllabus_plans (
  source_document_id
);


-- ============================================================
-- PLAN/DOCUMENT CONSISTENCY
--
-- A selected source document must belong to the same
-- batch subject as the plan.
-- ============================================================

create or replace function
public.validate_faculty_syllabus_plan_document()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document_subject_id uuid;
begin

  if
    new.source_document_id is null
  then
    return new;
  end if;


  select
    document.batch_subject_id
  into
    v_document_subject_id
  from
    public.faculty_syllabus_documents document
  where
    document.id =
      new.source_document_id;


  if
    v_document_subject_id is null
  then
    raise exception
      'Selected syllabus source document does not exist.';
  end if;


  if
    v_document_subject_id <>
      new.batch_subject_id
  then
    raise exception
      'Syllabus plan source must belong to the same batch subject.';
  end if;


  return new;

end;
$$;


drop trigger if exists
validate_faculty_syllabus_plan_document_trigger
on public.faculty_syllabus_plans;


create trigger
validate_faculty_syllabus_plan_document_trigger

before insert or update of
  batch_subject_id,
  source_document_id

on public.faculty_syllabus_plans

for each row
execute function
public.validate_faculty_syllabus_plan_document();


-- ============================================================
-- DOCUMENT RLS
-- ============================================================

alter table
public.faculty_syllabus_documents
enable row level security;


drop policy if exists
"Faculty reads assigned syllabus documents"
on public.faculty_syllabus_documents;


create policy
"Faculty reads assigned syllabus documents"
on public.faculty_syllabus_documents
for select
to authenticated
using (
  public.can_access_assigned_batch_subject(
    batch_subject_id
  )
);


drop policy if exists
"Faculty uploads assigned syllabus documents"
on public.faculty_syllabus_documents;


create policy
"Faculty uploads assigned syllabus documents"
on public.faculty_syllabus_documents
for insert
to authenticated
with check (
  uploaded_by =
    auth.uid()

  and public.can_access_assigned_batch_subject(
    batch_subject_id
  )
);


drop policy if exists
"Faculty updates own syllabus documents"
on public.faculty_syllabus_documents;


create policy
"Faculty updates own syllabus documents"
on public.faculty_syllabus_documents
for update
to authenticated
using (
  public.can_access_assigned_batch_subject(
    batch_subject_id
  )

  and (
    uploaded_by =
      auth.uid()

    or public.current_campus_role() =
      'Main Admin'
  )
)
with check (
  public.can_access_assigned_batch_subject(
    batch_subject_id
  )

  and (
    uploaded_by =
      auth.uid()

    or public.current_campus_role() =
      'Main Admin'
  )
);


drop policy if exists
"Faculty deletes own syllabus documents"
on public.faculty_syllabus_documents;


create policy
"Faculty deletes own syllabus documents"
on public.faculty_syllabus_documents
for delete
to authenticated
using (
  public.can_access_assigned_batch_subject(
    batch_subject_id
  )

  and (
    uploaded_by =
      auth.uid()

    or public.current_campus_role() =
      'Main Admin'
  )
);


-- ============================================================
-- PLAN RLS
-- ============================================================

alter table
public.faculty_syllabus_plans
enable row level security;


drop policy if exists
"Faculty reads assigned syllabus plans"
on public.faculty_syllabus_plans;


create policy
"Faculty reads assigned syllabus plans"
on public.faculty_syllabus_plans
for select
to authenticated
using (
  public.can_access_assigned_batch_subject(
    batch_subject_id
  )
);


drop policy if exists
"Faculty creates assigned syllabus plans"
on public.faculty_syllabus_plans;


create policy
"Faculty creates assigned syllabus plans"
on public.faculty_syllabus_plans
for insert
to authenticated
with check (
  created_by =
    auth.uid()

  and updated_by =
    auth.uid()

  and public.can_access_assigned_batch_subject(
    batch_subject_id
  )
);


drop policy if exists
"Faculty updates assigned syllabus plans"
on public.faculty_syllabus_plans;


create policy
"Faculty updates assigned syllabus plans"
on public.faculty_syllabus_plans
for update
to authenticated
using (
  public.can_access_assigned_batch_subject(
    batch_subject_id
  )
)
with check (
  updated_by =
    auth.uid()

  and public.can_access_assigned_batch_subject(
    batch_subject_id
  )
);


drop policy if exists
"Faculty deletes assigned syllabus plans"
on public.faculty_syllabus_plans;


create policy
"Faculty deletes assigned syllabus plans"
on public.faculty_syllabus_plans
for delete
to authenticated
using (
  public.can_access_assigned_batch_subject(
    batch_subject_id
  )
);


-- ============================================================
-- STORAGE RLS
--
-- First folder segment is the batch_subject_id.
-- ============================================================

drop policy if exists
"Faculty reads assigned syllabus source files"
on storage.objects;


create policy
"Faculty reads assigned syllabus source files"
on storage.objects
for select
to authenticated
using (
  bucket_id =
    'faculty-syllabus'

  and exists (
    select 1
    from
      public.attendance_batch_subjects subject
    where
      subject.id::text =
        (storage.foldername(name))[1]

      and public.can_access_assigned_batch_subject(
        subject.id
      )
  )
);


drop policy if exists
"Faculty uploads assigned syllabus source files"
on storage.objects;


create policy
"Faculty uploads assigned syllabus source files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id =
    'faculty-syllabus'

  and exists (
    select 1
    from
      public.attendance_batch_subjects subject
    where
      subject.id::text =
        (storage.foldername(name))[1]

      and public.can_access_assigned_batch_subject(
        subject.id
      )
  )
);


drop policy if exists
"Faculty updates assigned syllabus source files"
on storage.objects;


create policy
"Faculty updates assigned syllabus source files"
on storage.objects
for update
to authenticated
using (
  bucket_id =
    'faculty-syllabus'

  and exists (
    select 1
    from
      public.attendance_batch_subjects subject
    where
      subject.id::text =
        (storage.foldername(name))[1]

      and public.can_access_assigned_batch_subject(
        subject.id
      )
  )
)
with check (
  bucket_id =
    'faculty-syllabus'

  and exists (
    select 1
    from
      public.attendance_batch_subjects subject
    where
      subject.id::text =
        (storage.foldername(name))[1]

      and public.can_access_assigned_batch_subject(
        subject.id
      )
  )
);


drop policy if exists
"Faculty deletes assigned syllabus source files"
on storage.objects;


create policy
"Faculty deletes assigned syllabus source files"
on storage.objects
for delete
to authenticated
using (
  bucket_id =
    'faculty-syllabus'

  and exists (
    select 1
    from
      public.attendance_batch_subjects subject
    where
      subject.id::text =
        (storage.foldername(name))[1]

      and public.can_access_assigned_batch_subject(
        subject.id
      )
  )
);


-- ============================================================
-- PRIVILEGES
-- ============================================================

revoke all
on table
public.faculty_syllabus_documents
from anon;


revoke all
on table
public.faculty_syllabus_plans
from anon;


grant
select,
insert,
update,
delete
on table
public.faculty_syllabus_documents
to authenticated;


grant
select,
insert,
update,
delete
on table
public.faculty_syllabus_plans
to authenticated;


notify pgrst, 'reload schema';
