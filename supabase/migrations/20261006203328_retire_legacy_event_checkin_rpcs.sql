revoke execute on function public.check_in_event_attendee(
  uuid,
  text
) from public, anon, authenticated;

grant execute on function public.check_in_event_attendee(
  uuid,
  text
) to service_role;

revoke execute on function public.undo_event_check_in(
  uuid
) from public, anon, authenticated;

grant execute on function public.undo_event_check_in(
  uuid
) to service_role;

notify pgrst, 'reload schema';
