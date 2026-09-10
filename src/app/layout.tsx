import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { AuthProvider } from "@/components/providers/auth-provider"
import { AppShell } from "@/components/layout/app-shell"
import { Toaster } from "@/components/ui/toaster"
import localFont from "next/font/local"

const ledgerMono = localFont({ src:"./fonts/GeistMonoVF.woff", variable:"--font-ledger-mono" })

export const metadata: Metadata = {
  title: "HowMuch Finance",
  description: "Personal finance tracker",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💰</text></svg>",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={ledgerMono.variable}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <AppShell>{children}</AppShell>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
