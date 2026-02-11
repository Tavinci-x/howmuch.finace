"use client"

export function Footer() {
    return (
        <footer className="border-t py-6 text-center space-y-1">
            <p className="text-xs text-muted-foreground font-medium">
                Private. Simple. Yours.
            </p>
            <p className="text-xs text-muted-foreground">
                Built by{" "}
                <a
                    href="https://x.com/Skylab_ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4 hover:text-foreground transition-colors"
                >
                    Tavinci
                </a>
                .
            </p>
        </footer>
    )
}
