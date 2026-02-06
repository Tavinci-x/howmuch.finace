"use client"

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { formatCurrency } from "@/lib/currencies"
import { getIcon } from "@/lib/icons"
import type { Category, Transaction } from "@/types"

interface ExpenseDonutProps {
    transactions: Transaction[]
    categoryMap: Map<string, Category>
    currency: string
}

export function ExpenseDonut({ transactions, categoryMap, currency }: ExpenseDonutProps) {
    // Calculate expenses by category
    const expensesByCategory: Record<string, { name: string; value: number; icon: string; color: string }> = {}

    for (const t of transactions) {
        if (t.type !== 'expense') continue
        const cat = categoryMap.get(t.categoryId)
        const name = cat?.name || 'Other'
        const icon = cat?.icon || 'MoreHorizontal'
        const color = cat?.color || '#6b7280'
        if (!expensesByCategory[name]) {
            expensesByCategory[name] = { name, value: 0, icon, color }
        }
        expensesByCategory[name].value += t.amount
    }

    const data = Object.values(expensesByCategory).sort((a, b) => b.value - a.value)
    const total = data.reduce((sum, item) => sum + item.value, 0)

    if (data.length === 0 || total === 0) {
        return null
    }

    return (
        <div className="space-y-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Expenses Breakdown
            </h2>
            <div className="border p-4">
                <div className="flex items-center gap-4">
                    {/* Donut Chart */}
                    <div className="w-24 h-24 flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={28}
                                    outerRadius={40}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Legend */}
                    <div className="flex-1 space-y-1.5">
                        {data.slice(0, 4).map((item, index) => {
                            const Icon = getIcon(item.icon)
                            const percent = ((item.value / total) * 100).toFixed(0)
                            return (
                                <div key={item.name} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-2 h-2"
                                            style={{ backgroundColor: item.color }}
                                        />
                                        <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                                        <span>{item.name}</span>
                                    </div>
                                    <span className="mono text-muted-foreground">{percent}%</span>
                                </div>
                            )
                        })}
                        {data.length > 4 && (
                            <div className="text-xs text-muted-foreground">
                                +{data.length - 4} more
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
