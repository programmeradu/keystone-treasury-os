"use client";

import { Scan, AlertTriangle, Lock, Divide, ShieldCheck } from "lucide-react";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { useVault } from "@/lib/contexts/VaultContext";
import { useMemo } from "react";

export function RiskRadar() {
    const { theme } = useTheme();
    const { vaultTokens, vaultValue, vaultConfig } = useVault();

    // Live Risk Calculation
    const riskMetrics = useMemo(() => {
        if (!vaultValue || vaultValue === 0) return { concentration: 0, topAsset: "None", multisigSafe: false };

        // 1. Find Concentration (Max asset value / Total value)
        const sortedAssets = [...vaultTokens].sort((a, b) => b.value - a.value);
        const topAsset = sortedAssets[0];
        const concentration = topAsset ? (topAsset.value / vaultValue) * 100 : 0;

        // 2. Multisig Safety Check
        const multisigSafe = vaultConfig ? (vaultConfig.threshold > 1 && vaultConfig.members > 1) : false;

        return {
            concentration: Math.round(concentration),
            topAsset: topAsset?.symbol || "Unknown",
            multisigSafe
        };
    }, [vaultTokens, vaultValue, vaultConfig]);
    return (
        <div className="h-full min-h-[300px] w-full bg-card border border-border rounded-2xl relative overflow-hidden group shadow-lg">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(var(--dashboard-accent-muted)_1px,transparent_1px),linear-gradient(90deg,var(--dashboard-accent-muted)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)] pointer-events-none opacity-20" />

            <div className="p-6 h-full flex flex-col relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 text-primary shadow-[0_0_15px_rgba(54,226,123,0.15)]">
                            <Scan size={16} />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Risk Radar</h3>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Sector Scan Active</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 border border-primary/20">
                        <span className="text-[10px] font-mono font-bold text-primary animate-pulse">Scanning...</span>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center relative perspective-[500px]">
                    {/* Radar Circle Container */}
                    <div className="relative w-48 h-48 flex items-center justify-center [transform:rotateX(20deg)]">
                        {/* Outer Grid Ring */}
                        <div className="absolute inset-0 rounded-full border border-primary/30 shadow-[0_0_20px_rgba(54,226,123,0.1)]" />
                        <div className="absolute inset-2 rounded-full border border-dashed border-primary/20" />
                        <div className="absolute inset-12 rounded-full border border-primary/10" />
                        <div className="absolute inset-24 rounded-full border border-primary/10" />

                        {/* Crosshairs */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-full w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
                        </div>

                        {/* Scanner Sweep (Conic Gradient) */}
                        <div className="absolute inset-0 rounded-full overflow-hidden animate-[spin_3s_linear_infinite]">
                            <div className="w-full h-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,var(--dashboard-accent-muted)_360deg)] opacity-50" />
                        </div>

                        {/* Blips (Dynamic) */}
                        {/* High Concentration Blip - Only show if > 60% */}
                        {riskMetrics.concentration > 60 && (
                            <div className="absolute top-[25%] right-[25%] group/blip cursor-pointer">
                                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444] animate-ping absolute" />
                                <div className="w-2 h-2 rounded-full bg-red-500 relative z-10" />

                                {/* Hover Tooltip */}
                                <div className="absolute left-4 top-0 bg-black/90 text-white text-[9px] p-1.5 rounded border border-white/10 opacity-0 group-hover/blip:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                                    High Concentration: {riskMetrics.topAsset}
                                </div>
                            </div>
                        )}

                        <div className="absolute bottom-[30%] left-[40%]">
                            {/* Safe Blip for OpSec */}
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                        </div>

                        {/* Labels (Floating) */}
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] text-primary font-mono tracking-widest bg-background px-1 border border-primary/20 rounded">LIQUIDITY</div>
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-primary font-mono tracking-widest bg-background px-1 border border-primary/20 rounded">OPSEC</div>
                        <div className="absolute top-1/2 -left-16 -translate-y-1/2 text-[9px] text-primary font-mono tracking-widest bg-background px-1 border border-primary/20 rounded">BALANCE</div>
                        <div className="absolute top-1/2 -right-12 -translate-y-1/2 text-[9px] text-primary font-mono tracking-widest bg-background px-1 border border-primary/20 rounded">VOLATILITY</div>
                    </div>
                </div>

                {/* Legend/Alerts (Compact) */}
                <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="flex flex-col p-2 rounded bg-muted border border-border hover:border-red-500/50 transition-colors group/alert shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={10} className={riskMetrics.concentration > 60 ? "text-red-500" : "text-yellow-500"} />
                                <span className="text-[9px] text-foreground/70 uppercase">Concentration</span>
                            </div>
                            <span className="text-[9px] font-mono font-bold text-foreground">{riskMetrics.concentration}%</span>
                        </div>
                        <div className="w-full bg-foreground/10 h-1 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ${riskMetrics.concentration > 60 ? "bg-red-500" : "bg-yellow-500"}`}
                                style={{ width: `${riskMetrics.concentration}%` }}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col p-2 rounded bg-muted border border-border hover:border-primary/50 transition-colors shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldCheck size={10} className={riskMetrics.multisigSafe ? "text-primary" : "text-yellow-500"} />
                            <span className="text-[9px] text-foreground/70 uppercase">
                                Multisig ({vaultConfig ? `${vaultConfig.threshold}/${vaultConfig.members}` : "1/1"})
                            </span>
                        </div>
                        <div className="flex gap-0.5">
                            {/* Create dynamic bars based on member count (max 5 for UI) */}
                            {Array.from({ length: Math.min(vaultConfig?.members || 1, 5) }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1 flex-1 rounded-full ${i < (vaultConfig?.threshold || 1) ? (riskMetrics.multisigSafe ? 'bg-primary' : 'bg-yellow-500') : 'bg-foreground/10'}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
