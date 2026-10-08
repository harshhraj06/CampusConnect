revoke execute on function public.admin_set_profile_role(uuid, text) from anon;
revoke execute on function public.bulk_import_faculty(jsonb) from anon;
revoke execute on function public.set_faculty_departments(uuid, text[]) from anon;

revoke execute on function public.assign_faculty_teaching_allocation(
  uuid,
  uuid,
  text,
  text,
  integer,
  integer,
  boolean,
  text
) from anon;

revoke execute on function public.add_chat_group_member(uuid, uuid) from anon;
revoke execute on function public.remove_chat_group_member(uuid, uuid) from anon;
revoke execute on function public.set_chat_group_member_role(uuid, uuid, text) from anon;
revoke execute on function public.update_chat_group(uuid, text, text) from anon;
revoke execute on function public.delete_chat_group(uuid) from anon;

revoke execute on function public.undo_event_check_in(uuid) from anon;

revoke execute on function public.ai_claim_request(
  text,
  text,
  integer,
  integer
) from anon;

revoke execute on function public.find_attendance_student_by_uid(text) from anon;
revoke execute on function public.find_faculty_by_identifier(text) from anon;
revoke execute on function public.search_campus_directory(text) from anon;

revoke execute on function public.publish_generated_timetable(
  uuid,
  jsonb
) from anon;

grant execute on function public.admin_set_profile_role(uuid, text) to authenticated;
grant execute on function public.bulk_import_faculty(jsonb) to authenticated;
grant execute on function public.set_faculty_departments(uuid, text[]) to authenticated;

grant execute on function public.assign_faculty_teaching_allocation(
  uuid,
  uuid,
  text,
  text,
  integer,
  integer,
  boolean,
  text
) to authenticated;

grant execute on function public.add_chat_group_member(uuid, uuid) to authenticated;
grant execute on function public.remove_chat_group_member(uuid, uuid) to authenticated;
grant execute on function public.set_chat_group_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.update_chat_group(uuid, text, text) to authenticated;
grant execute on function public.delete_chat_group(uuid) to authenticated;

grant execute on function public.undo_event_check_in(uuid) to authenticated;

grant execute on function public.ai_claim_request(
  text,
  text,
  integer,
  integer
) to authenticated;

grant execute on function public.find_attendance_student_by_uid(text) to authenticated;
grant execute on function public.find_faculty_by_identifier(text) to authenticated;
grant execute on function public.search_campus_directory(text) to authenticated;

notify pgrst, 'reload schema';
