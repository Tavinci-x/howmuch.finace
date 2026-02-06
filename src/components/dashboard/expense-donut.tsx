"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { getIcon } from "@/lib/icons"
import type { Category, Transaction, TransactionType } from "@/types"

interface BreakdownDonutProps {
    transactions: Transaction[]
    categoryMap: Map<string, Category>
    type: TransactionType
}

export function BreakdownDonut({ transactions, categoryMap, type }: BreakdownDonutProps) {
    const byCategory: Record<string, { name: string; value: number; icon: string; color: string }> = {}

    for (const t of transactions) {
        if (t.type !== type) continue
        const cat = categoryMap.get(t.categoryId)
        const name = cat?.name || 'Other'
        const icon = cat?.icon || 'MoreHorizontal'
        const color = cat?.color || '#6b7280'
        if (!byCategory[name]) {
            byCategory[name] = { name, value: 0, icon, color }
        }
        byCategory[name].value += t.amount
    }

    const preferredOrder = type === 'expense'
        ? ['Housing', 'Food & Dining', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Health', 'Education', 'Subscriptions', 'Other']
        : ['Salary', 'Freelance', 'Gifts', 'Investments', 'Other Income']

    const data = Object.values(byCategory).sort((a, b) => {
        const aName = a.name.replace(/^[^\w]*/, '')
        const bName = b.name.replace(/^[^\w]*/, '')
        const aIdx = preferredOrder.findIndex(o => aName.includes(o))
        const bIdx = preferredOrder.findIndex(o => bName.includes(o))
        const aPri = aIdx >= 0 ? aIdx : preferredOrder.length
        const bPri = bIdx >= 0 ? bIdx : preferredOrder.length
        return aPri - bPri
    })
    const total = data.reduce((sum, item) => sum + item.value, 0)

    if (data.length === 0 || total === 0) {
        return (
            <div className="flex-1 text-center py-6 text-muted-foreground text-xs">
                No {type} data
            </div>
        )
    }

    return (
        <div className="flex-1 min-w-0">
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
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (!active || !payload?.length) return null
                                    const item = payload[0].payload
                                    const percent = ((item.value / total) * 100).toFixed(1)
                                    return (
                                        <div className="bg-popover border rounded-md px-3 py-1.5 text-sm shadow-md">
                                            <span className="font-medium">{item.name}</span>
                                            <span className="ml-2 mono text-muted-foreground">{percent}%</span>
                                        </div>
                                    )
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-1.5 min-w-0">
                    {data.slice(0, 4).map((item) => {
                        const Icon = getIcon(item.icon)
                        return (
                            <div key={item.name} className="flex items-center text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div
                                        className="w-2 h-2 shrink-0"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: item.color }} />
                                    <span className="truncate">{item.name}</span>
                                </div>
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
    )
}

// Keep backward-compatible export
export function ExpenseDonut({ transactions, categoryMap }: { transactions: Transaction[]; categoryMap: Map<string, Category>; currency: string }) {
    return <BreakdownDonut transactions={transactions} categoryMap={categoryMap} type="expense" />
}
