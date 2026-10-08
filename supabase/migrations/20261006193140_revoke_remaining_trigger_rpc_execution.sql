revoke execute on function public.ensure_campus_uid() from public, anon, authenticated;
revoke execute on function public.issue_campus_service_resolution_pass() from public, anon, authenticated;
revoke execute on function public.log_campus_operational_task_activity() from public, anon, authenticated;
revoke execute on function public.notify_chat_connection_change() from public, anon, authenticated;

revoke execute on function public.prepare_campus_magazine_issue() from public, anon, authenticated;
revoke execute on function public.prepare_campus_magazine_media() from public, anon, authenticated;
revoke execute on function public.prepare_campus_magazine_page() from public, anon, authenticated;

revoke execute on function public.prepare_campus_operational_task() from public, anon, authenticated;

revoke execute on function public.prepare_campus_service_approval() from public, anon, authenticated;
revoke execute on function public.prepare_campus_service_request() from public, anon, authenticated;

revoke execute on function public.protect_campus_service_request() from public, anon, authenticated;
revoke execute on function public.protect_delegated_seva_update() from public, anon, authenticated;
revoke execute on function public.protect_faculty_employee_id() from public, anon, authenticated;

notify pgrst, 'reload schema';
