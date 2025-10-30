import { supabase } from './supabase';

export interface Account {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  type: 'deposit' | 'charge' | 'refund' | 'adjustment';
  amount: number;
  balance_after: number;
  description: string;
  video_generation_id: string | null;
  payment_provider: string | null;
  payment_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export class AccountService {
  async getAccount(userId: string): Promise<Account | null> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch account: ${error.message}`);
    }

    return data;
  }

  async getBalance(userId: string): Promise<number> {
    const account = await this.getAccount(userId);
    return account ? Number(account.balance) : 0;
  }

  async deposit(
    userId: string,
    amount: number,
    paymentProvider?: string,
    paymentId?: string
  ): Promise<Transaction> {
    const account = await this.getAccount(userId);
    if (!account) {
      throw new Error('Account not found');
    }

    const newBalance = Number(account.balance) + amount;

    const { error: updateError } = await supabase
      .from('accounts')
      .update({ balance: newBalance })
      .eq('id', account.id);

    if (updateError) {
      throw new Error(`Failed to update balance: ${updateError.message}`);
    }

    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        account_id: account.id,
        type: 'deposit',
        amount: amount,
        balance_after: newBalance,
        description: `Deposited $${amount.toFixed(2)}`,
        payment_provider: paymentProvider,
        payment_id: paymentId,
      })
      .select()
      .single();

    if (txError) {
      throw new Error(`Failed to record transaction: ${txError.message}`);
    }

    return transaction;
  }

  async charge(
    userId: string,
    amount: number,
    description: string,
    videoGenerationId?: string
  ): Promise<Transaction> {
    const account = await this.getAccount(userId);
    if (!account) {
      throw new Error('Account not found');
    }

    const currentBalance = Number(account.balance);
    if (currentBalance < amount) {
      throw new Error('Insufficient balance');
    }

    const newBalance = currentBalance - amount;

    const { error: updateError } = await supabase
      .from('accounts')
      .update({ balance: newBalance })
      .eq('id', account.id);

    if (updateError) {
      throw new Error(`Failed to update balance: ${updateError.message}`);
    }

    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        account_id: account.id,
        type: 'charge',
        amount: -amount,
        balance_after: newBalance,
        description,
        video_generation_id: videoGenerationId,
      })
      .select()
      .single();

    if (txError) {
      throw new Error(`Failed to record transaction: ${txError.message}`);
    }

    return transaction;
  }

  async refund(
    userId: string,
    amount: number,
    description: string,
    videoGenerationId?: string
  ): Promise<Transaction> {
    const account = await this.getAccount(userId);
    if (!account) {
      throw new Error('Account not found');
    }

    const newBalance = Number(account.balance) + amount;

    const { error: updateError } = await supabase
      .from('accounts')
      .update({ balance: newBalance })
      .eq('id', account.id);

    if (updateError) {
      throw new Error(`Failed to update balance: ${updateError.message}`);
    }

    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        account_id: account.id,
        type: 'refund',
        amount: amount,
        balance_after: newBalance,
        description,
        video_generation_id: videoGenerationId,
      })
      .select()
      .single();

    if (txError) {
      throw new Error(`Failed to record transaction: ${txError.message}`);
    }

    return transaction;
  }

  async getTransactions(
    userId: string,
    limit: number = 50
  ): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    return data || [];
  }
}
