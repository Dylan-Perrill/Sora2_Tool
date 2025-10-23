/*
  # Add Image Upload Support

  ## Overview
  Adds support for image-to-video generation by adding image-related columns
  to the video_generations table. Users can upload an image that Sora will
  use as the starting frame or reference for video generation.

  ## Changes

  ### Modified Tables

  #### `video_generations`
  - `image_url` (text, nullable) - URL to the uploaded image in Supabase Storage
  - `image_filename` (text, nullable) - Original filename of the uploaded image

  ## Notes
  - Images are optional for video generation
  - When provided, images will be stored in Supabase Storage
  - The image URL is passed to the OpenAI API for image-to-video generation
  - This migration is safe to run multiple times
*/

-- Add image-related columns to video_generations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_generations' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE video_generations ADD COLUMN image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_generations' AND column_name = 'image_filename'
  ) THEN
    ALTER TABLE video_generations ADD COLUMN image_filename text;
  END IF;
END $$;
