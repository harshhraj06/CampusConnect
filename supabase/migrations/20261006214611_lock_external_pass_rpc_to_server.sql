revoke execute on function
public.get_external_event_pass(
  text
)
from public, anon, authenticated;

grant execute on function
public.get_external_event_pass(
  text
)
to service_role;

notify pgrst, 'reload schema';
