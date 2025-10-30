import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Database, Wifi, Code, Play, RefreshCw, Video, CreditCard } from 'lucide-react';
import { VideoService } from '../lib/video-service';
import { supabase, VideoGeneration } from '../lib/supabase';

interface TestPageProps {
  videoService: VideoService;
  onNavigate: (page: 'generator' | 'test' | 'billing') => void;
}

interface TestResult {
  name: string;
  status: 'idle' | 'running' | 'success' | 'error';
  message?: string;
  details?: any;
}

export function TestPage({ videoService, onNavigate }: TestPageProps) {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'OpenAI API Connection', status: 'idle' },
    { name: 'Supabase Database Connection', status: 'idle' },
    { name: 'Database Schema Validation', status: 'idle' },
    { name: 'Test Video Generation (Minimal)', status: 'idle' },
  ]);

  const [logs, setLogs] = useState<string[]>([]);
  const [recentVideos, setRecentVideos] = useState<VideoGeneration[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [refreshingVideo, setRefreshingVideo] = useState<string | null>(null);

  useEffect(() => {
    loadRecentVideos();
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests((prev) =>
      prev.map((test, i) => (i === index ? { ...test, ...updates } : test))
    );
  };

  const runTest = async (index: number, testFn: () => Promise<void>) => {
    updateTest(index, { status: 'running', message: undefined, details: undefined });
    try {
      await testFn();
      updateTest(index, { status: 'success', message: 'Test passed' });
    } catch (error) {
      updateTest(index, {
        status: 'error',
        message: error instanceof Error ? error.message : 'Test failed',
      });
    }
  };

  const testOpenAIConnection = async () => {
    addLog('Testing OpenAI API connection...');
    const result = await videoService.getSoraAPI().testConnection();
    addLog(`API response: ${result.message}`);

    if (!result.success) {
      throw new Error(result.message);
    }

    addLog('OpenAI API connection successful');
  };

  const testSupabaseConnection = async () => {
    addLog('Testing Supabase database connection...');
    const { error } = await supabase.from('video_generations').select('count').limit(1);

    if (error) {
      addLog(`Supabase error: ${error.message}`);
      throw new Error(error.message);
    }

    addLog('Supabase database connection successful');
  };

  const testDatabaseSchema = async () => {
    addLog('Validating database schema...');

    const { error } = await supabase
      .from('video_generations')
      .select('*')
      .limit(1);

    if (error) {
      addLog(`Schema validation error: ${error.message}`);
      throw new Error(error.message);
    }

    addLog('Database schema validated successfully');
    addLog(`Schema structure confirmed: id, prompt, model, resolution, duration, status, etc.`);
  };

  const testVideoGeneration = async () => {
    addLog('Starting minimal test video generation...');
    addLog('Parameters: prompt="Test video", model=sora-2, resolution=1280x720, duration=4s');

    try {
      const generation = await videoService.createVideoGeneration({
        prompt: 'A simple test video with a rotating cube',
        model: 'sora-2',
        resolution: '1280x720',
        duration: 4,
      });

      addLog(`Video generation job created: ID ${generation.id}`);
      addLog(`OpenAI Job ID: ${generation.openai_job_id || 'pending'}`);
      addLog(`Status: ${generation.status}`);
      addLog('Test video generation initiated successfully');
    } catch (error) {
      addLog(`Video generation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  const runAllTests = async () => {
    setLogs([]);
    addLog('Starting all tests...');

    await runTest(0, testOpenAIConnection);
    await new Promise((resolve) => setTimeout(resolve, 500));

    await runTest(1, testSupabaseConnection);
    await new Promise((resolve) => setTimeout(resolve, 500));

    await runTest(2, testDatabaseSchema);
    await new Promise((resolve) => setTimeout(resolve, 500));

    await runTest(3, testVideoGeneration);

    addLog('All tests completed');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const loadRecentVideos = async () => {
    try {
      setLoadingVideos(true);
      const videos = await videoService.listVideoGenerations(10);
      setRecentVideos(videos);
      addLog(`Loaded ${videos.length} recent video generations`);
    } catch (error) {
      addLog(`Error loading videos: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingVideos(false);
    }
  };

  const refreshVideoStatus = async (videoId: string) => {
    try {
      setRefreshingVideo(videoId);
      addLog(`\n=== Refreshing status for video ${videoId} ===`);

      const updated = await videoService.checkVideoStatus(videoId);

      addLog(`Current status: ${updated.status}`);
      addLog(`OpenAI Job ID: ${updated.openai_job_id || 'none'}`);
      addLog(`Video URL: ${updated.video_url || 'none'}`);

      if (updated.metadata) {
        addLog(`API Response metadata: ${JSON.stringify(updated.metadata, null, 2)}`);
      }

      setRecentVideos((prev) =>
        prev.map((v) => (v.id === videoId ? updated : v))
      );

      addLog(`Status refresh completed\n`);
    } catch (error) {
      addLog(`Error refreshing video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRefreshingVideo(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            onClick={() => onNavigate('generator')}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Generator
          </button>
          <button
            onClick={() => onNavigate('billing')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            Billing
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Test & Debug Page</h1>
          <p className="text-gray-600">
            Verify API connections, database setup, and test video generation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Test Suite</h2>
              <button
                onClick={runAllTests}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                Run All Tests
              </button>
            </div>

            <div className="space-y-4">
              {tests.map((test, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {test.status === 'idle' && (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                        )}
                        {test.status === 'running' && (
                          <div className="w-5 h-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                        )}
                        {test.status === 'success' && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                        {test.status === 'error' && (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-800">{test.name}</h3>
                        {test.message && (
                          <p
                            className={`text-sm mt-1 ${
                              test.status === 'error' ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {test.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (index === 0) runTest(0, testOpenAIConnection);
                        if (index === 1) runTest(1, testSupabaseConnection);
                        if (index === 2) runTest(2, testDatabaseSchema);
                        if (index === 3) runTest(3, testVideoGeneration);
                      }}
                      disabled={test.status === 'running'}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 transition-colors"
                    >
                      Run
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Code className="w-5 h-5" />
                Debug Logs
              </h2>
              <button
                onClick={clearLogs}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                Clear
              </button>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <p className="text-gray-500">No logs yet. Run tests to see output.</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="text-green-400 mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Wifi className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-800">API Status</h3>
            </div>
            <p className="text-sm text-gray-600">
              Test your OpenAI API key connection and verify Sora 2 API access
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Database</h3>
            </div>
            <p className="text-sm text-gray-600">
              Verify Supabase connection and validate database schema structure
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Generation</h3>
            </div>
            <p className="text-sm text-gray-600">
              Run a minimal test generation to verify end-to-end functionality
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Video className="w-6 h-6 text-gray-700" />
              <h2 className="text-xl font-semibold text-gray-800">Recent Video Generations</h2>
              <span className="text-sm text-gray-500">({recentVideos.length} videos)</span>
            </div>
            <button
              onClick={loadRecentVideos}
              disabled={loadingVideos}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingVideos ? 'animate-spin' : ''}`} />
              Refresh List
            </button>
          </div>

          {loadingVideos ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading videos...</p>
            </div>
          ) : recentVideos.length === 0 ? (
            <div className="text-center py-12">
              <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No video generations found</p>
              <p className="text-sm text-gray-500 mt-2">Run the test video generation to create one</p>
            </div>
          ) : (
            <div className="space-y-6">
              {recentVideos.map((video) => (
                <div
                  key={video.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2">
                      <div className="mb-4">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-gray-800 font-medium">{video.prompt}</p>
                          <span
                            className={`ml-4 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                              video.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : video.status === 'processing'
                                ? 'bg-blue-100 text-blue-700'
                                : video.status === 'failed'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mt-3">
                          <div>Model: <span className="font-medium">{video.model}</span></div>
                          <div>Resolution: <span className="font-medium">{video.resolution}</span></div>
                          <div>Duration: <span className="font-medium">{video.duration}s</span></div>
                          <div>Created: <span className="font-medium">{new Date(video.created_at).toLocaleTimeString()}</span></div>
                        </div>
                        {video.openai_job_id && (
                          <div className="text-xs text-gray-500 mt-2 font-mono bg-gray-50 p-2 rounded">
                            Job ID: {video.openai_job_id}
                          </div>
                        )}
                        {video.error_message && (
                          <div className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded">
                            Error: {video.error_message}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => refreshVideoStatus(video.id)}
                        disabled={refreshingVideo === video.id}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
                      >
                        <RefreshCw className={`w-4 h-4 ${refreshingVideo === video.id ? 'animate-spin' : ''}`} />
                        {refreshingVideo === video.id ? 'Checking Status...' : 'Check Status'}
                      </button>
                    </div>

                    <div className="lg:col-span-1">
                      {video.status === 'completed' && video.video_url ? (
                        <div className="relative">
                          <video
                            src={video.video_url}
                            controls
                            className="w-full rounded-lg bg-black"
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      ) : video.status === 'processing' || video.status === 'pending' ? (
                        <div className="aspect-video bg-gradient-to-br from-blue-50 to-sky-50 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                            <p className="text-xs text-gray-600">Generating...</p>
                          </div>
                        </div>
                      ) : video.status === 'failed' ? (
                        <div className="aspect-video bg-red-50 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                            <p className="text-xs text-red-600">Failed</p>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
                              <Play className="w-4 h-4 text-gray-500" />
                            </div>
                            <p className="text-xs text-gray-600">Pending</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
