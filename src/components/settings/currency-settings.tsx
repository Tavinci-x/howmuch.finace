"use client"

import { db } from "@/lib/db"
import { currencies } from "@/lib/currencies"
import { useDefaultCurrency } from "@/hooks/use-settings"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

export function CurrencySettings() {
  const { toast } = useToast()
  const defaultCurrency = useDefaultCurrency()

  async function handleChange(value: string) {
    const setting = await db.settings.where('key').equals('defaultCurrency').first()
    if (setting) {
      await db.settings.update(setting.id, { value })
    }
    toast({ title: `💱 Currency changed to ${value}` })
  }

  return (
    <Select value={defaultCurrency} onValueChange={handleChange}>
      <SelectTrigger className="w-full mono">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {currencies.map((c) => (
          <SelectItem key={c.code} value={c.code} className="mono">
            {c.symbol} {c.code} — {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
