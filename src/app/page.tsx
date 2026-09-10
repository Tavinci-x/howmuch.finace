"use client"

import { useState, useMemo } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { formatCurrency } from "@/lib/currencies"
import { useDefaultCurrency } from "@/hooks/use-settings"
import { getIcon } from "@/lib/icons"
import { QuickAdd } from "@/components/dashboard/quick-add"
import { BreakdownDonut } from "@/components/dashboard/expense-donut"
import { TransactionForm } from "@/components/transactions/transaction-form"
import { CsvImport } from "@/components/transactions/csv-import"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Pencil, Trash2, Upload, ChevronLeft, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parse } from "date-fns"
import type { Category, Transaction } from "@/types"
import { isIncluded, isVisible, majorAmount, signedMinor } from "@/lib/transactions"
import Link from "next/link"

export default function DashboardPage() {
  const currency = useDefaultCurrency()
  const { toast } = useToast()
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const accounts = useLiveQuery(() => db.accounts.toArray()) || []
  const accountsWithBalance = accounts.filter(account => account.currentBalanceMinor!==undefined&&account.currentBalanceMinor!==null)
  const totalBalance = accountsWithBalance.reduce((sum, account) => sum + (account.currentBalanceMinor || 0), 0) / 100
  const latestBalanceAsOf = accountsWithBalance.map(account => account.balanceAsOf).filter((value):value is string=>Boolean(value)).sort().at(-1)

  // Month navigation state
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"))
  const selectedDate = parse(selectedMonth, "yyyy-MM", new Date())
  const monthStart = format(startOfMonth(selectedDate), "yyyy-MM-dd")
  const monthEnd = format(endOfMonth(selectedDate), "yyyy-MM-dd")

  const isCurrentMonth = selectedMonth === format(new Date(), "yyyy-MM")

  function goToPrevMonth() {
    setSelectedMonth(format(subMonths(selectedDate, 1), "yyyy-MM"))
  }
  function goToNextMonth() {
    setSelectedMonth(format(addMonths(selectedDate, 1), "yyyy-MM"))
  }

  async function handleDelete(id: string) {
    await db.transactions.update(id, { deletedAt:new Date().toISOString(), updatedAt:new Date().toISOString() })
    toast({ title: "Transaction deleted" })
  }

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
  const analyticsTransactions = useMemo(
    () => transactions?.filter(isIncluded) ?? [],
    [transactions]
  )
  const ledgerTransactions = useMemo(() => transactions?.filter(isVisible) ?? [], [transactions])
  const income = analyticsTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + signedMinor(t), 0) / 100
  const expenses = -analyticsTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + signedMinor(t), 0) / 100
  const balance = income - expenses

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    if (ledgerTransactions.length === 0) return []
    const groups: { date: string; transactions: Transaction[] }[] = []
    let currentDate = ''
    for (const t of ledgerTransactions) {
      if (t.date !== currentDate) {
        currentDate = t.date
        groups.push({ date: t.date, transactions: [t] })
      } else {
        groups[groups.length - 1].transactions.push(t)
      }
    }
    return groups
  }, [ledgerTransactions])

  return (
    <div className="space-y-6">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold mono">💰 Dashboard</h1>
        </div>
        <Button variant="outline" size="sm" asChild><Link href="/reports">View reports</Link></Button>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <button
          className="text-lg font-medium mono hover:underline"
          onClick={() => setSelectedMonth(format(new Date(), "yyyy-MM"))}
          title="Go to current month"
        >
          {format(selectedDate, "MMMM yyyy")}
        </button>
        <Button variant="ghost" size="icon" onClick={goToNextMonth} disabled={isCurrentMonth}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Summary - Receipt Style */}
      <div className="border p-4 space-y-3">
        <div className="flex justify-between items-end pb-2">
          <div><span className="text-sm font-medium uppercase tracking-wide">Total balance</span>{latestBalanceAsOf&&<p className="text-xs text-muted-foreground mt-1">As of {new Date(`${latestBalanceAsOf}T00:00:00`).toLocaleDateString()}</p>}</div>
          <span className="mono text-2xl font-bold">{accountsWithBalance.length?formatCurrency(totalBalance, currency):'Not set'}</span>
        </div>
        <div className="divider" />
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

      {/* CSV Upload */}
      <div
        onClick={() => setCsvOpen(true)}
        className="border-2 border-dashed p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-foreground/40 hover:bg-muted/50 transition-colors"
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <div className="text-center">
          <p className="font-medium mono">Upload your CSV file</p>
          <p className="text-sm text-muted-foreground mt-1">
            Import transactions from your bank statement
          </p>
        </div>
      </div>

      {/* Income and Expenses Breakdown */}
      {analyticsTransactions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Income and Expenses Breakdown
          </h2>
          <div className="border p-4 flex gap-4">
            <BreakdownDonut transactions={analyticsTransactions} categoryMap={categoryMap} type="income" />
            <div className="w-px bg-border shrink-0" />
            <BreakdownDonut transactions={analyticsTransactions} categoryMap={categoryMap} type="expense" />
          </div>
        </div>
      )}

      {/* All Transactions — grouped by date */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Transactions
          </h2>
          {ledgerTransactions.length > 0 && (
            <span className="text-xs text-muted-foreground mono">
              {ledgerTransactions.length} total
            </span>
          )}
        </div>

        {groupedTransactions.length === 0 ? (
          <div className="border border-dashed p-6 text-center text-muted-foreground">
            <p className="mono">No transactions this month</p>
            <p className="text-sm mt-1">Add a transaction or import a CSV above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedTransactions.map((group) => (
              <div key={group.date}>
                {/* Date header */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground mono">
                    {format(new Date(group.date + 'T00:00:00'), "EEE, MMM d")}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground mono">
                    {group.transactions.length}
                  </span>
                </div>
                {/* Transactions table for this date */}
                <div className="border">
                  {/* Table header */}
                  <div className="flex items-center gap-3 px-3 py-2 border-b bg-muted/30">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide flex-1">Description</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide w-36 text-left">Category</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide w-24 text-right">Amount</span>
                    <div className="w-8" />
                  </div>
                  {/* Table rows */}
                  <div className="divide-y">
                    {group.transactions.map((t) => {
                      const cat = categoryMap.get(t.categoryId)
                      const Icon = getIcon(cat?.icon || "MoreHorizontal")
                      return (
                        <div key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm mono truncate block">
                              {t.normalizedMerchant || t.note || cat?.name || "Unknown"}
                            </span>
                          </div>
                          <div className="w-36 flex items-center gap-1.5 shrink-0">
                            <Icon className="h-4 w-4 shrink-0" style={{ color: cat?.color || "#6b7280" }} />
                            <span className="text-sm truncate">{cat?.name || "Other"}</span>
                          </div>
                          <span className={`mono text-sm font-medium w-24 text-right shrink-0 ${t.kind==='transfer'?'text-muted-foreground':t.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            {signedMinor(t) > 0 ? "+" : "-"}{formatCurrency(majorAmount(t), t.currency)}
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TransactionForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingTx(null) }}
        transaction={editingTx}
      />

      <CsvImport open={csvOpen} onOpenChange={setCsvOpen} />
    </div>
  )
}
