"use client";

import { ArrowRight, Copy, ExternalLink, RefreshCw } from "lucide-react";
import Image from "next/image";

interface TokenAccount {
    mint: string;
    amount: number;
    decimals: number;
    symbol?: string;
    price?: number;
    value?: number;
}

export function VaultAssetsCompact({ tokens }: { tokens: TokenAccount[] }) {
    // Sort by value desc
    const sortedTokens = [...tokens].sort((a, b) => (b.value || 0) - (a.value || 0));
    const topTokens = sortedTokens.slice(0, 5); // Show top 5

    return (
        <div className="h-full min-h-[300px] w-full bg-[#0F1115] border border-white/5 rounded-2xl relative overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#0B0C10]/50">
                <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Vault Assets</h3>
                    <p className="text-[10px] text-[#9eb7a8] uppercase tracking-widest">{tokens.length} Positions Active</p>
                </div>
                <button className="p-1.5 rounded-lg hover:bg-white/5 text-[#9eb7a8] transition-colors">
                    <RefreshCw size={14} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {tokens.length === 0 ? (
                    <div className="h-full flex items-center justify-center flex-col gap-2 text-[#9eb7a8] opacity-50">
                        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/5" />
                        <span className="text-xs">No assets found</span>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {topTokens.map((token) => (
                            <div key={token.mint} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 group transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#36e27b] to-[#25a85c] flex items-center justify-center text-[10px] text-[#0B0C10] font-bold shadow-[0_0_10px_rgba(54,226,123,0.2)]">
                                        {token.symbol ? token.symbol[0] : "T"}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-white flex items-center gap-2">
                                            {token.symbol || "Unknown"}
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-[#9eb7a8] group-hover:bg-[#36e27b]/10 group-hover:text-[#36e27b] transition-colors">
                                                Active
                                            </span>
                                        </div>
                                        <div className="text-[10px] font-mono text-[#9eb7a8] flex items-center gap-1">
                                            {token.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-mono font-bold text-white">
                                        {token.value ? `$${token.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"}
                                    </div>
                                    <div className="text-[10px] font-mono text-[#9eb7a8]">
                                        {token.price ? `$${token.price.toFixed(2)}` : "-"}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-white/5 bg-[#0B0C10]/50 sticky bottom-0 backdrop-blur-sm">
                <button className="w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-center text-white font-bold transition-all flex items-center justify-center gap-2 group">
                    View Full Treasury
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    );
}
