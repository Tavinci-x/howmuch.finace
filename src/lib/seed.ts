import { db } from './db'
import { v4 as uuidv4 } from 'uuid'
import type { Category } from '@/types'

const defaultExpenseCategories: Omit<Category, 'id'>[] = [
  { name: 'Housing', icon: 'Home', color: '#3b82f6', type: 'expense', isDefault: true },
  { name: 'Food & Dining', icon: 'UtensilsCrossed', color: '#ef4444', type: 'expense', isDefault: true },
  { name: 'Groceries', icon: 'ShoppingBag', color: '#16a34a', type: 'expense', isDefault: true },
  { name: 'Restaurants & Cafés', icon: 'UtensilsCrossed', color: '#f97316', type: 'expense', isDefault: true },
  { name: 'Transport', icon: 'Car', color: '#06b6d4', type: 'expense', isDefault: true },
  { name: 'Car Payment', icon: 'Car', color: '#0891b2', type: 'expense', isDefault: true },
  { name: 'Utilities', icon: 'Zap', color: '#f59e0b', type: 'expense', isDefault: true },
  { name: 'Phone & Internet', icon: 'Zap', color: '#0ea5e9', type: 'expense', isDefault: true },
  { name: 'Insurance', icon: 'Home', color: '#2563eb', type: 'expense', isDefault: true },
  { name: 'Entertainment', icon: 'Gamepad2', color: '#8b5cf6', type: 'expense', isDefault: true },
  { name: 'Gambling', icon: 'Gamepad2', color: '#dc2626', type: 'expense', isDefault: true },
  { name: 'Travel', icon: 'Car', color: '#7c3aed', type: 'expense', isDefault: true },
  { name: 'Taxes & Government', icon: 'Briefcase', color: '#64748b', type: 'expense', isDefault: true },
  { name: 'Amex', icon: 'CreditCard', color: '#2563eb', type: 'expense', isDefault: true },
  { name: 'Transfers', icon: 'CreditCard', color: '#94a3b8', type: 'both', isDefault: true },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#ec4899', type: 'expense', isDefault: true },
  { name: 'Health', icon: 'Heart', color: '#f43f5e', type: 'expense', isDefault: true },
  { name: 'Education', icon: 'GraduationCap', color: '#6366f1', type: 'expense', isDefault: true },
  { name: 'Subscriptions', icon: 'CreditCard', color: '#14b8a6', type: 'expense', isDefault: true },
  { name: 'Other', icon: 'MoreHorizontal', color: '#6b7280', type: 'expense', isDefault: true },
]

const defaultIncomeCategories: Omit<Category, 'id'>[] = [
  { name: 'Salary', icon: 'Briefcase', color: '#22c55e', type: 'income', isDefault: true },
  { name: 'Reimbursements', icon: 'CreditCard', color: '#059669', type: 'income', isDefault: true },
  { name: 'Freelance', icon: 'Laptop', color: '#10b981', type: 'income', isDefault: true },
  { name: 'Gifts', icon: 'Gift', color: '#a855f7', type: 'income', isDefault: true },
  { name: 'Investments', icon: 'TrendingUp', color: '#f97316', type: 'income', isDefault: true },
  { name: 'Other Income', icon: 'MoreHorizontal', color: '#6b7280', type: 'income', isDefault: true },
]

let seeding = false

export async function seedDatabase() {
  if (seeding) return
  seeding = true

  try {
    // Deduplicate existing categories (fixes StrictMode double-mount)
    const existing = await db.categories.toArray()
    const seen = new Set<string>()
    for (const cat of existing) {
      const key = `${cat.name}:${cat.type}`
      if (seen.has(key)) {
        await db.categories.delete(cat.id)
      } else {
        seen.add(key)
      }
    }

    // Migrate existing categories: strip emoji prefixes and assign distinct colors
    const colorMap: Record<string, string> = {
      'Housing': '#3b82f6', 'Food & Dining': '#ef4444', 'Transport': '#06b6d4',
      'Utilities': '#f59e0b', 'Entertainment': '#8b5cf6', 'Shopping': '#ec4899',
      'Health': '#f43f5e', 'Education': '#6366f1', 'Subscriptions': '#14b8a6',
      'Salary': '#22c55e', 'Freelance': '#10b981', 'Gifts': '#a855f7',
      'Investments': '#f97316',
    }
    for (const cat of await db.categories.toArray()) {
      const cleaned = cat.name.replace(/^[^\w]*/, '')
      const updates: Partial<{ name: string; color: string }> = {}
      if (cleaned !== cat.name) updates.name = cleaned
      if (cat.color === '#6b7280' && colorMap[cleaned]) updates.color = colorMap[cleaned]
      if (Object.keys(updates).length > 0) {
        await db.categories.update(cat.id, updates)
      }
    }

    // Add newly introduced defaults without duplicating or replacing user categories.
    const categoryNames = new Set((await db.categories.toArray()).map(category => category.name.toLocaleLowerCase()))
    const missingCategories: Category[] = [...defaultExpenseCategories, ...defaultIncomeCategories]
      .filter(category => !categoryNames.has(category.name.toLocaleLowerCase()))
      .map(category => ({ ...category, id: uuidv4() }))
    if (missingCategories.length > 0) await db.categories.bulkAdd(missingCategories)
    const investments = await db.categories.where('name').equals('Investments').first()
    if (investments && investments.type !== 'both') await db.categories.update(investments.id, { type: 'both' })

    // Set default currency to EUR if no settings exist
    const settingsCount = await db.settings.count()
    if (settingsCount === 0) {
      await db.settings.add({
        id: uuidv4(),
        key: 'defaultCurrency',
        value: 'EUR',
      })
    }

    if (await db.accounts.count() === 0) {
      const now = new Date().toISOString()
      await db.accounts.bulkAdd([
        { id:'s-pankki-checking',name:'S-Pankki Everyday',institution:'S-Pankki',type:'checking',currency:'EUR',createdAt:now,updatedAt:now },
        { id:'amex-card',name:'American Express',institution:'American Express',type:'credit_card',currency:'EUR',createdAt:now,updatedAt:now },
        { id:'manual',name:'Manual entries',institution:'HowMuch',type:'other',currency:'EUR',createdAt:now,updatedAt:now },
      ])
    }
  } finally {
    seeding = false
  }
}
