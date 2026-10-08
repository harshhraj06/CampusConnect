revoke execute on function public.audit_campus_service_request() from anon, authenticated;
revoke execute on function public.enforce_learning_resource_department() from anon, authenticated;
revoke execute on function public.guard_campus_profile_identity() from anon, authenticated;
revoke execute on function public.guard_guardian_contact_admin_only() from anon, authenticated;
revoke execute on function public.guard_student_usn_admin_only() from anon, authenticated;
revoke execute on function public.handle_new_campus_user() from anon, authenticated;

revoke execute on function public.hydrate_community_post_identity() from anon, authenticated;
revoke execute on function public.hydrate_community_reply_identity() from anon, authenticated;

revoke execute on function public.protect_festival_management() from anon, authenticated;

revoke execute on function public.rls_auto_enable() from anon, authenticated;

revoke execute on function public.rotate_event_pass_on_status_change() from anon, authenticated;

revoke execute on function public.secure_campus_notice_identity() from anon, authenticated;
revoke execute on function public.secure_learning_resource() from anon, authenticated;

revoke execute on function public.set_timetable_publication_updated_at() from anon, authenticated;
revoke execute on function public.set_timetable_v2_updated_at() from anon, authenticated;

revoke execute on function public.sync_community_post_reply_count() from anon, authenticated;
revoke execute on function public.sync_faculty_diary_to_syllabus() from anon, authenticated;
revoke execute on function public.sync_group_member_count() from anon, authenticated;

revoke execute on function public.update_attendance_batch_total() from anon, authenticated;

revoke execute on function public.validate_assignment_subject_scope() from anon, authenticated;
revoke execute on function public.validate_batch_timetable_entry() from anon, authenticated;
revoke execute on function public.validate_campus_event_schedule() from anon, authenticated;

revoke execute on function public.validate_faculty_availability_reference() from anon, authenticated;
revoke execute on function public.validate_faculty_coverage_offer() from anon, authenticated;
revoke execute on function public.validate_faculty_coverage_request() from anon, authenticated;
revoke execute on function public.validate_faculty_substitution_override() from anon, authenticated;
revoke execute on function public.validate_faculty_syllabus_plan_document() from anon, authenticated;
revoke execute on function public.validate_faculty_syllabus_topic_subject() from anon, authenticated;
revoke execute on function public.validate_faculty_teaching_allocation() from anon, authenticated;
revoke execute on function public.validate_faculty_unavailability_reference() from anon, authenticated;

revoke execute on function public.validate_timetable_configuration() from anon, authenticated;
revoke execute on function public.validate_timetable_period_slot() from anon, authenticated;
revoke execute on function public.validate_timetable_resource_collision() from anon, authenticated;

notify pgrst, 'reload schema';
