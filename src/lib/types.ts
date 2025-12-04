/**
 * Shared type definitions for the video generation backend
 */

export type SoraModel = 'sora-2' | 'sora-2-pro';

export type Resolution =
  | '1280x720'
  | '720x1280'
  | '1792x1024'
  | '1024x1792';

export type VideoDuration = 4 | 8 | 12;

export type VideoGenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface VideoGenerationRequest {
  prompt: string;
  model: SoraModel;
  resolution: Resolution;
  duration: VideoDuration;
  imageUrl?: string;
  imageFile?: File; // File to send directly to API (preferred over URL)
}

export interface VideoGenerationResponse {
  id: string;
  object: string;
  model: string;
  status: string;
  prompt: string;
  created_at: number;
  url?: string;
  download_url?: string;
  progress?: number;
  error?: {
    message: string;
    type: string;
    code: string;
  };
}

export interface VideoGeneration {
  id: string;
  created_at: string;
  updated_at: string;
  prompt: string;
  model: SoraModel;
  resolution: string;
  duration: number;
  status: VideoGenerationStatus;
  video_url: string | null;
  openai_job_id: string | null;
  error_message: string | null;
  metadata: Record<string, any>;
  image_url: string | null;
  image_filename: string | null;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
}

