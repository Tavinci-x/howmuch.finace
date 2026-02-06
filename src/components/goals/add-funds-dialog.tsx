"use client"

import { useState } from "react"
import { db } from "@/lib/db"
import { formatCurrency } from "@/lib/currencies"
import type { Goal } from "@/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface AddFundsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: Goal | null
}

export function AddFundsDialog({ open, onOpenChange, goal }: AddFundsDialogProps) {
  const { toast } = useToast()
  const [amount, setAmount] = useState("")
  const [mode, setMode] = useState<"add" | "withdraw">("add")

  if (!goal) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!goal) return

    const value = parseFloat(amount)
    if (isNaN(value) || value <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" })
      return
    }

    const newAmount = mode === "add"
      ? goal.currentAmount + value
      : Math.max(0, goal.currentAmount - value)

    await db.goals.update(goal.id, { currentAmount: newAmount })
    toast({
      title: mode === "add"
        ? `Added ${formatCurrency(value, goal.currency)} to ${goal.name}`
        : `Withdrew ${formatCurrency(value, goal.currency)} from ${goal.name}`,
    })
    setAmount("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setAmount("") }}>
      <DialogContent className="sm:max-w-[350px]">
        <DialogHeader>
          <DialogTitle>Update {goal.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Current Progress</p>
            <p className="text-xl font-bold">
              {formatCurrency(goal.currentAmount, goal.currency)}{" "}
              <span className="text-muted-foreground font-normal text-sm">
                / {formatCurrency(goal.targetAmount, goal.currency)}
              </span>
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "add" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("add")}
            >
              Add Funds
            </Button>
            <Button
              type="button"
              variant={mode === "withdraw" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setMode("withdraw")}
            >
              Withdraw
            </Button>
          </div>

          <div>
            <Label htmlFor="funds-amount">Amount</Label>
            <Input
              id="funds-amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {mode === "add" ? "Add" : "Withdraw"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
