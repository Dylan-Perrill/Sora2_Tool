import { useState, useEffect } from 'react';
import { ApiKeyInput } from './components/ApiKeyInput';
import { GeneratorPage } from './pages/GeneratorPage';
import { TestPage } from './pages/TestPage';
import { VideoService } from './lib/video-service';

type Page = 'generator' | 'test';

function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [videoService, setVideoService] = useState<VideoService | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('generator');

  useEffect(() => {
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey) {
      setApiKey(storedKey);
      setVideoService(new VideoService(storedKey));
    }
  }, []);

  const handleApiKeySubmit = (key: string) => {
    const normalizedKey = key.trim();
    localStorage.setItem('openai_api_key', normalizedKey);
    setApiKey(normalizedKey);
    setVideoService(new VideoService(normalizedKey));
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
