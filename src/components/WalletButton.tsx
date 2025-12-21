"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

export function WalletButton() {
    const { publicKey, disconnect, connecting, connected } = useWallet();
    const { setVisible } = useWalletModal();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Button variant="outline" size="sm" className="h-8 gap-2 text-xs font-mono opacity-50">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading
            </Button>
        );
    }

    if (connected && publicKey) {
        return (
            <Button
                variant="outline"
                size="sm"
                onClick={() => disconnect()}
                className="h-8 gap-2 border-border bg-background text-xs font-mono hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors cursor-pointer shadow-sm"
            >
                <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_var(--dashboard-accent-muted)]" />
                {publicKey.toBase58().slice(0, 4)}..{publicKey.toBase58().slice(-4)}
            </Button>
        );
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={() => setVisible(true)}
            className="h-8 gap-2 border-border bg-background text-xs font-medium hover:bg-muted hover:text-foreground transition-colors group shadow-sm"
        >
            <Wallet className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            {connecting ? "Connecting..." : "Connect"}
        </Button>
    );
}
