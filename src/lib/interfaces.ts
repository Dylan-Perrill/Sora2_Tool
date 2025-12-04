/**
 * Interfaces for storage and database operations
 * These abstractions allow the backend to work with different implementations
 */

import type { VideoGeneration } from './types';

/**
 * Interface for storage operations (e.g., Supabase Storage, S3, etc.)
 */
export interface IStorageService {
  /**
   * Upload a video file and return its public URL
   */
  uploadVideo(
    fileName: string,
    blob: Blob,
    contentType?: string
  ): Promise<string>;

  /**
   * Upload an image file and return its public URL
   */
  uploadImage(
    filePath: string,
    file: File,
    contentType?: string
  ): Promise<string>;
}

/**
 * Interface for database operations (e.g., Supabase, PostgreSQL, etc.)
 */
export interface IDatabaseService {
  /**
   * Create a new video generation record
   */
  createVideoGeneration(
    data: Partial<VideoGeneration>
  ): Promise<VideoGeneration>;

  /**
   * Get a video generation by ID
   */
  getVideoGeneration(id: string): Promise<VideoGeneration | null>;

  /**
   * Update a video generation record
   */
  updateVideoGeneration(
    id: string,
    updates: Partial<VideoGeneration>
  ): Promise<VideoGeneration>;

  /**
   * List video generations with optional limit
   */
  listVideoGenerations(limit?: number): Promise<VideoGeneration[]>;

  /**
   * Delete a video generation record
   */
  deleteVideoGeneration(id: string): Promise<void>;
}

