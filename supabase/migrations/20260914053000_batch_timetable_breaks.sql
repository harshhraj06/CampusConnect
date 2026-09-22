-- ============================================================
-- CAMPUSCONNECT — TIMETABLE BREAKS
--
-- Stores batch-level Tea Break / Lunch Break / custom breaks.
-- Breaks are independent of subjects and faculty.
-- ============================================================


create table if not exists
public.batch_timetable_breaks (
  id uuid primary key
    default gen_random_uuid(),

  batch_id uuid not null
    references public.attendance_batches(id)
    on delete cascade,

  label text not null
    check (
      char_length(trim(label))
      between 2 and 60
    ),

  start_time time not null,

  end_time time not null,

  display_order integer not null
    default 1
    check (
      display_order
      between 1 and 30
    ),

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  check (
    end_time > start_time
  ),

  unique (
    batch_id,
    start_time,
    end_time
  )
);


create index if not exists
batch_timetable_breaks_batch_idx
on public.batch_timetable_breaks(
  batch_id,
  display_order,
  start_time
);


alter table
public.batch_timetable_breaks
enable row level security;


grant select, insert, update, delete
on public.batch_timetable_breaks
to authenticated;


-- Students in the batch can read breaks.

drop policy if exists
"Students read own timetable breaks"
on public.batch_timetable_breaks;

create policy
"Students read own timetable breaks"
on public.batch_timetable_breaks
for select
to authenticated
using (
  exists (
    select 1
    from public.attendance_batch_students student
    where
      student.batch_id =
        batch_timetable_breaks.batch_id
      and student.student_id =
        auth.uid()
  )
);


-- Faculty may read breaks for batches where they teach.

drop policy if exists
"Faculty read assigned timetable breaks"
on public.batch_timetable_breaks;

create policy
"Faculty read assigned timetable breaks"
on public.batch_timetable_breaks
for select
to authenticated
using (
  public.current_campus_role() = 'Faculty'
  and exists (
    select 1
    from public.attendance_batch_subjects subject
    where
      subject.batch_id =
        batch_timetable_breaks.batch_id
      and subject.faculty_id =
        auth.uid()
  )
);


-- Main Admin can read all.

drop policy if exists
"Main Admin reads timetable breaks"
on public.batch_timetable_breaks;

create policy
"Main Admin reads timetable breaks"
on public.batch_timetable_breaks
for select
to authenticated
using (
  public.current_campus_role() =
    'Main Admin'
);


-- Faculty may create breaks only for a batch where they teach.

drop policy if exists
"Faculty creates timetable breaks"
on public.batch_timetable_breaks;

create policy
"Faculty creates timetable breaks"
on public.batch_timetable_breaks
for insert
to authenticated
with check (
  public.current_campus_role() = 'Faculty'
  and created_by = auth.uid()
  and exists (
    select 1
    from public.attendance_batch_subjects subject
    where
      subject.batch_id =
        batch_timetable_breaks.batch_id
      and subject.faculty_id =
        auth.uid()
  )
);


drop policy if exists
"Faculty updates timetable breaks"
on public.batch_timetable_breaks;

create policy
"Faculty updates timetable breaks"
on public.batch_timetable_breaks
for update
to authenticated
using (
  public.current_campus_role() = 'Faculty'
  and created_by = auth.uid()
)
with check (
  public.current_campus_role() = 'Faculty'
  and created_by = auth.uid()
  and exists (
    select 1
    from public.attendance_batch_subjects subject
    where
      subject.batch_id =
        batch_timetable_breaks.batch_id
      and subject.faculty_id =
        auth.uid()
  )
);


drop policy if exists
"Faculty deletes timetable breaks"
on public.batch_timetable_breaks;

create policy
"Faculty deletes timetable breaks"
on public.batch_timetable_breaks
for delete
to authenticated
using (
  public.current_campus_role() = 'Faculty'
  and created_by = auth.uid()
);


-- Main Admin full management.

drop policy if exists
"Main Admin creates timetable breaks"
on public.batch_timetable_breaks;

create policy
"Main Admin creates timetable breaks"
on public.batch_timetable_breaks
for insert
to authenticated
with check (
  public.current_campus_role() =
    'Main Admin'
  and created_by =
    auth.uid()
);


drop policy if exists
"Main Admin updates timetable breaks"
on public.batch_timetable_breaks;

create policy
"Main Admin updates timetable breaks"
on public.batch_timetable_breaks
for update
to authenticated
using (
  public.current_campus_role() =
    'Main Admin'
)
with check (
  public.current_campus_role() =
    'Main Admin'
);


drop policy if exists
"Main Admin deletes timetable breaks"
on public.batch_timetable_breaks;

create policy
"Main Admin deletes timetable breaks"
on public.batch_timetable_breaks
for delete
to authenticated
using (
  public.current_campus_role() =
    'Main Admin'
);


-- ============================================================
-- STUDENT BREAK RPC
-- ============================================================

create or replace function
public.get_my_timetable_breaks()
returns table (
  id uuid,
  batch_id uuid,
  label text,
  start_time time,
  end_time time,
  display_order integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    break_row.id,
    break_row.batch_id,
    break_row.label,
    break_row.start_time,
    break_row.end_time,
    break_row.display_order

  from public.batch_timetable_breaks break_row

  join public.attendance_batch_students membership
    on membership.batch_id =
      break_row.batch_id

  where
    auth.uid() is not null
    and membership.student_id =
      auth.uid()

  order by
    break_row.display_order,
    break_row.start_time;
$$;


revoke all
on function public.get_my_timetable_breaks()
from public, anon;

grant execute
on function public.get_my_timetable_breaks()
to authenticated;


notify pgrst, 'reload schema';
