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
    setApiKey(key);
    setVideoService(new VideoService(key));
  };

  if (!apiKey || !videoService) {
    return <ApiKeyInput onSubmit={handleApiKeySubmit} />;
  }

  return (
    <>
      {currentPage === 'generator' ? (
        <GeneratorPage videoService={videoService} onNavigate={setCurrentPage} />
      ) : (
        <TestPage videoService={videoService} onNavigate={setCurrentPage} />
      )}
    </>
  );
}

export default App;
