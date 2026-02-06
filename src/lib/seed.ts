import { db } from './db'
import { v4 as uuidv4 } from 'uuid'
import type { Category } from '@/types'

const defaultExpenseCategories: Omit<Category, 'id'>[] = [
  { name: '🍔 Food & Dining', icon: 'UtensilsCrossed', color: '#6b7280', type: 'expense', isDefault: true },
  { name: '🚗 Transport', icon: 'Car', color: '#6b7280', type: 'expense', isDefault: true },
  { name: '🏠 Housing', icon: 'Home', color: '#6b7280', type: 'expense', isDefault: true },
  { name: '💡 Utilities', icon: 'Zap', color: '#6b7280', type: 'expense', isDefault: true },
  { name: '🎬 Entertainment', icon: 'Gamepad2', color: '#6b7280', type: 'expense', isDefault: true },
  { name: '🛍️ Shopping', icon: 'ShoppingBag', color: '#6b7280', type: 'expense', isDefault: true },
  { name: '💊 Health', icon: 'Heart', color: '#6b7280', type: 'expense', isDefault: true },
  { name: '📚 Education', icon: 'GraduationCap', color: '#6b7280', type: 'expense', isDefault: true },
  { name: '💳 Subscriptions', icon: 'CreditCard', color: '#6b7280', type: 'expense', isDefault: true },
  { name: '📦 Other', icon: 'MoreHorizontal', color: '#6b7280', type: 'expense', isDefault: true },
]

const defaultIncomeCategories: Omit<Category, 'id'>[] = [
  { name: '💼 Salary', icon: 'Briefcase', color: '#6b7280', type: 'income', isDefault: true },
  { name: '💻 Freelance', icon: 'Laptop', color: '#6b7280', type: 'income', isDefault: true },
  { name: '📈 Investments', icon: 'TrendingUp', color: '#6b7280', type: 'income', isDefault: true },
  { name: '🎁 Gifts', icon: 'Gift', color: '#6b7280', type: 'income', isDefault: true },
  { name: '📦 Other Income', icon: 'MoreHorizontal', color: '#6b7280', type: 'income', isDefault: true },
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
