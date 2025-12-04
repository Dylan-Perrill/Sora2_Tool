/**
 * Supabase implementations of storage and database interfaces
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { VideoGeneration } from './types';
import type { IStorageService, IDatabaseService } from './interfaces';
import type { StorageConfig, DatabaseConfig } from './config';

/**
 * Supabase implementation of storage service
 */
export class SupabaseStorageService implements IStorageService {
  private client: SupabaseClient;
  private config: StorageConfig;

  constructor(client: SupabaseClient, config: StorageConfig) {
    this.client = client;
    this.config = config;
  }

  async uploadVideo(
    fileName: string,
    blob: Blob,
    contentType: string = 'video/mp4'
  ): Promise<string> {
    const { error } = await this.client.storage
      .from(this.config.videoBucket)
      .upload(fileName, blob, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload video: ${error.message}`);
    }

    const { data: urlData } = this.client.storage
      .from(this.config.videoBucket)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }

  async uploadImage(
    filePath: string,
    file: File,
    contentType?: string
  ): Promise<string> {
    const { error } = await this.client.storage
      .from(this.config.imageBucket)
      .upload(filePath, file, {
        contentType: contentType || file.type,
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    const { data: urlData } = this.client.storage
      .from(this.config.imageBucket)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  }
}

/**
 * Supabase implementation of database service
 */
export class SupabaseDatabaseService implements IDatabaseService {
  private client: SupabaseClient;
  private config: DatabaseConfig;

  constructor(client: SupabaseClient, config: DatabaseConfig) {
    this.client = client;
    this.config = config;
  }

  async createVideoGeneration(
    data: Partial<VideoGeneration>
  ): Promise<VideoGeneration> {
    const { data: result, error } = await this.client
      .from(this.config.tableName)
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create video generation: ${error.message}`);
    }

    return result;
  }

  async getVideoGeneration(id: string): Promise<VideoGeneration | null> {
    const { data, error } = await this.client
      .from(this.config.tableName)
      .select()
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to fetch video generation: ${error.message}`);
    }

    return data;
  }

  async updateVideoGeneration(
    id: string,
    updates: Partial<VideoGeneration>
  ): Promise<VideoGeneration> {
    const { data, error } = await this.client
      .from(this.config.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update video generation: ${error.message}`);
    }

    return data;
  }

  async listVideoGenerations(limit: number = 50): Promise<VideoGeneration[]> {
    const { data, error } = await this.client
      .from(this.config.tableName)
      .select()
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to list video generations: ${error.message}`);
    }

    return data || [];
  }

  async deleteVideoGeneration(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.config.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete video generation: ${error.message}`);
    }
  }
}

/**
 * Create Supabase client from environment variables
 */
export function createSupabaseClient(url?: string, anonKey?: string): SupabaseClient {
  const supabaseUrl = url || import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = anonKey || import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

