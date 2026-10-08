revoke execute on function
public.register_external_event_attendee(
  text,
  text,
  text,
  text,
  text,
  text,
  text
)
from public, anon, authenticated;

grant execute on function
public.register_external_event_attendee(
  text,
  text,
  text,
  text,
  text,
  text,
  text
)
to service_role;

notify pgrst, 'reload schema';
