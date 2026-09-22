create or replace function public.can_access_faculty_batch(
  p_batch_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and (
      public.current_campus_role() = 'Main Admin'

      or (
        public.current_campus_role() = 'Faculty'
        and (
          exists (
            select 1
            from public.attendance_batch_subjects abs
            where abs.batch_id = p_batch_id
              and abs.faculty_id = auth.uid()
          )

          or exists (
            select 1
            from public.faculty_teaching_allocations fta
            where fta.batch_id = p_batch_id
              and fta.faculty_id = auth.uid()
              and fta.status = 'Active'
          )
        )
      )
    );
$$;

revoke all
on function public.can_access_faculty_batch(uuid)
from public;

grant execute
on function public.can_access_faculty_batch(uuid)
to authenticated;


drop policy if exists
  "Staff create attendance batches"
on public.attendance_batches;

drop policy if exists
  "Staff delete attendance batches"
on public.attendance_batches;

drop policy if exists
  "Staff read attendance batches"
on public.attendance_batches;

drop policy if exists
  "Staff update attendance batches"
on public.attendance_batches;


create policy
  "Academic admin creates attendance batches"
on public.attendance_batches
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.current_campus_role() = 'Main Admin'
);


create policy
  "Assigned faculty read attendance batches"
on public.attendance_batches
for select
to authenticated
using (
  public.can_access_faculty_batch(id)
);


create policy
  "Academic admin updates attendance batches"
on public.attendance_batches
for update
to authenticated
using (
  public.current_campus_role() = 'Main Admin'
)
with check (
  public.current_campus_role() = 'Main Admin'
);


create policy
  "Academic admin deletes attendance batches"
on public.attendance_batches
for delete
to authenticated
using (
  public.current_campus_role() = 'Main Admin'
);


drop policy if exists
  "Staff create batch subjects"
on public.attendance_batch_subjects;

drop policy if exists
  "Staff delete batch subjects"
on public.attendance_batch_subjects;

drop policy if exists
  "Batch subjects readable"
on public.attendance_batch_subjects;

drop policy if exists
  "Staff update batch subjects"
on public.attendance_batch_subjects;


create policy
  "Academic admin creates batch subjects"
on public.attendance_batch_subjects
for insert
to authenticated
with check (
  public.current_campus_role() = 'Main Admin'
);


create policy
  "Authorized users read batch subjects"
on public.attendance_batch_subjects
for select
to authenticated
using (
  public.current_campus_role() = 'Main Admin'

  or (
    public.current_campus_role() = 'Faculty'
    and (
      faculty_id = auth.uid()

      or exists (
        select 1
        from public.faculty_teaching_allocations fta
        where fta.batch_subject_id =
          attendance_batch_subjects.id
          and fta.faculty_id = auth.uid()
          and fta.status = 'Active'
      )
    )
  )

  or exists (
    select 1
    from public.attendance_batch_students abs
    where abs.batch_id =
      attendance_batch_subjects.batch_id
      and abs.student_id = auth.uid()
  )
);


create policy
  "Academic admin updates batch subjects"
on public.attendance_batch_subjects
for update
to authenticated
using (
  public.current_campus_role() = 'Main Admin'
)
with check (
  public.current_campus_role() = 'Main Admin'
);


create policy
  "Academic admin deletes batch subjects"
on public.attendance_batch_subjects
for delete
to authenticated
using (
  public.current_campus_role() = 'Main Admin'
);


drop policy if exists
  "Staff add batch students"
on public.attendance_batch_students;

drop policy if exists
  "Staff remove batch students"
on public.attendance_batch_students;

drop policy if exists
  "Staff read batch students"
on public.attendance_batch_students;


create policy
  "Academic admin adds batch students"
on public.attendance_batch_students
for insert
to authenticated
with check (
  added_by = auth.uid()
  and public.current_campus_role() = 'Main Admin'
);


create policy
  "Assigned faculty read batch students"
on public.attendance_batch_students
for select
to authenticated
using (
  public.can_access_faculty_batch(batch_id)
);


create policy
  "Academic admin removes batch students"
on public.attendance_batch_students
for delete
to authenticated
using (
  public.current_campus_role() = 'Main Admin'
);
