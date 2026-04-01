"use client";

import { useMemo } from "react";
import { ArrowRight, Copy, ExternalLink, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useVault } from "@/lib/contexts/VaultContext";

interface TokenAccount {
    mint: string;
    amount: number;
    decimals: number;
    symbol?: string;
    name?: string;
    logo?: string;
    price?: number;
    value?: number;
}

export function VaultAssetsCompact({ tokens }: { tokens: TokenAccount[] }) {
    const { refresh, loading } = useVault();

    // ⚡ Bolt: Performance Improvement
    // Memoizing the sort and slice operations to prevent O(N log N) recalculation on every render
    // Expected impact: Reduces main thread blocking during frequent UI updates or polling
    const topTokens = useMemo(() => {
        const sortedTokens = [...tokens].sort((a, b) => {
            if (a.symbol === "SOL") return -1;
            if (b.symbol === "SOL") return 1;
            return (b.value || 0) - (a.value || 0);
        });
        return sortedTokens.slice(0, 5); // Show top 5
    }, [tokens]);

    return (
        <div className="h-full min-h-[300px] w-full bg-card border border-border rounded-2xl relative overflow-hidden flex flex-col shadow-lg">
            <div className="p-6 border-b border-border flex items-center justify-between bg-background/50">
                <div>
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Vault Assets</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{tokens.length} Positions Active</p>
                </div>
                <button
                    onClick={() => refresh()}
                    disabled={loading}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors disabled:opacity-40"
                    title="Refresh vault assets"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {tokens.length === 0 ? (
                    <div className="h-full flex items-center justify-center flex-col gap-2 text-muted-foreground opacity-50">
                        <div className="w-10 h-10 rounded-full bg-muted border border-border" />
                        <span className="text-xs">No assets found</span>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {topTokens.map((token) => (
                            <div key={token.mint} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 group transition-colors">
                                <div className="flex items-center gap-3">
                                    {token.logo ? (
                                        <div className="w-8 h-8 rounded-full overflow-hidden border border-border bg-muted shadow-sm">
                                            <img
                                                src={token.logo}
                                                alt={token.symbol || "Token"}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    // Fallback if image fails to load
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = 'none';
                                                    target.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-primary text-[10px] text-primary-foreground font-bold">' + (token.symbol ? token.symbol[0] : "T") + '</div>';
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] text-white font-black shadow-lg relative overflow-hidden border border-white/5"
                                            style={{
                                                background: `linear-gradient(135deg, var(--dashboard-accent) 0%, #1a1b1e 100%)`,
                                                boxShadow: `0 0 10px rgba(54, 226, 123, 0.1)`
                                            }}>
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.1),transparent)] opacity-50" />
                                            {token.symbol ? token.symbol[0] : "T"}
                                        </div>
                                    )}
                                    <div>
                                        <div className="text-xs font-bold text-foreground flex items-center gap-2">
                                            {token.symbol || "Unknown"}
                                            {token.name && token.name !== token.symbol && (
                                                <span className="text-[9px] text-muted-foreground font-normal truncate max-w-[80px]">
                                                    {token.name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                                            {token.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-mono font-bold text-foreground">
                                        {token.value ? `$${token.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"}
                                    </div>
                                    <div className="text-[10px] font-mono text-muted-foreground">
                                        {token.price ? `$${token.price.toFixed(2)}` : "-"}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-border bg-background/50 sticky bottom-0 backdrop-blur-sm">
                <Link href="/app/treasury">
                    <button className="w-full py-2.5 rounded-lg bg-muted/50 hover:bg-muted border border-border text-xs text-center text-foreground font-bold transition-all flex items-center justify-center gap-2 group">
                        View Full Treasury
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </Link>
            </div>
        </div>
    );
}
