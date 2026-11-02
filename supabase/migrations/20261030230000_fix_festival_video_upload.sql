-- CampusConnect: allow festival image and video banners.
-- Preserve the existing bucket and its storage policies.

UPDATE storage.buckets
SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-m4v'
  ]::text[]
WHERE id = 'event-banners';

-- Create the bucket with matching settings if it does not exist.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'event-banners',
  'event-banners',
  true,
  52428800,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-m4v'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;
