revoke execute on function public.admin_set_profile_role(
  uuid,
  text
) from public, anon, authenticated;

grant execute on function public.admin_set_profile_role(
  uuid,
  text
) to service_role;

notify pgrst, 'reload schema';
