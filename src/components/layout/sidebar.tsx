"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/providers/auth-provider"

const navItems = [
  { href: "/", label: "📊 Dashboard" },
  { href: "/reports", label: "📈 Reports" },
  { href: "/settings", label: "⚙️ Settings" },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  return (
    <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 border-r bg-card">
      <div className="flex h-14 items-center px-4 border-b">
        <h1 className="text-lg font-bold">HowMuch.Finance</h1>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium transition-colors border-l-2",
                isActive
                  ? "border-foreground bg-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-4 py-3 border-t space-y-2">
        {user && (
          <p className="text-xs text-muted-foreground truncate" title={user.email}>
            {user.email}
          </p>
        )}
        <button
          onClick={signOut}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
