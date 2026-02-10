"use client"

import { useState } from "react"
import { db } from "@/lib/db"
import { seedDatabase } from "@/lib/seed"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Download, Upload, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function DataManagement() {
  const { toast } = useToast()
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleExport() {
    const data = {
      transactions: await db.transactions.toArray(),
      categories: await db.categories.toArray(),
      budgets: await db.budgets.toArray(),
      goals: await db.goals.toArray(),
      settings: await db.settings.toArray(),
      exportedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `howmuch-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Data exported successfully" })
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (data.transactions) {
        await db.transactions.clear()
        await db.transactions.bulkAdd(data.transactions)
      }
      if (data.categories) {
        await db.categories.clear()
        await db.categories.bulkAdd(data.categories)
      }
      if (data.budgets) {
        await db.budgets.clear()
        await db.budgets.bulkAdd(data.budgets)
      }
      if (data.goals) {
        await db.goals.clear()
        await db.goals.bulkAdd(data.goals)
      }
      if (data.settings) {
        await db.settings.clear()
        await db.settings.bulkAdd(data.settings)
      }

      toast({ title: "Data imported successfully" })
    } catch {
      toast({ title: "Failed to import data. Invalid file.", variant: "destructive" })
    }

    // Reset file input
    e.target.value = ""
  }

  async function handleClearAll() {
    await db.transactions.clear()
    await db.categories.clear()
    await db.budgets.clear()
    await db.goals.clear()
    await db.settings.clear()
    await seedDatabase()
    setShowConfirm(false)
    toast({ title: "All data cleared and defaults restored" })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={handleExport} className="flex-1">
            <Download className="h-4 w-4 mr-2" /> Export Data (JSON)
          </Button>
          <div className="flex-1">
            <Label htmlFor="import-file" className="cursor-pointer">
              <Button variant="outline" className="w-full" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" /> Import Data (JSON)
                </span>
              </Button>
            </Label>
            <input
              id="import-file"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </div>

        <Separator />

        {showConfirm ? (
          <div className="border border-destructive/50 bg-destructive/5 p-4 space-y-3">
            <p className="text-sm font-medium text-destructive">
              ⚠️ Are you sure you want to clear all data?
            </p>
            <p className="text-sm text-muted-foreground">
              You will lose all your transactions, categories, budgets, and goals. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="destructive" onClick={handleClearAll}>
                Yes, Clear All Data
              </Button>
              <Button variant="outline" onClick={() => setShowConfirm(false)}>
                No, Go Back
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              This will delete all your data and restore default categories. This action cannot be undone.
            </p>
            <Button variant="destructive" onClick={() => setShowConfirm(true)}>
              <Trash2 className="h-4 w-4 mr-2" /> Clear All Data
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
