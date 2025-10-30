import { supabase } from './supabase';
import { Resolution, SoraModel, VideoDuration } from './sora-api';

export type TransactionType = 'deposit' | 'charge' | 'refund';

export interface Account {
  id: string;
  api_key_hash: string;
  currency: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface TransactionRecord {
  id: string;
  account_id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface PricingTier {
  id: number;
  model: SoraModel;
  resolution: Resolution;
  duration_seconds: number;
  price: number;
  currency: string;
  created_at: string;
}

export interface PriceOptions {
  model: SoraModel;
  resolution: Resolution;
  duration: VideoDuration;
}

async function hashApiKey(apiKey: string): Promise<string> {
  const cryptoObj = globalThis.crypto;

  if (!cryptoObj?.subtle) {
    throw new Error('Secure hashing is not available in this environment');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function calculatePrice(
  pricing: PricingTier[],
  options: PriceOptions
): number | null {
  const tier = pricing.find(
    (item) =>
      item.model === options.model &&
      item.resolution === options.resolution &&
      item.duration_seconds === options.duration
  );

  return tier ? itemToNumber(tier.price) : null;
}

function itemToNumber(value: number | string): number {
  if (typeof value === 'number') {
    return value;
  }
  return Number.parseFloat(value);
}

function normalizeAccountRecord(data: any): Account {
  return {
    id: data.id,
    api_key_hash: data.api_key_hash,
    currency: data.currency,
    balance: itemToNumber(data.balance ?? 0),
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

function normalizeTransaction(data: any): TransactionRecord {
  return {
    id: data.id,
    account_id: data.account_id,
    type: data.type,
    amount: itemToNumber(data.amount ?? 0),
    description: data.description,
    metadata: typeof data.metadata === 'object' && data.metadata !== null ? data.metadata : {},
    created_at: data.created_at,
  };
}

function normalizePricingTier(data: any): PricingTier {
  return {
    id: data.id,
    model: data.model,
    resolution: data.resolution,
    duration_seconds: data.duration_seconds,
    price: itemToNumber(data.price ?? 0),
    currency: data.currency,
    created_at: data.created_at,
  };
}

export class BillingService {
  private apiKey: string;
  private apiKeyHashPromise: Promise<string> | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getApiKeyHash(): Promise<string> {
    if (!this.apiKeyHashPromise) {
      this.apiKeyHashPromise = hashApiKey(this.apiKey);
    }
    return this.apiKeyHashPromise;
  }

  async ensureAccount(): Promise<Account> {
    const hash = await this.getApiKeyHash();

    const { data: existing, error: fetchError } = await supabase
      .from('accounts')
      .select('*')
      .eq('api_key_hash', hash)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to load account: ${fetchError.message}`);
    }

    if (existing) {
      return normalizeAccountRecord(existing);
    }

    const { data, error } = await supabase
      .from('accounts')
      .insert({ api_key_hash: hash })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create account: ${error.message}`);
    }

    return normalizeAccountRecord(data);
  }

  async getAccount(): Promise<Account> {
    const hash = await this.getApiKeyHash();
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('api_key_hash', hash)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load account: ${error.message}`);
    }

    if (!data) {
      return this.ensureAccount();
    }

    return normalizeAccountRecord(data);
  }

  async getTransactions(limit: number = 25): Promise<TransactionRecord[]> {
    const account = await this.ensureAccount();

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to load transactions: ${error.message}`);
    }

    return (data || []).map(normalizeTransaction);
  }

  async getPricing(): Promise<PricingTier[]> {
    const { data, error } = await supabase
      .from('pricing_tiers')
      .select('*')
      .order('model', { ascending: true })
      .order('resolution', { ascending: true })
      .order('duration_seconds', { ascending: true });

    if (error) {
      throw new Error(`Failed to load pricing: ${error.message}`);
    }

    return (data || []).map(normalizePricingTier);
  }

  async createDeposit(amount: number, description?: string): Promise<TransactionRecord> {
    if (Number.isNaN(amount) || amount <= 0) {
      throw new Error('Deposit amount must be greater than zero');
    }

    if (amount < 5) {
      throw new Error('Minimum deposit is $5.00');
    }

    const account = await this.ensureAccount();

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        account_id: account.id,
        type: 'deposit',
        amount,
        description: description || 'Account deposit',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create deposit: ${error.message}`);
    }

    return normalizeTransaction(data);
  }

  async createCharge(
    amount: number,
    description: string,
    metadata?: Record<string, any>
  ): Promise<TransactionRecord> {
    if (Number.isNaN(amount) || amount <= 0) {
      throw new Error('Charge amount must be greater than zero');
    }

    const account = await this.ensureAccount();

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        account_id: account.id,
        type: 'charge',
        amount,
        description,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create charge: ${error.message}`);
    }

    return normalizeTransaction(data);
  }
}
