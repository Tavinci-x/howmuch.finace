"use client"

import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { formatCurrency } from "@/lib/currencies"
import { useDefaultCurrency } from "@/hooks/use-settings"
import { getIcon } from "@/lib/icons"
import { CurrencySelector } from "@/components/dashboard/currency-selector"
import { QuickAdd } from "@/components/dashboard/quick-add"
import { BreakdownDonut } from "@/components/dashboard/expense-donut"
import { TransactionForm } from "@/components/transactions/transaction-form"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Pencil, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format, startOfMonth, endOfMonth } from "date-fns"
import type { Category, Transaction } from "@/types"

export default function DashboardPage() {
  const currency = useDefaultCurrency()
  const { toast } = useToast()
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  async function handleDelete(id: string) {
    await db.transactions.delete(id)
    toast({ title: "Transaction deleted" })
  }

  const now = new Date()
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd")
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd")

  const transactions = useLiveQuery(
    () => db.transactions
      .where("date")
      .between(monthStart, monthEnd, true, true)
      .reverse()
      .sortBy("date"),
    [monthStart, monthEnd]
  )

  const categories = useLiveQuery(() => db.categories.toArray())
  const categoryMap = new Map<string, Category>(categories?.map(c => [c.id, c]))

  // Calculate totals
  const income = transactions?.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0) ?? 0
  const expenses = transactions?.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0) ?? 0
  const balance = income - expenses

  // Get recent transactions (last 10)
  const recentTransactions = transactions?.slice(0, 10) ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold mono">💰 Dashboard</h1>
          <p className="text-sm text-muted-foreground mono">
            {format(now, "MMMM yyyy")}
          </p>
        </div>
        <CurrencySelector />
      </div>

      {/* Summary - Receipt Style */}
      <div className="border p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground uppercase tracking-wide">Income</span>
          <span className="mono text-lg text-green-600 dark:text-green-400">
            +{formatCurrency(income, currency)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <span className="text-sm text-muted-foreground uppercase tracking-wide">Expenses</span>
            {income > 0 && (
              <p className="text-xs text-muted-foreground">
                {((expenses / income) * 100).toFixed(1)}% of income spent
              </p>
            )}
          </div>
          <span className="mono text-lg text-red-600 dark:text-red-400">
            -{formatCurrency(expenses, currency)}
          </span>
        </div>
        <div className="divider" />
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium uppercase tracking-wide">Balance</span>
          <span className={`mono text-xl font-bold ${balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {balance >= 0 ? "+" : ""}{formatCurrency(balance, currency)}
          </span>
        </div>
      </div>

      {/* Quick Add */}
      <QuickAdd />

      {/* Income and Expenses Breakdown */}
      {transactions && transactions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Income and Expenses Breakdown
          </h2>
          <div className="border p-4 flex gap-4">
            <BreakdownDonut transactions={transactions} categoryMap={categoryMap} type="income" />
            <div className="w-px bg-border shrink-0" />
            <BreakdownDonut transactions={transactions} categoryMap={categoryMap} type="expense" />
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Recent Transactions
        </h2>

        {recentTransactions.length === 0 ? (
          <div className="border border-dashed p-6 text-center text-muted-foreground">
            <p className="mono">No transactions yet</p>
            <p className="text-sm mt-1">Add your first transaction above ☝️</p>
          </div>
        ) : (
          <div className="border divide-y">
            {recentTransactions.map((t) => {
              const cat = categoryMap.get(t.categoryId)
              const Icon = getIcon(cat?.icon || "MoreHorizontal")
              return (
                <div key={t.id} className="flex items-center gap-3 p-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Icon className="h-5 w-5 shrink-0" style={{ color: cat?.color || "#6b7280" }} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {cat?.name || "Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground mono">
                        {format(new Date(t.date), "MMM d")}
                      </div>
                    </div>
                  </div>
                  <span className={`mono font-medium text-right shrink-0 ${t.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount, currency)}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditingTx(t); setFormOpen(true) }}>
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(t.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <TransactionForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingTx(null) }}
        transaction={editingTx}
      />
    </div>
  )
}
