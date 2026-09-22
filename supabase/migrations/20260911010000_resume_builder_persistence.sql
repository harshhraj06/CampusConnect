-- =========================================================
-- CAMPUSCONNECT
-- ORIGINAL RESUME BUILDER PERSISTENCE
--
-- Keeps the existing Resume UI completely unchanged.
-- Stores the complete legacy/original resume builder state.
-- =========================================================

alter table public.student_resumes
add column if not exists resume_builder_data jsonb
not null
default '{}'::jsonb;
