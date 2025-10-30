import { useState, useEffect } from 'react';
import { Settings, Key, Eye, EyeOff, Save, ArrowLeft } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { Toast, ToastType } from '../components/Toast';

interface SettingsPageProps {
  onNavigateBack: () => void;
}

interface ToastState {
  message: string;
  type: ToastType;
}

export function SettingsPage({ onNavigateBack }: SettingsPageProps) {
  const { profile, updateProfile, refreshProfile } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (profile?.openai_api_key) {
      setApiKey(profile.openai_api_key);
    }
  }, [profile]);

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!apiKey.trim()) {
      showToast('API key cannot be empty', 'error');
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      showToast('Invalid API key format. OpenAI keys start with "sk-"', 'error');
      return;
    }

    setSaving(true);

    try {
      await updateProfile({ openai_api_key: apiKey.trim() });
      await refreshProfile();
      showToast('API key saved successfully', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to save API key', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onNavigateBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <Settings className="w-8 h-8 text-slate-800" />
              <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Account Information</h2>
            <p className="text-sm text-gray-600">Manage your account details</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
              <input
                type="text"
                value={profile?.id || ''}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed font-mono text-sm"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Key className="w-5 h-5" />
              OpenAI API Key
            </h2>
            <p className="text-sm text-gray-600">
              Your API key is required to generate videos using the Sora API
            </p>
          </div>

          <form onSubmit={handleSaveApiKey} className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <div className="relative">
                <input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Your API key is stored securely and never shared. Get your key from{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-800 underline font-medium"
                >
                  platform.openai.com/api-keys
                </a>
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Important:</strong> Keep your API key secure. Anyone with access to your
                key can use your OpenAI account and incur charges.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save API Key'}
            </button>
          </form>
        </div>
      </main>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
