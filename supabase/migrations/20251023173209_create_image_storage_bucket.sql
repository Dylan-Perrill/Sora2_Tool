/*
  # Create Image Storage Bucket

  ## Overview
  Creates a Supabase Storage bucket for storing uploaded images that will be used
  for image-to-video generation with OpenAI's Sora API.

  ## Storage Configuration

  ### Bucket: `image_files`
  - Public access enabled for easy image access
  - Accepts common image formats (jpg, png, webp)
  - File size limit: 50MB per file
  - Files are stored with a unique identifier

  ## Security

  ### Storage Policies
  - Public read access for all image files
  - Anyone can upload images (for development purposes)
  - Anyone can update/delete for development purposes
  - Production deployments should restrict write access to authenticated users

  ## Notes
  - Images are stored with path pattern: `{generation_id}/{filename}`
  - This migration is idempotent and safe to run multiple times
*/

-- Create the storage bucket for image files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'image_files',
  'image_files',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for image files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update image files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete image files" ON storage.objects;

-- Create policy for public read access
CREATE POLICY "Public read access for image files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'image_files');

-- Create policy for public uploads
CREATE POLICY "Anyone can upload images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'image_files');

-- Create policy for public updates (development mode)
CREATE POLICY "Anyone can update image files"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'image_files')
  WITH CHECK (bucket_id = 'image_files');

-- Create policy for public deletes (development mode)
CREATE POLICY "Anyone can delete image files"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'image_files');
