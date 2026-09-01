-- Secure server-side Campus Seva submission.
-- The authenticated identity is derived inside Supabase.

create or replace function
public.submit_campus_service_request(
  p_requester_name text,
  p_department text,
  p_category text,
  p_subject text,
  p_description text,
  p_priority text
)
returns public.campus_service_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  authenticated_user_id uuid;
  authenticated_role text;
  safe_requester_name text;
  created_request
    public.campus_service_requests%rowtype;
begin
  authenticated_user_id :=
    auth.uid();

  if authenticated_user_id is null then
    raise exception
      'Authentication is required to submit a campus request.';
  end if;

  authenticated_role :=
    public.campus_service_current_role();

  safe_requester_name :=
    coalesce(
      nullif(
        trim(
          p_requester_name
        ),
        ''
      ),
      nullif(
        auth.jwt()
          -> 'user_metadata'
          ->> 'full_name',
        ''
      ),
      split_part(
        coalesce(
          auth.jwt()
            ->> 'email',
          'Campus member'
        ),
        '@',
        1
      )
    );

  if p_category is null
     or not (
       p_category = any (
         array[
           'Bonafide Certificate',
           'Leave Request',
           'ID Card Correction',
           'Attendance Correction',
           'Placement Query',
           'Technical Complaint',
           'Campus Grievance',
           'Event Permission',
           'Other'
         ]
       )
     )
  then
    raise exception
      'Invalid Campus Seva category.';
  end if;

  if char_length(
    trim(
      coalesce(
        p_subject,
        ''
      )
    )
  ) not between 4 and 160
  then
    raise exception
      'The subject must contain between 4 and 160 characters.';
  end if;

  if char_length(
    trim(
      coalesce(
        p_description,
        ''
      )
    )
  ) not between 10 and 5000
  then
    raise exception
      'The description must contain between 10 and 5000 characters.';
  end if;

  if p_priority is null
     or not (
       p_priority = any (
         array[
           'Low',
           'Normal',
           'High',
           'Urgent'
         ]
       )
     )
  then
    raise exception
      'Invalid request priority.';
  end if;

  insert into
    public.campus_service_requests (
      requester_id,
      requester_name,
      requester_role,
      department,
      category,
      subject,
      description,
      priority
    )
  values (
    authenticated_user_id,
    safe_requester_name,
    authenticated_role,
    trim(
      coalesce(
        p_department,
        ''
      )
    ),
    p_category,
    trim(
      p_subject
    ),
    trim(
      p_description
    ),
    p_priority
  )
  returning *
  into created_request;

  return created_request;
end;
$$;


revoke all
on function
public.submit_campus_service_request(
  text,
  text,
  text,
  text,
  text,
  text
)
from public;


revoke all
on function
public.submit_campus_service_request(
  text,
  text,
  text,
  text,
  text,
  text
)
from anon;


grant execute
on function
public.submit_campus_service_request(
  text,
  text,
  text,
  text,
  text,
  text
)
to authenticated;


-- Requests must now be submitted through the protected function.
revoke insert
on public.campus_service_requests
from authenticated;
