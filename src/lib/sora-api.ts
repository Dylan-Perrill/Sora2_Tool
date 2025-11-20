export type SoraModel = 'sora-2' | 'sora-2-pro';

export type Resolution =
  | '1280x720'
  | '720x1280'
  | '1792x1024'
  | '1024x1792';

export type VideoDuration = 4 | 8 | 12;

export interface VideoGenerationRequest {
  prompt: string;
  model: SoraModel;
  resolution: Resolution;
  duration: VideoDuration;
  imageUrl?: string;
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

const OPENAI_API_BASE = 'https://api.openai.com/v1';

export class SoraAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    const normalizedKey = apiKey.trim();
    if (!normalizedKey) {
      throw new Error('Missing OpenAI API key. Please provide a valid key.');
    }

    this.apiKey = normalizedKey;
  }

  async createVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    const body: any = {
      model: request.model,
      prompt: request.prompt,
      size: request.resolution,
      seconds: request.duration.toString(),
    };

    const response = await fetch(`${OPENAI_API_BASE}/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message ||
        `API request failed with status ${response.status}`
      );
    }

    return response.json();
  }

  async getVideo(videoId: string): Promise<VideoGenerationResponse> {
    const response = await fetch(`${OPENAI_API_BASE}/videos/${videoId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message ||
        `Failed to fetch video status: ${response.status}`
      );
    }

    return response.json();
  }

  async listVideos(limit: number = 20): Promise<{ data: VideoGenerationResponse[] }> {
    const response = await fetch(`${OPENAI_API_BASE}/videos?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message ||
        `Failed to list videos: ${response.status}`
      );
    }

    return response.json();
  }

  async downloadContent(videoId: string): Promise<Blob> {
    const response = await fetch(`${OPENAI_API_BASE}/videos/${videoId}/content`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message ||
        `Failed to download video content: ${response.status}`
      );
    }

    return response.blob();
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${OPENAI_API_BASE}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (response.ok) {
        return {
          success: true,
          message: 'API connection successful',
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: errorData.error?.message || `Connection failed: ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const RESOLUTION_OPTIONS: { value: Resolution; label: string; model: SoraModel[] }[] = [
  { value: '1280x720', label: '1280x720 (HD Landscape)', model: ['sora-2', 'sora-2-pro'] },
  { value: '720x1280', label: '720x1280 (HD Portrait)', model: ['sora-2', 'sora-2-pro'] },
  { value: '1792x1024', label: '1792x1024 (Full HD Landscape)', model: ['sora-2-pro'] },
  { value: '1024x1792', label: '1024x1792 (Full HD Portrait)', model: ['sora-2-pro'] },
];

export const DURATION_OPTIONS: { value: VideoDuration; label: string }[] = [
  { value: 4, label: '4 seconds' },
  { value: 8, label: '8 seconds' },
  { value: 12, label: '12 seconds' },
];

export const MODEL_OPTIONS: { value: SoraModel; label: string; description: string }[] = [
  {
    value: 'sora-2',
    label: 'Sora 2',
    description: 'Fast generation, up to 1280x720 resolution'
  },
  {
    value: 'sora-2-pro',
    label: 'Sora 2 Pro',
    description: 'High quality, up to 1792x1024 resolution'
  },
];
