/**
 * Supabase client and types
 * 
 * This file maintains backward compatibility while also providing
 * the new modular configuration system.
 */

import { createSupabaseClient } from './supabase-adapters';
import type { VideoGeneration } from './types';
import type { VideoServiceConfig } from './config';
import { SupabaseStorageService, SupabaseDatabaseService } from './supabase-adapters';

// Create default Supabase client for backward compatibility
export const supabase = createSupabaseClient();

// Re-export types for backward compatibility
export type { VideoGeneration };

/**
 * Create storage and database services from configuration
 * This allows the backend to be portable across projects
 */
export function createSupabaseServices(config: VideoServiceConfig) {
  const client = createSupabaseClient();
  
  return {
    storage: new SupabaseStorageService(client, config.storage),
    database: new SupabaseDatabaseService(client, config.database),
  };
}
