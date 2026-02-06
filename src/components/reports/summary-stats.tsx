"use client"

import { formatCurrency } from "@/lib/currencies"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Calculator, Crown } from "lucide-react"

interface SummaryStatsProps {
  avgDailySpend: number
  highestCategory: { name: string; amount: number } | null
  monthOverMonthChange: number
  totalTransactions: number
  currency: string
}

export function SummaryStats({
  avgDailySpend,
  highestCategory,
  monthOverMonthChange,
  totalTransactions,
  currency,
}: SummaryStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Daily Spend</CardTitle>
          <Calculator className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{formatCurrency(avgDailySpend, currency)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Category</CardTitle>
          <Crown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold truncate">
            {highestCategory?.name || "N/A"}
          </div>
          {highestCategory && (
            <p className="text-xs text-muted-foreground">
              {formatCurrency(highestCategory.amount, currency)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Month Change</CardTitle>
          {monthOverMonthChange >= 0 ? (
            <TrendingUp className="h-4 w-4 text-red-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-green-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-xl font-bold ${monthOverMonthChange > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {monthOverMonthChange > 0 ? '+' : ''}{monthOverMonthChange.toFixed(0)}%
          </div>
          <p className="text-xs text-muted-foreground">vs last month spending</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Transactions</CardTitle>
          <Calculator className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{totalTransactions}</div>
          <p className="text-xs text-muted-foreground">in this period</p>
        </CardContent>
      </Card>
    </div>
  )
}
