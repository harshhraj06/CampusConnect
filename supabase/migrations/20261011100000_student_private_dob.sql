-- Store DOB separately from general profile data to avoid exposing it
-- through existing broad SELECT permissions on public.profiles.
create table if not exists public.student_private_profile_data (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  date_of_birth date,
  updated_at timestamptz not null default now(),
  constraint student_private_profile_dob_not_future
    check (date_of_birth is null or date_of_birth <= current_date)
);

alter table public.student_private_profile_data enable row level security;

revoke all on table public.student_private_profile_data from anon, authenticated;
grant select, insert, update on table public.student_private_profile_data to authenticated;

drop policy if exists student_private_profile_read_authorized
  on public.student_private_profile_data;
create policy student_private_profile_read_authorized
  on public.student_private_profile_data
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or public.current_campus_role() = 'Main Admin'
    or (
      public.current_campus_role() = 'Faculty'
      and (
        exists (
          select 1
          from public.attendance_batch_students abs
          join public.attendance_batch_subjects absu
            on absu.batch_id = abs.batch_id
          where abs.student_id = student_private_profile_data.student_id
            and absu.faculty_id = (select auth.uid())
        )
        or exists (
          select 1
          from public.attendance_batch_students abs
          join public.faculty_teaching_allocations fta
            on fta.batch_id = abs.batch_id
          where abs.student_id = student_private_profile_data.student_id
            and fta.faculty_id = (select auth.uid())
            and fta.status = 'Active'
        )
      )
    )
  );

drop policy if exists student_private_profile_insert_self
  on public.student_private_profile_data;
create policy student_private_profile_insert_self
  on public.student_private_profile_data
  for insert to authenticated
  with check (student_id = (select auth.uid()));

drop policy if exists student_private_profile_update_self
  on public.student_private_profile_data;
create policy student_private_profile_update_self
  on public.student_private_profile_data
  for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));
