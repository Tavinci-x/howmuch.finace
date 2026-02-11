-- HowMuch.Finance: Supabase Database Tables
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/hwchxbvuyyqtpoitmbvh/sql/new

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

-- Enable Row Level Security
alter table transactions enable row level security;
alter table categories enable row level security;
alter table budgets enable row level security;
alter table goals enable row level security;
alter table settings enable row level security;

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
