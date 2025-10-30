import { useState, useEffect } from 'react';
import { ApiKeyInput } from './components/ApiKeyInput';
import { GeneratorPage } from './pages/GeneratorPage';
import { TestPage } from './pages/TestPage';
import { BillingPage } from './pages/BillingPage';
import { VideoService } from './lib/video-service';
import { BillingService, Account, PricingTier } from './lib/billing-service';

type Page = 'generator' | 'test' | 'billing';

function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [videoService, setVideoService] = useState<VideoService | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('generator');
  const [billingService, setBillingService] = useState<BillingService | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [pricing, setPricing] = useState<PricingTier[]>([]);

  useEffect(() => {
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey) {
      setApiKey(storedKey);
      setVideoService(new VideoService(storedKey));
    }
  }, []);

  useEffect(() => {
    if (!apiKey) {
      setBillingService(null);
      setAccount(null);
      return;
    }

    const service = new BillingService(apiKey);
    setBillingService(service);
    let isMounted = true;

    const loadBilling = async () => {
      try {
        const [accountData, pricingData] = await Promise.all([
          service.ensureAccount(),
          service.getPricing(),
        ]);

        if (isMounted) {
          setAccount(accountData);
          setPricing(pricingData);
        }
      } catch (error) {
        console.error('Failed to load billing details', error);
      } finally {
        // no-op
      }
    };

    loadBilling();

    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  const handleApiKeySubmit = (key: string) => {
    setApiKey(key);
    setVideoService(new VideoService(key));
  };

  const refreshAccount = async () => {
    if (!billingService) {
      return;
    }

    try {
      const latest = await billingService.getAccount();
      setAccount(latest);
    } catch (error) {
      console.error('Failed to refresh account', error);
    }
  };

  if (!apiKey || !videoService) {
    return <ApiKeyInput onSubmit={handleApiKeySubmit} />;
  }

  if (currentPage === 'billing') {
    if (!billingService) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
          Loading billing tools...
        </div>
      );
    }

    return (
      <BillingPage
        billingService={billingService}
        account={account}
        pricing={pricing}
        onNavigate={setCurrentPage}
        onAccountUpdated={refreshAccount}
      />
    );
  }

  if (currentPage === 'test') {
    return <TestPage videoService={videoService} onNavigate={setCurrentPage} />;
  }

  return (
    <GeneratorPage
      videoService={videoService}
      billingService={billingService}
      account={account}
      pricing={pricing}
      onNavigate={setCurrentPage}
      onAccountUpdated={refreshAccount}
    />
  );
}

export default App;
