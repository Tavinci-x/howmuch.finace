import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns"
import type { TimeRange } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatDateShort(date: string | Date): string {
  return format(new Date(date), 'MMM d')
}

export function formatMonth(month: string): string {
  const [year, m] = month.split('-')
  return format(new Date(parseInt(year), parseInt(m) - 1), 'MMMM yyyy')
}

export function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM')
}

export function getDateRange(range: TimeRange): { start: Date; end: Date } {
  const now = new Date()
  switch (range) {
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) }
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) }
    case 'all':
      return { start: new Date(2000, 0, 1), end: now }
  }
}

export function getLast6Months(): string[] {
  const months: string[] = []
  for (let i = 5; i >= 0; i--) {
    months.push(format(subMonths(new Date(), i), 'yyyy-MM'))
  }
  return months
}
