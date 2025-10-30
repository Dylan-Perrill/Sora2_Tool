import { useEffect, useState } from 'react';
import { ArrowLeft, CreditCard, DollarSign, History, Loader2, TestTube, Video } from 'lucide-react';
import { BillingService, Account, PricingTier, TransactionRecord, calculatePrice } from '../lib/billing-service';
import { Toast, ToastType } from '../components/Toast';
import { Resolution, SoraModel, VideoDuration } from '../lib/sora-api';

interface BillingPageProps {
  billingService: BillingService;
  account: Account | null;
  pricing: PricingTier[];
  onNavigate: (page: 'generator' | 'test' | 'billing') => void;
  onAccountUpdated: () => Promise<void>;
}

interface ToastState {
  message: string;
  type: ToastType;
}

interface PricingRow {
  model: SoraModel;
  resolution: Resolution;
  duration: VideoDuration;
  price: number | null;
}

const ORDERED_MODELS: SoraModel[] = ['sora-2', 'sora-2-pro'];
const ORDERED_RESOLUTIONS: Resolution[] = [
  '1280x720',
  '720x1280',
  '1792x1024',
  '1024x1792',
];
const ORDERED_DURATIONS: VideoDuration[] = [4, 8, 12];

export function BillingPage({
  billingService,
  account,
  pricing,
  onNavigate,
  onAccountUpdated,
}: BillingPageProps) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [amount, setAmount] = useState('5.00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    loadTransactions();
  }, [billingService]);

  const loadTransactions = async () => {
    try {
      setLoadingTransactions(true);
      const data = await billingService.getTransactions(50);
      setTransactions(data);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to load transactions',
        'error'
      );
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number.parseFloat(amount);

    if (Number.isNaN(numericAmount)) {
      showToast('Enter a valid deposit amount', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await billingService.createDeposit(numericAmount, 'Manual deposit');
      await onAccountUpdated();
      await loadTransactions();
      showToast('Deposit successful!', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to complete deposit',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  const pricingRows: PricingRow[] = [];
  for (const model of ORDERED_MODELS) {
    for (const resolution of ORDERED_RESOLUTIONS) {
      if (model === 'sora-2' && (resolution === '1792x1024' || resolution === '1024x1792')) {
        continue;
      }
      for (const duration of ORDERED_DURATIONS) {
        pricingRows.push({
          model,
          resolution,
          duration,
          price: calculatePrice(pricing, { model, resolution, duration }),
        });
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => onNavigate('generator')}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Generator
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => onNavigate('test')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <TestTube className="w-4 h-4" />
              Test Page
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
              <CreditCard className="w-4 h-4" />
              Billing
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <section className="bg-white rounded-2xl shadow-xl p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Account Balance</h1>
            <p className="text-gray-600 mb-6">
              Keep your wallet topped up to generate videos instantly. Minimum deposit is $5.00.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">Current Balance</p>
                <p className="text-3xl font-bold text-blue-900">
                  {account ? `$${account.balance.toFixed(2)} ${account.currency}` : 'Loading...'}
                </p>
              </div>
              <Video className="w-12 h-12 text-blue-400" />
            </div>
          </div>

          <form onSubmit={handleDeposit} className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-4">
            <div>
              <label htmlFor="deposit" className="block text-sm font-semibold text-gray-700 mb-2">
                Deposit Amount
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-gray-500">
                  <DollarSign className="w-4 h-4" />
                </span>
                <input
                  id="deposit"
                  type="number"
                  min={5}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter amount"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">Minimum deposit $5.00. Funds are available immediately.</p>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              {isSubmitting ? 'Processing...' : 'Add Funds'}
            </button>
          </form>
        </section>

        <section className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-800">Pricing by Model & Duration</h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Model
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Resolution
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Duration (s)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pricingRows.map((row, index) => (
                  <tr key={`${row.model}-${row.resolution}-${row.duration}-${index}`}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {row.model === 'sora-2' ? 'Sora 2' : 'Sora 2 Pro'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.resolution}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.duration}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                      {row.price !== null ? `$${row.price.toFixed(2)}` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <History className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">Recent Transactions</h2>
          </div>

          {loadingTransactions ? (
            <div className="py-12 text-center text-gray-500">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No transactions yet. Make a deposit to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="border border-gray-200 rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {transaction.type === 'deposit'
                        ? 'Deposit'
                        : transaction.type === 'charge'
                        ? 'Video Generation Charge'
                        : 'Refund'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(transaction.created_at).toLocaleString()}
                    </p>
                    {transaction.description && (
                      <p className="text-xs text-gray-500 mt-1">{transaction.description}</p>
                    )}
                  </div>
                  <div
                    className={`text-lg font-semibold ${
                      transaction.type === 'charge' ? 'text-red-500' : 'text-green-600'
                    }`}
                  >
                    {transaction.type === 'charge' ? '-' : '+'}${transaction.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
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
