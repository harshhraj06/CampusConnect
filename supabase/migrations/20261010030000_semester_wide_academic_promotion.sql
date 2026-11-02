-- Semester-wide academic credit rules and atomic multi-batch promotion.
-- This migration intentionally preserves existing results, audit history,
-- and the unrelated student_personal_announcements table.

begin;

-- Keep the most recently updated rule for each semester, then make the
-- remaining rule apply to every department.
delete from public.academic_promotion_credit_rules older
using public.academic_promotion_credit_rules newer
where btrim(older.semester) = btrim(newer.semester)
  and (
    older.updated_at < newer.updated_at
    or (
      older.updated_at = newer.updated_at
      and older.id < newer.id
    )
  );

alter table public.academic_promotion_credit_rules
  drop constraint if exists academic_promotion_credit_rules_dept_sem_unique;

alter table public.academic_promotion_credit_rules
  drop constraint if exists academic_promotion_credit_rules_semester_unique;

update public.academic_promotion_credit_rules
set department = 'All branches';

alter table public.academic_promotion_credit_rules
  add constraint academic_promotion_credit_rules_semester_unique
  unique (semester);


-- Preserve the existing RPC signature so existing API callers remain
-- compatible, but store exactly one rule per semester.
create or replace function public.admin_set_academic_promotion_credit_rule(
  p_department text,
  p_semester text,
  p_total_credits numeric,
  p_minimum_credits numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.academic_promotion_credit_rules%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if public.current_campus_role() is distinct from 'Main Admin' then
    raise exception 'Only Main Admin can configure credit rules.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.account_status::text, 'Active') = 'Active'
  ) then
    raise exception 'An active Main Admin account is required.';
  end if;

  if nullif(btrim(coalesce(p_semester, '')), '') is null then
    raise exception 'Semester is required.';
  end if;

  if p_total_credits is null
     or p_minimum_credits is null
     or p_total_credits <= 0
     or p_minimum_credits < 0
     or p_minimum_credits > p_total_credits then
    raise exception 'Minimum credits must be between zero and total credits.';
  end if;

  insert into public.academic_promotion_credit_rules (
    department, semester, total_credits, minimum_credits, updated_by, updated_at
  )
  values (
    'All branches', btrim(p_semester), p_total_credits,
    p_minimum_credits, auth.uid(), now()
  )
  on conflict (semester) do update
  set department = 'All branches',
      total_credits = excluded.total_credits,
      minimum_credits = excluded.minimum_credits,
      updated_by = auth.uid(),
      updated_at = now()
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'department', v_row.department,
    'semester', v_row.semester,
    'total_credits', v_row.total_credits,
    'minimum_credits', v_row.minimum_credits
  );
end;
$$;


-- Result validation now looks up the semester-wide rule, not a department rule.
create or replace function public.admin_save_student_academic_result(
  p_batch_id uuid,
  p_student_id uuid,
  p_credits_earned numeric,
  p_exam_status text,
  p_result_verified boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch public.attendance_batches%rowtype;
  v_rule public.academic_promotion_credit_rules%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if public.current_campus_role() is distinct from 'Main Admin' then
    raise exception 'Only Main Admin can record or verify promotion results.';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.account_status::text, 'Active') = 'Active'
  ) then
    raise exception 'An active Main Admin account is required.';
  end if;

  if p_batch_id is null
     or p_student_id is null
     or p_credits_earned is null
     or p_credits_earned < 0
     or p_exam_status not in ('pass', 'fail', 'pending') then
    raise exception 'Invalid academic result.';
  end if;

  select * into v_batch
  from public.attendance_batches
  where id = p_batch_id;

  if not found then
    raise exception 'Batch not found.';
  end if;

  if not exists (
    select 1
    from public.attendance_batch_students bs
    join public.profiles p
      on p.id = bs.student_id
     and p.role = 'Student'
    where bs.batch_id = p_batch_id
      and bs.student_id = p_student_id
      and coalesce(p.account_status::text, 'Active') = 'Active'
  ) then
    raise exception 'Student is not an active member of this batch.';
  end if;

  select * into v_rule
  from public.academic_promotion_credit_rules r
  where btrim(r.semester) = btrim(v_batch.semester)
  limit 1;

  if not found then
    raise exception 'Configure the shared credit rule for this semester first.';
  end if;

  if p_credits_earned > v_rule.total_credits then
    raise exception 'Credits earned cannot exceed configured total credits.';
  end if;

  insert into public.student_academic_results (
    batch_id, student_id, credits_earned, exam_status,
    result_verified, recorded_by, updated_at
  )
  values (
    p_batch_id, p_student_id, p_credits_earned, p_exam_status,
    coalesce(p_result_verified, false), auth.uid(), now()
  )
  on conflict (batch_id, student_id) do update
  set credits_earned = excluded.credits_earned,
      exam_status = excluded.exam_status,
      result_verified = excluded.result_verified,
      recorded_by = auth.uid(),
      updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'credits_earned', p_credits_earned,
    'exam_status', p_exam_status,
    'result_verified', coalesce(p_result_verified, false)
  );
end;
$$;


-- Semester-wide promotion RPC.
-- Target batches are matched by department, section and next semester.
-- Academic year is intentionally not used as a hard filter because semester
-- progression may cross an academic-year boundary. Ambiguous matches fail
-- safely instead of choosing an arbitrary batch.
create or replace function public.admin_promote_semester_students(
  p_semester text,
  p_student_ids uuid[] default null,
  p_note text default '',
  p_override_student_ids uuid[] default null,
  p_override_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student record;
  v_source public.attendance_batches%rowtype;
  v_target public.attendance_batches%rowtype;
  v_rule public.academic_promotion_credit_rules%rowtype;
  v_result public.student_academic_results%rowtype;
  v_target_count integer;
  v_source_count integer;
  v_promoted integer := 0;
  v_blocked integer := 0;
  v_override_count integer := 0;
  v_source_semester_number integer;
  v_note text := btrim(coalesce(p_note, ''));
  v_reason text := btrim(coalesce(p_override_reason, ''));
  v_eligible boolean;
  v_has_result boolean := false;
  v_overridden boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if public.current_campus_role() is distinct from 'Main Admin' then
    raise exception 'Only Main Admin can promote students.';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.account_status::text, 'Active') = 'Active'
  ) then
    raise exception 'An active Main Admin account is required.';
  end if;

  if nullif(btrim(coalesce(p_semester, '')), '') is null then
    raise exception 'Choose a semester.';
  end if;

  if coalesce(array_length(p_student_ids, 1), 0) > 500
     or coalesce(array_length(p_override_student_ids, 1), 0) > 500 then
    raise exception 'Select at most 500 students in one operation.';
  end if;

  if char_length(v_note) > 500 or char_length(v_reason) > 500 then
    raise exception 'Notes must be 500 characters or fewer.';
  end if;

  if coalesce(array_length(p_override_student_ids, 1), 0) > 0
     and char_length(v_reason) < 8 then
    raise exception 'An admin override requires a reason of at least 8 characters.';
  end if;

  if coalesce(array_length(p_override_student_ids, 1), 0) > 0
     and exists (
       select 1
       from unnest(p_override_student_ids) as o(student_id)
       where not (o.student_id = any(coalesce(p_student_ids, '{}'::uuid[])))
     ) then
    raise exception 'Override students must be part of the selected student list.';
  end if;

  select * into v_rule
  from public.academic_promotion_credit_rules r
  where btrim(r.semester) = btrim(p_semester)
  limit 1;

  if not found then
    raise exception 'No shared credit rule is configured for this semester.';
  end if;

  -- Reject invalid semester labels rather than guessing their sequence.
  v_source_semester_number :=
    substring(btrim(p_semester) from '([0-9]+)')::integer;

  if v_source_semester_number is null then
    raise exception 'Semester must contain a numeric semester number to determine the next semester.';
  end if;

  -- Every explicitly selected student must belong to the selected semester.
  if p_student_ids is not null and exists (
    select 1
    from unnest(p_student_ids) as requested(student_id)
    where not exists (
      select 1
      from public.attendance_batch_students bs
      join public.attendance_batches b on b.id = bs.batch_id
      join public.profiles p
        on p.id = bs.student_id
       and p.role = 'Student'
       and coalesce(p.account_status::text, 'Active') = 'Active'
      where bs.student_id = requested.student_id
        and btrim(b.semester) = btrim(p_semester)
    )
  ) then
    raise exception 'One or more selected students are not active members of the chosen semester.';
  end if;

  for v_student in
    select
      bs.batch_id as source_batch_id,
      bs.student_id,
      bs.student_name,
      bs.campus_uid,
      bs.department as student_department,
      bs.graduation_year,
      bs.roll_number,
      b.batch_name as source_batch_name,
      b.department as source_department,
      b.section as source_section,
      b.semester as source_semester,
      b.academic_year as source_academic_year
    from public.attendance_batch_students bs
    join public.attendance_batches b on b.id = bs.batch_id
    join public.profiles p
      on p.id = bs.student_id
     and p.role = 'Student'
     and coalesce(p.account_status::text, 'Active') = 'Active'
    where btrim(b.semester) = btrim(p_semester)
      and (
        p_student_ids is null
        or bs.student_id = any(p_student_ids)
      )
    order by b.department, b.section, bs.student_name
  loop
    -- A student with multiple source memberships in this semester must be
    -- resolved manually before promotion.
    select count(*) into v_source_count
    from public.attendance_batch_students bs
    join public.attendance_batches b on b.id = bs.batch_id
    join public.profiles p
      on p.id = bs.student_id
     and p.role = 'Student'
     and coalesce(p.account_status::text, 'Active') = 'Active'
    where bs.student_id = v_student.student_id
      and btrim(b.semester) = btrim(p_semester);

    if v_source_count > 1 then
      raise exception 'Student % belongs to multiple source batches in semester %. Resolve duplicate source memberships first.',
        coalesce(v_student.student_name, v_student.student_id::text), p_semester;
    end if;

    select * into v_result
    from public.student_academic_results ar
    where ar.batch_id = v_student.source_batch_id
      and ar.student_id = v_student.student_id;

    -- Capture FOUND immediately; subsequent statements can change it.
    v_has_result := found;

    v_overridden :=
      v_student.student_id = any(coalesce(p_override_student_ids, '{}'::uuid[]));

    v_eligible :=
      v_has_result
      and v_result.result_verified is true
      and v_result.exam_status = 'pass'
      and v_result.credits_earned >= v_rule.minimum_credits
      and v_result.credits_earned <= v_rule.total_credits;

    if not v_eligible and not v_overridden then
      v_blocked := v_blocked + 1;
      continue;
    end if;

    -- Match the same branch and section in the next numeric semester.
    select count(*) into v_target_count
    from public.attendance_batches b
    where lower(btrim(coalesce(b.department, '')))
            = lower(btrim(coalesce(v_student.source_department, '')))
      and lower(btrim(coalesce(b.section, '')))
            = lower(btrim(coalesce(v_student.source_section, '')))
      and substring(btrim(b.semester) from '([0-9]+)') is not null
      and substring(btrim(b.semester) from '([0-9]+)')::integer
            = v_source_semester_number + 1;

    if v_target_count = 0 then
      raise exception 'No next-semester batch found for student %: department %, section %, semester %.',
        coalesce(v_student.student_name, v_student.student_id::text),
        v_student.source_department, v_student.source_section,
        v_source_semester_number + 1;
    elsif v_target_count > 1 then
      raise exception 'Multiple next-semester batches found for department %, section %, semester %. Resolve duplicate target batches before promoting.',
        v_student.source_department, v_student.source_section,
        v_source_semester_number + 1;
    end if;

    select * into v_target
    from public.attendance_batches b
    where lower(btrim(coalesce(b.department, '')))
            = lower(btrim(coalesce(v_student.source_department, '')))
      and lower(btrim(coalesce(b.section, '')))
            = lower(btrim(coalesce(v_student.source_section, '')))
      and substring(btrim(b.semester) from '([0-9]+)') is not null
      and substring(btrim(b.semester) from '([0-9]+)')::integer
            = v_source_semester_number + 1;

    if exists (
      select 1
      from public.student_academic_promotion_log l
      where l.source_batch_id = v_student.source_batch_id
        and l.target_batch_id = v_target.id
        and l.student_id = v_student.student_id
    ) then
      raise exception 'Student % has already been promoted from their source batch.',
        coalesce(v_student.student_name, v_student.student_id::text);
    end if;

    if exists (
      select 1
      from public.attendance_batch_students bs
      where bs.batch_id = v_target.id
        and bs.student_id = v_student.student_id
    ) then
      raise exception 'Student % is already a member of the target batch. Review existing memberships before retrying.',
        coalesce(v_student.student_name, v_student.student_id::text);
    end if;

    insert into public.attendance_batch_students (
      batch_id, student_id, student_name, campus_uid,
      department, graduation_year, roll_number, added_by
    )
    values (
      v_target.id, v_student.student_id, v_student.student_name,
      v_student.campus_uid, v_student.student_department,
      v_student.graduation_year, v_student.roll_number, auth.uid()
    );

    insert into public.student_academic_promotion_log (
      source_batch_id, target_batch_id, student_id, promoted_by,
      source_semester, target_semester, source_academic_year,
      target_academic_year, note, override_reason
    )
    values (
      v_student.source_batch_id, v_target.id, v_student.student_id, auth.uid(),
      v_student.source_semester, v_target.semester,
      v_student.source_academic_year, v_target.academic_year, v_note,
      case when v_overridden then v_reason else '' end
    );

    v_promoted := v_promoted + 1;
    if v_overridden then
      v_override_count := v_override_count + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'semester', p_semester,
    'target_semester', v_source_semester_number + 1,
    'promoted_count', v_promoted,
    'blocked_count', v_blocked,
    'override_selected_count', v_override_count,
    'minimum_credits', v_rule.minimum_credits,
    'total_credits', v_rule.total_credits
  );
end;
$$;

revoke all on function public.admin_promote_semester_students(text, uuid[], text, uuid[], text)
  from public, anon;

grant execute on function public.admin_set_academic_promotion_credit_rule(text, text, numeric, numeric)
  to authenticated;

grant execute on function public.admin_save_student_academic_result(uuid, uuid, numeric, text, boolean)
  to authenticated;

grant execute on function public.admin_promote_semester_students(text, uuid[], text, uuid[], text)
  to authenticated;

notify pgrst, 'reload schema';

commit;
