-- Correct promotion RPC handling of malformed roster entries and target batches.
-- Missing/ambiguous targets and duplicate memberships in all-eligible mode block
-- affected students without rolling back unrelated valid promotions. No data
-- is deleted or rewritten by this migration.

begin;

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
  v_target public.attendance_batches%rowtype;
  v_rule public.academic_promotion_credit_rules%rowtype;
  v_result public.student_academic_results%rowtype;
  v_target_count integer;
  v_source_count integer;
  v_promoted integer := 0;
  v_blocked integer := 0;
  v_blocked_eligibility integer := 0;
  v_blocked_target integer := 0;
  v_blocked_duplicate integer := 0;
  v_duplicate_students uuid[] := '{}'::uuid[];
  v_skipped integer := 0;
  v_override_count integer := 0;
  v_source_semester_number integer;
  v_semester text;
  v_note text := btrim(coalesce(p_note, ''));
  v_reason text := btrim(coalesce(p_override_reason, ''));
  v_eligible boolean;
  v_has_result boolean := false;
  v_overridden boolean;
  v_student_count integer := coalesce(array_length(p_student_ids, 1), 0);
  v_override_len integer := coalesce(array_length(p_override_student_ids, 1), 0);
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

  v_semester := public.normalize_academic_semester(p_semester);
  if v_semester is null then
    raise exception 'Semester must contain a numeric semester number to determine the next semester.';
  end if;

  -- Empty array is not the same as NULL. NULL = all eligible (+ overrides).
  if p_student_ids is not null and v_student_count = 0 then
    raise exception 'Empty student selection is not allowed. Omit the selection to promote all eligible students.';
  end if;

  if p_override_student_ids is not null and v_override_len = 0 then
    p_override_student_ids := null;
    v_override_len := 0;
  end if;

  if p_student_ids is not null and exists (
    select 1 from unnest(p_student_ids) as selected(student_id)
    where selected.student_id is null
  ) then
    raise exception 'Student selection contains a null student ID.';
  end if;

  if p_student_ids is not null and exists (
    select selected.student_id
    from unnest(p_student_ids) as selected(student_id)
    group by selected.student_id
    having count(*) > 1
  ) then
    raise exception 'Student selection contains duplicate student IDs.';
  end if;

  if p_override_student_ids is not null and exists (
    select 1 from unnest(p_override_student_ids) as selected(student_id)
    where selected.student_id is null
  ) then
    raise exception 'Override selection contains a null student ID.';
  end if;

  if p_override_student_ids is not null and exists (
    select selected.student_id
    from unnest(p_override_student_ids) as selected(student_id)
    group by selected.student_id
    having count(*) > 1
  ) then
    raise exception 'Override selection contains duplicate student IDs.';
  end if;

  if v_student_count > 500 or v_override_len > 500 then
    raise exception 'Select at most 500 students in one operation.';
  end if;

  if char_length(v_note) > 500 or char_length(v_reason) > 500 then
    raise exception 'Notes must be 500 characters or fewer.';
  end if;

  if v_override_len > 0 and char_length(v_reason) < 8 then
    raise exception 'An admin override requires a reason of at least 8 characters.';
  end if;

  -- Workflow A: explicit selection requires overrides to be a subset.
  -- Workflow B: NULL selection evaluates all eligible students and named overrides.
  if p_student_ids is not null
     and v_override_len > 0
     and exists (
       select 1
       from unnest(p_override_student_ids) as o(student_id)
       where not (o.student_id = any(p_student_ids))
     ) then
    raise exception 'Override students must be part of the selected student list.';
  end if;

  select * into v_rule
  from public.academic_promotion_credit_rules r
  where r.semester = v_semester
  for update;

  if not found then
    raise exception 'No shared credit rule is configured for this semester.';
  end if;

  v_source_semester_number := substring(v_semester from '([0-9]+)')::integer;

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
        and public.normalize_academic_semester(b.semester) = v_semester
    )
  ) then
    raise exception 'One or more selected students are not active members of the chosen semester.';
  end if;

  if v_override_len > 0 and exists (
    select 1
    from unnest(p_override_student_ids) as requested(student_id)
    where not exists (
      select 1
      from public.attendance_batch_students bs
      join public.attendance_batches b on b.id = bs.batch_id
      join public.profiles p
        on p.id = bs.student_id
       and p.role = 'Student'
       and coalesce(p.account_status::text, 'Active') = 'Active'
      where bs.student_id = requested.student_id
        and public.normalize_academic_semester(b.semester) = v_semester
    )
  ) then
    raise exception 'One or more override students are not active members of the chosen semester.';
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
    where public.normalize_academic_semester(b.semester) = v_semester
      and (
        p_student_ids is null
        or bs.student_id = any(p_student_ids)
        or bs.student_id = any(coalesce(p_override_student_ids, '{}'::uuid[]))
      )
    order by b.id, bs.student_id
    for update of bs
  loop
    select count(*) into v_source_count
    from public.attendance_batch_students bs
    join public.attendance_batches b on b.id = bs.batch_id
    where bs.student_id = v_student.student_id
      and public.normalize_academic_semester(b.semester) = v_semester;

    if v_source_count > 1 then
      -- In all-eligible mode, one malformed roster entry must not roll back
      -- otherwise valid students. Block that student once and continue.
      -- Explicitly selected duplicates still raise so the admin must resolve
      -- the invalid source membership before retrying that selected request.
      if p_student_ids is null then
        if not (v_student.student_id = any(v_duplicate_students)) then
          v_duplicate_students := array_append(v_duplicate_students, v_student.student_id);
          v_blocked := v_blocked + 1;
          v_blocked_duplicate := v_blocked_duplicate + 1;
        end if;
        continue;
      end if;

      raise exception 'Student % belongs to multiple source batches in semester %. Resolve duplicate source memberships first.',
        coalesce(v_student.student_name, v_student.student_id::text), v_semester;
    end if;

    select * into v_result
    from public.student_academic_results ar
    where ar.batch_id = v_student.source_batch_id
      and ar.student_id = v_student.student_id;

    v_has_result := found;

    v_overridden :=
      v_student.student_id = any(coalesce(p_override_student_ids, '{}'::uuid[]));

    v_eligible :=
      v_has_result
      and v_result.result_verified is true
      and v_result.exam_status = 'pass'
      and v_result.credits_earned >= v_rule.minimum_credits
      and v_result.credits_earned <= v_rule.total_credits;

    if exists (
      select 1
      from public.student_academic_promotion_log l
      where l.source_batch_id = v_student.source_batch_id
        and l.student_id = v_student.student_id
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    if not v_eligible and not v_overridden then
      v_blocked := v_blocked + 1;
      v_blocked_eligibility := v_blocked_eligibility + 1;
      continue;
    end if;

    select count(*) into v_target_count
    from public.attendance_batches b
    where lower(btrim(coalesce(b.department, '')))
            = lower(btrim(coalesce(v_student.source_department, '')))
      and lower(btrim(coalesce(b.section, '')))
            = lower(btrim(coalesce(v_student.source_section, '')))
      and public.normalize_academic_semester(b.semester)
            = 'Semester ' || (v_source_semester_number + 1)::text;

    if v_target_count = 0 then
      -- Never guess a target. Block this student while allowing other
      -- unambiguous candidates in the transaction to proceed.
      v_blocked := v_blocked + 1;
      v_blocked_target := v_blocked_target + 1;
      continue;
    end if;

    if v_target_count > 1 then
      select count(*) into v_target_count
      from public.attendance_batches b
      where lower(btrim(coalesce(b.department, '')))
              = lower(btrim(coalesce(v_student.source_department, '')))
        and lower(btrim(coalesce(b.section, '')))
              = lower(btrim(coalesce(v_student.source_section, '')))
        and public.normalize_academic_semester(b.semester)
              = 'Semester ' || (v_source_semester_number + 1)::text
        and lower(btrim(coalesce(b.academic_year, '')))
              = lower(btrim(coalesce(v_student.source_academic_year, '')));

      if v_target_count <> 1 then
        v_blocked := v_blocked + 1;
        v_blocked_target := v_blocked_target + 1;
        continue;
      end if;

      select * into v_target
      from public.attendance_batches b
      where lower(btrim(coalesce(b.department, '')))
              = lower(btrim(coalesce(v_student.source_department, '')))
        and lower(btrim(coalesce(b.section, '')))
              = lower(btrim(coalesce(v_student.source_section, '')))
        and public.normalize_academic_semester(b.semester)
              = 'Semester ' || (v_source_semester_number + 1)::text
        and lower(btrim(coalesce(b.academic_year, '')))
              = lower(btrim(coalesce(v_student.source_academic_year, '')))
      for update;
    else
      select * into v_target
      from public.attendance_batches b
      where lower(btrim(coalesce(b.department, '')))
              = lower(btrim(coalesce(v_student.source_department, '')))
        and lower(btrim(coalesce(b.section, '')))
              = lower(btrim(coalesce(v_student.source_section, '')))
        and public.normalize_academic_semester(b.semester)
              = 'Semester ' || (v_source_semester_number + 1)::text
      for update;
    end if;

    if exists (
      select 1
      from public.attendance_batch_students bs
      where bs.batch_id = v_target.id
        and bs.student_id = v_student.student_id
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    begin
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
    exception
      when unique_violation then
        v_skipped := v_skipped + 1;
    end;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'semester', v_semester,
    'target_semester', v_source_semester_number + 1,
    'promoted_count', v_promoted,
    'blocked_count', v_blocked,
    'blocked_eligibility_count', v_blocked_eligibility,
    'blocked_target_count', v_blocked_target,
    'blocked_duplicate_source_count', v_blocked_duplicate,
    'skipped_already_promoted_count', v_skipped,
    'override_selected_count', v_override_count,
    'minimum_credits', v_rule.minimum_credits,
    'total_credits', v_rule.total_credits
  );
end;
$$;

revoke all on function public.admin_promote_semester_students(text, uuid[], text, uuid[], text)
  from public, anon, authenticated;
grant execute on function public.admin_promote_semester_students(text, uuid[], text, uuid[], text)
  to authenticated;

notify pgrst, 'reload schema';

commit;
