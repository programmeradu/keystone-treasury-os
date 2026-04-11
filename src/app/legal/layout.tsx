import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <nav className="border-b border-border/50 px-6 py-4">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <Link href="/" className="text-sm font-black uppercase tracking-widest text-foreground hover:text-primary transition-colors">
                        Keystone
                    </Link>
                    <div className="flex items-center gap-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                        <Link href="/legal/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                        <Link href="/legal/terms" className="hover:text-foreground transition-colors">Terms</Link>
                        <Link href="/legal/cookies" className="hover:text-foreground transition-colors">Cookies</Link>
                    </div>
                </div>
            </nav>
            <main className="max-w-3xl mx-auto px-6 py-12">
                {children}
            </main>
        </div>
    );
}
