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
