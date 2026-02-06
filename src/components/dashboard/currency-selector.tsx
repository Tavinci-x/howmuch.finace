"use client"

import { db } from "@/lib/db"
import { currencies, getCurrency } from "@/lib/currencies"
import { useDefaultCurrency } from "@/hooks/use-settings"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"

export function CurrencySelector() {
    const { toast } = useToast()
    const currencyCode = useDefaultCurrency()
    const currency = getCurrency(currencyCode)

    async function handleChange(code: string) {
        const setting = await db.settings.where('key').equals('defaultCurrency').first()
        if (setting) {
            await db.settings.update(setting.id, { value: code })
        }
        toast({ title: `Currency changed to ${code}` })
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                    <span className="font-medium">{currency.symbol}</span>
                    <span className="text-muted-foreground">{currencyCode}</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
                {currencies.map((c) => (
                    <DropdownMenuItem
                        key={c.code}
                        onClick={() => handleChange(c.code)}
                        className={currencyCode === c.code ? "bg-accent" : ""}
                    >
                        <span className="w-8 font-medium">{c.symbol}</span>
                        <span className="mr-2">{c.code}</span>
                        <span className="text-muted-foreground text-sm">{c.name}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
