# Backend Service Layer

This directory contains the modular, portable backend services for video generation.

## Architecture

The backend has been refactored to be fully configurable and portable:

### Core Files

- **`types.ts`** - Shared TypeScript type definitions
- **`config.ts`** - Configuration interfaces and default values
- **`interfaces.ts`** - Abstract interfaces for storage and database operations
- **`sora-api.ts`** - OpenAI Sora API client (configurable)
- **`supabase-adapters.ts`** - Supabase implementations of storage/database interfaces
- **`supabase.ts`** - Supabase client factory (maintains backward compatibility)
- **`video-service.ts`** - Main orchestration service (fully configurable)

## Usage

### Backward Compatible (Current Project)

The existing code continues to work without changes:

```typescript
// Still works - uses defaults
const videoService = new VideoService(apiKey);
```

### Portable Configuration (New Projects)

For portability, use the configuration system:

```typescript
import { createVideoServiceConfig } from './lib/config';
import { VideoService } from './lib/video-service';

const config = createVideoServiceConfig(apiKey, {
  storage: {
    videoBucket: 'my_videos',
    imageBucket: 'my_images',
    imageUploadPath: 'custom/path/',
  },
  database: {
    tableName: 'my_video_table',
  },
  sora: {
    baseUrl: 'https://custom-api.example.com/v1', // Optional
  },
});

const videoService = new VideoService(config);
```

### Custom Implementations

You can implement your own storage or database services:

```typescript
import type { IStorageService, IDatabaseService } from './lib/interfaces';

class MyStorageService implements IStorageService {
  // Implement interface methods
}

class MyDatabaseService implements IDatabaseService {
  // Implement interface methods
}

// Then inject them into VideoService
```

## Configuration Options

### StorageConfig
- `videoBucket`: Name of the video storage bucket
- `imageBucket`: Name of the image storage bucket
- `imageUploadPath`: Base path for image uploads (default: `'uploads/'`)

### DatabaseConfig
- `tableName`: Name of the video generations table

### SoraAPIConfig
- `apiKey`: OpenAI API key (required)
- `baseUrl`: API base URL (default: `'https://api.openai.com/v1'`)

## Benefits

1. **Portability** - Easy to move to different projects
2. **Testability** - Interfaces allow easy mocking
3. **Flexibility** - Swap implementations without changing business logic
4. **Backward Compatible** - Existing code continues to work
5. **Type Safety** - Full TypeScript support throughout

