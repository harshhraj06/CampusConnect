alter table public.assignments
add column if not exists audience_batch_id uuid
references public.attendance_batches(id)
on delete set null;

create index if not exists
assignments_audience_batch_idx
on public.assignments(audience_batch_id);

drop policy if exists
"Relevant assignments are visible"
on public.assignments;

create policy
"Relevant assignments are visible"
on public.assignments
for select
to authenticated
using (
  created_by = auth.uid()

  or public.current_campus_role() = 'Main Admin'

  or (
    public.current_campus_role() = 'Student'
    and audience_batch_id is not null
    and exists (
      select 1
      from public.attendance_batch_students abs
      where
        abs.batch_id = assignments.audience_batch_id
        and abs.student_id = auth.uid()
    )
  )

  or (
    public.current_campus_role() = 'Student'
    and audience_batch_id is null
    and (
      audience_department = 'All'
      or audience_department =
        public.current_campus_department()
    )
  )
);

drop policy if exists
"Staff create assignments"
on public.assignments;

create policy
"Staff create assignments"
on public.assignments
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Placement Cell',
    'Main Admin'
  )
  and audience_batch_id is not null
);

create table if not exists
public.assignment_attachments (
  id uuid primary key
    default gen_random_uuid(),

  assignment_id uuid not null
    references public.assignments(id)
    on delete cascade,

  owner_id uuid not null
    references auth.users(id)
    on delete cascade,

  file_name text not null,

  file_path text not null unique,

  file_type text not null,

  mime_type text not null
    default 'application/octet-stream',

  file_size bigint not null
    check (
      file_size > 0
      and file_size <= 15728640
    ),

  created_at timestamptz not null
    default now()
);

create index if not exists
assignment_attachments_assignment_idx
on public.assignment_attachments(assignment_id);

alter table public.assignment_attachments
enable row level security;

grant select, insert, delete
on public.assignment_attachments
to authenticated;

drop policy if exists
"Assignment attachments readable"
on public.assignment_attachments;

create policy
"Assignment attachments readable"
on public.assignment_attachments
for select
to authenticated
using (
  exists (
    select 1
    from public.assignments a
    where
      a.id =
        assignment_attachments.assignment_id
      and (
        a.created_by = auth.uid()

        or public.current_campus_role() =
          'Main Admin'

        or (
          public.current_campus_role() =
            'Student'
          and a.audience_batch_id is not null
          and exists (
            select 1
            from public.attendance_batch_students abs
            where
              abs.batch_id =
                a.audience_batch_id
              and abs.student_id =
                auth.uid()
          )
        )

        or (
          public.current_campus_role() =
            'Student'
          and a.audience_batch_id is null
          and (
            a.audience_department = 'All'
            or a.audience_department =
              public.current_campus_department()
          )
        )
      )
  )
);

drop policy if exists
"Assignment owners upload attachments"
on public.assignment_attachments;

create policy
"Assignment owners upload attachments"
on public.assignment_attachments
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.assignments a
    where
      a.id =
        assignment_attachments.assignment_id
      and a.created_by =
        auth.uid()
  )
);

drop policy if exists
"Assignment owners delete attachments"
on public.assignment_attachments;

create policy
"Assignment owners delete attachments"
on public.assignment_attachments
for delete
to authenticated
using (
  owner_id = auth.uid()
  or public.current_campus_role() =
    'Main Admin'
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'assignment-files',
  'assignment-files',
  false,
  15728640,
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
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types =
    excluded.allowed_mime_types;

drop policy if exists
"Assignment files upload"
on storage.objects;

create policy
"Assignment files upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'assignment-files'
  and (storage.foldername(name))[1] =
    auth.uid()::text
);

drop policy if exists
"Assignment files read"
on storage.objects;

create policy
"Assignment files read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'assignment-files'
  and exists (
    select 1
    from public.assignment_attachments aa
    where
      aa.file_path = name
  )
);

drop policy if exists
"Assignment files delete"
on storage.objects;

create policy
"Assignment files delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'assignment-files'
  and (
    (storage.foldername(name))[1] =
      auth.uid()::text
    or public.current_campus_role() =
      'Main Admin'
  )
);

notify pgrst, 'reload schema';
