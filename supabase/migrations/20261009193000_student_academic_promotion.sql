-- Main Admin-controlled academic promotion. Previous batch memberships are retained
-- so historical attendance and academic records remain available.

create table if not exists public.student_academic_promotion_log (
  id uuid primary key default gen_random_uuid(),
  source_batch_id uuid not null references public.attendance_batches(id) on delete cascade,
  target_batch_id uuid not null references public.attendance_batches(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  promoted_by uuid references auth.users(id) on delete set null,
  source_semester text not null default '',
  target_semester text not null default '',
  source_academic_year text not null default '',
  target_academic_year text not null default '',
  note text not null default '',
  promoted_at timestamptz not null default now(),
  constraint student_academic_promotion_log_distinct_batches check (source_batch_id <> target_batch_id),
  constraint student_academic_promotion_log_once unique (source_batch_id, target_batch_id, student_id)
);

create index if not exists student_academic_promotion_log_student_idx
  on public.student_academic_promotion_log(student_id, promoted_at desc);
create index if not exists student_academic_promotion_log_actor_idx
  on public.student_academic_promotion_log(promoted_by, promoted_at desc);

alter table public.student_academic_promotion_log enable row level security;
revoke all on public.student_academic_promotion_log from public, anon, authenticated;

create or replace function public.admin_promote_students(
  p_source_batch_id uuid,
  p_target_batch_id uuid,
  p_student_ids uuid[] default null,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source public.attendance_batches%rowtype;
  v_target public.attendance_batches%rowtype;
  v_count integer := 0;
  v_requested integer := 0;
  v_note text := btrim(coalesce(p_note, ''));
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if public.current_campus_role() is distinct from 'Main Admin' then
    raise exception 'Only Main Admin can promote students.';
  end if;

  if p_source_batch_id is null or p_target_batch_id is null
     or p_source_batch_id = p_target_batch_id then
    raise exception 'Choose two different source and target batches.';
  end if;

  if coalesce(array_length(p_student_ids, 1), 0) > 500 then
    raise exception 'Promote at most 500 students in one operation.';
  end if;

  if char_length(v_note) > 500 then
    raise exception 'The promotion note must be 500 characters or fewer.';
  end if;

  select * into v_source
  from public.attendance_batches
  where id = p_source_batch_id
  for update;

  if not found then
    raise exception 'Source batch was not found.';
  end if;

  select * into v_target
  from public.attendance_batches
  where id = p_target_batch_id
  for update;

  if not found then
    raise exception 'Target batch was not found.';
  end if;

  if lower(btrim(v_source.department)) <> lower(btrim(v_target.department)) then
    raise exception 'Source and target batches must belong to the same department.';
  end if;

  select count(*) into v_requested
  from public.attendance_batch_students bs
  join public.profiles p on p.id = bs.student_id and p.role = 'Student'
  where bs.batch_id = p_source_batch_id
    and coalesce(p.account_status::text, 'Active') = 'Active'
    and (p_student_ids is null or bs.student_id = any(p_student_ids));

  if v_requested = 0 then
    raise exception 'No students were found in the selected source batch.';
  end if;

  with candidates as (
    select bs.student_id, bs.student_name, bs.campus_uid, bs.department,
           bs.graduation_year, bs.roll_number
    from public.attendance_batch_students bs
    join public.profiles p on p.id = bs.student_id and p.role = 'Student'
    where bs.batch_id = p_source_batch_id
      and (p_student_ids is null or bs.student_id = any(p_student_ids))
      and coalesce(p.account_status::text, 'Active') = 'Active'
  ), inserted as (
    insert into public.attendance_batch_students (
      batch_id, student_id, student_name, campus_uid, department,
      graduation_year, roll_number, added_by
    )
    select p_target_batch_id, c.student_id, c.student_name, c.campus_uid,
           c.department, c.graduation_year, c.roll_number, auth.uid()
    from candidates c
    on conflict (batch_id, student_id) do nothing
    returning student_id
  ), logged as (
    insert into public.student_academic_promotion_log (
      source_batch_id, target_batch_id, student_id, promoted_by,
      source_semester, target_semester, source_academic_year,
      target_academic_year, note
    )
    select p_source_batch_id, p_target_batch_id, i.student_id, auth.uid(),
           v_source.semester, v_target.semester, v_source.academic_year,
           v_target.academic_year, v_note
    from inserted i
    on conflict (source_batch_id, target_batch_id, student_id) do nothing
    returning student_id
  )
  select count(*)::integer into v_count from logged;

  return jsonb_build_object(
    'ok', true,
    'promoted_count', v_count,
    'already_in_target_count', greatest(v_requested - v_count, 0),
    'source_batch_id', p_source_batch_id,
    'target_batch_id', p_target_batch_id,
    'source_semester', v_source.semester,
    'target_semester', v_target.semester,
    'source_academic_year', v_source.academic_year,
    'target_academic_year', v_target.academic_year
  );
end;
$$;

revoke all on function public.admin_promote_students(uuid, uuid, uuid[], text) from public, anon;
grant execute on function public.admin_promote_students(uuid, uuid, uuid[], text) to authenticated;

notify pgrst, 'reload schema';
