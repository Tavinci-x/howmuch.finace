export type TransactionType = 'income' | 'expense'
export type TimeRange = 'week' | 'month' | 'year' | 'all'

export interface Transaction {
  id: string
  amount: number
  type: TransactionType
  categoryId: string
  currency: string
  date: string // ISO date string YYYY-MM-DD
  note: string
  createdAt: string // ISO datetime
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
