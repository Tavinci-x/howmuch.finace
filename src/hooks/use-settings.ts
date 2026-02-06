"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"

export function useSetting(key: string): string | undefined {
  return useLiveQuery(
    () => db.settings.where('key').equals(key).first().then(s => s?.value),
    [key]
  )
}

export function useDefaultCurrency(): string {
  const currency = useSetting('defaultCurrency')
  return currency || 'USD'
}
