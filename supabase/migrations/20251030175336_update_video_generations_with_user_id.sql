/*
  # Update Video Generations for User Association

  ## Overview
  This migration adds user ownership to video generations and updates RLS policies
  to ensure users can only access their own video generation history.

  ## Changes

  ### Schema Updates
  - Add `user_id` column to `video_generations` table
  - Add `cost` column to track how much each generation cost
  - Add foreign key constraint to link videos to users
  - Add index on user_id for efficient querying

  ### Security Updates
  - Drop existing public RLS policies
  - Create new restrictive policies that only allow users to access their own data
  - Add policy for inserting new generations (must be own user_id)
  - Add policy for updating own generations (for status updates)
  - Add policy for deleting own generations

  ## Important Notes
  - Existing video_generations records will have NULL user_id (historical data)
  - New generations must have a user_id set
*/

-- Add user_id column to video_generations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_generations' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE video_generations ADD COLUMN user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add cost column to track generation cost
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_generations' AND column_name = 'cost'
  ) THEN
    ALTER TABLE video_generations ADD COLUMN cost numeric(10, 2);
  END IF;
END $$;

-- Create index on user_id for efficient queries
CREATE INDEX IF NOT EXISTS idx_video_generations_user_id ON video_generations(user_id);

-- Drop old public policies
DROP POLICY IF EXISTS "Anyone can view video generations" ON video_generations;
DROP POLICY IF EXISTS "Anyone can create video generations" ON video_generations;
DROP POLICY IF EXISTS "Anyone can update video generations" ON video_generations;
DROP POLICY IF EXISTS "Anyone can delete video generations" ON video_generations;

-- Create new restrictive RLS policies
CREATE POLICY "Users can view own video generations"
  ON video_generations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own video generations"
  ON video_generations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own video generations"
  ON video_generations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own video generations"
  ON video_generations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());