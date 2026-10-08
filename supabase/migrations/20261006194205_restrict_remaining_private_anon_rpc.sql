revoke execute on function public.find_campus_user_by_uid(text) from public, anon;
grant execute on function public.find_campus_user_by_uid(text) to authenticated;

revoke execute on function public.find_campus_users_by_ids(uuid[]) from public, anon;
grant execute on function public.find_campus_users_by_ids(uuid[]) to authenticated;

revoke execute on function public.generate_campus_uid() from public, anon, authenticated;

revoke execute on function public.get_campus_calendar_rsvp_counts(
  text,
  uuid
) from public, anon;

grant execute on function public.get_campus_calendar_rsvp_counts(
  text,
  uuid
) to authenticated;

notify pgrst, 'reload schema';
