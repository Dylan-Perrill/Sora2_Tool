import { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  TrendingUp,
  TrendingDown,
  Clock,
  CreditCard,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { AccountService, Transaction } from '../lib/account-service';
import { Toast, ToastType } from '../components/Toast';

interface AccountPageProps {
  onNavigateBack: () => void;
}

interface ToastState {
  message: string;
  type: ToastType;
}

export function AccountPage({ onNavigateBack }: AccountPageProps) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const accountService = new AccountService();

  useEffect(() => {
    if (user) {
      loadAccountData();
    }
  }, [user]);

  const loadAccountData = async () => {
    if (!user) return;

    try {
      const [accountBalance, txHistory] = await Promise.all([
        accountService.getBalance(user.id),
        accountService.getTransactions(user.id, 20),
      ]);

      setBalance(accountBalance);
      setTransactions(txHistory);
    } catch (error) {
      showToast('Failed to load account data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!user) return;

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < 10) {
      showToast('Minimum deposit is $10', 'error');
      return;
    }

    if (amount > 10000) {
      showToast('Maximum deposit is $10,000', 'error');
      return;
    }

    setDepositing(true);

    try {
      await accountService.deposit(user.id, amount, 'manual', `manual-${Date.now()}`);
      await loadAccountData();
      setShowDepositModal(false);
      setDepositAmount('');
      showToast(`Successfully deposited $${amount.toFixed(2)}`, 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to process deposit',
        'error'
      );
    } finally {
      setDepositing(false);
    }
  };

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'charge':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      case 'refund':
        return <TrendingUp className="w-5 h-5 text-blue-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
      </div>
    );
  }

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
              <Wallet className="w-8 h-8 text-slate-800" />
              <h1 className="text-2xl font-bold text-gray-800">Account</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Current Balance</p>
              <p className="text-4xl font-bold text-gray-800">${balance.toFixed(2)}</p>
            </div>
            <button
              onClick={() => setShowDepositModal(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-lg transition-all shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              Add Funds
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Total Deposits</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                $
                {transactions
                  .filter((t) => t.type === 'deposit')
                  .reduce((sum, t) => sum + Number(t.amount), 0)
                  .toFixed(2)}
              </p>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700 mb-1">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm font-medium">Total Spent</span>
              </div>
              <p className="text-2xl font-bold text-red-900">
                $
                {Math.abs(
                  transactions
                    .filter((t) => t.type === 'charge')
                    .reduce((sum, t) => sum + Number(t.amount), 0)
                ).toFixed(2)}
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-700 mb-1">
                <CreditCard className="w-4 h-4" />
                <span className="text-sm font-medium">Transactions</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{transactions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Transaction History</h2>

          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{transaction.description}</p>
                      <p className="text-sm text-gray-500">{formatDate(transaction.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-semibold ${
                        Number(transaction.amount) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {Number(transaction.amount) >= 0 ? '+' : ''}$
                      {Number(transaction.amount).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Balance: ${Number(transaction.balance_after).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showDepositModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Add Funds</h2>

            <div className="mb-6">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Deposit Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                  $
                </span>
                <input
                  id="amount"
                  type="number"
                  min="10"
                  max="10000"
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent text-lg"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">Minimum: $10.00 | Maximum: $10,000.00</p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">
                This is a demo deposit interface. In production, this would integrate with a
                payment gateway like Stripe or PayPal.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDepositModal(false);
                  setDepositAmount('');
                }}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeposit}
                disabled={depositing}
                className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {depositing ? 'Processing...' : 'Deposit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
