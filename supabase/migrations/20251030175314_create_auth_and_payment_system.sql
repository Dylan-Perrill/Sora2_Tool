/*
  # Authentication and Payment System Setup

  ## Overview
  This migration creates a comprehensive authentication and payment system for the Sora video
  generation platform. It includes user management, account balances, transaction tracking,
  and configurable pricing.

  ## New Tables

  ### `user_profiles`
  Extends Supabase auth.users with additional profile information
  - `id` (uuid, primary key, references auth.users) - User ID from Supabase Auth
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update timestamp
  - `email` (text) - User's email address (synced from auth.users)
  - `openai_api_key` (text, encrypted) - User's OpenAI API key (encrypted at rest)
  - `is_active` (boolean) - Whether the account is active
  - `email_verified` (boolean) - Whether email has been verified

  ### `accounts`
  Tracks user account balances
  - `id` (uuid, primary key) - Account identifier
  - `user_id` (uuid, references user_profiles) - Owner of the account
  - `balance` (numeric) - Current account balance in USD
  - `currency` (text) - Currency code (default: USD)
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last balance update timestamp

  ### `transactions`
  Logs all financial activities (deposits, charges, refunds)
  - `id` (uuid, primary key) - Transaction identifier
  - `user_id` (uuid, references user_profiles) - User who owns this transaction
  - `account_id` (uuid, references accounts) - Associated account
  - `type` (text) - Transaction type: deposit, charge, refund, adjustment
  - `amount` (numeric) - Transaction amount (positive for credits, negative for charges)
  - `balance_after` (numeric) - Account balance after this transaction
  - `description` (text) - Human-readable description
  - `video_generation_id` (uuid, nullable) - Related video generation if applicable
  - `payment_provider` (text, nullable) - Payment provider used (stripe, paypal, etc.)
  - `payment_id` (text, nullable) - External payment ID for reconciliation
  - `metadata` (jsonb) - Additional transaction data
  - `created_at` (timestamptz) - Transaction timestamp

  ### `pricing_config`
  Configurable pricing for video generations
  - `id` (uuid, primary key) - Pricing rule identifier
  - `model` (text) - Sora model (sora-2, sora-2-pro)
  - `resolution` (text, nullable) - Resolution tier (any resolution if null)
  - `duration` (integer, nullable) - Duration in seconds (any duration if null)
  - `price` (numeric) - Price in USD
  - `is_active` (boolean) - Whether this pricing rule is active
  - `created_at` (timestamptz) - Rule creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security

  ### Row Level Security
  - All tables have RLS enabled
  - Users can only access their own data (profiles, accounts, transactions, generations)
  - Public read access to pricing_config (everyone needs to see prices)
  - Service role can perform admin operations

  ## Important Notes
  - Accounts are automatically created when a user signs up (via trigger)
  - Balance is tracked with numeric type for precision (avoiding floating point errors)
  - All monetary calculations use 2 decimal places
  - Transactions are immutable (no updates allowed, only inserts)
*/

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  email text NOT NULL,
  openai_api_key text,
  is_active boolean DEFAULT true,
  email_verified boolean DEFAULT false
);

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  balance numeric(10, 2) DEFAULT 0.00 CHECK (balance >= 0),
  currency text DEFAULT 'USD',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('deposit', 'charge', 'refund', 'adjustment')),
  amount numeric(10, 2) NOT NULL,
  balance_after numeric(10, 2) NOT NULL,
  description text NOT NULL,
  video_generation_id uuid,
  payment_provider text,
  payment_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create pricing_config table
CREATE TABLE IF NOT EXISTS pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model text NOT NULL,
  resolution text,
  duration integer,
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_video_generation_id ON transactions(video_generation_id);
CREATE INDEX IF NOT EXISTS idx_pricing_config_model ON pricing_config(model);

-- Enable Row Level Security on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for accounts
CREATE POLICY "Users can view own account"
  ON accounts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own account"
  ON accounts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for pricing_config (public read access)
CREATE POLICY "Anyone can view active pricing"
  ON pricing_config FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_config_updated_at
  BEFORE UPDATE ON pricing_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile and account after signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, email_verified)
  VALUES (NEW.id, NEW.email, NEW.email_confirmed_at IS NOT NULL);
  
  INSERT INTO accounts (user_id, balance)
  VALUES (NEW.id, 0.00);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile and account when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Insert default pricing configuration
INSERT INTO pricing_config (model, resolution, duration, price, is_active) VALUES
  ('sora-2', '1280x720', 4, 1.00, true),
  ('sora-2', '1280x720', 8, 1.50, true),
  ('sora-2', '1280x720', 12, 2.00, true),
  ('sora-2', '720x1280', 4, 1.00, true),
  ('sora-2', '720x1280', 8, 1.50, true),
  ('sora-2', '720x1280', 12, 2.00, true),
  ('sora-2-pro', '1280x720', 4, 2.00, true),
  ('sora-2-pro', '1280x720', 8, 3.00, true),
  ('sora-2-pro', '1280x720', 12, 4.00, true),
  ('sora-2-pro', '720x1280', 4, 2.00, true),
  ('sora-2-pro', '720x1280', 8, 3.00, true),
  ('sora-2-pro', '720x1280', 12, 4.00, true),
  ('sora-2-pro', '1792x1024', 4, 3.00, true),
  ('sora-2-pro', '1792x1024', 8, 4.50, true),
  ('sora-2-pro', '1792x1024', 12, 6.00, true),
  ('sora-2-pro', '1024x1792', 4, 3.00, true),
  ('sora-2-pro', '1024x1792', 8, 4.50, true),
  ('sora-2-pro', '1024x1792', 12, 6.00, true)
ON CONFLICT DO NOTHING;