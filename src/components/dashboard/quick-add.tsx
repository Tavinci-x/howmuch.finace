"use client"

import { useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { format } from "date-fns"
import { db } from "@/lib/db"
import { useDefaultCurrency } from "@/hooks/use-settings"
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

    const categories = useLiveQuery(() =>
        db.categories.where("type").anyOf([type, "both"]).toArray()
        , [type])

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
                    className="flex-1 mono"
                    onClick={() => { setType("expense"); setIsAdding(true) }}
                >
                    <Minus className="h-4 w-4 mr-2" />
                    Add Expense
                </Button>
                <Button
                    variant="outline"
                    className="flex-1 mono"
                    onClick={() => { setType("income"); setIsAdding(true) }}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Income
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
                        {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Button type="submit" className="w-full mono">
                Add {type === "expense" ? "Expense" : "Income"}
            </Button>
        </form>
    )
}
