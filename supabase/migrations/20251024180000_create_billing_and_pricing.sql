-- Create pricing tiers table for model, resolution, and duration-specific pricing
create table if not exists pricing_tiers (
  id bigserial primary key,
  model text not null,
  resolution text not null,
  duration_seconds integer not null,
  price numeric(10,2) not null,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  unique (model, resolution, duration_seconds)
);

create index if not exists pricing_tiers_model_resolution_idx
  on pricing_tiers (model, resolution);

-- Seed initial pricing data reflecting different prices per model, resolution, and duration
insert into pricing_tiers (model, resolution, duration_seconds, price)
values
  ('sora-2', '1280x720', 4, 1.20),
  ('sora-2', '1280x720', 8, 1.80),
  ('sora-2', '1280x720', 12, 2.40),
  ('sora-2', '720x1280', 4, 1.20),
  ('sora-2', '720x1280', 8, 1.80),
  ('sora-2', '720x1280', 12, 2.40),
  ('sora-2-pro', '1280x720', 4, 1.80),
  ('sora-2-pro', '1280x720', 8, 2.40),
  ('sora-2-pro', '1280x720', 12, 3.20),
  ('sora-2-pro', '720x1280', 4, 1.80),
  ('sora-2-pro', '720x1280', 8, 2.40),
  ('sora-2-pro', '720x1280', 12, 3.20),
  ('sora-2-pro', '1792x1024', 4, 2.60),
  ('sora-2-pro', '1792x1024', 8, 3.40),
  ('sora-2-pro', '1792x1024', 12, 4.20),
  ('sora-2-pro', '1024x1792', 4, 2.60),
  ('sora-2-pro', '1024x1792', 8, 3.40),
  ('sora-2-pro', '1024x1792', 12, 4.20)
  on conflict do nothing;

-- Create enum for transaction types
create type transaction_type as enum ('deposit', 'charge', 'refund');

-- Accounts table keyed by hashed API key
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  api_key_hash text not null unique,
  currency text not null default 'USD',
  balance numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists accounts_api_key_hash_idx
  on accounts (api_key_hash);

create or replace function set_accounts_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists accounts_set_updated_at on accounts;
create trigger accounts_set_updated_at
before update on accounts
for each row execute function set_accounts_updated_at();

-- Transactions table with automatic balance adjustments
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  type transaction_type not null,
  amount numeric(12,2) not null check (amount > 0),
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint min_deposit_amount check (
    type <> 'deposit' or amount >= 5
  )
);

create index if not exists transactions_account_created_at_idx
  on transactions (account_id, created_at desc);

create or replace function apply_transaction_to_account()
returns trigger as $$
declare
  delta numeric(12,2);
begin
  if new.type = 'deposit' then
    delta := new.amount;
  elsif new.type = 'charge' then
    delta := -new.amount;
  elsif new.type = 'refund' then
    delta := new.amount;
  else
    delta := 0;
  end if;

  update accounts
    set balance = balance + delta,
        updated_at = now()
  where id = new.account_id;

  return new;
end;
$$ language plpgsql;

drop trigger if exists transactions_apply_balance on transactions;
create trigger transactions_apply_balance
after insert on transactions
for each row execute function apply_transaction_to_account();
