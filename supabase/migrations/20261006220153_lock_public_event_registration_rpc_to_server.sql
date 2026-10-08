revoke execute on function
public.get_public_event_registration(
  text
)
from public, anon, authenticated;

grant execute on function
public.get_public_event_registration(
  text
)
to service_role;

notify pgrst, 'reload schema';
