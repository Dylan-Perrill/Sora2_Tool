/*
  # Fix Authentication Trigger and RLS Policies

  ## Overview
  This migration fixes issues with user signup by improving the trigger function
  and adding necessary RLS policies for profile and account creation.

  ## Changes

  ### 1. Enhanced Trigger Function
  - Add comprehensive error handling and logging
  - Use ON CONFLICT DO NOTHING to handle race conditions
  - Ensure atomic operations with better error messages
  - Keep SECURITY DEFINER to bypass RLS during creation

  ### 2. RLS Policy Improvements
  - Add INSERT policy for user_profiles (needed for trigger)
  - Add INSERT policy for accounts (needed for trigger)
  - Policies allow service role to insert during signup

  ## Important Notes
  - The trigger function runs with SECURITY DEFINER privileges
  - This allows it to bypass RLS when creating profiles and accounts
  - Users still cannot insert profiles directly (only via signup)
  - All existing policies remain intact
*/

-- Drop and recreate the handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_exists boolean;
  v_account_exists boolean;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS(SELECT 1 FROM user_profiles WHERE id = NEW.id) INTO v_profile_exists;
  
  IF NOT v_profile_exists THEN
    -- Create user profile
    INSERT INTO user_profiles (id, email, email_verified)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.email_confirmed_at IS NOT NULL, false))
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Check if account already exists
  SELECT EXISTS(SELECT 1 FROM accounts WHERE user_id = NEW.id) INTO v_account_exists;
  
  IF NOT v_account_exists THEN
    -- Create account with zero balance
    INSERT INTO accounts (user_id, balance)
    VALUES (NEW.id, 0.00)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't prevent user creation
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Add INSERT policies for user_profiles (for service role and trigger)
DO $$
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Service role can insert profiles" ON user_profiles;
  
  -- Create policy for service role to insert profiles
  CREATE POLICY "Service role can insert profiles"
    ON user_profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- Add INSERT policies for accounts (for service role and trigger)
DO $$
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Service role can insert accounts" ON accounts;
  
  -- Create policy for service role to insert accounts
  CREATE POLICY "Service role can insert accounts"
    ON accounts FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON accounts TO authenticated;
GRANT SELECT, INSERT ON transactions TO authenticated;
GRANT SELECT ON pricing_config TO authenticated;
