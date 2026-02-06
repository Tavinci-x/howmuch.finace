import { db } from './db'
import { v4 as uuidv4 } from 'uuid'
import type { Category } from '@/types'

const defaultExpenseCategories: Omit<Category, 'id'>[] = [
  { name: 'Housing', icon: 'Home', color: '#3b82f6', type: 'expense', isDefault: true },
  { name: 'Food & Dining', icon: 'UtensilsCrossed', color: '#ef4444', type: 'expense', isDefault: true },
  { name: 'Transport', icon: 'Car', color: '#06b6d4', type: 'expense', isDefault: true },
  { name: 'Utilities', icon: 'Zap', color: '#f59e0b', type: 'expense', isDefault: true },
  { name: 'Entertainment', icon: 'Gamepad2', color: '#8b5cf6', type: 'expense', isDefault: true },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#ec4899', type: 'expense', isDefault: true },
  { name: 'Health', icon: 'Heart', color: '#f43f5e', type: 'expense', isDefault: true },
  { name: 'Education', icon: 'GraduationCap', color: '#6366f1', type: 'expense', isDefault: true },
  { name: 'Subscriptions', icon: 'CreditCard', color: '#14b8a6', type: 'expense', isDefault: true },
  { name: 'Other', icon: 'MoreHorizontal', color: '#6b7280', type: 'expense', isDefault: true },
]

const defaultIncomeCategories: Omit<Category, 'id'>[] = [
  { name: 'Salary', icon: 'Briefcase', color: '#22c55e', type: 'income', isDefault: true },
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

    const categoryCount = await db.categories.count()
    if (categoryCount === 0) {
      const allCategories: Category[] = [
        ...defaultExpenseCategories,
        ...defaultIncomeCategories,
      ].map((cat) => ({
        ...cat,
        id: uuidv4(),
      }))

      await db.categories.bulkAdd(allCategories)
    }

    // Set default currency to USD if no settings exist
    const settingsCount = await db.settings.count()
    if (settingsCount === 0) {
      await db.settings.add({
        id: uuidv4(),
        key: 'defaultCurrency',
        value: 'USD',
      })
    }
  } finally {
    seeding = false
  }
}
