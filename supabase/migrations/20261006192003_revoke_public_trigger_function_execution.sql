revoke execute on function public.audit_campus_service_request() from public;
revoke execute on function public.enforce_learning_resource_department() from public;
revoke execute on function public.guard_campus_profile_identity() from public;
revoke execute on function public.guard_guardian_contact_admin_only() from public;
revoke execute on function public.guard_student_usn_admin_only() from public;
revoke execute on function public.handle_new_campus_user() from public;

revoke execute on function public.hydrate_community_post_identity() from public;
revoke execute on function public.hydrate_community_reply_identity() from public;

revoke execute on function public.protect_festival_management() from public;
revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rotate_event_pass_on_status_change() from public;

revoke execute on function public.secure_learning_resource() from public;

revoke execute on function public.set_timetable_publication_updated_at() from public;
revoke execute on function public.set_timetable_v2_updated_at() from public;

revoke execute on function public.sync_community_post_reply_count() from public;
revoke execute on function public.sync_faculty_diary_to_syllabus() from public;
revoke execute on function public.sync_group_member_count() from public;

revoke execute on function public.update_attendance_batch_total() from public;

revoke execute on function public.validate_assignment_subject_scope() from public;
revoke execute on function public.validate_batch_timetable_entry() from public;
revoke execute on function public.validate_campus_event_schedule() from public;

revoke execute on function public.validate_faculty_availability_reference() from public;
revoke execute on function public.validate_faculty_coverage_offer() from public;
revoke execute on function public.validate_faculty_coverage_request() from public;
revoke execute on function public.validate_faculty_substitution_override() from public;
revoke execute on function public.validate_faculty_syllabus_plan_document() from public;
revoke execute on function public.validate_faculty_syllabus_topic_subject() from public;
revoke execute on function public.validate_faculty_teaching_allocation() from public;
revoke execute on function public.validate_faculty_unavailability_reference() from public;

revoke execute on function public.validate_timetable_configuration() from public;
revoke execute on function public.validate_timetable_period_slot() from public;
revoke execute on function public.validate_timetable_resource_collision() from public;

notify pgrst, 'reload schema';
