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

// Shape of the create video payload sent to the API
interface SoraCreateVideoBody {
  model: SoraModel;
  prompt: string;
  size: Resolution;
  seconds: string;
  image?: string;
}

export class SoraAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createVideo(
    request: VideoGenerationRequest,
    inputReference?: File | string
  ): Promise<VideoGenerationResponse> {
    // If an input reference is provided, use multipart/form-data and send it as `input_reference`
    if (inputReference) {
      const form = new FormData();
      form.append('model', request.model);
      form.append('prompt', request.prompt);
      form.append('size', request.resolution);
      form.append('seconds', request.duration.toString());

      if (inputReference instanceof File) {
        form.append('input_reference', inputReference, inputReference.name);
      } else {
        // Some APIs may allow a URL here; if not, server will respond with a clear error
        form.append('input_reference', inputReference);
      }

      try {
        console.debug('[SoraAPI] createVideo payload (multipart)', {
          model: request.model,
          prompt: request.prompt,
          size: request.resolution,
          seconds: request.duration,
          hasImageFile: inputReference instanceof File,
        });
      } catch {
        void 0;
      }

      const response = await fetch(`${OPENAI_API_BASE}/videos`, {
        method: 'POST',
        headers: {
          // Do not set Content-Type for FormData; the browser will set proper boundary
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: form,
      });

      if (!response.ok) {
        let message = `API request failed with status ${response.status}`;
        try {
          const text = await response.text();
          try {
            const parsed = JSON.parse(text);
            message = parsed?.error?.message || message;
          } catch {
            message = `${message}: ${text?.slice(0, 500)}`;
          }
        } catch {
          void 0;
        }
        throw new Error(message);
      }

      return response.json();
    }

    // Fallback: JSON payload when no input reference is provided
    const body: SoraCreateVideoBody = {
      model: request.model,
      prompt: request.prompt,
      size: request.resolution,
      seconds: request.duration.toString(),
      // image left out here; use multipart if sending a real reference
    };

    if (request.imageUrl) {
      // For servers that accept a simple URL field named `image`, keep this backward-compatible path
      body.image = request.imageUrl;
    }

    try {
      console.debug('[SoraAPI] createVideo payload (json)', {
        model: body.model,
        prompt: body.prompt,
        size: body.size,
        seconds: body.seconds,
        hasImage: Boolean(request.imageUrl),
      });
    } catch {
      void 0;
    }

    const response = await fetch(`${OPENAI_API_BASE}/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let message = `API request failed with status ${response.status}`;
      try {
        const text = await response.text();
        try {
          const parsed = JSON.parse(text);
          message = parsed?.error?.message || message;
        } catch {
          // non-JSON body; include a snippet for debugging
          message = `${message}: ${text?.slice(0, 500)}`;
        }
      } catch {
        // ignore read errors
        void 0;
      }
      throw new Error(message);
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
