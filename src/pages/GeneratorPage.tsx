import { useState, useEffect } from 'react';
import { Video, History, TestTube, RefreshCw } from 'lucide-react';
import { VideoService } from '../lib/video-service';
import { VideoGeneration } from '../lib/supabase';
import { VideoGenerationForm } from '../components/VideoGenerationForm';
import { VideoPlayer } from '../components/VideoPlayer';
import { Toast, ToastType } from '../components/Toast';
import { SoraModel, Resolution, VideoDuration } from '../lib/sora-api';

interface GeneratorPageProps {
  videoService: VideoService;
  onNavigate: (page: 'generator' | 'test') => void;
}

interface ToastState {
  message: string;
  type: ToastType;
}

export function GeneratorPage({ videoService, onNavigate }: GeneratorPageProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generations, setGenerations] = useState<VideoGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);

  useEffect(() => {
    loadGenerations();
    const interval = setInterval(() => {
      checkPendingGenerations();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadGenerations = async () => {
    try {
      const data = await videoService.listVideoGenerations();
      setGenerations(data);
    } catch (error) {
      showToast('Failed to load video history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const checkPendingGenerations = async () => {
    const pending = generations.filter(
      (g) => g.status === 'processing' || g.status === 'pending'
    );

    if (pending.length === 0) {
      return;
    }

    console.log(`[GeneratorPage] Checking status for ${pending.length} pending videos...`);
    setLastCheckTime(new Date());

    for (const gen of pending) {
      try {
        console.log(`[GeneratorPage] Checking video ${gen.id} (Job: ${gen.openai_job_id})`);
        const updated = await videoService.checkVideoStatus(gen.id);
        setGenerations((prev) =>
          prev.map((g) => (g.id === updated.id ? updated : g))
        );

        if (updated.status === 'completed' && gen.status !== 'completed') {
          console.log(`[GeneratorPage] Video ${gen.id} completed!`);
          showToast('Video generation completed!', 'success');
        } else if (updated.status === 'failed' && gen.status !== 'failed') {
          console.log(`[GeneratorPage] Video ${gen.id} failed`);
          showToast('Video generation failed', 'error');
        }
      } catch (error) {
        console.error('[GeneratorPage] Error checking status:', error);
      }
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    console.log('[GeneratorPage] Manual refresh triggered');
    try {
      await checkPendingGenerations();
      showToast('Status refreshed', 'success');
    } catch (error) {
      showToast('Failed to refresh status', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleGenerate = async (params: {
    prompt: string;
    model: SoraModel;
    resolution: Resolution;
    duration: VideoDuration;
    imageFile?: File;
  }) => {
    setIsGenerating(true);
    try {
      const { imageFile, ...requestParams } = params;
      const generation = await videoService.createVideoGeneration(requestParams, imageFile);
      setGenerations((prev) => [generation, ...prev]);
      showToast('Video generation started!', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to start video generation',
        'error'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this video generation?')) {
      return;
    }

    try {
      await videoService.deleteVideoGeneration(id);
      setGenerations((prev) => prev.filter((g) => g.id !== id));
      showToast('Video generation deleted', 'success');
    } catch (error) {
      showToast('Failed to delete video generation', 'error');
    }
  };

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Video className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Sora 2 Generator</h1>
            </div>
            <button
              onClick={() => onNavigate('test')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <TestTube className="w-4 h-4" />
              Test Page
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Create New Video</h2>
          <VideoGenerationForm onSubmit={handleGenerate} isGenerating={isGenerating} />
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-gray-700" />
            <h2 className="text-xl font-semibold text-gray-800">Video History</h2>
            <span className="text-sm text-gray-500">({generations.length} total)</span>
            {lastCheckTime && (
              <span className="text-xs text-gray-400">
                Last check: {lastCheckTime.toLocaleTimeString()}
              </span>
            )}
          </div>
          {generations.some((g) => g.status === 'processing' || g.status === 'pending') && (
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Checking...' : 'Refresh Status'}
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading videos...</p>
          </div>
        ) : generations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No videos yet</h3>
            <p className="text-gray-500">Generate your first video to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {generations.map((generation) => (
              <VideoPlayer
                key={generation.id}
                generation={generation}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
