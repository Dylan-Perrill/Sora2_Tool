# Sora 2 Tool

Sora 2 Tool is a Vite + React application that lets you launch and monitor video generations through OpenAI's experimental Sora 2 API while persisting the job history in Supabase. The app focuses on two use cases:

1. **Production-style generation workflow** – collect prompts, start jobs, track their progress, and play back finished videos from Supabase storage.
2. **Operational testing** – run smoke tests against the OpenAI and Supabase backends, inspect request logs, and manually refresh job status when debugging issues.

This document explains how the project is wired together so that you can confidently run, extend, or troubleshoot it.

## High-level architecture

```text
┌────────────┐      OpenAI Sora API      ┌─────────────────────┐
│ React SPA  │ ───────────────────────► │ VideoService/SoraAPI │
└─────┬──────┘                          └────────┬────────────┘
      │                                        (fetch/HTTP)
      │                                           │
      │   Supabase JS client            ┌─────────▼─────────┐
      └────────────────────────────────►│ Supabase Database  │
                                        │  + Storage buckets │
                                        └────────────────────┘
```

* The **React single-page app** (SPA) handles UI, state, and navigation between the generator and testing views.
* **VideoService** in [`src/lib/video-service.ts`](src/lib/video-service.ts) orchestrates requests to the OpenAI Sora API and updates Supabase with the job metadata, status, and downloadable assets.
* **Supabase** stores video job history (`video_generations` table) and hosts uploaded images (`image_files` bucket) plus finished video files (`video_files` bucket).
* **SoraAPI** in [`src/lib/sora-api.ts`](src/lib/sora-api.ts) is a thin wrapper around the REST endpoints exposed by OpenAI for creating jobs, polling status, and downloading the generated video blobs.

## Front-end flow

### Entry point and API key capture

* [`src/main.tsx`](src/main.tsx) boots the React application and renders `<App />`.
* [`src/App.tsx`](src/App.tsx) is responsible for gating the app behind an API key prompt:
  * On initial load it looks for `openai_api_key` in `localStorage`.
  * If absent, it renders [`<ApiKeyInput />`](src/components/ApiKeyInput.tsx), a form that securely stores the key in `localStorage` and instantiates `VideoService` with that key.
  * Once a key is available, the component toggles between the **Generator** and **Test** pages using a simple state machine (`currentPage`).

### Generator page

[`src/pages/GeneratorPage.tsx`](src/pages/GeneratorPage.tsx) delivers the main production workflow:

1. **Initial data load** – `useEffect` calls `videoService.listVideoGenerations()` to fetch the most recent Supabase history.
2. **Background polling** – every 10 seconds `checkPendingGenerations()` looks for records stuck in `pending` or `processing`, then asks `videoService.checkVideoStatus()` to refresh them.
3. **Manual refresh** – when pending jobs exist a "Refresh Status" button triggers the same check on demand.
4. **Video creation** – the embedded [`<VideoGenerationForm />`](src/components/VideoGenerationForm.tsx) collects a prompt, Sora model (`sora-2` or `sora-2-pro`), resolution, duration, and optional starting image. Submitting the form calls `videoService.createVideoGeneration()` with those parameters.
5. **History display** – each `VideoGeneration` record renders through [`<VideoPlayer />`](src/components/VideoPlayer.tsx), which handles status-dependent UIs (spinner, failure message, completed video playback, download button) and allows deletion via `videoService.deleteVideoGeneration()`.
6. **Feedback** – success/error toasts use [`<Toast />`](src/components/Toast.tsx), a lightweight component that auto-dismisses after 5 seconds.

### Test page

[`src/pages/TestPage.tsx`](src/pages/TestPage.tsx) focuses on diagnostics:

* Presents a **Test Suite** with four targeted checks (OpenAI connection, Supabase connection, schema validation, and a minimal generation request). Each test updates its status badge and writes to the live log stream.
* The **Debug Logs** panel displays timestamped messages assembled via `addLog`, making it easy to follow backend calls without opening the browser console.
* The **Recent Video Generations** list mirrors the generator history but adds a "Check Status" button next to each entry so you can poll individual jobs (`videoService.checkVideoStatus`) while watching the metadata returned by the API.
* Supporting cards summarize what each testing area covers (API, Database, Generation).

## Video generation lifecycle

The `VideoService` class encapsulates the end-to-end lifecycle. Understanding its steps is key to modifying or troubleshooting the app.

1. **Optional image upload** – if the user supplied an image, `uploadImage()` pushes it to the Supabase `image_files` bucket and records the public URL.
2. **Database record creation** – a `video_generations` row is inserted with `status: 'pending'` plus the user-selected parameters.
3. **OpenAI job creation** – `SoraAPI.createVideo()` sends a POST to `https://api.openai.com/v1/videos` with the prompt, model, resolution (`size`), and duration (`seconds`). The response payload is stored in the Supabase row (`openai_job_id`, `metadata`) and the status flips to `processing`.
4. **Polling for completion** – `checkVideoStatus()` fetches the row, calls `SoraAPI.getVideo()` using the stored job ID, and branches based on the returned status:
   * `completed` – downloads the video bits with `downloadContent()`, uploads them into the `video_files` storage bucket via `downloadAndStoreVideo()`, then updates the row with a permanent `video_url` and `status: 'completed'`.
   * `failed` – writes the error message to `error_message` and marks the job as failed.
   * `processing/queued/in_progress` – leaves the job as `processing` and keeps the latest metadata for debugging.
5. **Deletion** – removing a job simply deletes the Supabase row (it does not clean up storage assets by default, but you can extend `deleteVideoGeneration()` to do so).

Throughout the process, extensive `console.log` output helps track API calls when running the app locally with developer tools open.

## Supabase schema & migrations

The SQL migrations under [`supabase/migrations`](supabase/migrations) define the backend resources required by the UI:

| Migration | Purpose |
|-----------|---------|
| [`20251021163127_create_video_generations_table.sql`](supabase/migrations/20251021163127_create_video_generations_table.sql) | Creates the `video_generations` table, indices, and permissive Row Level Security policies for development use.
| [`20251021172516_create_video_storage_bucket.sql`](supabase/migrations/20251021172516_create_video_storage_bucket.sql) | Sets up the public `video_files` storage bucket with relaxed read/write policies.
| [`20251023173149_add_image_upload_support.sql`](supabase/migrations/20251023173149_add_image_upload_support.sql) | Adds `image_url` and `image_filename` columns so uploads can be associated with a generation.
| [`20251023173209_create_image_storage_bucket.sql`](supabase/migrations/20251023173209_create_image_storage_bucket.sql) | Creates the `image_files` storage bucket to hold optional starter images.

Run these migrations in your Supabase project to mirror the schema used by the application. The generous policies are intended for single-user development; tighten them before deploying to a multi-user environment.

## Environment configuration

Create a `.env` file (or export environment variables) with the following Vite/Supabase settings before running the app:

```bash
VITE_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
```

At runtime the UI will prompt for your **OpenAI API key** (must have Sora 2 access). The key never leaves the browser – it is stored in `localStorage` and used to sign requests directly from the front end.

## Developing locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Open the displayed local URL. Enter your OpenAI API key when prompted and begin generating videos.
4. (Optional) Run linting or type checks:
   ```bash
   npm run lint
   npm run typecheck
   ```

Because the app speaks directly to OpenAI and Supabase from the browser, make sure CORS settings in Supabase allow requests from your dev host (Vite defaults to `http://localhost:5173`).

## Extending the app

Here are a few common customization points:

* **Add new Sora options** – extend `RESOLUTION_OPTIONS`, `DURATION_OPTIONS`, or `MODEL_OPTIONS` in [`src/lib/sora-api.ts`](src/lib/sora-api.ts) and surface them in [`VideoGenerationForm`](src/components/VideoGenerationForm.tsx).
* **Enhance history filters** – adjust the query in `VideoService.listVideoGenerations()` or add new API endpoints to sort/filter by status, date range, or prompt text.
* **Tighten security** – update the Supabase migrations to enforce per-user access (add `user_id` columns, bind policies to `auth.uid()`, restrict storage writes, etc.).
* **Automate cleanup** – extend `deleteVideoGeneration()` to remove associated video/image files from Supabase storage.

Armed with this overview you should be able to explore the codebase, run the tool, and evolve it to fit your workflow.
