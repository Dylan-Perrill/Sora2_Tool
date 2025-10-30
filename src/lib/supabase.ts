import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type VideoGeneration = {
  id: string;
  created_at: string;
  updated_at: string;
  prompt: string;
  model: 'sora-2' | 'sora-2-pro';
  resolution: string;
  duration: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  video_url: string | null;
  openai_job_id: string | null;
  error_message: string | null;
  metadata: Record<string, any>;
  image_url: string | null;
  image_filename: string | null;
};

export type TransactionType = 'deposit' | 'charge' | 'refund';

export type AccountRecord = {
  id: string;
  api_key_hash: string;
  currency: string;
  balance: number;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  account_id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  metadata: Record<string, any>;
  created_at: string;
};

export type PricingTierRecord = {
  id: number;
  model: string;
  resolution: string;
  duration_seconds: number;
  price: number;
  currency: string;
  created_at: string;
};
