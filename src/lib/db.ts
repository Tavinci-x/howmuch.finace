import Dexie, { type Table } from 'dexie'
import type { Transaction, Category, Budget, Goal, AppSettings } from '@/types'

export class HowMuchDB extends Dexie {
  transactions!: Table<Transaction>
  categories!: Table<Category>
  budgets!: Table<Budget>
  goals!: Table<Goal>
  settings!: Table<AppSettings>

  constructor() {
    super('howmuch-finance')
    this.version(1).stores({
      transactions: 'id, type, categoryId, currency, date, createdAt',
      categories: 'id, name, type, isDefault',
      budgets: 'id, categoryId, month, currency',
      goals: 'id, name, deadline',
      settings: 'id, key',
    })
  }
}

export const db = new HowMuchDB()
