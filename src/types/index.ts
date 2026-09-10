export type TransactionType = 'income' | 'expense'
export type TransactionKind = 'purchase' | 'income' | 'refund' | 'transfer' | 'fee' | 'withdrawal' | 'adjustment'
export type TimeRange = 'month' | 'year' | 'all'

export interface Transaction {
  id: string
  /** Legacy absolute major-unit value. New calculations use amountMinor. */
  amount: number
  /** Signed amount in the currency's minor unit: expenses are negative. */
  amountMinor?: number
  type: TransactionType
  categoryId: string
  accountId?: string
  importId?: string
  currency: string
  date: string // ISO date string YYYY-MM-DD
  postedDate?: string
  note: string
  rawDescription?: string
  normalizedMerchant?: string
  kind?: TransactionKind
  externalTransactionId?: string
  fingerprint?: string
  fingerprintVersion?: number
  excludedFromAnalytics?: boolean
  reviewStatus?: 'reviewed' | 'needs_review'
  categorizationConfidence?: number
  originalAmountMinor?: number
  originalCurrency?: string
  exchangeRate?: number
  createdAt: string // ISO datetime
  updatedAt?: string
  deletedAt?: string
}

export interface Account {
  id: string
  name: string
  institution: string
  type: 'checking' | 'savings' | 'credit_card' | 'cash' | 'other'
  currency: string
  currentBalanceMinor?: number
  balanceAsOf?: string
  lastImportDate?: string
  createdAt: string
  updatedAt: string
}

export interface ImportBatch {
  id: string
  accountId: string
  source: string
  fileName: string
  fileHash: string
  rowCount: number
  importedCount: number
  duplicateCount: number
  rejectedCount: number
  importedAt: string
  statementCurrency?: string
  statementDate?: string
  periodStart?: string
  periodEnd?: string
  dueDate?: string
  openingBalanceMinor?: number
  paymentsCreditsMinor?: number
  newChargesMinor?: number
  closingBalanceMinor?: number
  amountDueMinor?: number
  spendingLimitMinor?: number
  reconciliationDifferenceMinor?: number
  reconciled?: boolean
}

export interface MerchantRule {
  id: string
  pattern: string
  normalizedMerchant: string
  categoryId: string
  matchType: 'exact' | 'contains'
  priority: number
  learned: boolean
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: 'income' | 'expense' | 'both'
  isDefault: boolean
}

export interface Budget {
  id: string
  categoryId: string
  amount: number
  currency: string
  month: string // YYYY-MM
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  currency: string
  deadline: string // ISO date string
  color: string
}

export interface AppSettings {
  id: string
  key: string
  value: string
}

export interface Currency {
  code: string
  name: string
  symbol: string
  decimals: number
}
