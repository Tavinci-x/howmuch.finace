"use client"

import { formatCurrency } from "@/lib/currencies"
import { formatDate } from "@/lib/utils"
import type { Goal } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Pencil, Trash2, Plus } from "lucide-react"

interface GoalCardProps {
  goal: Goal
  onEdit: () => void
  onDelete: () => void
  onAddFunds: () => void
}

export function GoalCard({ goal, onEdit, onDelete, onAddFunds }: GoalCardProps) {
  const percentage = goal.targetAmount > 0
    ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
    : 0
  const isComplete = goal.currentAmount >= goal.targetAmount
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: goal.color }}
          />
          <CardTitle className="text-sm font-medium">{goal.name}</CardTitle>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onAddFunds}>
              <Plus className="h-4 w-4 mr-2" /> Add/Withdraw
            </DropdownMenuItem>
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
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: goal.color }}>
              {formatCurrency(goal.currentAmount, goal.currency)}
            </p>
            <p className="text-sm text-muted-foreground">
              of {formatCurrency(goal.targetAmount, goal.currency)}
            </p>
          </div>

          <Progress
            value={percentage}
            className="h-2"
            style={{ ['--progress-color' as string]: goal.color }}
          />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{percentage.toFixed(0)}% complete</span>
            <span>
              {isComplete
                ? "Goal reached!"
                : `${daysLeft} days left`
              }
            </span>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Deadline: {formatDate(goal.deadline)}
          </p>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onAddFunds}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Funds
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
