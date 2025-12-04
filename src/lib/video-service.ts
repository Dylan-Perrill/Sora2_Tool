/**
 * VideoService - Orchestrates video generation between OpenAI Sora API,
 * storage, and database services.
 * 
 * This service is now fully configurable and portable across projects.
 */

import type { VideoGeneration, VideoGenerationRequest } from './types';
import { SoraAPI } from './sora-api';
import type { VideoServiceConfig } from './config';
import { createVideoServiceConfig } from './config';
import type { IStorageService, IDatabaseService } from './interfaces';
import { createSupabaseServices } from './supabase';

/**
 * VideoService handles the complete video generation workflow:
 * 1. Image upload (optional)
 * 2. Database record creation
 * 3. OpenAI job creation
 * 4. Status polling and video download
 * 5. Storage management
 */
export class VideoService {
  private soraAPI: SoraAPI;
  private storage: IStorageService;
  private database: IDatabaseService;
  private config: VideoServiceConfig;

  /**
   * Constructor accepts either:
   * - string (apiKey) for backward compatibility
   * - VideoServiceConfig for full configuration
   */
  constructor(configOrApiKey: string | VideoServiceConfig) {
    // Support both old API (string) and new API (config object) for backward compatibility
    if (typeof configOrApiKey === 'string') {
      this.config = createVideoServiceConfig(configOrApiKey);
      // Use default Supabase services for backward compatibility
      const services = createSupabaseServices(this.config);
      this.storage = services.storage;
      this.database = services.database;
    } else {
      this.config = configOrApiKey;
      // Use provided services or create default Supabase services
      const services = createSupabaseServices(this.config);
      this.storage = services.storage;
      this.database = services.database;
    }

    this.soraAPI = new SoraAPI(this.config.sora);
  }

  /**
   * Create a new video generation job
   */
  async createVideoGeneration(
    request: VideoGenerationRequest,
    imageFile?: File
  ): Promise<VideoGeneration> {
    let imageUrl: string | null = null;
    let imageFilename: string | null = null;

    if (imageFile) {
      imageUrl = await this.uploadImage(imageFile);
      imageFilename = imageFile.name;
    }

    const dbRecord: Partial<VideoGeneration> = {
      prompt: request.prompt,
      model: request.model,
      resolution: request.resolution,
      duration: request.duration,
      status: 'pending',
      image_url: imageUrl,
      image_filename: imageFilename,
    };

    const data = await this.database.createVideoGeneration(dbRecord);

    try {
      const videoRequest: VideoGenerationRequest = {
        ...request,
        imageUrl: imageUrl || undefined,
        imageFile: imageFile || undefined, // Pass File directly to API
      };
      const response = await this.soraAPI.createVideo(videoRequest);

      const updated = await this.database.updateVideoGeneration(data.id, {
        openai_job_id: response.id,
        status: 'processing',
        metadata: response,
      });

      return updated;
    } catch (error) {
      await this.database.updateVideoGeneration(data.id, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Check and update the status of a video generation
   */
  async checkVideoStatus(generationId: string): Promise<VideoGeneration> {
    const generation = await this.database.getVideoGeneration(generationId);

    if (!generation) {
      throw new Error(`Video generation ${generationId} not found`);
    }

    if (!generation.openai_job_id) {
      console.log(`[VideoService] No OpenAI job ID for generation ${generationId}`);
      return generation;
    }

    try {
      console.log(`[VideoService] Checking status for OpenAI job: ${generation.openai_job_id}`);
      const status = await this.soraAPI.getVideo(generation.openai_job_id);

      console.log(`[VideoService] OpenAI API Response:`, {
        status: status.status,
        url: status.url,
        download_url: status.download_url,
        error: status.error,
        fullResponse: status
      });

      const updates: Partial<VideoGeneration> = {
        metadata: status,
      };

      if (status.status === 'completed') {
        console.log(`[VideoService] Video completed, downloading from OpenAI...`);

        if (generation.video_url) {
          console.log(`[VideoService] Video already downloaded and stored`);
          updates.status = 'completed';
        } else {
          try {
            const videoUrl = await this.downloadAndStoreVideo(generation.openai_job_id, generationId);
            console.log(`[VideoService] Video stored at: ${videoUrl}`);
            updates.status = 'completed';
            updates.video_url = videoUrl;
          } catch (downloadError) {
            console.error(`[VideoService] Failed to download video:`, downloadError);
            updates.status = 'failed';
            updates.error_message = downloadError instanceof Error ? downloadError.message : 'Failed to download video';
          }
        }
      } else if (status.status === 'failed' || status.error) {
        console.log(`[VideoService] Video failed with error:`, status.error);
        updates.status = 'failed';
        updates.error_message = status.error?.message || 'Video generation failed';
      } else if (status.status === 'processing' || status.status === 'queued' || status.status === 'in_progress') {
        console.log(`[VideoService] Video still processing (status: ${status.status})`);
        updates.status = 'processing';
      } else {
        console.log(`[VideoService] Unknown status from API: ${status.status}`);
      }

      // Always update the database with metadata (and any other updates)
      // Then fetch fresh data to ensure we return the latest state
      if (Object.keys(updates).length > 0) {
        console.log(`[VideoService] Updating database with:`, updates);
        await this.database.updateVideoGeneration(generationId, updates);
      }

      // Always fetch fresh data from database to return the latest state
      const updated = await this.database.getVideoGeneration(generationId);
      if (!updated) {
        throw new Error(`Video generation ${generationId} not found after update`);
      }
      return updated;
    } catch (error) {
      console.error('[VideoService] Error checking video status:', error);
      if (error instanceof Error) {
        console.error('[VideoService] Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      return generation;
    }
  }

  /**
   * Download video from OpenAI and store it
   */
  private async downloadAndStoreVideo(videoId: string, generationId: string): Promise<string> {
    console.log(`[VideoService] Downloading video ${videoId} from OpenAI...`);

    const blob = await this.soraAPI.downloadContent(videoId);

    console.log(`[VideoService] Downloaded ${blob.size} bytes, uploading to storage...`);

    const fileName = `${generationId}/${videoId}.mp4`;
    const videoUrl = await this.storage.uploadVideo(fileName, blob, 'video/mp4');

    console.log(`[VideoService] Video stored successfully at: ${videoUrl}`);
    return videoUrl;
  }

  /**
   * Upload an image file
   */
  private async uploadImage(file: File): Promise<string> {
    console.log(`[VideoService] Uploading image: ${file.name}`);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${this.config.storage.imageUploadPath || 'uploads/'}${fileName}`;

    const imageUrl = await this.storage.uploadImage(filePath, file, file.type);

    console.log(`[VideoService] Image uploaded successfully at: ${imageUrl}`);
    return imageUrl;
  }

  /**
   * List video generations
   */
  async listVideoGenerations(limit: number = 50): Promise<VideoGeneration[]> {
    return this.database.listVideoGenerations(limit);
  }

  /**
   * Delete a video generation
   */
  async deleteVideoGeneration(generationId: string): Promise<void> {
    return this.database.deleteVideoGeneration(generationId);
  }

  /**
   * Get the SoraAPI instance (for testing/debugging)
   */
  getSoraAPI(): SoraAPI {
    return this.soraAPI;
  }

  /**
   * Get the current configuration
   */
  getConfig(): VideoServiceConfig {
    return this.config;
  }
}
