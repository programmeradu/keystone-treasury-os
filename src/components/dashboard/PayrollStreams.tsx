"use client";

import React, { useRef, useState, useLayoutEffect, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatars";
import { Wallet, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { useRouter } from "next/navigation";
import { useVault } from "@/lib/contexts/VaultContext";

type DerivedStream = {
    id: string;
    name: string;
    rateLabel: string;
    avatar: string;
    monthlyUsd: number;
};

export function PayrollStreams() {
    const { theme } = useTheme();
    const router = useRouter();
    const { recentTransactions, loading, activeVault } = useVault();
    const visualizerRef = useRef<HTMLDivElement>(null);
    const treasuryRef = useRef<HTMLDivElement>(null);
    const payeeRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [paths, setPaths] = useState<Record<string, string>>({});

    const streams = useMemo<DerivedStream[]>(() => {
        const candidates = (recentTransactions || [])
            .filter((tx: any) => {
                if (!tx?.success) return false;
                const amountText = String(tx?.amount || "");
                const numeric = Number(amountText.replace(/[^0-9.-]/g, ""));
                return Number.isFinite(numeric) && numeric < 0;
            })
            .slice(0, 20)
            .map((tx: any) => {
                const amountText = String(tx?.amount || "0");
                const value = Math.abs(Number(amountText.replace(/[^0-9.-]/g, "")));
                const token = (tx?.token || "USDC").toUpperCase();
                const sig = String(tx?.signature || "");
                const short = sig ? `${sig.slice(0, 4)}…${sig.slice(-4)}` : "Unknown";
                const name = `Payee ${short}`;
                return {
                    id: sig || `${tx?.slot || Math.random()}`,
                    name,
                    monthlyUsd: value,
                    rateLabel: `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${token}`,
                    avatar: getAvatarUrl(name),
                };
            });

        // Aggregate by payee label and keep top 3
        const merged = new Map<string, DerivedStream>();
        for (const c of candidates) {
            const existing = merged.get(c.name);
            if (!existing) {
                merged.set(c.name, c);
                continue;
            }
            existing.monthlyUsd += c.monthlyUsd;
            existing.rateLabel = `${existing.monthlyUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`;
        }
        return [...merged.values()]
            .sort((a, b) => b.monthlyUsd - a.monthlyUsd)
            .slice(0, 3);
    }, [recentTransactions]);

    const totalMonthlyFlow = useMemo(
        () => streams.reduce((sum, s) => sum + s.monthlyUsd, 0),
        [streams],
    );

    // The core fix: Calculate coordinates relative to the VISUALIZER container
    const updatePaths = () => {
        if (!visualizerRef.current || !treasuryRef.current) return;

        const containerRect = visualizerRef.current.getBoundingClientRect();
        const treasuryRect = treasuryRef.current.getBoundingClientRect();

        // START POINT: Center-right edge of the Treasury icon
        const startX = treasuryRect.right - containerRect.left;
        const startY = (treasuryRect.top + treasuryRect.height / 2) - containerRect.top;

        const newPaths: { [key: string]: string } = {};

        streams.forEach((stream) => {
            const payeeEl = payeeRefs.current[stream.id];
            if (payeeEl) {
                const payeeRect = payeeEl.getBoundingClientRect();

                // END POINT: Center-left edge of the Payee capsule
                const endX = payeeRect.left - containerRect.left;
                const endY = (payeeRect.top + payeeRect.height / 2) - containerRect.top;

                // Smooth Bezier Curve
                const deltaX = endX - startX;
                const cp1x = startX + deltaX * 0.4;
                const cp2x = startX + deltaX * 0.6;

                newPaths[stream.id] = `M ${startX} ${startY} C ${cp1x} ${startY}, ${cp2x} ${endY}, ${endX} ${endY}`;
            }
        });

        setPaths(newPaths);
    };

    useLayoutEffect(() => {
        // Initial calculation
        updatePaths();

        // Watch for resizes and layout shifts
        const observer = new ResizeObserver(() => {
            updatePaths();
        });

        if (visualizerRef.current) {
            observer.observe(visualizerRef.current);
        }

        window.addEventListener("resize", updatePaths);

        // Safety timeout for hydration
        const timer = setTimeout(updatePaths, 300);

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", updatePaths);
            clearTimeout(timer);
        };
    }, [streams]);

    return (
        <div className="bg-card backdrop-blur-[24px] border border-border rounded-[2rem] p-8 flex flex-col relative overflow-hidden h-[450px] shadow-lg">
            {/* Header */}
            <div className="flex justify-between items-start mb-6 z-10">
                <div>
                    <h2 className="text-muted-foreground uppercase tracking-widest text-xs font-semibold mb-1">Payroll Streams</h2>
                    <p className="text-xl font-bold text-foreground">
                        {totalMonthlyFlow.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC{" "}
                        <span className="text-muted-foreground text-sm font-normal">/ month flowing</span>
                    </p>
                </div>
                <button
                    onClick={() => router.push("/app/treasury")}
                    className="p-2 rounded-full hover:bg-muted/10 transition-colors text-muted-foreground"
                    title="Manage payroll in Treasury"
                >
                    <MoreHorizontal size={20} />
                </button>
            </div>

            {/* Visualizer Container - Correct Coordinate Parent */}
            <div
                ref={visualizerRef}
                className="flex-1 flex items-center justify-between relative px-2"
            >

                {/* 1. Treasury Node */}
                <div ref={treasuryRef} className="relative z-20">
                    <div className="w-16 h-16 rounded-2xl bg-background border border-border flex items-center justify-center shadow-lg group hover:scale-105 transition-transform duration-300">
                        <Wallet className="text-primary" size={32} />
                    </div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap font-bold uppercase tracking-tighter">Treasury</div>
                </div>

                {/* 2. SVG Paths Layer */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                    <svg className="w-full h-full overflow-visible">
                        <defs>
                            <linearGradient id="streamFlowGradientFinal" x1="0" x2="1" y1="0" y2="0">
                                <stop offset="0%" stopColor={theme === 'light' ? '#16A34A' : "#36e27b"} stopOpacity="0.8" />
                                <stop offset="100%" stopColor={theme === 'light' ? '#16A34A' : "#36e27b"} stopOpacity="0.1" />
                            </linearGradient>
                        </defs>

                        {streams.map((stream) => (
                            <path
                                key={`stream-line-final-${stream.id}`}
                                className="animate-flow"
                                d={paths[stream.id] || ""}
                                fill="none"
                                stroke="url(#streamFlowGradientFinal)"
                                strokeDasharray="4 4"
                                strokeWidth="2"
                            />
                        ))}
                    </svg>
                </div>

                {/* 3. Payee Nodes */}
                <div className="flex flex-col gap-10 z-20 mr-4">
                    {streams.length === 0 && (
                        <div className="w-52 rounded-xl border border-border bg-input/50 p-4 text-xs text-muted-foreground">
                            {activeVault ? (loading ? "Loading payroll flow..." : "No outgoing payroll-like transfers detected yet.") : "Connect a vault to see payroll streams."}
                        </div>
                    )}
                    {streams.map((stream) => (
                        <motion.div
                            key={stream.id}
                            drag
                            dragConstraints={visualizerRef}
                            dragMomentum={false}
                            onDrag={updatePaths}
                            className={`flex items-center gap-3 p-2 pr-4 rounded-full bg-input backdrop-blur-md border border-border hover:border-primary/50 transition-colors cursor-grab active:cursor-grabbing w-52 group shadow-sm`}
                            ref={(el) => { payeeRefs.current[stream.id] = el; }}
                        >
                            <Avatar className="h-10 w-10 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all pointer-events-none">
                                <AvatarImage src={stream.avatar} />
                                <AvatarFallback className="bg-muted text-[10px]">{stream.name.substring(0, 1)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col pointer-events-none select-none">
                                <span className="text-xs font-bold text-foreground whitespace-nowrap group-hover:text-primary transition-colors">{stream.name}</span>
                                <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-tighter">Streaming...</span>
                            </div>
                            <span className="ml-auto text-sm text-primary font-mono font-black pointer-events-none select-none">{stream.rateLabel}</span>
                        </motion.div>
                    ))}
                </div>
            </div>

            <style jsx global>{`
                @keyframes flow {
                    0% { stroke-dashoffset: 24; }
                    100% { stroke-dashoffset: 0; }
                }
                .animate-flow {
                    animation: flow 1s linear infinite;
                }
            `}</style>
        </div>
    );
}
