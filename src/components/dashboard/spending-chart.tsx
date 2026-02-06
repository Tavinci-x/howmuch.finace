"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { useDefaultCurrency } from "@/hooks/use-settings"
import { getCurrentMonth } from "@/lib/utils"
import { formatCurrency } from "@/lib/currencies"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

export function SpendingChart() {
  const currency = useDefaultCurrency()
  const month = getCurrentMonth()

  const data = useLiveQuery(async () => {
    const transactions = await db.transactions
      .where('date')
      .startsWith(month)
      .and(t => t.type === 'expense')
      .toArray()

    const categories = await db.categories.toArray()
    const categoryMap = new Map(categories.map(c => [c.id, c]))

    const grouped: Record<string, { name: string; value: number; color: string }> = {}
    for (const t of transactions) {
      const cat = categoryMap.get(t.categoryId)
      const name = cat?.name || 'Other'
      const color = cat?.color || '#6b7280'
      if (!grouped[name]) {
        grouped[name] = { name, value: 0, color }
      }
      grouped[name].value += t.amount
    }

    return Object.values(grouped).sort((a, b) => b.value - a.value)
  }, [month])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            No spending data this month
          </p>
        ) : (
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value || 0), currency)}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4 w-full">
              {data.slice(0, 6).map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
