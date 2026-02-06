"use client"

import { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import type { Goal } from "@/types"
import { GoalCard } from "./goal-card"
import { GoalForm } from "./goal-form"
import { AddFundsDialog } from "./add-funds-dialog"
import { useToast } from "@/hooks/use-toast"

export function GoalList() {
  const { toast } = useToast()
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [fundsGoal, setFundsGoal] = useState<Goal | null>(null)
  const [fundsOpen, setFundsOpen] = useState(false)

  const goals = useLiveQuery(() => db.goals.toArray())

  async function handleDelete(id: string) {
    await db.goals.delete(id)
    toast({ title: "Goal deleted" })
  }

  return (
    <>
      {!goals || goals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No savings goals yet. Create one to start saving!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => { setEditingGoal(goal); setFormOpen(true) }}
              onDelete={() => handleDelete(goal.id)}
              onAddFunds={() => { setFundsGoal(goal); setFundsOpen(true) }}
            />
          ))}
        </div>
      )}

      <GoalForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingGoal(null) }}
        goal={editingGoal}
      />

      <AddFundsDialog
        open={fundsOpen}
        onOpenChange={(open) => { setFundsOpen(open); if (!open) setFundsGoal(null) }}
        goal={fundsGoal}
      />
    </>
  )
}
