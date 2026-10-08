revoke execute on function public.add_campus_task_comment(uuid, text, text) from public, anon;
grant execute on function public.add_campus_task_comment(uuid, text, text) to authenticated;

revoke execute on function public.campus_service_can_access_request(uuid) from public, anon;
grant execute on function public.campus_service_can_access_request(uuid) to authenticated;

revoke execute on function public.campus_service_current_role() from public, anon;
grant execute on function public.campus_service_current_role() to authenticated;

revoke execute on function public.can_access_assigned_batch_subject(uuid) from public, anon;
grant execute on function public.can_access_assigned_batch_subject(uuid) to authenticated;

revoke execute on function public.can_access_campus_operational_task(uuid) from public, anon;
grant execute on function public.can_access_campus_operational_task(uuid) to authenticated;

revoke execute on function public.can_access_faculty_batch(uuid) from public, anon;
grant execute on function public.can_access_faculty_batch(uuid) to authenticated;

revoke execute on function public.can_edit_campus_magazine() from public, anon;
grant execute on function public.can_edit_campus_magazine() to authenticated;

revoke execute on function public.can_manage_activity_center() from public, anon;
grant execute on function public.can_manage_activity_center() to authenticated;

revoke execute on function public.can_manage_campus_alumni() from public, anon;
grant execute on function public.can_manage_campus_alumni() to authenticated;

revoke execute on function public.can_manage_campus_map() from public, anon;
grant execute on function public.can_manage_campus_map() to authenticated;

revoke execute on function public.can_manage_faculty_directory() from public, anon;
grant execute on function public.can_manage_faculty_directory() to authenticated;

revoke execute on function public.can_manage_placements() from public, anon;
grant execute on function public.can_manage_placements() to authenticated;

revoke execute on function public.can_manage_student_calendar() from public, anon;
grant execute on function public.can_manage_student_calendar() to authenticated;

revoke execute on function public.check_in_event_attendee(uuid, text) from public, anon;
grant execute on function public.check_in_event_attendee(uuid, text) to authenticated;

revoke execute on function public.current_campus_department() from public, anon;
grant execute on function public.current_campus_department() to authenticated;

revoke execute on function public.current_campus_role() from public, anon;
grant execute on function public.current_campus_role() to authenticated;

revoke execute on function public.delete_festival_announcement(uuid) from public, anon;
grant execute on function public.delete_festival_announcement(uuid) to authenticated;

revoke execute on function public.faculty_has_department(uuid, text) from public, anon;
grant execute on function public.faculty_has_department(uuid, text) to authenticated;

revoke execute on function public.get_campus_notice_stats(uuid[]) from public, anon;
grant execute on function public.get_campus_notice_stats(uuid[]) to authenticated;

revoke execute on function public.get_current_batch_timetable_entries(uuid[]) from public, anon;
grant execute on function public.get_current_batch_timetable_entries(uuid[]) to authenticated;

revoke execute on function public.get_my_faculty_today_classes(text) from public, anon;
grant execute on function public.get_my_faculty_today_classes(text) to authenticated;

revoke execute on function public.get_or_create_direct_chat(uuid) from public, anon;
grant execute on function public.get_or_create_direct_chat(uuid) to authenticated;

revoke execute on function public.has_campus_role(text[]) from public, anon;
grant execute on function public.has_campus_role(text[]) to authenticated;

revoke execute on function public.is_campus_admin() from public, anon;
grant execute on function public.is_campus_admin() to authenticated;

revoke execute on function public.is_chat_admin(uuid) from public, anon;
grant execute on function public.is_chat_admin(uuid) to authenticated;

revoke execute on function public.is_current_student_in_attendance_batch(text) from public, anon;
grant execute on function public.is_current_student_in_attendance_batch(text) to authenticated;

revoke execute on function public.is_group_member(uuid) from public, anon;
grant execute on function public.is_group_member(uuid) to authenticated;

revoke execute on function public.leave_chat_group(uuid) from public, anon;
grant execute on function public.leave_chat_group(uuid) to authenticated;

revoke execute on function public.same_campus_department(text, text) from public, anon;
grant execute on function public.same_campus_department(text, text) to authenticated;

notify pgrst, 'reload schema';
