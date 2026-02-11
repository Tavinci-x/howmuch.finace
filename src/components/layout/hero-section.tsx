"use client"

export function HeroSection() {
    return (
        <section className="border-b bg-background">
            <div className="max-w-3xl mx-auto px-4 md:px-6 py-12 md:py-16 text-center space-y-3">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                    Track your finances, without the mess.
                </h2>
                <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
                    Add your income and expenses below to try it out — no account needed.
                </p>
            </div>
        </section>
    )
}
