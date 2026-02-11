"use client"

import { useEffect, useState, useRef } from "react"
import { seedDatabase } from "@/lib/seed"
import { useAuth } from "@/components/providers/auth-provider"
import { initialSync, startBackgroundSync, stopBackgroundSync } from "@/lib/sync"

export function DBProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const { user } = useAuth()
  const syncStarted = useRef(false)

  useEffect(() => {
    async function init() {
      // Seed default categories
      await seedDatabase()

      // If logged in, sync with Supabase
      if (user && !syncStarted.current) {
        syncStarted.current = true
        try {
          await initialSync(user.id)
          startBackgroundSync(user.id)
        } catch (error) {
          console.error('[DBProvider] Sync failed, using local data:', error)
        }
      }

      setReady(true)
    }

    init()

    return () => {
      if (syncStarted.current) {
        stopBackgroundSync()
        syncStarted.current = false
      }
    }
  }, [user])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return <>{children}</>
}
