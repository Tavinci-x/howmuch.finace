"use client"

import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { useDefaultCurrency } from "@/hooks/use-settings"
import { getCurrentMonth } from "@/lib/utils"
import type { Budget } from "@/types"
import { BudgetCard } from "./budget-card"
import { BudgetForm } from "./budget-form"
import { BudgetOverview } from "./budget-overview"
import { useToast } from "@/hooks/use-toast"

export function BudgetList() {
  const { toast } = useToast()
  const currency = useDefaultCurrency()
  const month = getCurrentMonth()
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const data = useLiveQuery(async () => {
    const budgets = await db.budgets.where('month').equals(month).toArray()
    const categories = await db.categories.toArray()
    const categoryMap = new Map(categories.map(c => [c.id, c]))

    const transactions = await db.transactions
      .where('date')
      .startsWith(month)
      .toArray()

    const spentByCategory: Record<string, number> = {}
    for (const t of transactions) {
      if (t.type === 'expense') {
        spentByCategory[t.categoryId] = (spentByCategory[t.categoryId] || 0) + t.amount
      }
    }

    return {
      budgets,
      categoryMap,
      spentByCategory,
    }
  }, [month])

  if (!data) return null

  const { budgets, categoryMap, spentByCategory } = data
  const totalBudgeted = budgets
    .filter(b => b.currency === currency)
    .reduce((sum, b) => sum + b.amount, 0)
  const totalSpent = budgets
    .filter(b => b.currency === currency)
    .reduce((sum, b) => sum + (spentByCategory[b.categoryId] || 0), 0)

  async function handleDelete(id: string) {
    await db.budgets.delete(id)
    toast({ title: "Budget deleted" })
  }

  return (
    <>
      <BudgetOverview
        totalBudgeted={totalBudgeted}
        totalSpent={totalSpent}
        currency={currency}
      />

      {budgets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No budgets set for this month. Create one to start tracking!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              category={categoryMap.get(budget.categoryId)}
              spent={spentByCategory[budget.categoryId] || 0}
              onEdit={() => { setEditingBudget(budget); setFormOpen(true) }}
              onDelete={() => handleDelete(budget.id)}
            />
          ))}
        </div>
      )}

      <BudgetForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingBudget(null) }}
        budget={editingBudget}
      />
    </>
  )
}
