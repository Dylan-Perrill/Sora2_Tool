/**
 * Configuration interfaces for backend services
 * This allows the backend to be portable across different projects
 */

/**
 * Configuration for OpenAI Sora API
 */
export interface SoraAPIConfig {
  /** OpenAI API key */
  apiKey: string;
  /** Base URL for OpenAI API (defaults to https://api.openai.com/v1) */
  baseUrl?: string;
}

/**
 * Configuration for storage operations
 */
export interface StorageConfig {
  /** Name of the video files storage bucket */
  videoBucket: string;
  /** Name of the image files storage bucket */
  imageBucket: string;
  /** Base path for image uploads (defaults to 'uploads/') */
  imageUploadPath?: string;
}

/**
 * Configuration for database operations
 */
export interface DatabaseConfig {
  /** Name of the video generations table */
  tableName: string;
}

/**
 * Complete configuration for VideoService
 */
export interface VideoServiceConfig {
  /** Sora API configuration */
  sora: SoraAPIConfig;
  /** Storage configuration */
  storage: StorageConfig;
  /** Database configuration */
  database: DatabaseConfig;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  sora: {
    baseUrl: 'https://api.openai.com/v1',
  },
  storage: {
    videoBucket: 'video_files',
    imageBucket: 'image_files',
    imageUploadPath: 'uploads/',
  },
  database: {
    tableName: 'video_generations',
  },
} as const;

/**
 * Helper to create a full config with defaults
 */
export function createVideoServiceConfig(
  apiKey: string,
  overrides?: Partial<VideoServiceConfig>
): VideoServiceConfig {
  return {
    sora: {
      apiKey,
      baseUrl: DEFAULT_CONFIG.sora.baseUrl,
      ...overrides?.sora,
    },
    storage: {
      ...DEFAULT_CONFIG.storage,
      ...overrides?.storage,
    },
    database: {
      ...DEFAULT_CONFIG.database,
      ...overrides?.database,
    },
  };
}

