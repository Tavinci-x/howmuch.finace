import {
  UtensilsCrossed,
  Car,
  Home,
  Zap,
  Gamepad2,
  ShoppingBag,
  Heart,
  GraduationCap,
  CreditCard,
  MoreHorizontal,
  Briefcase,
  Laptop,
  TrendingUp,
  Gift,
  type LucideIcon,
} from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  UtensilsCrossed,
  Car,
  Home,
  Zap,
  Gamepad2,
  ShoppingBag,
  Heart,
  GraduationCap,
  CreditCard,
  MoreHorizontal,
  Briefcase,
  Laptop,
  TrendingUp,
  Gift,
}

export function getIcon(name: string): LucideIcon {
  return iconMap[name] || MoreHorizontal
}

export const availableIcons = Object.keys(iconMap)
