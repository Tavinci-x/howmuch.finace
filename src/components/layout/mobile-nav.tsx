"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/providers/auth-provider"

const navItems = [
  { href: "/", label: "Dashboard", emoji: "📊" },
  { href: "/reports", label: "Reports", emoji: "📈" },
  { href: "/settings", label: "Settings", emoji: "⚙️" },
]

export function MobileNav() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-card">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-1 text-xs transition-colors",
                isActive
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              <span className="text-lg">{item.emoji}</span>
              {item.label}
            </Link>
          )
        })}
        {user ? (
          <button
            onClick={signOut}
            className="flex flex-col items-center gap-0.5 px-4 py-1 text-xs text-muted-foreground transition-colors"
          >
            <span className="text-lg">👋</span>
            Sign out
          </button>
        ) : (
          <Link
            href="/login"
            className="flex flex-col items-center gap-0.5 px-4 py-1 text-xs text-muted-foreground transition-colors"
          >
            <span className="text-lg">🔑</span>
            Log in
          </Link>
        )}
      </div>
    </nav>
  )
}
