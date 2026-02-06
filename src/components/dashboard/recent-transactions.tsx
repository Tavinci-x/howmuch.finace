"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { formatCurrency } from "@/lib/currencies"
import { formatDate } from "@/lib/utils"
import { getIcon } from "@/lib/icons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export function RecentTransactions() {
  const data = useLiveQuery(async () => {
    const transactions = await db.transactions
      .orderBy('date')
      .reverse()
      .limit(8)
      .toArray()

    const categories = await db.categories.toArray()
    const categoryMap = new Map(categories.map(c => [c.id, c]))

    return transactions.map(t => ({
      ...t,
      category: categoryMap.get(t.categoryId),
    }))
  })

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Transactions</CardTitle>
        <Link href="/transactions" className="text-sm text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No transactions yet. Add your first one!
          </p>
        ) : (
          <div className="space-y-3">
            {data.map((t) => {
              const Icon = getIcon(t.category?.icon || 'MoreHorizontal')
              return (
                <div key={t.id} className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: (t.category?.color || '#6b7280') + '20' }}
                  >
                    <Icon
                      className="h-4 w-4"
                      style={{ color: t.category?.color || '#6b7280' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {t.category?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {t.note || formatDate(t.date)}
                    </p>
                  </div>
                  <div className={`text-sm font-medium ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, t.currency)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
