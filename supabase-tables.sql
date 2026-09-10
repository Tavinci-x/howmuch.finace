-- HowMuch.Finance: Supabase Database Tables
-- Run this in your Supabase SQL Editor.

-- Transactions
create table if not exists transactions (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric not null,
  type text not null check (type in ('income', 'expense')),
  category_id text not null,
  currency text not null,
  date text not null,
  note text default '',
  created_at text not null
);

-- Accuracy and import lineage. Safe to run against an existing installation.
alter table transactions add column if not exists amount_minor bigint;
alter table transactions add column if not exists account_id text;
alter table transactions add column if not exists import_id text;
alter table transactions add column if not exists posted_date date;
alter table transactions add column if not exists raw_description text;
alter table transactions add column if not exists normalized_merchant text;
alter table transactions add column if not exists kind text check (kind in ('purchase','income','refund','transfer','fee','withdrawal','adjustment'));
alter table transactions add column if not exists external_transaction_id text;
alter table transactions add column if not exists fingerprint text;
alter table transactions add column if not exists fingerprint_version integer default 2;
alter table transactions add column if not exists excluded_from_analytics boolean default false;
alter table transactions add column if not exists review_status text default 'reviewed' check (review_status in ('reviewed','needs_review'));
alter table transactions add column if not exists categorization_confidence numeric;
alter table transactions add column if not exists original_amount_minor bigint;
alter table transactions add column if not exists original_currency text;
alter table transactions add column if not exists exchange_rate numeric;
alter table transactions add column if not exists updated_at timestamptz default now();
alter table transactions add column if not exists deleted_at timestamptz;

-- Categories
create table if not exists categories (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  icon text not null,
  color text not null,
  type text not null check (type in ('income', 'expense', 'both')),
  is_default boolean default false
);

-- Budgets
create table if not exists budgets (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  category_id text not null,
  amount numeric not null,
  currency text not null,
  month text not null
);

-- Goals
create table if not exists goals (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  target_amount numeric not null,
  current_amount numeric default 0,
  currency text not null,
  deadline text not null,
  color text not null
);

-- Settings
create table if not exists settings (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  key text not null,
  value text not null
);

create table if not exists accounts (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  institution text not null,
  type text not null check (type in ('checking','savings','credit_card','cash','other')),
  currency text not null default 'EUR',
  current_balance_minor bigint,
  balance_as_of date,
  last_import_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists imports (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  account_id text not null,
  source text not null,
  file_name text not null,
  file_hash text not null,
  row_count integer not null,
  imported_count integer not null,
  duplicate_count integer not null,
  rejected_count integer not null,
  imported_at timestamptz not null default now()
);

alter table imports add column if not exists statement_currency text;
alter table imports add column if not exists statement_date date;
alter table imports add column if not exists period_start date;
alter table imports add column if not exists period_end date;
alter table imports add column if not exists due_date date;
alter table imports add column if not exists opening_balance_minor bigint;
alter table imports add column if not exists payments_credits_minor bigint;
alter table imports add column if not exists new_charges_minor bigint;
alter table imports add column if not exists closing_balance_minor bigint;
alter table imports add column if not exists amount_due_minor bigint;
alter table imports add column if not exists spending_limit_minor bigint;
alter table imports add column if not exists reconciliation_difference_minor bigint;
alter table imports add column if not exists reconciled boolean;

create table if not exists merchant_rules (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  pattern text not null,
  normalized_merchant text not null,
  category_id text not null,
  match_type text not null check (match_type in ('exact','contains')),
  priority integer not null default 0,
  learned boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists transactions_user_account_external_uidx on transactions(user_id, account_id, external_transaction_id) where external_transaction_id is not null;
create unique index if not exists transactions_user_account_fingerprint_uidx on transactions(user_id, account_id, fingerprint, fingerprint_version) where fingerprint is not null;
create index if not exists transactions_user_date_idx on transactions(user_id, date desc);
create index if not exists transactions_user_category_date_idx on transactions(user_id, category_id, date desc);
create unique index if not exists categories_user_name_type_uidx on categories(user_id, lower(name), type);
create unique index if not exists settings_user_key_uidx on settings(user_id, key);
create unique index if not exists budgets_user_category_month_currency_uidx on budgets(user_id, category_id, month, currency);
create unique index if not exists merchant_rules_user_pattern_uidx on merchant_rules(user_id, pattern);
create unique index if not exists imports_user_file_account_uidx on imports(user_id, file_hash, account_id);

-- Enable Row Level Security
alter table transactions enable row level security;
alter table categories enable row level security;
alter table budgets enable row level security;
alter table goals enable row level security;
alter table settings enable row level security;
alter table accounts enable row level security;
alter table imports enable row level security;
alter table merchant_rules enable row level security;

-- RLS Policies: users can only access their own data
create policy "Users manage own transactions" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own categories" on categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own budgets" on budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own goals" on goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own settings" on settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own accounts" on accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own imports" on imports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own merchant rules" on merchant_rules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
