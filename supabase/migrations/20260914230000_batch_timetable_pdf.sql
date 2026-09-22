-- ============================================================
-- CAMPUSCONNECT — OFFICIAL BATCH TIMETABLE PDF
--
-- Faculty / Main Admin upload one official PDF per batch.
-- Students can read only the timetable for their own batch.
-- Files are stored in a private Supabase Storage bucket.
-- ============================================================


-- ------------------------------------------------------------
-- PRIVATE STORAGE BUCKET
-- ------------------------------------------------------------

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'campus-timetables',
  'campus-timetables',
  false,
  20971520,
  array['application/pdf']
)
on conflict (id)
do update set
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types =
    array['application/pdf'];


-- ------------------------------------------------------------
-- TIMETABLE DOCUMENT
-- One current official PDF per batch.
-- ------------------------------------------------------------

create table if not exists
public.batch_timetable_documents (
  id uuid primary key
    default gen_random_uuid(),

  batch_id uuid not null
    references public.attendance_batches(id)
    on delete cascade,

  storage_path text not null,

  file_name text not null,

  file_size bigint not null
    default 0
    check (
      file_size >= 0
      and file_size <= 20971520
    ),

  uploaded_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  unique(batch_id)
);


create index if not exists
batch_timetable_documents_batch_idx
on public.batch_timetable_documents(batch_id);


alter table
public.batch_timetable_documents
enable row level security;


-- ------------------------------------------------------------
-- UPDATED_AT
-- ------------------------------------------------------------

create or replace function
public.set_batch_timetable_document_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


drop trigger if exists
set_batch_timetable_document_updated_at_trigger
on public.batch_timetable_documents;


create trigger
set_batch_timetable_document_updated_at_trigger
before update
on public.batch_timetable_documents
for each row
execute function
public.set_batch_timetable_document_updated_at();


-- ============================================================
-- TABLE RLS
-- ============================================================


-- ------------------------------------------------------------
-- STUDENT
-- Student sees document only for a batch they belong to.
-- ------------------------------------------------------------

drop policy if exists
"Students view own batch timetable document"
on public.batch_timetable_documents;


create policy
"Students view own batch timetable document"
on public.batch_timetable_documents
for select
to authenticated
using (
  exists (
    select 1
    from public.attendance_batch_students abs
    where abs.batch_id =
      batch_timetable_documents.batch_id
      and abs.student_id = auth.uid()
  )
);


-- ------------------------------------------------------------
-- FACULTY
-- Faculty sees timetable for batches where they teach.
-- ------------------------------------------------------------

drop policy if exists
"Faculty view taught batch timetable document"
on public.batch_timetable_documents;


create policy
"Faculty view taught batch timetable document"
on public.batch_timetable_documents
for select
to authenticated
using (
  exists (
    select 1
    from public.attendance_batch_subjects abs
    where abs.batch_id =
      batch_timetable_documents.batch_id
      and abs.faculty_id = auth.uid()
  )
);


-- ------------------------------------------------------------
-- MAIN ADMIN
-- ------------------------------------------------------------

drop policy if exists
"Main Admin views timetable documents"
on public.batch_timetable_documents;


create policy
"Main Admin views timetable documents"
on public.batch_timetable_documents
for select
to authenticated
using (
  public.current_campus_role() =
    'Main Admin'
);


-- ------------------------------------------------------------
-- FACULTY INSERT
-- ------------------------------------------------------------

drop policy if exists
"Faculty creates taught batch timetable document"
on public.batch_timetable_documents;


create policy
"Faculty creates taught batch timetable document"
on public.batch_timetable_documents
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1
    from public.attendance_batch_subjects abs
    where abs.batch_id =
      batch_timetable_documents.batch_id
      and abs.faculty_id = auth.uid()
  )
);


-- ------------------------------------------------------------
-- MAIN ADMIN INSERT
-- ------------------------------------------------------------

drop policy if exists
"Main Admin creates timetable document"
on public.batch_timetable_documents;


create policy
"Main Admin creates timetable document"
on public.batch_timetable_documents
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and public.current_campus_role() =
    'Main Admin'
);


-- ------------------------------------------------------------
-- FACULTY UPDATE
-- ------------------------------------------------------------

drop policy if exists
"Faculty updates taught batch timetable document"
on public.batch_timetable_documents;


create policy
"Faculty updates taught batch timetable document"
on public.batch_timetable_documents
for update
to authenticated
using (
  exists (
    select 1
    from public.attendance_batch_subjects abs
    where abs.batch_id =
      batch_timetable_documents.batch_id
      and abs.faculty_id = auth.uid()
  )
)
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1
    from public.attendance_batch_subjects abs
    where abs.batch_id =
      batch_timetable_documents.batch_id
      and abs.faculty_id = auth.uid()
  )
);


-- ------------------------------------------------------------
-- MAIN ADMIN UPDATE
-- ------------------------------------------------------------

drop policy if exists
"Main Admin updates timetable document"
on public.batch_timetable_documents;


create policy
"Main Admin updates timetable document"
on public.batch_timetable_documents
for update
to authenticated
using (
  public.current_campus_role() =
    'Main Admin'
)
with check (
  uploaded_by = auth.uid()
  and public.current_campus_role() =
    'Main Admin'
);


-- ------------------------------------------------------------
-- FACULTY DELETE
-- ------------------------------------------------------------

drop policy if exists
"Faculty deletes taught batch timetable document"
on public.batch_timetable_documents;


create policy
"Faculty deletes taught batch timetable document"
on public.batch_timetable_documents
for delete
to authenticated
using (
  exists (
    select 1
    from public.attendance_batch_subjects abs
    where abs.batch_id =
      batch_timetable_documents.batch_id
      and abs.faculty_id = auth.uid()
  )
);


-- ------------------------------------------------------------
-- MAIN ADMIN DELETE
-- ------------------------------------------------------------

drop policy if exists
"Main Admin deletes timetable document"
on public.batch_timetable_documents;


create policy
"Main Admin deletes timetable document"
on public.batch_timetable_documents
for delete
to authenticated
using (
  public.current_campus_role() =
    'Main Admin'
);


grant select, insert, update, delete
on public.batch_timetable_documents
to authenticated;


-- ============================================================
-- STORAGE RLS
--
-- Storage path:
--
--   <batch-id>/<timestamp>-timetable.pdf
--
-- ============================================================


-- ------------------------------------------------------------
-- READ PDF
-- Student own batch / Faculty taught batch / Main Admin
-- ------------------------------------------------------------

drop policy if exists
"Authenticated users view allowed timetable PDFs"
on storage.objects;


create policy
"Authenticated users view allowed timetable PDFs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'campus-timetables'
  and (
    public.current_campus_role() =
      'Main Admin'

    or exists (
      select 1
      from public.attendance_batch_students abs
      where abs.student_id = auth.uid()
        and abs.batch_id::text =
          (storage.foldername(name))[1]
    )

    or exists (
      select 1
      from public.attendance_batch_subjects abs
      where abs.faculty_id = auth.uid()
        and abs.batch_id::text =
          (storage.foldername(name))[1]
    )
  )
);


-- ------------------------------------------------------------
-- UPLOAD PDF
-- Faculty own batch / Main Admin
-- ------------------------------------------------------------

drop policy if exists
"Faculty and admin upload timetable PDFs"
on storage.objects;


create policy
"Faculty and admin upload timetable PDFs"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'campus-timetables'
  and (
    public.current_campus_role() =
      'Main Admin'

    or exists (
      select 1
      from public.attendance_batch_subjects abs
      where abs.faculty_id = auth.uid()
        and abs.batch_id::text =
          (storage.foldername(name))[1]
    )
  )
);


-- ------------------------------------------------------------
-- DELETE OLD/REPLACED PDF
-- ------------------------------------------------------------

drop policy if exists
"Faculty and admin delete timetable PDFs"
on storage.objects;


create policy
"Faculty and admin delete timetable PDFs"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'campus-timetables'
  and (
    public.current_campus_role() =
      'Main Admin'

    or exists (
      select 1
      from public.attendance_batch_subjects abs
      where abs.faculty_id = auth.uid()
        and abs.batch_id::text =
          (storage.foldername(name))[1]
    )
  )
);
