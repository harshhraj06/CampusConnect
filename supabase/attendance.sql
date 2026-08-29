create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  subject text not null,
  attended integer not null default 0 check (attended >= 0),
  total integer not null default 0 check (total >= attended),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),

  unique (student_id, subject)
);

alter table public.attendance_records enable row level security;

drop policy if exists "Attendance access"
on public.attendance_records;

drop policy if exists "Staff record attendance"
on public.attendance_records;

drop policy if exists "Staff update attendance"
on public.attendance_records;

create policy "Attendance access"
on public.attendance_records
for select
to authenticated
using (
  student_id = auth.uid()
  or public.current_campus_role() in ('Faculty', 'Placement Cell')
);

create policy "Staff record attendance"
on public.attendance_records
for insert
to authenticated
with check (
  public.current_campus_role() in ('Faculty', 'Placement Cell')
);

create policy "Staff update attendance"
on public.attendance_records
for update
to authenticated
using (
  public.current_campus_role() in ('Faculty', 'Placement Cell')
)
with check (
  public.current_campus_role() in ('Faculty', 'Placement Cell')
);