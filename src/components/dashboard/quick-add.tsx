"use client"

import { useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { format } from "date-fns"
import { db } from "@/lib/db"
import { useDefaultCurrency } from "@/hooks/use-settings"
import { getIcon } from "@/lib/icons"
import { useLiveQuery } from "dexie-react-hooks"
import { Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

export function QuickAdd() {
    const { toast } = useToast()
    const currency = useDefaultCurrency()
    const [type, setType] = useState<"expense" | "income">("expense")
    const [amount, setAmount] = useState("")
    const [categoryId, setCategoryId] = useState("")
    const [isAdding, setIsAdding] = useState(false)

    const rawCategories = useLiveQuery(() =>
        db.categories.where("type").anyOf([type, "both"]).toArray()
        , [type])

    // Priority order for categories (lower = higher priority)
    const expensePriority: Record<string, number> = {
        "housing": 1, "rent": 1, "home": 1,
        "food": 2, "dining": 2,
        "utilities": 3, "bills": 3,
        "transport": 4, "transportation": 4,
        "subscriptions": 5,
        "health": 6, "medical": 6,
        "shopping": 7,
        "entertainment": 8,
        "education": 9,
        "other": 99,
    }
    const incomePriority: Record<string, number> = {
        "salary": 1,
        "freelance": 2,
        "investments": 3, "investment": 3,
        "gifts": 4,
        "other": 99,
    }
    function getPriority(name: string): number {
        const lower = name.toLowerCase()
        const priorityMap = type === "expense" ? expensePriority : incomePriority
        for (const [key, priority] of Object.entries(priorityMap)) {
            if (lower.includes(key)) return priority
        }
        return 50
    }
    const categories = rawCategories?.sort((a, b) => getPriority(a.name) - getPriority(b.name))

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!amount || !categoryId) {
            toast({ title: "Please fill in amount and category", variant: "destructive" })
            return
        }

        const numAmount = parseFloat(amount)
        if (isNaN(numAmount) || numAmount <= 0) {
            toast({ title: "Please enter a valid amount", variant: "destructive" })
            return
        }

        await db.transactions.add({
            id: uuidv4(),
            amount: numAmount,
            type,
            categoryId,
            currency,
            date: format(new Date(), "yyyy-MM-dd"),
            note: "",
            createdAt: new Date().toISOString(),
        })

        // Reset form
        setAmount("")
        setCategoryId("")
        setIsAdding(false)
        toast({ title: type === "expense" ? "💸 Expense added" : "💰 Income added" })
    }

    if (!isAdding) {
        return (
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    className="flex-1 mono border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-950 dark:hover:text-green-300"
                    onClick={() => { setType("income"); setIsAdding(true) }}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Income
                </Button>
                <Button
                    variant="outline"
                    className="flex-1 mono border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300"
                    onClick={() => { setType("expense"); setIsAdding(true) }}
                >
                    <Minus className="h-4 w-4 mr-2" />
                    Add Expense
                </Button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="border p-4 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium mono uppercase tracking-wide">
                    {type === "expense" ? "➖ New Expense" : "➕ New Income"}
                </span>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAdding(false)}
                >
                    Cancel
                </Button>
            </div>

            <div className="flex gap-2">
                <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 mono text-lg"
                    autoFocus
                />
                <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        {categories?.map((cat) => {
                            const Icon = getIcon(cat.icon)
                            return (
                                <SelectItem key={cat.id} value={cat.id}>
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4" style={{ color: cat.color }} />
                                        {cat.name}
                                    </div>
                                </SelectItem>
                            )
                        })}
                    </SelectContent>
                </Select>
            </div>

            <Button type="submit" className="w-full mono">
                Add {type === "expense" ? "Expense" : "Income"}
            </Button>
        </form>
    )
}
