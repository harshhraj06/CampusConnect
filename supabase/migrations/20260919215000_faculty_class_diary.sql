-- ============================================================
-- CAMPUSCONNECT — FACULTY CLASS DIARY
--
-- One diary record per saved attendance session.
-- Faculty owns the record through the underlying attendance
-- session. Main Admin may review records.
-- ============================================================


create table if not exists
public.faculty_class_diary (
  id uuid primary key
    default gen_random_uuid(),

  attendance_session_id uuid not null
    references public.attendance_sessions(id)
    on delete cascade,

  batch_id uuid not null
    references public.attendance_batches(id)
    on delete cascade,

  batch_subject_id uuid
    references public.attendance_batch_subjects(id)
    on delete set null,

  faculty_id uuid not null
    references auth.users(id)
    on delete cascade,

  faculty_name text not null,

  class_date date not null,

  period_name text not null,

  subject text not null,

  topic text not null
    default '',

  present_count integer not null
    default 0
    check (present_count >= 0),

  absent_count integer not null
    default 0
    check (absent_count >= 0),

  late_count integer not null
    default 0
    check (late_count >= 0),

  excused_count integer not null
    default 0
    check (excused_count >= 0),

  total_students integer not null
    default 0
    check (total_students >= 0),

  source text not null
    default 'Manual'
    check (
      source in (
        'Manual',
        'Published Timetable'
      )
    ),

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint faculty_class_diary_attendance_session_key
    unique (attendance_session_id)
);


create index if not exists
faculty_class_diary_faculty_date_idx
on public.faculty_class_diary (
  faculty_id,
  class_date desc
);


create index if not exists
faculty_class_diary_batch_date_idx
on public.faculty_class_diary (
  batch_id,
  class_date desc
);


create index if not exists
faculty_class_diary_subject_idx
on public.faculty_class_diary (
  batch_subject_id
)
where batch_subject_id is not null;


alter table
public.faculty_class_diary
enable row level security;


drop policy if exists
"Faculty reads own class diary"
on public.faculty_class_diary;


create policy
"Faculty reads own class diary"
on public.faculty_class_diary
for select
to authenticated
using (
  faculty_id = auth.uid()
  or
  public.current_campus_role() =
    'Main Admin'
);


drop policy if exists
"Faculty creates own class diary"
on public.faculty_class_diary;


create policy
"Faculty creates own class diary"
on public.faculty_class_diary
for insert
to authenticated
with check (
  faculty_id = auth.uid()

  and
  public.current_campus_role() =
    'Faculty'

  and exists (
    select 1
    from public.attendance_sessions s
    where
      s.id =
        faculty_class_diary.attendance_session_id

      and s.faculty_id =
        auth.uid()

      and s.batch_id =
        faculty_class_diary.batch_id
  )
);


drop policy if exists
"Faculty updates own class diary"
on public.faculty_class_diary;


create policy
"Faculty updates own class diary"
on public.faculty_class_diary
for update
to authenticated
using (
  faculty_id = auth.uid()
  and
  public.current_campus_role() =
    'Faculty'
)
with check (
  faculty_id = auth.uid()

  and
  public.current_campus_role() =
    'Faculty'

  and exists (
    select 1
    from public.attendance_sessions s
    where
      s.id =
        faculty_class_diary.attendance_session_id

      and s.faculty_id =
        auth.uid()

      and s.batch_id =
        faculty_class_diary.batch_id
  )
);


drop policy if exists
"Main Admin deletes class diary"
on public.faculty_class_diary;


create policy
"Main Admin deletes class diary"
on public.faculty_class_diary
for delete
to authenticated
using (
  public.current_campus_role() =
    'Main Admin'
);


revoke all
on table public.faculty_class_diary
from anon;


grant
select,
insert,
update
on table public.faculty_class_diary
to authenticated;
