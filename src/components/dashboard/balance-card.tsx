"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { formatCurrency } from "@/lib/currencies"
import { useDefaultCurrency } from "@/hooks/use-settings"
import { getCurrentMonth } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet } from "lucide-react"

export function BalanceCard() {
  const currency = useDefaultCurrency()
  const month = getCurrentMonth()

  const balance = useLiveQuery(async () => {
    const transactions = await db.transactions
      .where('date')
      .startsWith(month)
      .toArray()

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    return income - expenses
  }, [month])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Monthly Balance</CardTitle>
        <Wallet className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${(balance ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {formatCurrency(balance ?? 0, currency)}
        </div>
        <p className="text-xs text-muted-foreground">
          Net for this month
        </p>
      </CardContent>
    </Card>
  )
}
