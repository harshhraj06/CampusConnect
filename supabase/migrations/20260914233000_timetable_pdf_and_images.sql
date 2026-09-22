-- ============================================================
-- CAMPUSCONNECT — TIMETABLE DOCUMENT FORMAT EXPANSION
-- Allow official timetable PDF and common image formats.
-- ============================================================

update storage.buckets
set
  allowed_mime_types = array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ],
  file_size_limit = 20971520
where id = 'campus-timetables';
