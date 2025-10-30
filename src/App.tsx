import { useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth-context';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { GeneratorPage } from './pages/GeneratorPage';
import { AccountPage } from './pages/AccountPage';
import { SettingsPage } from './pages/SettingsPage';
import { TestPage } from './pages/TestPage';
import { VideoService } from './lib/video-service';

type Page = 'login' | 'signup' | 'generator' | 'test' | 'account' | 'settings';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('generator');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-slate-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (currentPage === 'signup') {
      return <SignupPage onNavigateToLogin={() => setCurrentPage('login')} />;
    }
    return <LoginPage onNavigateToSignup={() => setCurrentPage('signup')} />;
  }

  if (!profile?.openai_api_key) {
    return <SettingsPage onNavigateBack={() => setCurrentPage('generator')} />;
  }

  const videoService = new VideoService(profile.openai_api_key);

  if (currentPage === 'account') {
    return <AccountPage onNavigateBack={() => setCurrentPage('generator')} />;
  }

  if (currentPage === 'settings') {
    return <SettingsPage onNavigateBack={() => setCurrentPage('generator')} />;
  }

  if (currentPage === 'test') {
    return <TestPage videoService={videoService} onNavigate={setCurrentPage} />;
  }

  return <GeneratorPage videoService={videoService} onNavigate={setCurrentPage} />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
