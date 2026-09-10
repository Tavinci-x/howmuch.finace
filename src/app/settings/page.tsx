"use client"

import { ThemeToggle } from "@/components/settings/theme-toggle"
import { CategoryManager } from "@/components/settings/category-manager"
import { DataManagement } from "@/components/settings/data-management"
import { AccountSettings, ImportHistory, MerchantRuleSettings } from "@/components/settings/ledger-settings"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold mono">⚙️ Settings</h1>
        <p className="text-sm text-muted-foreground mono">
          Customize your experience
        </p>
      </div>

      {/* Theme */}
      <div className="border p-4 space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Appearance
        </h2>
        <ThemeToggle />
      </div>

      {/* Accounts */}
      <div className="border p-4 space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Accounts & balances
        </h2>
        <AccountSettings />
      </div>

      <div className="border p-4 space-y-3"><h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Merchant Rules</h2><MerchantRuleSettings /></div>
      <div className="border p-4 space-y-3"><h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Import History</h2><ImportHistory /></div>

      {/* Categories */}
      <div className="border p-4 space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Categories
        </h2>
        <CategoryManager />
      </div>

      {/* Data */}
      <div className="border p-4 space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Data Management
        </h2>
        <DataManagement />
      </div>
    </div>
  )
}
