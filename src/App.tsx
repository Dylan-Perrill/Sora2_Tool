import { useState, useEffect } from 'react';
import { ApiKeyInput } from './components/ApiKeyInput';
import { GeneratorPage } from './pages/GeneratorPage';
import { TestPage } from './pages/TestPage';
import { VideoService } from './lib/video-service';

type Page = 'generator' | 'test';

const normalizeApiKey = (key: string | null | undefined) => key?.trim() || '';

function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [videoService, setVideoService] = useState<VideoService | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('generator');

  useEffect(() => {
    const storedKey = normalizeApiKey(localStorage.getItem('openai_api_key'));
    if (storedKey) {
      localStorage.setItem('openai_api_key', storedKey);
      setApiKey(storedKey);
    } else {
      localStorage.removeItem('openai_api_key');
    }
  }, []);

  useEffect(() => {
    if (!apiKey) {
      setVideoService(null);
      return;
    }

    try {
      setVideoService(new VideoService(apiKey));
    } catch (error) {
      console.error('Failed to initialize video service with provided API key:', error);
      setVideoService(null);
    }
  }, [apiKey]);

  const handleApiKeySubmit = (key: string) => {
    const normalizedKey = normalizeApiKey(key);

    if (!normalizedKey) {
      localStorage.removeItem('openai_api_key');
      setApiKey(null);
      setVideoService(null);
      return;
    }

    localStorage.setItem('openai_api_key', normalizedKey);
    setApiKey(normalizedKey);
  };

  const handleLogout = () => {
    localStorage.removeItem('openai_api_key');
    setApiKey(null);
    setVideoService(null);
    setCurrentPage('generator');
  };

  if (!apiKey || !videoService) {
    return <ApiKeyInput onSubmit={handleApiKeySubmit} />;
  }

  return (
    <>
      {currentPage === 'generator' ? (
        <GeneratorPage
          videoService={videoService}
          onNavigate={setCurrentPage}
          onLogout={handleLogout}
        />
      ) : (
        <TestPage
          videoService={videoService}
          onNavigate={setCurrentPage}
          onLogout={handleLogout}
        />
      )}
    </>
  );
}

export default App;
