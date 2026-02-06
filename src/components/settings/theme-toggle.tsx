"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Sun, Moon, Monitor } from "lucide-react"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const options = [
    { value: "light", label: "☀️ Light", icon: Sun },
    { value: "dark", label: "🌙 Dark", icon: Moon },
    { value: "system", label: "💻 System", icon: Monitor },
  ]

  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <Button
          key={option.value}
          variant={theme === option.value ? "default" : "outline"}
          className={cn("flex-1 mono")}
          onClick={() => setTheme(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
