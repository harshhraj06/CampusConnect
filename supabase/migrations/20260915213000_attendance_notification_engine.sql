-- ============================================================
-- CAMPUSCONNECT — ATTENDANCE NOTIFICATION ENGINE
--
-- Generates durable attendance notification events after an
-- attendance session has been saved.
--
-- IMPORTANT:
-- - Does NOT send email/SMS directly.
-- - Does NOT replace attendance_records.
-- - Uses completed attendance_session_entries as source of truth.
-- - Re-running for the same session is idempotent.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Track which session generated an in-app warning.
--    This gives us proper duplicate protection.
-- ------------------------------------------------------------

alter table public.student_attendance_notifications
add column if not exists source_session_id uuid
references public.attendance_sessions(id)
on delete cascade;


create index if not exists
student_attendance_notifications_session_idx
on public.student_attendance_notifications(
  source_session_id
);


create unique index if not exists
student_attendance_low_session_unique
on public.student_attendance_notifications(
  source_session_id,
  student_id,
  notification_type
)
where source_session_id is not null;


-- ------------------------------------------------------------
-- 2. Notification generator
-- ------------------------------------------------------------

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

  v_absence_subject text;
  v_absence_message text;

  v_low_subject text;
  v_low_message text;
begin

  -- ----------------------------------------------------------
  -- Authentication
  -- ----------------------------------------------------------

  if auth.uid() is null then
    raise exception
      'Authentication required.';
  end if;


  -- ----------------------------------------------------------
  -- Session
  -- ----------------------------------------------------------

  select *
  into v_session
  from public.attendance_sessions
  where id = target_session_id;

  if not found then
    raise exception
      'Attendance session not found.';
  end if;


  -- Only the Faculty who owns the session, Coordinator,
  -- or Main Admin may request generation.
  --
  -- This mirrors the existing attendance-session update model.

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


  -- ----------------------------------------------------------
  -- Settings
  -- ----------------------------------------------------------

  select *
  into v_settings
  from public.attendance_notification_settings
  where id = true;

  if not found then
    raise exception
      'Attendance notification settings are missing.';
  end if;


  v_subject_key :=
    regexp_replace(
      lower(trim(v_session.subject)),
      '\s+',
      ' ',
      'g'
    );


  -- ----------------------------------------------------------
  -- Process every student in this saved session.
  -- ----------------------------------------------------------

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
    -- A. ABSENCE NOTIFICATIONS
    -- ========================================================

    if v_entry.attendance_status = 'Absent' then

      select *
      into v_guardian
      from public.student_guardian_contacts
      where
        student_id =
          v_entry.student_id;


      v_absence_subject :=
        'Attendance Alert — ' ||
        trim(v_session.subject);


      v_absence_message :=
        v_entry.student_name ||
        ' was marked absent for ' ||
        trim(v_session.subject) ||
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
            trim(v_session.period_name) ||
            ')'
          else
            ''
        end ||
        '.';


      -- ------------------------------------------------------
      -- Guardian email
      -- ------------------------------------------------------

      if
        v_settings.absence_parent_email_enabled
        and v_guardian.student_id is not null
        and v_guardian.email_enabled
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
          'absence_parent_email',
          'guardian',
          'email',
          lower(
            trim(v_guardian.email)
          ),
          v_absence_subject,
          v_absence_message,
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
              then 'Sent'
              else 'Pending'
            end,

          last_error =
            case
              when
                public.attendance_notification_outbox.delivery_status
                  = 'Sent'
              then
                public.attendance_notification_outbox.last_error
              else ''
            end,

          updated_at =
            now();

        get diagnostics
          v_rows = row_count;

        v_absence_email :=
          v_absence_email +
          v_rows;

      else

        -- If configuration/contact no longer allows this alert,
        -- cancel only unsent work.
        update public.attendance_notification_outbox
        set
          delivery_status =
            'Skipped',

          last_error =
            'Guardian email alert is disabled or no valid guardian email is available.',

          updated_at =
            now()

        where
          session_id =
            target_session_id

          and student_id =
            v_entry.student_id

          and notification_type =
            'absence_parent_email'

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


      -- ------------------------------------------------------
      -- Guardian SMS
      -- ------------------------------------------------------

      if
        v_settings.absence_parent_sms_enabled
        and v_guardian.student_id is not null
        and v_guardian.sms_enabled
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
          'absence_parent_sms',
          'guardian',
          'sms',
          trim(v_guardian.phone),
          v_absence_subject,
          v_absence_message,
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
              then 'Sent'
              else 'Pending'
            end,

          last_error =
            case
              when
                public.attendance_notification_outbox.delivery_status
                  = 'Sent'
              then
                public.attendance_notification_outbox.last_error
              else ''
            end,

          updated_at =
            now();

        get diagnostics
          v_rows = row_count;

        v_absence_sms :=
          v_absence_sms +
          v_rows;

      else

        update public.attendance_notification_outbox
        set
          delivery_status =
            'Skipped',

          last_error =
            'Guardian SMS alert is disabled or no valid guardian phone number is available.',

          updated_at =
            now()

        where
          session_id =
            target_session_id

          and student_id =
            v_entry.student_id

          and notification_type =
            'absence_parent_sms'

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


    else

      -- ======================================================
      -- Attendance was edited from Absent to another status.
      --
      -- Never pretend a Sent message can be recalled.
      -- Only Pending / Failed work is cancelled.
      -- ======================================================

      update public.attendance_notification_outbox
      set
        delivery_status =
          'Skipped',

        last_error =
          'Attendance was corrected before notification delivery.',

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
            'absence_parent_sms'
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
    -- B. AUTHORITATIVE SUBJECT ATTENDANCE
    --
    -- Present + Late = attended
    -- Excused = excluded from denominator
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
      on s.id = e.session_id

    where
      e.student_id =
        v_entry.student_id

      and s.status =
        'Completed'

      and regexp_replace(
        lower(trim(s.subject)),
        '\s+',
        ' ',
        'g'
      ) =
        v_subject_key;


    if coalesce(
      v_counted,
      0
    ) = 0 then
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
    -- C. LOW ATTENDANCE
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
        trim(v_session.subject);


      v_low_message :=
        'Your attendance in ' ||
        trim(v_session.subject) ||
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


      -- ------------------------------------------------------
      -- Student in-app notification
      -- ------------------------------------------------------

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
          trim(v_session.subject),
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


      -- ------------------------------------------------------
      -- Student email
      -- ------------------------------------------------------

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
            trim(v_student_email)
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
              then 'Sent'
              else 'Pending'
            end,

          last_error =
            case
              when
                public.attendance_notification_outbox.delivery_status
                  = 'Sent'
              then
                public.attendance_notification_outbox.last_error
              else ''
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

      -- ------------------------------------------------------
      -- Student is no longer below the threshold.
      --
      -- Cancel unsent low-attendance email for this session.
      -- We intentionally retain the in-app record as history.
      -- ------------------------------------------------------

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
