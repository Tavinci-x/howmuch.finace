"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { useDefaultCurrency } from "@/hooks/use-settings"
import { getLast6Months } from "@/lib/utils"
import { formatCurrency } from "@/lib/currencies"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { format } from "date-fns"

export function MonthlyTrend() {
  const currency = useDefaultCurrency()
  const months = getLast6Months()

  const data = useLiveQuery(async () => {
    const transactions = await db.transactions.toArray()

    return months.map(month => {
      const monthTxns = transactions.filter(t => t.date.startsWith(month))
      const income = monthTxns
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)
      const expenses = monthTxns
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)

      const [y, m] = month.split('-')
      const label = format(new Date(parseInt(y), parseInt(m) - 1), 'MMM')

      return { month: label, Income: income, Expenses: expenses }
    })
  }, [])

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Income vs Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        {!data ? (
          <p className="text-sm text-muted-foreground text-center py-10">Loading...</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => formatCurrency(v, currency)} width={80} />
              <Tooltip formatter={(value) => formatCurrency(Number(value || 0), currency)} />
              <Legend />
              <Bar dataKey="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
