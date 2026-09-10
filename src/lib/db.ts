import Dexie, { type Table } from 'dexie'
import type { Transaction, Category, Budget, Goal, AppSettings, Account, ImportBatch, MerchantRule } from '@/types'

export class HowMuchDB extends Dexie {
  transactions!: Table<Transaction>
  categories!: Table<Category>
  budgets!: Table<Budget>
  goals!: Table<Goal>
  settings!: Table<AppSettings>
  accounts!: Table<Account>
  imports!: Table<ImportBatch>
  merchantRules!: Table<MerchantRule>

  constructor() {
    super('howmuch-finance')
    this.version(1).stores({
      transactions: 'id, type, categoryId, currency, date, createdAt',
      categories: 'id, name, type, isDefault',
      budgets: 'id, categoryId, month, currency',
      goals: 'id, name, deadline',
      settings: 'id, key',
    })
    this.version(2).stores({
      transactions: 'id, type, categoryId, accountId, currency, date, postedDate, importId, fingerprint, [accountId+fingerprint], updatedAt, deletedAt',
      categories: 'id, name, type, isDefault',
      budgets: 'id, categoryId, month, currency',
      goals: 'id, name, deadline',
      settings: 'id, &key',
      accounts: 'id, institution, type, currency, lastImportDate, updatedAt',
      imports: 'id, accountId, source, fileHash, importedAt',
      merchantRules: 'id, pattern, normalizedMerchant, categoryId, matchType, priority, learned, updatedAt',
    }).upgrade(async tx => {
      await tx.table<Transaction>('transactions').toCollection().modify(record => {
        record.amountMinor = Math.round(record.amount * 100) * (record.type === 'income' ? 1 : -1)
        record.kind = record.type === 'income' ? 'income' : 'purchase'
        record.rawDescription = record.note
        record.normalizedMerchant = record.note
        record.accountId = record.accountId || 'manual'
        record.updatedAt = record.updatedAt || record.createdAt
        record.fingerprintVersion = 2
        record.excludedFromAnalytics = false
        record.reviewStatus = 'reviewed'
      })
    })
  }
}

export const db = new HowMuchDB()
