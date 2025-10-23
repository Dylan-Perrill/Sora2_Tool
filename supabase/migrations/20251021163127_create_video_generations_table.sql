/*
  # Create Video Generations Schema

  ## Overview
  This migration creates the database schema for tracking Sora 2 API video generation requests,
  their parameters, status, and results. This enables persistent storage of video history,
  debugging capabilities, and user analytics.

  ## New Tables
  
  ### `video_generations`
  Tracks all video generation requests made through the application.
  
  **Columns:**
  - `id` (uuid, primary key) - Unique identifier for each video generation request
  - `created_at` (timestamptz) - Timestamp when the generation was requested
  - `updated_at` (timestamptz) - Timestamp of last status update
  - `prompt` (text) - The text prompt used to generate the video
  - `model` (text) - The Sora model used (sora-2 or sora-2-pro)
  - `resolution` (text) - Video resolution (e.g., 1280x720, 1792x1024)
  - `duration` (integer) - Video duration in seconds (4, 8, or 12)
  - `status` (text) - Current status: pending, processing, completed, failed
  - `video_url` (text, nullable) - URL to the generated video (null until completed)
  - `openai_job_id` (text, nullable) - OpenAI's job ID for tracking the generation
  - `error_message` (text, nullable) - Error details if generation failed
  - `metadata` (jsonb, nullable) - Additional parameters and response data

  ## Security
  
  ### Row Level Security
  - RLS is enabled on the `video_generations` table
  - Public read access is granted since this is a single-user development tool
  - Anyone can insert new generation requests
  - Anyone can update their own generation records
  - This can be restricted later by adding authentication and user_id columns

  ## Indexes
  - Index on `created_at` for efficient sorting and filtering by date
  - Index on `status` for quick filtering of pending/completed/failed generations
  - Index on `openai_job_id` for fast lookups when polling job status
*/

-- Create video_generations table
CREATE TABLE IF NOT EXISTS video_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  prompt text NOT NULL,
  model text NOT NULL DEFAULT 'sora-2',
  resolution text NOT NULL DEFAULT '1280x720',
  duration integer NOT NULL DEFAULT 4,
  status text NOT NULL DEFAULT 'pending',
  video_url text,
  openai_job_id text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_video_generations_created_at 
  ON video_generations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_video_generations_status 
  ON video_generations(status);

CREATE INDEX IF NOT EXISTS idx_video_generations_openai_job_id 
  ON video_generations(openai_job_id);

-- Enable Row Level Security
ALTER TABLE video_generations ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (development mode)
CREATE POLICY "Anyone can view video generations"
  ON video_generations
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create video generations"
  ON video_generations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update video generations"
  ON video_generations
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete video generations"
  ON video_generations
  FOR DELETE
  USING (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_video_generations_updated_at
  BEFORE UPDATE ON video_generations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();