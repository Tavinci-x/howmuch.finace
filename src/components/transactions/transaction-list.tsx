"use client"

import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { formatCurrency } from "@/lib/currencies"
import { formatDate } from "@/lib/utils"
import { getIcon } from "@/lib/icons"
import type { Transaction } from "@/types"
import { TransactionFilters } from "./transaction-filters"
import { TransactionForm } from "./transaction-form"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Pencil, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { isIncluded, majorAmount, signedMinor } from "@/lib/transactions"

export function TransactionList() {
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [accountFilter, setAccountFilter] = useState("all")
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const data = useLiveQuery(async () => {
    const transactions = await db.transactions.orderBy('date').reverse().toArray()
    const [categories,accounts] = await Promise.all([db.categories.toArray(),db.accounts.toArray()])
    const categoryMap = new Map(categories.map(c => [c.id, c]))
    const accountMap = new Map(accounts.map(a => [a.id, a]))

    return transactions.filter(isIncluded).map(t => ({
      ...t,
      category: categoryMap.get(t.categoryId),
      account: accountMap.get(t.accountId || 'manual'),
    }))
  })

  const filtered = data?.filter(t => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false
    if (categoryFilter !== "all" && t.categoryId !== categoryFilter) return false
    if (accountFilter !== "all" && t.accountId !== accountFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return (
        (t.normalizedMerchant || t.note).toLowerCase().includes(s) ||
        t.category?.name.toLowerCase().includes(s) ||
        t.amount.toString().includes(s)
      )
    }
    return true
  })

  async function handleDelete(id: string) {
    await db.transactions.update(id, { deletedAt:new Date().toISOString(), updatedAt:new Date().toISOString() })
    toast({ title: "Transaction deleted" })
  }

  return (
    <>
      <TransactionFilters
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        accountFilter={accountFilter}
        onAccountFilterChange={setAccountFilter}
      />

      {!filtered || filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No transactions found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const Icon = getIcon(t.category?.icon || 'MoreHorizontal')
            return (
              <div
                key={t.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full shrink-0"
                  style={{ backgroundColor: (t.category?.color || '#6b7280') + '20' }}
                >
                  <Icon
                    className="h-5 w-5"
                    style={{ color: t.category?.color || '#6b7280' }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {t.normalizedMerchant || t.note || t.category?.name || 'Unknown'}
                    </span>
                    <Badge variant={signedMinor(t) > 0 ? 'default' : 'secondary'} className="text-xs">
                      {t.kind || t.type}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex gap-2">
                    <span>{formatDate(t.date)}</span>
                    {t.account && <span>- {t.account.name}</span>}
                  </div>
                </div>
                <div className={`text-sm font-semibold shrink-0 ${signedMinor(t) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {signedMinor(t) > 0 ? '+' : '-'}{formatCurrency(majorAmount(t), t.currency)}
                </div>
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

      <TransactionForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingTx(null) }}
        transaction={editingTx}
      />
    </>
  )
}
