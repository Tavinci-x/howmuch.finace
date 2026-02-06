import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { DBProvider } from "@/components/providers/db-provider"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "HowMuch Finance",
  description: "Personal finance tracker",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DBProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 md:ml-56">
                <div className="p-4 md:p-6 pb-20 md:pb-6 max-w-3xl mx-auto">
                  {children}
                </div>
              </main>
              <MobileNav />
            </div>
            <Toaster />
          </DBProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
