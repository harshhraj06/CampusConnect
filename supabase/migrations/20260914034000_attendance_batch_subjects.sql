create table if not exists public.attendance_batch_subjects (
  id uuid primary key default gen_random_uuid(),

  batch_id uuid not null
    references public.attendance_batches(id)
    on delete cascade,

  subject_name text not null
    check (
      char_length(trim(subject_name))
      between 2 and 160
    ),

  subject_code text not null default '',

  credits integer not null default 3
    check (credits between 1 and 4),

  subject_type text not null default 'Theory'
    check (
      subject_type in (
        'Theory',
        'Lab',
        'Theory + Lab'
      )
    ),

  faculty_id uuid not null
    references auth.users(id)
    on delete cascade,

  faculty_name text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    batch_id,
    subject_name
  )
);


create index if not exists
attendance_batch_subjects_batch_idx
on public.attendance_batch_subjects(batch_id);


alter table public.attendance_batch_subjects
enable row level security;


grant select, insert, update, delete
on public.attendance_batch_subjects
to authenticated;


drop policy if exists
"Batch subjects readable"
on public.attendance_batch_subjects;

create policy
"Batch subjects readable"
on public.attendance_batch_subjects
for select
to authenticated
using (
  public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )

  or exists (
    select 1
    from public.attendance_batch_students bs
    where
      bs.batch_id =
        attendance_batch_subjects.batch_id
      and bs.student_id =
        auth.uid()
  )
);


drop policy if exists
"Staff create batch subjects"
on public.attendance_batch_subjects;

create policy
"Staff create batch subjects"
on public.attendance_batch_subjects
for insert
to authenticated
with check (
  faculty_id = auth.uid()

  and public.current_campus_role() in (
    'Faculty',
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists
"Staff update batch subjects"
on public.attendance_batch_subjects;

create policy
"Staff update batch subjects"
on public.attendance_batch_subjects
for update
to authenticated
using (
  faculty_id = auth.uid()

  or public.current_campus_role() in (
    'Coordinator',
    'Main Admin'
  )
)
with check (
  faculty_id = auth.uid()

  or public.current_campus_role() in (
    'Coordinator',
    'Main Admin'
  )
);


drop policy if exists
"Staff delete batch subjects"
on public.attendance_batch_subjects;

create policy
"Staff delete batch subjects"
on public.attendance_batch_subjects
for delete
to authenticated
using (
  faculty_id = auth.uid()

  or public.current_campus_role() in (
    'Coordinator',
    'Main Admin'
  )
);


create or replace function
public.get_my_batch_subjects()
returns table (
  id uuid,
  batch_id uuid,
  subject_name text,
  subject_code text,
  credits integer,
  subject_type text,
  faculty_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id,
    s.batch_id,
    s.subject_name,
    s.subject_code,
    s.credits,
    s.subject_type,
    s.faculty_name
  from public.attendance_batch_subjects s
  join public.attendance_batch_students bs
    on bs.batch_id = s.batch_id
  where
    auth.uid() is not null
    and bs.student_id = auth.uid()
  order by lower(s.subject_name);
$$;


revoke all
on function public.get_my_batch_subjects()
from public, anon;

grant execute
on function public.get_my_batch_subjects()
to authenticated;


notify pgrst, 'reload schema';
