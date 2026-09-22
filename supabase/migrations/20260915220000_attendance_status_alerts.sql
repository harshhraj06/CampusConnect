-- ============================================================
-- CAMPUSCONNECT — ATTENDANCE STATUS ALERTS
--
-- Extends attendance notifications:
--   • Absent  -> Guardian email/SMS
--   • Excused -> Guardian email/SMS
--
-- Alert contains:
--   • Student name
--   • Attendance status
--   • Subject
--   • Teacher
--   • Attendance date
--   • Period
--   • Real timetable start/end time when a matching timetable
--     entry exists
--
-- Low-attendance warnings remain independent.
-- ============================================================


-- ============================================================
-- 1. EXTEND OUTBOX NOTIFICATION TYPES
-- ============================================================

alter table public.attendance_notification_outbox
drop constraint if exists
attendance_notification_outbox_notification_type_check;


alter table public.attendance_notification_outbox
add constraint
attendance_notification_outbox_notification_type_check
check (
  notification_type in (
    'absence_parent_email',
    'absence_parent_sms',
    'excused_parent_email',
    'excused_parent_sms',
    'low_attendance_student_email',
    'low_attendance_in_app'
  )
);


-- ============================================================
-- 2. REPLACE GENERATOR
-- ============================================================

create or replace function public.generate_attendance_notifications(
  target_session_id uuid
)
returns table (
  absence_email_queued integer,
  absence_sms_queued integer,
  low_attendance_email_queued integer,
  in_app_created integer,
  absence_notifications_skipped integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.attendance_sessions%rowtype;

  v_settings
    public.attendance_notification_settings%rowtype;

  v_entry record;

  v_guardian
    public.student_guardian_contacts%rowtype;

  v_student_email text;

  v_subject_key text;

  v_attended bigint;
  v_counted bigint;

  v_percentage numeric(5,2);

  v_absence_email integer := 0;
  v_absence_sms integer := 0;
  v_low_email integer := 0;
  v_in_app integer := 0;
  v_skipped integer := 0;

  v_rows integer := 0;

  v_day_name text;

  v_period_order integer;

  v_start_time time;

  v_end_time time;

  v_time_text text := '';

  v_status_label text;

  v_email_type text;

  v_sms_type text;

  v_status_subject text;

  v_status_message text;

  v_low_subject text;

  v_low_message text;
begin

  -- ==========================================================
  -- AUTHENTICATION
  -- ==========================================================

  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;


  -- ==========================================================
  -- LOAD SESSION
  -- ==========================================================

  select *
  into v_session
  from public.attendance_sessions
  where id = target_session_id;

  if not found then
    raise exception
      'Attendance session not found.';
  end if;


  if not (
    v_session.faculty_id = auth.uid()

    or public.current_campus_role()
      in (
        'Coordinator',
        'Main Admin'
      )
  ) then
    raise exception
      'You do not have permission to generate notifications for this attendance session.';
  end if;


  if v_session.status <> 'Completed' then
    raise exception
      'Notifications can only be generated for completed attendance sessions.';
  end if;


  -- ==========================================================
  -- SETTINGS
  -- ==========================================================

  select *
  into v_settings
  from public.attendance_notification_settings
  where id = true;

  if not found then
    raise exception
      'Attendance notification settings are missing.';
  end if;


  -- ==========================================================
  -- NORMALIZED SUBJECT
  -- ==========================================================

  v_subject_key :=
    regexp_replace(
      lower(trim(v_session.subject)),
      '\s+',
      ' ',
      'g'
    );


  -- ==========================================================
  -- REAL TIMETABLE TIME
  --
  -- Attendance session stores a logical period.
  -- batch_timetable_entries stores the real clock time.
  --
  -- Match:
  --   batch
  --   weekday
  --   period
  --
  -- If no match exists, do NOT invent a clock time.
  -- ==========================================================

  v_day_name :=
    trim(
      to_char(
        v_session.attendance_date,
        'FMDay'
      )
    );


  if trim(
    coalesce(
      v_session.period_name,
      ''
    )
  ) ~ '^[0-9]+$' then

    v_period_order :=
      trim(
        v_session.period_name
      )::integer;

  else

    v_period_order := null;

  end if;


  v_start_time := null;
  v_end_time := null;


  if v_period_order is not null then

    select
      entry.start_time,
      entry.end_time

    into
      v_start_time,
      v_end_time

    from public.batch_timetable_entries entry

    where
      entry.batch_id =
        v_session.batch_id

      and lower(
        trim(entry.day_of_week)
      ) =
        lower(v_day_name)

      and entry.period_order =
        v_period_order

    limit 1;

  end if;


  if
    v_start_time is not null
    and v_end_time is not null
  then

    v_time_text :=
      ' Class time: ' ||

      trim(
        to_char(
          v_start_time,
          'HH12:MI AM'
        )
      ) ||

      ' - ' ||

      trim(
        to_char(
          v_end_time,
          'HH12:MI AM'
        )
      ) ||

      '.';

  else

    v_time_text := '';

  end if;


  -- ==========================================================
  -- PROCESS SESSION STUDENTS
  -- ==========================================================

  for v_entry in

    select
      e.student_id,
      e.student_name,
      e.attendance_status

    from public.attendance_session_entries e

    where
      e.session_id =
        target_session_id

  loop

    -- ========================================================
    -- A. GUARDIAN STATUS ALERT
    --
    -- Only Absent and Excused generate guardian alerts.
    -- ========================================================

    if
      v_entry.attendance_status
        in (
          'Absent',
          'Excused'
        )
    then

      select *
      into v_guardian
      from public.student_guardian_contacts
      where
        student_id =
          v_entry.student_id;


      if
        v_entry.attendance_status =
          'Absent'
      then

        v_status_label :=
          'Absent';

        v_email_type :=
          'absence_parent_email';

        v_sms_type :=
          'absence_parent_sms';

      else

        v_status_label :=
          'Excused';

        v_email_type :=
          'excused_parent_email';

        v_sms_type :=
          'excused_parent_sms';

      end if;


      v_status_subject :=
        'Attendance Alert — ' ||
        trim(v_session.subject);


      v_status_message :=
        v_entry.student_name ||

        ' was marked ' ||

        v_status_label ||

        ' for ' ||

        trim(v_session.subject) ||

        ' by ' ||

        coalesce(
          nullif(
            trim(
              v_session.faculty_name
            ),
            ''
          ),
          'Faculty'
        ) ||

        ' on ' ||

        to_char(
          v_session.attendance_date,
          'DD Mon YYYY'
        ) ||

        case
          when trim(
            coalesce(
              v_session.period_name,
              ''
            )
          ) <> ''
          then
            ' (Period ' ||
            trim(
              v_session.period_name
            ) ||
            ')'
          else
            ''
        end ||

        '.' ||

        v_time_text;


      -- ======================================================
      -- EMAIL
      -- ======================================================

      if
        v_settings.absence_parent_email_enabled

        and
        v_guardian.student_id
          is not null

        and
        v_guardian.email_enabled

        and trim(
          coalesce(
            v_guardian.email,
            ''
          )
        ) <> ''
      then

        insert into public.attendance_notification_outbox (
          student_id,
          session_id,
          notification_type,
          recipient_type,
          channel,
          recipient,
          subject,
          message,
          delivery_status,
          attempts,
          provider_message_id,
          last_error,
          sent_at,
          updated_at
        )
        values (
          v_entry.student_id,
          target_session_id,
          v_email_type,
          'guardian',
          'email',
          lower(
            trim(
              v_guardian.email
            )
          ),
          v_status_subject,
          v_status_message,
          'Pending',
          0,
          '',
          '',
          null,
          now()
        )
        on conflict (
          session_id,
          student_id,
          notification_type
        )
        where session_id is not null
        do update set

          recipient =
            excluded.recipient,

          subject =
            excluded.subject,

          message =
            excluded.message,

          delivery_status =
            case
              when
                public.attendance_notification_outbox.delivery_status
                  = 'Sent'
              then
                'Sent'
              else
                'Pending'
            end,

          last_error =
            case
              when
                public.attendance_notification_outbox.delivery_status
                  = 'Sent'
              then
                public.attendance_notification_outbox.last_error
              else
                ''
            end,

          updated_at =
            now();

        get diagnostics
          v_rows = row_count;

        v_absence_email :=
          v_absence_email +
          v_rows;

      end if;


      -- ======================================================
      -- SMS
      -- ======================================================

      if
        v_settings.absence_parent_sms_enabled

        and
        v_guardian.student_id
          is not null

        and
        v_guardian.sms_enabled

        and trim(
          coalesce(
            v_guardian.phone,
            ''
          )
        ) <> ''
      then

        insert into public.attendance_notification_outbox (
          student_id,
          session_id,
          notification_type,
          recipient_type,
          channel,
          recipient,
          subject,
          message,
          delivery_status,
          attempts,
          provider_message_id,
          last_error,
          sent_at,
          updated_at
        )
        values (
          v_entry.student_id,
          target_session_id,
          v_sms_type,
          'guardian',
          'sms',
          trim(
            v_guardian.phone
          ),
          v_status_subject,
          v_status_message,
          'Pending',
          0,
          '',
          '',
          null,
          now()
        )
        on conflict (
          session_id,
          student_id,
          notification_type
        )
        where session_id is not null
        do update set

          recipient =
            excluded.recipient,

          subject =
            excluded.subject,

          message =
            excluded.message,

          delivery_status =
            case
              when
                public.attendance_notification_outbox.delivery_status
                  = 'Sent'
              then
                'Sent'
              else
                'Pending'
            end,

          last_error =
            case
              when
                public.attendance_notification_outbox.delivery_status
                  = 'Sent'
              then
                public.attendance_notification_outbox.last_error
              else
                ''
            end,

          updated_at =
            now();

        get diagnostics
          v_rows = row_count;

        v_absence_sms :=
          v_absence_sms +
          v_rows;

      end if;


      -- ======================================================
      -- CANCEL THE OPPOSITE STATUS IF ATTENDANCE WAS EDITED
      --
      -- Absent -> Excused:
      --   skip pending absence alerts
      --
      -- Excused -> Absent:
      --   skip pending excused alerts
      -- ======================================================

      update public.attendance_notification_outbox
      set
        delivery_status =
          'Skipped',

        last_error =
          'Attendance status was corrected before notification delivery.',

        updated_at =
          now()

      where
        session_id =
          target_session_id

        and student_id =
          v_entry.student_id

        and notification_type
          in (
            'absence_parent_email',
            'absence_parent_sms',
            'excused_parent_email',
            'excused_parent_sms'
          )

        and notification_type
          not in (
            v_email_type,
            v_sms_type
          )

        and delivery_status
          in (
            'Pending',
            'Failed'
          );

      get diagnostics
        v_rows = row_count;

      v_skipped :=
        v_skipped +
        v_rows;


    else

      -- ======================================================
      -- PRESENT / LATE
      --
      -- Cancel any unsent Absent/Excused guardian alert.
      -- Already Sent notifications remain immutable.
      -- ======================================================

      update public.attendance_notification_outbox
      set
        delivery_status =
          'Skipped',

        last_error =
          'Attendance status was corrected before notification delivery.',

        updated_at =
          now()

      where
        session_id =
          target_session_id

        and student_id =
          v_entry.student_id

        and notification_type
          in (
            'absence_parent_email',
            'absence_parent_sms',
            'excused_parent_email',
            'excused_parent_sms'
          )

        and delivery_status
          in (
            'Pending',
            'Failed'
          );

      get diagnostics
        v_rows = row_count;

      v_skipped :=
        v_skipped +
        v_rows;

    end if;


    -- ========================================================
    -- B. CALCULATE AUTHORITATIVE SUBJECT ATTENDANCE
    --
    -- Present + Late = attended
    -- Excused is excluded from denominator.
    -- ========================================================

    select

      count(*) filter (
        where
          e.attendance_status
            in (
              'Present',
              'Late'
            )
      ),

      count(*) filter (
        where
          e.attendance_status
            <> 'Excused'
      )

    into
      v_attended,
      v_counted

    from public.attendance_session_entries e

    join public.attendance_sessions s
      on s.id =
        e.session_id

    where
      e.student_id =
        v_entry.student_id

      and s.status =
        'Completed'

      and regexp_replace(
        lower(
          trim(
            s.subject
          )
        ),
        '\s+',
        ' ',
        'g'
      ) =
        v_subject_key;


    if
      coalesce(
        v_counted,
        0
      ) = 0
    then

      v_percentage := 0;

    else

      v_percentage :=
        round(
          (
            v_attended::numeric
            /
            v_counted::numeric
          ) * 100,
          2
        );

    end if;


    -- ========================================================
    -- C. LOW ATTENDANCE WARNING
    -- ========================================================

    if
      v_percentage <
      v_settings.minimum_attendance_percentage
    then

      select
        p.email

      into
        v_student_email

      from public.profiles p

      where
        p.id =
          v_entry.student_id

        and p.role =
          'Student'

      limit 1;


      v_low_subject :=
        'Low Attendance Warning — ' ||
        trim(
          v_session.subject
        );


      v_low_message :=
        'Your attendance in ' ||

        trim(
          v_session.subject
        ) ||

        ' is ' ||

        trim(
          to_char(
            v_percentage,
            'FM990.00'
          )
        ) ||

        '%, below the required ' ||

        trim(
          to_char(
            v_settings.minimum_attendance_percentage,
            'FM990.00'
          )
        ) ||

        '%.';


      -- ======================================================
      -- IN-APP
      -- ======================================================

      if
        v_settings.low_attendance_in_app_enabled
      then

        insert into public.student_attendance_notifications (
          student_id,
          source_session_id,
          subject,
          title,
          message,
          notification_type,
          attendance_percentage,
          threshold_percentage,
          is_read
        )
        values (
          v_entry.student_id,
          target_session_id,
          trim(
            v_session.subject
          ),
          v_low_subject,
          v_low_message,
          'low_attendance',
          v_percentage,
          v_settings.minimum_attendance_percentage,
          false
        )
        on conflict (
          source_session_id,
          student_id,
          notification_type
        )
        where source_session_id is not null
        do update set

          subject =
            excluded.subject,

          title =
            excluded.title,

          message =
            excluded.message,

          attendance_percentage =
            excluded.attendance_percentage,

          threshold_percentage =
            excluded.threshold_percentage,

          is_read =
            false;

        get diagnostics
          v_rows = row_count;

        v_in_app :=
          v_in_app +
          v_rows;

      end if;


      -- ======================================================
      -- STUDENT EMAIL
      -- ======================================================

      if
        v_settings.low_attendance_student_email_enabled

        and trim(
          coalesce(
            v_student_email,
            ''
          )
        ) <> ''
      then

        insert into public.attendance_notification_outbox (
          student_id,
          session_id,
          notification_type,
          recipient_type,
          channel,
          recipient,
          subject,
          message,
          delivery_status,
          attempts,
          provider_message_id,
          last_error,
          sent_at,
          updated_at
        )
        values (
          v_entry.student_id,
          target_session_id,
          'low_attendance_student_email',
          'student',
          'email',
          lower(
            trim(
              v_student_email
            )
          ),
          v_low_subject,
          v_low_message,
          'Pending',
          0,
          '',
          '',
          null,
          now()
        )
        on conflict (
          session_id,
          student_id,
          notification_type
        )
        where session_id is not null
        do update set

          recipient =
            excluded.recipient,

          subject =
            excluded.subject,

          message =
            excluded.message,

          delivery_status =
            case
              when
                public.attendance_notification_outbox.delivery_status
                  = 'Sent'
              then
                'Sent'
              else
                'Pending'
            end,

          last_error =
            case
              when
                public.attendance_notification_outbox.delivery_status
                  = 'Sent'
              then
                public.attendance_notification_outbox.last_error
              else
                ''
            end,

          updated_at =
            now();

        get diagnostics
          v_rows = row_count;

        v_low_email :=
          v_low_email +
          v_rows;

      end if;


    else

      -- Student recovered above threshold.
      -- Cancel only unsent email for this source session.

      update public.attendance_notification_outbox
      set
        delivery_status =
          'Skipped',

        last_error =
          'Attendance is no longer below the configured threshold.',

        updated_at =
          now()

      where
        session_id =
          target_session_id

        and student_id =
          v_entry.student_id

        and notification_type =
          'low_attendance_student_email'

        and delivery_status
          in (
            'Pending',
            'Failed'
          );

      get diagnostics
        v_rows = row_count;

      v_skipped :=
        v_skipped +
        v_rows;

    end if;

  end loop;


  return query
  select
    v_absence_email,
    v_absence_sms,
    v_low_email,
    v_in_app,
    v_skipped;

end;
$$;


revoke all
on function public.generate_attendance_notifications(uuid)
from public, anon;


grant execute
on function public.generate_attendance_notifications(uuid)
to authenticated;


notify pgrst, 'reload schema';
