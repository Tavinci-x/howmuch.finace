"use client"

import Link from "next/link"

export function LandingHeader() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="max-w-3xl mx-auto flex h-14 items-center justify-between px-4 md:px-6">
                <h1 className="text-lg font-bold">HowMuch.Finance</h1>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                        Login to save your data
                    </span>
                    <Link
                        href="/login"
                        className="inline-flex h-8 items-center justify-center border border-input bg-background px-4 text-sm font-medium hover:bg-accent transition-colors"
                    >
                        Log in
                    </Link>
                </div>
            </div>
        </header>
    )
}
