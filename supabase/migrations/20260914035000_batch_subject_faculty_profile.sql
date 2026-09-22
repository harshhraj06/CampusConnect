drop function if exists public.get_my_batch_subjects();

create function
public.get_my_batch_subjects()
returns table (
  id uuid,
  batch_id uuid,
  subject_name text,
  subject_code text,
  credits integer,
  subject_type text,
  faculty_id uuid,
  faculty_name text,
  faculty_avatar_url text
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
    s.faculty_id,

    coalesce(
      nullif(trim(p.full_name), ''),
      nullif(trim(s.faculty_name), ''),
      'Faculty'
    ) as faculty_name,

    p.avatar_url
      as faculty_avatar_url

  from public.attendance_batch_subjects s

  join public.attendance_batch_students bs
    on bs.batch_id = s.batch_id

  left join public.profiles p
    on p.id = s.faculty_id

  where
    auth.uid() is not null
    and bs.student_id = auth.uid()

  order by
    lower(s.subject_name);
$$;

revoke all
on function public.get_my_batch_subjects()
from public, anon;

grant execute
on function public.get_my_batch_subjects()
to authenticated;

notify pgrst, 'reload schema';
