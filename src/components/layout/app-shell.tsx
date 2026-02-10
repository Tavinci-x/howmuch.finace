"use client"

import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { DBProvider } from "@/components/providers/db-provider"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"
import { useEffect, useState } from "react"

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const { user, loading } = useAuth()
    const [isOAuthCallback, setIsOAuthCallback] = useState(false)

    const isLoginPage = pathname === "/login"

    // Detect OAuth callback (hash fragment with access_token)
    useEffect(() => {
        if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
            setIsOAuthCallback(true)
        }
    }, [])

    // Clear OAuth callback flag once auth resolves
    useEffect(() => {
        if (!loading && user && isOAuthCallback) {
            setIsOAuthCallback(false)
        }
    }, [loading, user, isOAuthCallback])

    useEffect(() => {
        if (!loading && !user && !isLoginPage && !isOAuthCallback) {
            router.push("/login")
        }
        if (!loading && user && isLoginPage) {
            router.push("/")
        }
    }, [user, loading, isLoginPage, isOAuthCallback, router])

    // Show loading spinner while checking auth or processing OAuth callback
    if (loading || isOAuthCallback) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        )
    }

    // Login page — no sidebar, no nav
    if (isLoginPage) {
        return <>{children}</>
    }

    // Not authenticated — don't render anything (redirect will happen)
    if (!user) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-muted-foreground">Redirecting...</div>
            </div>
        )
    }

    // Authenticated — full app shell
    return (
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
        </DBProvider>
    )
}

