"use client"

import { useState, useMemo } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { useDefaultCurrency } from "@/hooks/use-settings"
import { formatCurrency } from "@/lib/currencies"
import { getDateRange, getTrendPeriods } from "@/lib/utils"
import { subMonths, startOfMonth, endOfMonth, differenceInDays } from "date-fns"
import type { TimeRange } from "@/types"
import { getIcon } from "@/lib/icons"

import { TimeRangeSelector } from "@/components/reports/time-range-selector"
import { IncomeVsExpense } from "@/components/reports/income-vs-expense"

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("month")
  const currency = useDefaultCurrency()

  const allData = useLiveQuery(async () => {
    const transactions = await db.transactions.toArray()
    const categories = await db.categories.toArray()
    return { transactions, categories }
  })

  const reportData = useMemo(() => {
    if (!allData) return null

    const { transactions, categories } = allData
    const categoryMap = new Map(categories.map(c => [c.id, c]))
    const { start, end } = getDateRange(timeRange)

    const filtered = transactions.filter(t => {
      const d = new Date(t.date)
      return d >= start && d <= end
    })

    // Spending by category
    const spendingMap: Record<string, { name: string; value: number; icon: string; color: string }> = {}
    for (const t of filtered) {
      if (t.type !== 'expense') continue
      const cat = categoryMap.get(t.categoryId)
      const name = cat?.name || 'Other'
      const icon = cat?.icon || 'MoreHorizontal'
      const color = cat?.color || '#6b7280'
      if (!spendingMap[name]) spendingMap[name] = { name, value: 0, icon, color }
      spendingMap[name].value += t.amount
    }
    const spendingByCategory = Object.values(spendingMap).sort((a, b) => b.value - a.value)

    // Income vs Expense trend (time-range aware)
    const earliestTxn = transactions.length > 0
      ? transactions.reduce((min, t) => t.date < min ? t.date : min, transactions[0].date)
      : undefined
    const periods = getTrendPeriods(timeRange, earliestTxn ? new Date(earliestTxn) : undefined)
    const incomeVsExpense = periods.map(period => {
      const periodTxns = transactions.filter(t => t.date.startsWith(period.key))
      const income = periodTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const expenses = periodTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      return { label: period.label, Income: income, Expenses: expenses }
    })

    // Summary stats
    const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const totalExpenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const days = Math.max(1, differenceInDays(end, start) || 1)
    const avgDailySpend = totalExpenses / days

    // Month-over-month change
    const now = new Date()
    const thisMonthStart = startOfMonth(now)
    const thisMonthEnd = endOfMonth(now)
    const lastMonthStart = startOfMonth(subMonths(now, 1))
    const lastMonthEnd = endOfMonth(subMonths(now, 1))

    const thisMonthSpending = transactions
      .filter(t => t.type === 'expense' && new Date(t.date) >= thisMonthStart && new Date(t.date) <= thisMonthEnd)
      .reduce((s, t) => s + t.amount, 0)
    const lastMonthSpending = transactions
      .filter(t => t.type === 'expense' && new Date(t.date) >= lastMonthStart && new Date(t.date) <= lastMonthEnd)
      .reduce((s, t) => s + t.amount, 0)

    const monthOverMonthChange = lastMonthSpending > 0
      ? ((thisMonthSpending - lastMonthSpending) / lastMonthSpending) * 100
      : 0

    return {
      spendingByCategory,
      incomeVsExpense,
      totalIncome,
      totalExpenses,
      avgDailySpend,
      monthOverMonthChange,
      totalTransactions: filtered.length,
    }
  }, [allData, timeRange])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold mono">📈 Reports</h1>
          <p className="text-sm text-muted-foreground mono">
            Analyze your finances
          </p>
        </div>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {reportData && (
        <>
          {/* Summary Stats */}
          <div className="border p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground uppercase tracking-wide">
                Total Income
              </span>
              <span className="mono text-lg text-green-600 dark:text-green-400">
                +{formatCurrency(reportData.totalIncome, currency)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground uppercase tracking-wide">
                Total Expenses
              </span>
              <span className="mono text-lg text-red-600 dark:text-red-400">
                -{formatCurrency(reportData.totalExpenses, currency)}
              </span>
            </div>
            <div className="divider" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground uppercase tracking-wide">
                Avg. Daily Spend
              </span>
              <span className="mono">
                {formatCurrency(reportData.avgDailySpend, currency)}/day
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground uppercase tracking-wide">
                vs Last Month
              </span>
              <span className={`mono ${reportData.monthOverMonthChange > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                {reportData.monthOverMonthChange > 0 ? "+" : ""}{reportData.monthOverMonthChange.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Spending by Category */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Spending by Category
            </h2>
            {reportData.spendingByCategory.length === 0 ? (
              <div className="border border-dashed p-6 text-center text-muted-foreground">
                <p className="mono">No spending data</p>
              </div>
            ) : (
              <div className="border divide-y">
                {reportData.spendingByCategory.map((item) => {
                  const total = reportData.totalExpenses || 1
                  const percent = (item.value / total) * 100
                  return (
                    <div key={item.name} className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {(() => { const Icon = getIcon(item.icon); return <Icon className="h-4 w-4" style={{ color: item.color }} />; })()}
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="mono text-sm">
                          {formatCurrency(item.value, currency)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-foreground transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Income vs Expenses Chart */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {timeRange === 'month' ? 'Monthly' : timeRange === 'year' ? 'Yearly' : 'All-Time'} Trend
            </h2>
            <IncomeVsExpense data={reportData.incomeVsExpense} currency={currency} />
          </div>
        </>
      )}
    </div>
  )
}
