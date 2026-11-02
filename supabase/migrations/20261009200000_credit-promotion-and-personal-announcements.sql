-- Credit-based academic progression and private, per-student announcements.
-- Apply after 20261009193000_student_academic_promotion.sql.

create table if not exists public.academic_promotion_credit_rules (
  id uuid primary key default gen_random_uuid(),
  department text not null,
  semester text not null,
  total_credits numeric(7,2) not null check (total_credits > 0),
  minimum_credits numeric(7,2) not null check (minimum_credits >= 0 and minimum_credits <= total_credits),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint academic_promotion_credit_rules_dept_sem_unique unique (department, semester)
);

create table if not exists public.student_academic_results (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.attendance_batches(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  credits_earned numeric(7,2) not null check (credits_earned >= 0),
  exam_status text not null check (exam_status in ('pass','fail','pending')),
  result_verified boolean not null default false,
  recorded_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint student_academic_results_batch_student_unique unique (batch_id, student_id)
);
create index if not exists student_academic_results_student_idx on public.student_academic_results(student_id, updated_at desc);

alter table public.academic_promotion_credit_rules enable row level security;
alter table public.student_academic_results enable row level security;
revoke all on public.academic_promotion_credit_rules from public, anon, authenticated;
revoke all on public.student_academic_results from public, anon, authenticated;

alter table public.student_academic_promotion_log
  add column if not exists override_reason text not null default '';

create or replace function public.admin_set_academic_promotion_credit_rule(
  p_department text, p_semester text, p_total_credits numeric, p_minimum_credits numeric
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_row public.academic_promotion_credit_rules%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if public.current_campus_role() is distinct from 'Main Admin' then raise exception 'Only Main Admin can configure credit rules.'; end if;
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.account_status::text,'Active') = 'Active') then raise exception 'An active Main Admin account is required.'; end if;
  if nullif(btrim(coalesce(p_department,'')),'') is null or nullif(btrim(coalesce(p_semester,'')),'') is null then raise exception 'Department and semester are required.'; end if;
  if p_total_credits is null or p_minimum_credits is null or p_total_credits <= 0 or p_minimum_credits < 0 or p_minimum_credits > p_total_credits then raise exception 'Minimum credits must be between zero and total credits.'; end if;
  insert into public.academic_promotion_credit_rules(department,semester,total_credits,minimum_credits,updated_by,updated_at)
  values (btrim(p_department),btrim(p_semester),p_total_credits,p_minimum_credits,auth.uid(),now())
  on conflict (department,semester) do update set total_credits=excluded.total_credits, minimum_credits=excluded.minimum_credits, updated_by=auth.uid(), updated_at=now()
  returning * into v_row;
  return jsonb_build_object('ok',true,'department',v_row.department,'semester',v_row.semester,'total_credits',v_row.total_credits,'minimum_credits',v_row.minimum_credits);
end; $$;

create or replace function public.admin_save_student_academic_result(
  p_batch_id uuid, p_student_id uuid, p_credits_earned numeric, p_exam_status text, p_result_verified boolean default false
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_batch public.attendance_batches%rowtype; v_rule public.academic_promotion_credit_rules%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if public.current_campus_role() is distinct from 'Main Admin' then raise exception 'Only Main Admin can record or verify promotion results.'; end if;
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.account_status::text,'Active') = 'Active') then raise exception 'An active Main Admin account is required.'; end if;
  if p_batch_id is null or p_student_id is null or p_credits_earned is null or p_credits_earned < 0 or p_exam_status is null or p_exam_status not in ('pass','fail','pending') then raise exception 'Invalid academic result.'; end if;
  select * into v_batch from public.attendance_batches where id=p_batch_id;
  if not found then raise exception 'Batch not found.'; end if;
  if not exists (select 1 from public.attendance_batch_students bs join public.profiles p on p.id=bs.student_id and p.role='Student' where bs.batch_id=p_batch_id and bs.student_id=p_student_id and coalesce(p.account_status::text,'Active')='Active') then raise exception 'Student is not an active member of this batch.'; end if;
  select * into v_rule from public.academic_promotion_credit_rules r where lower(btrim(r.department))=lower(btrim(v_batch.department)) and btrim(r.semester)=btrim(v_batch.semester) limit 1;
  if not found then raise exception 'Configure total and minimum credits for this department and semester first.'; end if;
  if p_credits_earned > v_rule.total_credits then raise exception 'Credits earned cannot exceed configured total credits.'; end if;
  insert into public.student_academic_results(batch_id,student_id,credits_earned,exam_status,result_verified,recorded_by,updated_at)
  values (p_batch_id,p_student_id,p_credits_earned,p_exam_status,coalesce(p_result_verified,false),auth.uid(),now())
  on conflict (batch_id,student_id) do update set credits_earned=excluded.credits_earned,exam_status=excluded.exam_status,result_verified=excluded.result_verified,recorded_by=auth.uid(),updated_at=now();
  return jsonb_build_object('ok',true,'credits_earned',p_credits_earned,'exam_status',p_exam_status,'result_verified',coalesce(p_result_verified,false));
end; $$;

-- New secured RPC. Revoke the old four-argument RPC so callers cannot bypass credit checks.
revoke all on function public.admin_promote_students(uuid, uuid, uuid[], text) from public, anon, authenticated;
create or replace function public.admin_promote_students_with_credits(
  p_source_batch_id uuid, p_target_batch_id uuid, p_student_ids uuid[] default null,
  p_note text default '', p_override_student_ids uuid[] default null, p_override_reason text default ''
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_source public.attendance_batches%rowtype; v_target public.attendance_batches%rowtype;
  v_rule public.academic_promotion_credit_rules%rowtype;
  v_promoted integer := 0; v_blocked integer := 0; v_override_count integer := 0;
  v_note text := btrim(coalesce(p_note,'')); v_override_reason text := btrim(coalesce(p_override_reason,''));
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if public.current_campus_role() is distinct from 'Main Admin' then raise exception 'Only Main Admin can promote students.'; end if;
  if not exists (select 1 from public.profiles p where p.id=auth.uid() and coalesce(p.account_status::text,'Active')='Active') then raise exception 'An active Main Admin account is required.'; end if;
  if p_source_batch_id is null or p_target_batch_id is null or p_source_batch_id=p_target_batch_id then raise exception 'Choose two different source and target batches.'; end if;
  if coalesce(array_length(p_student_ids,1),0)>500 or coalesce(array_length(p_override_student_ids,1),0)>500 then raise exception 'Select at most 500 students in one operation.'; end if;
  if char_length(v_note)>500 or char_length(v_override_reason)>500 then raise exception 'Notes must be 500 characters or fewer.'; end if;
  if coalesce(array_length(p_override_student_ids,1),0)>0 and char_length(v_override_reason)<8 then raise exception 'An admin override requires a reason of at least 8 characters.'; end if;
  select * into v_source from public.attendance_batches where id=p_source_batch_id for update;
  if not found then raise exception 'Source batch was not found.'; end if;
  select * into v_target from public.attendance_batches where id=p_target_batch_id for update;
  if not found then raise exception 'Target batch was not found.'; end if;
  if lower(btrim(v_source.department))<>lower(btrim(v_target.department)) then raise exception 'Source and target batches must belong to the same department.'; end if;
  select * into v_rule from public.academic_promotion_credit_rules r where lower(btrim(r.department))=lower(btrim(v_source.department)) and btrim(r.semester)=btrim(v_source.semester) limit 1;
  if not found and coalesce(array_length(p_override_student_ids,1),0)=0 then raise exception 'No credit rule is configured for this department and semester.'; end if;
  if coalesce(array_length(p_student_ids,1),0)>0 and exists (select 1 from unnest(p_override_student_ids) as u(student_id) where not (u.student_id=any(p_student_ids))) then raise exception 'Override students must be part of the selected student list.'; end if;
  with source_students as (
    select bs.student_id,bs.student_name,bs.campus_uid,bs.department,bs.graduation_year,bs.roll_number,
           ar.credits_earned,ar.exam_status,ar.result_verified,
           (v_rule.id is not null and ar.result_verified is true and ar.exam_status='pass' and ar.credits_earned>=v_rule.minimum_credits) as eligible,
           (bs.student_id=any(coalesce(p_override_student_ids,'{}'::uuid[]))) as overridden
    from public.attendance_batch_students bs
    join public.profiles p on p.id=bs.student_id and p.role='Student' and coalesce(p.account_status::text,'Active')='Active'
    left join public.student_academic_results ar on ar.batch_id=p_source_batch_id and ar.student_id=bs.student_id
    where bs.batch_id=p_source_batch_id and (p_student_ids is null or bs.student_id=any(p_student_ids))
  ), allowed as (
    select * from source_students where eligible or overridden
  ), inserted as (
    insert into public.attendance_batch_students(batch_id,student_id,student_name,campus_uid,department,graduation_year,roll_number,added_by)
    select p_target_batch_id,a.student_id,a.student_name,a.campus_uid,a.department,a.graduation_year,a.roll_number,auth.uid() from allowed a
    on conflict(batch_id,student_id) do nothing returning student_id
  ), logged as (
    insert into public.student_academic_promotion_log(source_batch_id,target_batch_id,student_id,promoted_by,source_semester,target_semester,source_academic_year,target_academic_year,note,override_reason)
    select p_source_batch_id,p_target_batch_id,i.student_id,auth.uid(),v_source.semester,v_target.semester,v_source.academic_year,v_target.academic_year,v_note,
      case when i.student_id=any(coalesce(p_override_student_ids,'{}'::uuid[])) then v_override_reason else '' end
    from inserted i on conflict(source_batch_id,target_batch_id,student_id) do nothing returning student_id
  ) select count(*)::integer into v_promoted from logged;
  select count(*)::integer into v_blocked from public.attendance_batch_students bs
  join public.profiles p on p.id=bs.student_id and p.role='Student' and coalesce(p.account_status::text,'Active')='Active'
  left join public.student_academic_results ar on ar.batch_id=p_source_batch_id and ar.student_id=bs.student_id
  where bs.batch_id=p_source_batch_id and (p_student_ids is null or bs.student_id=any(p_student_ids))
    and not ((v_rule.id is not null and ar.result_verified is true and ar.exam_status='pass' and ar.credits_earned>=v_rule.minimum_credits) or bs.student_id=any(coalesce(p_override_student_ids,'{}'::uuid[])));
  select count(*)::integer into v_override_count from unnest(coalesce(p_override_student_ids,'{}'::uuid[])) x;
  if v_promoted=0 then raise exception 'No new students were promoted. Check credit eligibility, target membership, and any override reason.'; end if;
  return jsonb_build_object('ok',true,'promoted_count',v_promoted,'blocked_count',v_blocked,'override_selected_count',v_override_count,
    'minimum_credits',v_rule.minimum_credits,'total_credits',v_rule.total_credits,'source_batch_id',p_source_batch_id,'target_batch_id',p_target_batch_id,
    'source_semester',v_source.semester,'target_semester',v_target.semester,'source_academic_year',v_source.academic_year,'target_academic_year',v_target.academic_year);
end; $$;
revoke all on function public.admin_set_academic_promotion_credit_rule(text,text,numeric,numeric) from public,anon;
revoke all on function public.admin_save_student_academic_result(uuid,uuid,numeric,text,boolean) from public,anon;
revoke all on function public.admin_promote_students_with_credits(uuid,uuid,uuid[],text,uuid[],text) from public,anon;
grant execute on function public.admin_set_academic_promotion_credit_rule(text,text,numeric,numeric) to authenticated;
grant execute on function public.admin_save_student_academic_result(uuid,uuid,numeric,text,boolean) to authenticated;
grant execute on function public.admin_promote_students_with_credits(uuid,uuid,uuid[],text,uuid[],text) to authenticated;

create table if not exists public.student_personal_announcements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('Main Admin','Faculty')),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  message text not null check (char_length(btrim(message)) between 1 and 5000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  archived_at timestamptz
);
create index if not exists student_personal_announcements_inbox_idx on public.student_personal_announcements(student_id,created_at desc);
create index if not exists student_personal_announcements_sender_idx on public.student_personal_announcements(sender_id,created_at desc);
alter table public.student_personal_announcements enable row level security;
revoke all on public.student_personal_announcements from public,anon,authenticated;

notify pgrst, 'reload schema';
