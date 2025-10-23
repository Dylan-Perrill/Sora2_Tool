import { supabase, VideoGeneration } from './supabase';
import { SoraAPI, VideoGenerationRequest } from './sora-api';

export class VideoService {
  private soraAPI: SoraAPI;

  constructor(apiKey: string) {
    this.soraAPI = new SoraAPI(apiKey);
  }

  async createVideoGeneration(
    request: VideoGenerationRequest,
    imageFile?: File
  ): Promise<VideoGeneration> {
    let imageUrl: string | null = null;
    let imageFilename: string | null = null;

    if (imageFile) {
      const uploadResult = await this.uploadImage(imageFile);
      imageUrl = uploadResult.url;
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

    const { data, error } = await supabase
      .from('video_generations')
      .insert(dbRecord)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save video generation: ${error.message}`);
    }

    try {
      const videoRequest: VideoGenerationRequest = {
        ...request,
        imageUrl: imageUrl || undefined,
      };
      const response = await this.soraAPI.createVideo(videoRequest);

      await supabase
        .from('video_generations')
        .update({
          openai_job_id: response.id,
          status: 'processing',
          metadata: response,
        })
        .eq('id', data.id);

      const { data: updatedData } = await supabase
        .from('video_generations')
        .select()
        .eq('id', data.id)
        .single();

      return updatedData!;
    } catch (error) {
      await supabase
        .from('video_generations')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', data.id);

      throw error;
    }
  }

  async checkVideoStatus(generationId: string): Promise<VideoGeneration> {
    const { data: generation, error } = await supabase
      .from('video_generations')
      .select()
      .eq('id', generationId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch generation: ${error.message}`);
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

      if (Object.keys(updates).length > 1) {
        console.log(`[VideoService] Updating database with:`, updates);
        const { error: updateError } = await supabase
          .from('video_generations')
          .update(updates)
          .eq('id', generationId);

        if (updateError) {
          console.error(`[VideoService] Failed to update database:`, updateError);
        }
      }

      const { data: updatedData } = await supabase
        .from('video_generations')
        .select()
        .eq('id', generationId)
        .single();

      return updatedData!;
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

  private async downloadAndStoreVideo(videoId: string, generationId: string): Promise<string> {
    console.log(`[VideoService] Downloading video ${videoId} from OpenAI...`);

    const blob = await this.soraAPI.downloadContent(videoId);

    console.log(`[VideoService] Downloaded ${blob.size} bytes, uploading to Supabase Storage...`);

    const fileName = `${generationId}/${videoId}.mp4`;
    const { error } = await supabase.storage
      .from('video_files')
      .upload(fileName, blob, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload to Supabase Storage: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('video_files')
      .getPublicUrl(fileName);

    console.log(`[VideoService] Video stored successfully at: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  }

  private async uploadImage(file: File): Promise<{ url: string }> {
    console.log(`[VideoService] Uploading image: ${file.name}`);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error } = await supabase.storage
      .from('image_files')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('image_files')
      .getPublicUrl(filePath);

    console.log(`[VideoService] Image uploaded successfully at: ${urlData.publicUrl}`);
    return { url: urlData.publicUrl };
  }

  async listVideoGenerations(limit: number = 50): Promise<VideoGeneration[]> {
    const { data, error } = await supabase
      .from('video_generations')
      .select()
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to list video generations: ${error.message}`);
    }

    return data || [];
  }

  async deleteVideoGeneration(generationId: string): Promise<void> {
    const { error } = await supabase
      .from('video_generations')
      .delete()
      .eq('id', generationId);

    if (error) {
      throw new Error(`Failed to delete video generation: ${error.message}`);
    }
  }

  getSoraAPI(): SoraAPI {
    return this.soraAPI;
  }
}
