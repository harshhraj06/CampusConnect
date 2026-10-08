-- Dated teaching calendars are plans, not Faculty Diary completion events.
-- Existing syllabus/progress tables and RPCs are intentionally preserved.
begin;
create table if not exists public.faculty_syllabus_calendars (
  batch_subject_id uuid primary key references public.attendance_batch_subjects(id) on delete cascade,
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  revision integer not null default 1 check (revision > 0),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.faculty_syllabus_calendars enable row level security;
revoke all on public.faculty_syllabus_calendars from public, anon, authenticated;
grant select on public.faculty_syllabus_calendars to authenticated;
drop policy if exists faculty_syllabus_calendar_read on public.faculty_syllabus_calendars;
create policy faculty_syllabus_calendar_read on public.faculty_syllabus_calendars
for select to authenticated using (public.can_access_assigned_batch_subject(batch_subject_id));

create or replace function public.save_faculty_syllabus_calendar(
  p_batch_subject_id uuid, p_document jsonb, p_expected_revision integer
) returns integer language plpgsql security definer set search_path = '' as $$
declare
  cfg jsonb; item jsonb; slot jsonb; slots jsonb := '[]'::jsonb;
  start_date date; end_date date; day_date date; prev_date date;
  minute_start integer; duration integer; previous_end integer := 0;
  total_required integer := 0; total_teaching integer := 0;
  reserve_count integer; slot_count integer; slot_index integer := 0;
  old_revision integer; new_revision integer;
  seen_ids text[] := array[]::text[];
begin
  if auth.uid() is null or coalesce(public.current_campus_role(), '') not in ('Faculty','Main Admin')
     or not coalesce(public.can_access_assigned_batch_subject(p_batch_subject_id), false) then
    raise exception 'Only assigned faculty or Main Admin can save this teaching calendar.';
  end if;
  -- Serialize saves for one concrete subject, including first-time insertion.
  perform 1 from public.attendance_batch_subjects where id = p_batch_subject_id for update;
  if not found then raise exception 'Subject no longer exists.'; end if;
  select revision into old_revision from public.faculty_syllabus_calendars where batch_subject_id = p_batch_subject_id;
  if p_expected_revision is null or p_expected_revision <> coalesce(old_revision, 0) then
    raise exception 'This plan was changed in another session. Reload before saving; your changes were not applied.';
  end if;
  if p_document is null or jsonb_typeof(p_document) <> 'object' or p_document->>'version' is distinct from '1'
     or octet_length(p_document::text) > 1000000 then raise exception 'Invalid calendar document.'; end if;
  if jsonb_typeof(p_document->'topics') is distinct from 'array' then raise exception 'Topics must be an array.'; end if;
  if jsonb_array_length(p_document->'topics') not between 1 and 300 then raise exception 'Use 1–300 topics.'; end if;
  for item in select value from jsonb_array_elements(p_document->'topics') loop
    if jsonb_typeof(item) <> 'object' or jsonb_typeof(item->'id') is distinct from 'string'
       or length(item->>'id') not between 1 and 80 or (item->>'id') = any(seen_ids)
       or jsonb_typeof(item->'unit') is distinct from 'string' or length(btrim(item->>'unit')) not between 1 and 240
       or length(item->>'unit') > 240
       or jsonb_typeof(item->'title') is distinct from 'string' or length(btrim(item->>'title')) not between 1 and 240
       or length(item->>'title') > 240
       or jsonb_typeof(item->'minutes') is distinct from 'number' or coalesce(item->>'minutes','') !~ '^[0-9]{1,4}$'
    then raise exception 'Each topic needs a unique ID, unit, title and whole teaching minutes.'; end if;
    duration := (item->>'minutes')::integer;
    if duration not between 1 and 6000 then raise exception 'Topic duration must be 1–6000 minutes.'; end if;
    total_required := total_required + duration;
    seen_ids := array_append(seen_ids, item->>'id');
  end loop;
  cfg := p_document->'config';
  if jsonb_typeof(cfg) is distinct from 'object' or jsonb_typeof(cfg->'weekly') is distinct from 'array'
     or jsonb_typeof(cfg->'extras') is distinct from 'array' or jsonb_typeof(cfg->'excluded') is distinct from 'array'
     or coalesce(cfg->>'start','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
     or coalesce(cfg->>'end','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
     or jsonb_typeof(cfg->'reserve') is distinct from 'number' or coalesce(cfg->>'reserve','') !~ '^[0-9]{1,2}$'
  then raise exception 'Invalid calendar settings.'; end if;
  start_date := (cfg->>'start')::date; end_date := (cfg->>'end')::date;
  if end_date < start_date or end_date - start_date > 365 then raise exception 'Choose a semester of at most 366 days.'; end if;
  reserve_count := (cfg->>'reserve')::integer;
  if reserve_count > 50 or jsonb_array_length(cfg->'weekly') > 35 or jsonb_array_length(cfg->'extras') > 100
     or jsonb_array_length(cfg->'excluded') > 366 then raise exception 'Too many slots, extra classes, exclusions or revision classes.'; end if;
  for item in select value from jsonb_array_elements(cfg->'excluded') loop
    if jsonb_typeof(item) <> 'string' or (item #>> '{}') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid excluded date.'; end if;
    day_date := (item #>> '{}')::date;
    if day_date < start_date or day_date > end_date then raise exception 'Excluded dates must fall within the semester.'; end if;
  end loop;
  seen_ids := array[]::text[];
  for item in select value from jsonb_array_elements((cfg->'weekly') || (cfg->'extras')) loop
    if jsonb_typeof(item) <> 'object' or jsonb_typeof(item->'id') is distinct from 'string'
       or length(item->>'id') not between 1 and 80 or (item->>'id') = any(seen_ids)
       or coalesce(item->>'start','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or jsonb_typeof(item->'minutes') is distinct from 'number' or coalesce(item->>'minutes','') !~ '^[0-9]{1,3}$'
    then raise exception 'Invalid class slot.'; end if;
    minute_start := split_part(item->>'start', ':', 1)::integer * 60 + split_part(item->>'start', ':', 2)::integer;
    duration := (item->>'minutes')::integer;
    if duration not between 5 and 480 or minute_start + duration > 1440 then raise exception 'Classes must last 5–480 minutes and finish by midnight.'; end if;
    seen_ids := array_append(seen_ids, item->>'id');
  end loop;
  for item in select value from jsonb_array_elements(cfg->'weekly') loop
    if jsonb_typeof(item->'day') is distinct from 'number' or coalesce(item->>'day','') !~ '^[0-6]$' then raise exception 'Invalid weekday.'; end if;
    for day_date in select start_date + n from generate_series(0, end_date - start_date) n loop
      if extract(dow from day_date)::integer = (item->>'day')::integer and not (cfg->'excluded') ? to_char(day_date, 'YYYY-MM-DD') then
        slots := slots || jsonb_build_array(jsonb_build_object('date', day_date, 'start', split_part(item->>'start', ':', 1)::integer * 60 + split_part(item->>'start', ':', 2)::integer, 'minutes', (item->>'minutes')::integer));
      end if;
    end loop;
  end loop;
  for item in select value from jsonb_array_elements(cfg->'extras') loop
    if coalesce(item->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Invalid extra-class date.'; end if;
    day_date := (item->>'date')::date;
    if day_date < start_date or day_date > end_date or (cfg->'excluded') ? to_char(day_date, 'YYYY-MM-DD') then raise exception 'Extra classes must be in the semester and not on excluded dates.'; end if;
    slots := slots || jsonb_build_array(jsonb_build_object('date', day_date, 'start', split_part(item->>'start', ':', 1)::integer * 60 + split_part(item->>'start', ':', 2)::integer, 'minutes', (item->>'minutes')::integer));
  end loop;
  slot_count := jsonb_array_length(slots);
  if slot_count not between 1 and 2000 or reserve_count >= slot_count then raise exception 'At least one teaching class must remain after revision reserves.'; end if;
  for slot in select value from jsonb_array_elements(slots) order by value->>'date', (value->>'start')::integer loop
    slot_index := slot_index + 1;
    day_date := (slot->>'date')::date; minute_start := (slot->>'start')::integer; duration := (slot->>'minutes')::integer;
    if day_date = prev_date and minute_start < previous_end then raise exception 'Two class slots overlap on %.', day_date; end if;
    prev_date := day_date; previous_end := minute_start + duration;
    if slot_index <= slot_count - reserve_count then total_teaching := total_teaching + duration; end if;
  end loop;
  if total_required > total_teaching then raise exception 'The syllabus exceeds available teaching time by % minutes.', total_required - total_teaching; end if;
  new_revision := coalesce(old_revision, 0) + 1;
  insert into public.faculty_syllabus_calendars(batch_subject_id, document, revision, updated_by, updated_at)
    values(p_batch_subject_id, p_document, new_revision, auth.uid(), now())
    on conflict(batch_subject_id) do update set document = excluded.document, revision = excluded.revision, updated_by = excluded.updated_by, updated_at = excluded.updated_at;
  return new_revision;
end;
$$;
revoke all on function public.save_faculty_syllabus_calendar(uuid,jsonb,integer) from public, anon;
grant execute on function public.save_faculty_syllabus_calendar(uuid,jsonb,integer) to authenticated;
commit;
