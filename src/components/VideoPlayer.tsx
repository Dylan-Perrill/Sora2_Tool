import { VideoGeneration } from '../lib/supabase';
import { Download, Calendar, Clock, Monitor, Sparkles, Trash2 } from 'lucide-react';

interface VideoPlayerProps {
  generation: VideoGeneration;
  onDelete?: (id: string) => void;
}

export function VideoPlayer({ generation, onDelete }: VideoPlayerProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleDownload = () => {
    if (generation.video_url) {
      const link = document.createElement('a');
      link.href = generation.video_url;
      link.download = `sora-video-${generation.id}.mp4`;
      link.click();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
      {generation.status === 'completed' && generation.video_url ? (
        <div className="relative">
          <video
            src={generation.video_url}
            controls
            className="w-full aspect-video bg-black"
            poster=""
          >
            Your browser does not support the video tag.
          </video>
          <button
            onClick={handleDownload}
            className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-lg shadow-lg transition-all"
            title="Download video"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      ) : generation.status === 'processing' ? (
        <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Generating video...</p>
            <p className="text-sm text-gray-500 mt-1">This may take a few minutes</p>
          </div>
        </div>
      ) : generation.status === 'failed' ? (
        <div className="aspect-video bg-red-50 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">✕</span>
            </div>
            <p className="text-red-600 font-medium">Generation Failed</p>
            {generation.error_message && (
              <p className="text-sm text-red-500 mt-2">{generation.error_message}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="aspect-video bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-gray-600 font-medium">Pending</p>
          </div>
        </div>
      )}

      <div className="p-6">
        {generation.image_url && (
          <div className="mb-4">
            <img
              src={generation.image_url}
              alt="Starting image"
              className="w-full h-32 object-cover rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Starting image: {generation.image_filename}</p>
          </div>
        )}
        <div className="flex items-start justify-between mb-4">
          <p className="text-gray-800 leading-relaxed flex-1">{generation.prompt}</p>
          {onDelete && (
            <button
              onClick={() => onDelete(generation.id)}
              className="ml-4 text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete generation"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Sparkles className="w-4 h-4" />
            <span className="font-medium">{generation.model}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Monitor className="w-4 h-4" />
            <span className="font-medium">{generation.resolution}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <span className="font-medium">{generation.duration}s</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4" />
            <span className="font-medium text-xs">{formatDate(generation.created_at)}</span>
          </div>
        </div>

        {generation.status && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                generation.status === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : generation.status === 'processing'
                  ? 'bg-blue-100 text-blue-700'
                  : generation.status === 'failed'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {generation.status.charAt(0).toUpperCase() + generation.status.slice(1)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
