"use client"

import { formatCurrency } from "@/lib/currencies"
import { getIcon } from "@/lib/icons"
import type { Budget, Category } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Pencil, Trash2 } from "lucide-react"

interface BudgetCardProps {
  budget: Budget
  category: Category | undefined
  spent: number
  onEdit: () => void
  onDelete: () => void
}

export function BudgetCard({ budget, category, spent, onEdit, onDelete }: BudgetCardProps) {
  const Icon = getIcon(category?.icon || 'MoreHorizontal')
  const percentage = budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0
  const remaining = budget.amount - spent
  const isOverBudget = spent > budget.amount

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: (category?.color || '#6b7280') + '20' }}
          >
            <Icon className="h-4 w-4" style={{ color: category?.color || '#6b7280' }} />
          </div>
          <CardTitle className="text-sm font-medium">{category?.name || 'Unknown'}</CardTitle>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {formatCurrency(spent, budget.currency)} spent
            </span>
            <span className="font-medium">
              {formatCurrency(budget.amount, budget.currency)}
            </span>
          </div>
          <Progress
            value={percentage}
            className={`h-2 ${isOverBudget ? '[&>div]:bg-red-500' : ''}`}
          />
          <p className={`text-xs ${isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
            {isOverBudget
              ? `Over budget by ${formatCurrency(Math.abs(remaining), budget.currency)}`
              : `${formatCurrency(remaining, budget.currency)} remaining`
            }
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
