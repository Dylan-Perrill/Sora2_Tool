# Sora 2 Tool

Sora 2 Tool is a Vite + React single-page application that orchestrates video generation jobs against OpenAI's Sora 2 APIs while persisting state in Supabase. It is designed to support two workflows:

1. **Production-style generation** – collect prompts, launch jobs, monitor their progress, and play back completed assets that are persisted in Supabase storage.
2. **Operational testing** – smoke test connections to OpenAI and Supabase, validate schema assumptions, and manually refresh stalled jobs while inspecting verbose logs.

This README is intended to be a comprehensive field guide to the repository so you can quickly locate relevant code, understand how the pieces interact, and diagnose issues such as failures that occur when supplying a starting image for video generation.

## Repository layout

```
Sora2_Tool/
├── supabase/                  # SQL migrations that provision database tables and storage buckets
├── src/
│   ├── components/            # Reusable UI widgets (API key gate, forms, video playback, toast)
│   ├── lib/                   # API client wrappers and Supabase bindings
│   ├── pages/                 # High-level screens (Generator and Test experiences)
│   ├── App.tsx                # Root component that swaps between pages once an API key is present
│   ├── main.tsx               # Vite entry point that renders <App />
│   └── index.css              # Tailwind + custom layer imports used across the app
├── public/ (implicit)         # Served static assets (none committed by default)
├── index.html                 # Vite HTML template that mounts the React bundle
├── package.json               # Tooling scripts and dependency manifest
├── tailwind.config.js         # Tailwind design tokens powering the gradient-heavy UI
├── postcss.config.js          # Tailwind/PostCSS integration for the build pipeline
├── tsconfig*.json             # TypeScript compiler settings for app and tooling
└── vite.config.ts             # Vite configuration (React plugin, dev server defaults)
```

### Core dependencies

The project uses React 18, Tailwind CSS, Supabase JS v2, and `lucide-react` for iconography. Linting and type checking are handled through ESLint 9 and TypeScript 5, respectively, and all common tasks (`dev`, `build`, `lint`, `typecheck`, `preview`) are exposed via `npm` scripts in [`package.json`](package.json).【F:package.json†L1-L33】

## Front-end application flow

### Bootstrapping and API key capture

* [`src/main.tsx`](src/main.tsx) hydrates the React tree into the `#root` element exposed by `index.html` and applies global Tailwind styles from `index.css`.
* [`src/App.tsx`](src/App.tsx) guards the rest of the UI behind an API key. It pulls `openai_api_key` from `localStorage`, instantiates a `VideoService`, and persists the key back to the browser when the user submits it through [`<ApiKeyInput />`](src/components/ApiKeyInput.tsx). Navigation between the generator and test experiences is a local state toggle (`currentPage`).【F:src/App.tsx†L1-L51】【F:src/components/ApiKeyInput.tsx†L1-L75】

### Generator workflow

[`src/pages/GeneratorPage.tsx`](src/pages/GeneratorPage.tsx) hosts the end-to-end production flow.【F:src/pages/GeneratorPage.tsx†L1-L214】

1. **Initial load** – `loadGenerations()` fetches the latest 50 records from Supabase via `VideoService.listVideoGenerations()` and primes the page state.
2. **Background polling** – a `setInterval` loop inspects all `pending`/`processing` records and calls `videoService.checkVideoStatus()` so that long-running jobs eventually flip to `completed` or `failed` without manual intervention.【F:src/pages/GeneratorPage.tsx†L21-L89】
3. **Manual refresh** – if any jobs are in-flight the "Refresh Status" button invokes the same polling routine on demand.【F:src/pages/GeneratorPage.tsx†L91-L127】
4. **Job creation** – [`<VideoGenerationForm />`](src/components/VideoGenerationForm.tsx) collects prompt, model, resolution, duration, and optional starting image before delegating to `videoService.createVideoGeneration()`.【F:src/components/VideoGenerationForm.tsx†L1-L214】
5. **History display** – each record is rendered with [`<VideoPlayer />`](src/components/VideoPlayer.tsx), which conditionally displays progress states, playback controls, and download/delete affordances.【F:src/components/VideoPlayer.tsx†L1-L123】
6. **User feedback** – successes, warnings, and failures trigger the lightweight [`<Toast />`](src/components/Toast.tsx) which auto-dismisses after five seconds.【F:src/pages/GeneratorPage.tsx†L152-L214】【F:src/components/Toast.tsx†L1-L44】

### Test & debug workflow

[`src/pages/TestPage.tsx`](src/pages/TestPage.tsx) is the operator console for diagnostics.【F:src/pages/TestPage.tsx†L1-L305】 It features:

* A four-step **test suite** that exercises the OpenAI API (`SoraAPI.testConnection()`), Supabase connectivity, schema validation, and a minimal video generation smoke test.
* A **live log console** that timestamps every action and makes it easy to copy/paste results when debugging.【F:src/pages/TestPage.tsx†L13-L161】
* A **recent videos** panel that mirrors Supabase history, provides inline status refreshes, and previews completed assets without leaving the page.【F:src/pages/TestPage.tsx†L197-L302】
* Shortcut cards that summarize the role of each test grouping.

## Services, APIs, and data persistence

### Supabase client and types

[`src/lib/supabase.ts`](src/lib/supabase.ts) reads the Vite environment variables, creates a typed Supabase client, and exports the `VideoGeneration` TypeScript definition used throughout the UI.【F:src/lib/supabase.ts†L1-L24】 Missing environment variables will throw at module load, making local misconfiguration obvious.

### VideoService orchestration

[`src/lib/video-service.ts`](src/lib/video-service.ts) is the workhorse responsible for syncing UI intentions with both Supabase and the OpenAI API.【F:src/lib/video-service.ts†L1-L195】 Key responsibilities include:

1. **Image upload** – optional starter images are pushed to the `image_files` storage bucket and the resulting public URL is persisted alongside the generation record.【F:src/lib/video-service.ts†L12-L75】【F:src/lib/video-service.ts†L135-L168】
2. **Job tracking** – after creating a Supabase record, `SoraAPI.createVideo()` is called and the OpenAI job identifier is stored for future polling.【F:src/lib/video-service.ts†L37-L75】
3. **Status reconciliation** – `checkVideoStatus()` repeatedly queries the OpenAI API, updates metadata in Supabase, downloads finished content, and uploads it into the `video_files` bucket with deterministic names for easy reuse.【F:src/lib/video-service.ts†L77-L134】
4. **CRUD utilities** – helper methods exist to list and delete generation records so both pages can share the same data access patterns.【F:src/lib/video-service.ts†L170-L192】

### OpenAI API wrapper

[`src/lib/sora-api.ts`](src/lib/sora-api.ts) wraps the Sora REST endpoints for job creation, status polling, listing historical jobs, downloading MP4 blobs, and performing a connectivity test.【F:src/lib/sora-api.ts†L1-L125】 Requests include the API key supplied by the user and perform basic error translation so human-readable messages appear in the UI.

### Database and storage migrations

The SQL files in [`supabase/migrations`](supabase/migrations) codify the backend shape expected by the app:

* `20251021163127_create_video_generations_table.sql` creates the `video_generations` table, triggers, indexes, and permissive Row Level Security policies for development.【F:supabase/migrations/20251021163127_create_video_generations_table.sql†L1-L73】
* `20251021172516_create_video_storage_bucket.sql` provisions a public `video_files` bucket with development-friendly storage policies so completed MP4s remain accessible.【F:supabase/migrations/20251021172516_create_video_storage_bucket.sql†L1-L79】
* `20251023173149_add_image_upload_support.sql` appends `image_url` and `image_filename` columns so uploaded references can be associated with generations.【F:supabase/migrations/20251023173149_add_image_upload_support.sql†L1-L40】
* `20251023173209_create_image_storage_bucket.sql` mirrors the storage setup for the `image_files` bucket used by `VideoService.uploadImage`.【F:supabase/migrations/20251023173209_create_image_storage_bucket.sql†L1-L59】

Apply these migrations to a Supabase project (locally via the CLI or in the hosted dashboard) before running the app so the UI has the expected tables and storage buckets. Policies are intentionally permissive for single-user testing—tighten them for any multi-user deployment.

## Styling, layout, and UX

The UI is Tailwind-first. [`tailwind.config.js`](tailwind.config.js) controls the design tokens and gradient palette, while [`src/index.css`](src/index.css) wires in Tailwind's base/component/utility layers. All layout components use responsive utility classes to provide desktop/two-column dashboards and mobile-friendly fallbacks. Iconography comes from `lucide-react`, giving buttons and status pills recognizable metaphors across both pages.

## Environment configuration

Supply the Supabase connection details to Vite before starting the dev server:

```bash
VITE_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
```

The OpenAI API key is collected client-side via the API key gate and stored in `localStorage`. It never leaves the browser—network requests are made directly from the user’s machine.

## Local development workflow

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Open the printed URL (Vite defaults to `http://localhost:5173`), enter a Sora-enabled OpenAI API key, and begin experimenting.
4. Quality gates:
   ```bash
   npm run lint
   npm run typecheck
   npm run build
   ```

Because requests originate from the browser, confirm that your Supabase project's CORS settings allow the Vite origin.

## Extending or modifying the app

Here are common areas you might adapt:

* **Add new Sora parameters** – update the constant lists exported from `src/lib/sora-api.ts` and surface them through `VideoGenerationForm` controls so the extra options appear in the UI.【F:src/lib/sora-api.ts†L127-L154】【F:src/components/VideoGenerationForm.tsx†L24-L214】
* **Enrich history views** – adjust `VideoService.listVideoGenerations()` to join with additional Supabase tables or add filters/search before the data hits `GeneratorPage` and `TestPage`.
* **Tighten security** – revise the migrations to add `user_id` columns, lock down storage policies, and enforce `auth.uid()` checks once authentication is introduced.
* **Automate storage cleanup** – expand `deleteVideoGeneration()` to remove associated MP4 and image assets from Supabase storage to prevent orphaned files.【F:src/lib/video-service.ts†L170-L192】

## TODO: Investigate image-to-video generation failures

If video jobs fail when a starting image is uploaded, focus your debugging on the following areas:

1. **Sora API payload** – `VideoService.createVideoGeneration()` passes an `imageUrl` field into the request object, but `SoraAPI.createVideo()` currently ignores it when constructing the JSON body. Update [`src/lib/sora-api.ts`](src/lib/sora-api.ts) so the POST payload forwards the image reference in the format expected by the Sora API (for example, `image_url` or `image` depending on the spec).【F:src/lib/video-service.ts†L37-L60】【F:src/lib/sora-api.ts†L33-L74】
2. **Supabase storage permissions** – ensure the `image_files` bucket is public (or otherwise accessible) so OpenAI can fetch the uploaded asset. Review the policies defined in `20251023173209_create_image_storage_bucket.sql` and tighten or relax them as needed for your environment.【F:supabase/migrations/20251023173209_create_image_storage_bucket.sql†L1-L59】
3. **Request metadata persistence** – confirm `image_url` and `image_filename` are populated in the `video_generations` table by inspecting rows in Supabase Studio or logging the data returned from `VideoService.createVideoGeneration()`. This helps verify the upload step succeeded before the OpenAI request is sent.【F:src/lib/video-service.ts†L16-L75】
4. **UI upload flow** – the form enforces a 50 MB limit and only accepts specific MIME types. If legitimate files are rejected or corrupted, adjust the checks in [`VideoGenerationForm`](src/components/VideoGenerationForm.tsx).【F:src/components/VideoGenerationForm.tsx†L30-L105】

Working through those touchpoints should isolate whether failures stem from front-end validation, Supabase storage configuration, or the OpenAI request payload.
