"use client"

import { formatCurrency } from "@/lib/currencies"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface BudgetOverviewProps {
  totalBudgeted: number
  totalSpent: number
  currency: string
}

export function BudgetOverview({ totalBudgeted, totalSpent, currency }: BudgetOverviewProps) {
  const percentage = totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0
  const isOver = totalSpent > totalBudgeted

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Budget Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className={`text-2xl font-bold ${isOver ? 'text-red-600 dark:text-red-400' : ''}`}>
                {formatCurrency(totalSpent, currency)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Budgeted</p>
              <p className="text-2xl font-bold">
                {formatCurrency(totalBudgeted, currency)}
              </p>
            </div>
          </div>
          <Progress
            value={percentage}
            className={`h-3 ${isOver ? '[&>div]:bg-red-500' : ''}`}
          />
          <p className="text-sm text-muted-foreground text-center">
            {percentage.toFixed(0)}% of total budget used
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
