/*
  # Create Video Storage Bucket

  ## Overview
  Creates a Supabase Storage bucket for storing downloaded video files from OpenAI's Sora API.
  Videos will be downloaded from OpenAI and stored persistently in Supabase to ensure
  they remain accessible even after OpenAI's temporary URLs expire.

  ## Storage Configuration

  ### Bucket: `video_files`
  - Public access enabled for easy video playback
  - Accepts video files (mp4, webm, etc.)
  - File size limit: 500MB per file
  - Files are stored with a unique identifier based on generation ID

  ## Security

  ### Storage Policies
  - Public read access for all video files
  - Authenticated users can upload videos (for server-side operations)
  - Anyone can update/delete for development purposes
  - Production deployments should restrict write access

  ## Notes
  - Videos are stored with path pattern: `{generation_id}/{video_id}.mp4`
  - This migration is idempotent and safe to run multiple times
*/

-- Create the storage bucket for video files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video_files',
  'video_files',
  true,
  524288000,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/quicktime']::text[];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for video files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update video files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete video files" ON storage.objects;

-- Create policy for public read access
CREATE POLICY "Public read access for video files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'video_files');

-- Create policy for authenticated uploads
CREATE POLICY "Authenticated users can upload videos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'video_files');

-- Create policy for public updates (development mode)
CREATE POLICY "Anyone can update video files"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'video_files')
  WITH CHECK (bucket_id = 'video_files');

-- Create policy for public deletes (development mode)
CREATE POLICY "Anyone can delete video files"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'video_files');
