create or replace function public.get_my_assignments()
returns table (
  id uuid,
  title text,
  subject text,
  description text,
  due_at timestamptz,
  audience_department text,
  audience_batch_id uuid,
  created_by uuid,
  created_by_name text,
  kind text,
  created_at timestamptz,
  batch_name text,
  batch_section text
)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct
    a.id,
    a.title,
    a.subject,
    a.description,
    a.due_at,
    a.audience_department,
    a.audience_batch_id,
    a.created_by,
    a.created_by_name,
    a.kind,
    a.created_at,
    b.batch_name,
    b.section
  from public.assignments a
  left join public.attendance_batches b
    on b.id = a.audience_batch_id
  where
    auth.uid() is not null
    and (
      (
        a.audience_batch_id is not null
        and exists (
          select 1
          from public.attendance_batch_students abs
          where
            abs.batch_id = a.audience_batch_id
            and abs.student_id = auth.uid()
        )
      )
      or (
        a.audience_batch_id is null
        and (
          a.audience_department = 'All'
          or a.audience_department =
            public.current_campus_department()
        )
      )
    )
  order by a.due_at asc;
$$;

revoke all
on function public.get_my_assignments()
from public, anon;

grant execute
on function public.get_my_assignments()
to authenticated;

notify pgrst, 'reload schema';
