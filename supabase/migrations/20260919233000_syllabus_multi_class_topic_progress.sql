-- ============================================================
-- CAMPUSCONNECT — MULTI-CLASS SYLLABUS TOPIC PROGRESS
--
-- A syllabus topic may require multiple teaching classes.
--
-- Example:
--   planned_periods = 3
--
--   Diary class 1 -> 1/3
--   Diary class 2 -> 2/3
--   Diary class 3 -> 3/3 COMPLETE
--
-- Completion rows therefore represent COVERAGE EVENTS,
-- not a single permanent completion flag.
-- ============================================================


-- ============================================================
-- REMOVE THE OLD ONE-TOPIC-ONE-COMPLETION CONSTRAINT
-- ============================================================

alter table
public.faculty_syllabus_topic_completions
drop constraint if exists
faculty_syllabus_topic_completion_topic_key;


-- Keep exactly one coverage event per topic + diary entry.
-- This prevents the same attendance/diary class from being
-- counted twice.

alter table
public.faculty_syllabus_topic_completions
drop constraint if exists
faculty_syllabus_topic_completion_diary_key;


alter table
public.faculty_syllabus_topic_completions
add constraint
faculty_syllabus_topic_completion_diary_key
unique (
  diary_id,
  topic_id
);


create index if not exists
faculty_syllabus_completion_topic_idx
on public.faculty_syllabus_topic_completions (
  topic_id,
  completed_at
);



-- ============================================================
-- UPDATE DIARY → SYLLABUS SYNC
--
-- Every matching diary class becomes one coverage event.
-- ============================================================

create or replace function
public.sync_faculty_diary_to_syllabus()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_topic_id uuid;
begin

  if
    new.batch_subject_id is null
    or trim(
      coalesce(
        new.topic,
        ''
      )
    ) = ''
  then

    -- If a diary entry was edited and no longer has a syllabus
    -- topic, remove any previous coverage created from it.

    delete from
      public.faculty_syllabus_topic_completions

    where
      diary_id =
        new.id;


    return new;
  end if;


  select
    t.id

  into
    v_topic_id

  from public.faculty_syllabus_topics t

  where
    t.batch_subject_id =
      new.batch_subject_id

    and lower(
      trim(
        t.topic_title
      )
    ) =
      lower(
        trim(
          new.topic
        )
      )

  limit 1;


  -- The topic text may have been changed from one syllabus
  -- topic to another. Remove coverage from the old topic first.

  delete from
    public.faculty_syllabus_topic_completions

  where
    diary_id =
      new.id

    and (
      v_topic_id is null
      or topic_id <>
        v_topic_id
    );


  if
    v_topic_id is null
  then
    return new;
  end if;


  insert into
    public.faculty_syllabus_topic_completions (
      topic_id,
      batch_subject_id,
      diary_id,
      faculty_id,
      completed_at
    )

  values (
    v_topic_id,
    new.batch_subject_id,
    new.id,
    new.faculty_id,
    new.class_date::timestamptz
  )

  on conflict (
    diary_id,
    topic_id
  )
  do update
  set
    batch_subject_id =
      excluded.batch_subject_id,

    faculty_id =
      excluded.faculty_id,

    completed_at =
      excluded.completed_at;


  return new;

end;
$$;



-- ============================================================
-- BACKFILL EXISTING DIARY CLASSES
--
-- Existing diary rows whose topic exactly matches a syllabus
-- topic are converted into coverage events.
-- ============================================================

insert into
public.faculty_syllabus_topic_completions (
  topic_id,
  batch_subject_id,
  diary_id,
  faculty_id,
  completed_at
)

select
  t.id,
  d.batch_subject_id,
  d.id,
  d.faculty_id,
  d.class_date::timestamptz

from public.faculty_class_diary d

join public.faculty_syllabus_topics t
  on t.batch_subject_id =
    d.batch_subject_id

  and lower(
    trim(
      t.topic_title
    )
  ) =
    lower(
      trim(
        d.topic
      )
    )

where
  d.batch_subject_id is not null

  and trim(
    coalesce(
      d.topic,
      ''
    )
  ) <> ''

on conflict (
  diary_id,
  topic_id
)
do nothing;
