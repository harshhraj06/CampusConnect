-- Fix scanner identity lookup to use profiles.full_name.

begin;

create or replace function
  public.check_in_event_pass(
    p_event_id uuid,
    p_pass_value text
  )
returns jsonb
language plpgsql
security definer
set search_path =
  pg_catalog,
  public,
  extensions,
  campusconnect_private
as $$
declare
  raw_value text;
  fingerprint text;
  scan_method text;

  registration_id_value uuid;
  token_version integer;
  supplied_signature text;
  expected_signature text;
  manual_compact text;

  registration_row
    public.event_registrations%rowtype;

  candidate_row
    public.event_registrations%rowtype;

  event_row
    public.campus_events%rowtype;

  matched_registration uuid;
  scanner_name text;
  valid_from timestamptz;
  valid_until timestamptz;
begin
  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.can_scan_event_pass(
    p_event_id
  ) then
    raise exception
      'You are not authorized to scan passes for this event.';
  end if;

  raw_value :=
    trim(
      coalesce(
        p_pass_value,
        ''
      )
    );

  if raw_value = '' then
    return jsonb_build_object(
      'success', false,
      'code', 'EMPTY_PASS',
      'message',
        'Scan the QR or enter the manual pass code.'
    );
  end if;

  fingerprint :=
    substr(
      encode(
        digest(
          convert_to(
            raw_value,
            'UTF8'
          ),
          'sha256'
        ),
        'hex'
      ),
      1,
      24
    );

  select coalesce(
    nullif(profile.full_name, ''),
    nullif(profile.full_name, ''),
    'Campus staff'
  )
  into scanner_name
  from public.profiles profile
  where profile.id = auth.uid()
  limit 1;

  scanner_name :=
    coalesce(
      scanner_name,
      'Campus staff'
    );

  if raw_value ~*
    '^CCEV1\.[0-9a-f-]{36}\.[0-9]+\.[0-9a-f]{64}$'
  then
    scan_method := 'QR';

    registration_id_value :=
      split_part(
        raw_value,
        '.',
        2
      )::uuid;

    token_version :=
      split_part(
        raw_value,
        '.',
        3
      )::integer;

    supplied_signature :=
      lower(
        split_part(
          raw_value,
          '.',
          4
        )
      );

  else
    scan_method := 'Manual';

    manual_compact :=
      regexp_replace(
        upper(raw_value),
        '[^0-9A-F]',
        '',
        'g'
      );

    if length(manual_compact) <> 12 then
      perform
        campusconnect_private
        .record_event_pass_scan(
          p_event_id,
          null,
          scan_method,
          'INVALID_FORMAT',
          fingerprint,
          scanner_name
        );

      return jsonb_build_object(
        'success', false,
        'code', 'INVALID_FORMAT',
        'message',
          'Enter the 12-character event pass code.'
      );
    end if;

    for candidate_row in
      select *
      from public.event_registrations
      where
        event_id = p_event_id
        and status = 'Going'
    loop
      expected_signature :=
        campusconnect_private
        .event_pass_signature(
          candidate_row.id,
          candidate_row.event_id,
          candidate_row.student_id,
          candidate_row.event_pass_version
        );

      if upper(
        substr(
          expected_signature,
          1,
          12
        )
      ) = manual_compact then
        if matched_registration
          is not null
        then
          perform
            campusconnect_private
            .record_event_pass_scan(
              p_event_id,
              null,
              scan_method,
              'AMBIGUOUS_CODE',
              fingerprint,
              scanner_name
            );

          return jsonb_build_object(
            'success', false,
            'code', 'AMBIGUOUS_CODE',
            'message',
              'This code is ambiguous. Scan the QR instead.'
          );
        end if;

        matched_registration :=
          candidate_row.id;
      end if;
    end loop;

    if matched_registration is null then
      perform
        campusconnect_private
        .record_event_pass_scan(
          p_event_id,
          null,
          scan_method,
          'INVALID_CODE',
          fingerprint,
          scanner_name
        );

      return jsonb_build_object(
        'success', false,
        'code', 'INVALID_CODE',
        'message',
          'This event pass code is invalid.'
      );
    end if;

    registration_id_value :=
      matched_registration;
  end if;

  select *
  into registration_row
  from public.event_registrations
  where id = registration_id_value
  for update;

  if not found
    or registration_row.event_id <>
      p_event_id
  then
    perform
      campusconnect_private
      .record_event_pass_scan(
        p_event_id,
        null,
        scan_method,
        'WRONG_EVENT',
        fingerprint,
        scanner_name
      );

    return jsonb_build_object(
      'success', false,
      'code', 'WRONG_EVENT',
      'message',
        'This pass does not belong to the selected event.'
    );
  end if;

  if scan_method = 'QR' then
    expected_signature :=
      campusconnect_private
      .event_pass_signature(
        registration_row.id,
        registration_row.event_id,
        registration_row.student_id,
        registration_row.event_pass_version
      );

    if token_version <>
        registration_row.event_pass_version
      or supplied_signature <>
        expected_signature
    then
      perform
        campusconnect_private
        .record_event_pass_scan(
          p_event_id,
          registration_row.id,
          scan_method,
          'INVALID_SIGNATURE',
          fingerprint,
          scanner_name
        );

      return jsonb_build_object(
        'success', false,
        'code', 'INVALID_SIGNATURE',
        'message',
          'This QR pass is invalid or has been replaced.'
      );
    end if;
  end if;

  select *
  into event_row
  from public.campus_events
  where id = p_event_id
  limit 1;

  if registration_row.status <>
    'Going'
  then
    perform
      campusconnect_private
      .record_event_pass_scan(
        p_event_id,
        registration_row.id,
        scan_method,
        'CANCELLED',
        fingerprint,
        scanner_name
      );

    return jsonb_build_object(
      'success', false,
      'code', 'CANCELLED',
      'message',
        'This event registration was cancelled.'
    );
  end if;

  if registration_row
    .event_pass_revoked_at
    is not null
  then
    perform
      campusconnect_private
      .record_event_pass_scan(
        p_event_id,
        registration_row.id,
        scan_method,
        'REVOKED',
        fingerprint,
        scanner_name
      );

    return jsonb_build_object(
      'success', false,
      'code', 'REVOKED',
      'message',
        'This event pass has been revoked.'
    );
  end if;

  if event_row.status <>
    'Published'
  then
    perform
      campusconnect_private
      .record_event_pass_scan(
        p_event_id,
        registration_row.id,
        scan_method,
        'EVENT_UNAVAILABLE',
        fingerprint,
        scanner_name
      );

    return jsonb_build_object(
      'success', false,
      'code', 'EVENT_UNAVAILABLE',
      'message',
        'This event is not currently available for entry.'
    );
  end if;

  valid_from :=
    event_row.event_date -
    interval '2 hours';

  valid_until :=
    coalesce(
      event_row.end_date,
      event_row.event_date +
        interval '6 hours'
    ) +
    interval '2 hours';

  if now() < valid_from then
    perform
      campusconnect_private
      .record_event_pass_scan(
        p_event_id,
        registration_row.id,
        scan_method,
        'TOO_EARLY',
        fingerprint,
        scanner_name
      );

    return jsonb_build_object(
      'success', false,
      'code', 'TOO_EARLY',
      'message',
        'Event check-in has not opened yet.',
      'valid_from', valid_from
    );
  end if;

  if now() > valid_until then
    perform
      campusconnect_private
      .record_event_pass_scan(
        p_event_id,
        registration_row.id,
        scan_method,
        'EXPIRED',
        fingerprint,
        scanner_name
      );

    return jsonb_build_object(
      'success', false,
      'code', 'EXPIRED',
      'message',
        'This event pass has expired.'
    );
  end if;

  if registration_row.checked_in then
    perform
      campusconnect_private
      .record_event_pass_scan(
        p_event_id,
        registration_row.id,
        scan_method,
        'ALREADY_USED',
        fingerprint,
        scanner_name
      );

    return jsonb_build_object(
      'success', true,
      'already_checked_in', true,
      'code', 'ALREADY_USED',
      'message',
        'This attendee has already checked in.',
      'student_name',
        registration_row.student_name,
      'department',
        registration_row.department,
      'graduation_year',
        registration_row.graduation_year,
      'checked_in_at',
        registration_row.checked_in_at
    );
  end if;

  update public.event_registrations
  set
    checked_in = true,
    checked_in_at = now(),
    checked_in_by = auth.uid(),
    checked_in_by_name =
      scanner_name,
    check_in_method =
      scan_method,
    updated_at = now()
  where id = registration_row.id
  returning *
  into registration_row;

  perform
    campusconnect_private
    .record_event_pass_scan(
      p_event_id,
      registration_row.id,
      scan_method,
      'CHECKED_IN',
      fingerprint,
      scanner_name
    );

  return jsonb_build_object(
    'success', true,
    'already_checked_in', false,
    'code', 'CHECKED_IN',
    'message',
      'Attendee checked in successfully.',
    'student_name',
      registration_row.student_name,
    'department',
      registration_row.department,
    'graduation_year',
      registration_row.graduation_year,
    'checked_in_at',
      registration_row.checked_in_at,
    'check_in_method',
      registration_row.check_in_method
  );
end;
$$;

revoke all
on function public.check_in_event_pass(
  uuid,
  text
)
from public, anon;

grant execute
on function public.check_in_event_pass(
  uuid,
  text
)
to authenticated;

commit;

notify pgrst, 'reload schema';
