import { useState, useEffect } from 'react';
import { Video, Sparkles, Clock, Monitor, Image, X } from 'lucide-react';
import {
  SoraModel,
  Resolution,
  VideoDuration,
  RESOLUTION_OPTIONS,
  DURATION_OPTIONS,
  MODEL_OPTIONS,
} from '../lib/sora-api';

interface VideoGenerationFormProps {
  onSubmit: (params: {
    prompt: string;
    model: SoraModel;
    resolution: Resolution;
    duration: VideoDuration;
    imageFile?: File;
  }) => void;
  isGenerating: boolean;
}

export function VideoGenerationForm({ onSubmit, isGenerating }: VideoGenerationFormProps) {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<SoraModel>('sora-2');
  const [resolution, setResolution] = useState<Resolution>('1280x720');
  const [duration, setDuration] = useState<VideoDuration>(4);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const availableResolutions = RESOLUTION_OPTIONS.filter(
    (option) => option.model.includes(model)
  );

  useEffect(() => {
    if (model === 'sora-2' && (resolution === '1792x1024' || resolution === '1024x1792')) {
      setResolution('1280x720');
    }
  }, [model, resolution]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    onSubmit({
      prompt: prompt.trim(),
      model,
      resolution,
      duration,
      imageFile: imageFile || undefined,
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        alert('Image file size must be less than 50MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const examplePrompts = [
    'A serene mountain landscape at sunset with golden light reflecting off a crystal-clear lake',
    'A futuristic city street with neon lights, flying cars, and holographic advertisements',
    'A close-up of a hummingbird hovering near a vibrant tropical flower in slow motion',
    'A cozy coffee shop interior with warm lighting, steam rising from fresh coffee, rainy window view',
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
          Video Description
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the video you want to generate in detail..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
          rows={4}
          disabled={isGenerating}
          required
        />
        <div className="mt-2">
          <p className="text-xs text-gray-500 mb-2">Try an example:</p>
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((example, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setPrompt(example)}
                className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
                disabled={isGenerating}
              >
                Example {index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
          <Image className="inline w-4 h-4 mr-1" />
          Starting Image (Optional)
        </label>
        {!imagePreview ? (
          <div className="relative">
            <input
              type="file"
              id="image"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleImageChange}
              disabled={isGenerating}
              className="hidden"
            />
            <label
              htmlFor="image"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <Image className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">Click to upload an image</span>
              <span className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP (Max 50MB)</span>
            </label>
          </div>
        ) : (
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-48 object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={isGenerating}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Upload an image to use as the starting frame or reference for your video
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
            <Sparkles className="inline w-4 h-4 mr-1" />
            Model
          </label>
          <select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value as SoraModel)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            disabled={isGenerating}
          >
            {MODEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {MODEL_OPTIONS.find((o) => o.value === model)?.description}
          </p>
        </div>

        <div>
          <label htmlFor="resolution" className="block text-sm font-medium text-gray-700 mb-2">
            <Monitor className="inline w-4 h-4 mr-1" />
            Resolution
          </label>
          <select
            id="resolution"
            value={resolution}
            onChange={(e) => setResolution(e.target.value as Resolution)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            disabled={isGenerating}
          >
            {availableResolutions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {model === 'sora-2' && (
            <p className="mt-1 text-xs text-gray-500">
              Higher resolutions require Sora 2 Pro
            </p>
          )}
        </div>

        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="inline w-4 h-4 mr-1" />
            Duration
          </label>
          <select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) as VideoDuration)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            disabled={isGenerating}
          >
            {DURATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={!prompt.trim() || isGenerating}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
      >
        <Video className="w-5 h-5" />
        {isGenerating ? 'Generating Video...' : 'Generate Video'}
      </button>
    </form>
  );
}
