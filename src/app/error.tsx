"use client"; // Error boundaries must be client components

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, MoveLeft } from "lucide-react";
import { Logo } from "@/components/icons";
import { DreyvMark } from "@/components/brand/dreyv-mark";
import Link from "next/link";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the exact error to telemetry
        console.error("Global Platform Error Intercepted:", error);
    }, [error]);

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-zinc-100 dark:bg-[#030305] font-sans selection:bg-primary/30">
            {/* Premium Background Pipeline - Adapted from Auth Page */}
            <div className="absolute inset-0 z-0 select-none pointer-events-none">
                {/* 4K Minimal Arch Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 dark:opacity-40"
                    style={{ backgroundImage: `url('/images/auth_bg_minimal_arch_4k.png')` }}
                />
                
                {/* Fade Gradients */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-[#030305] lg:bg-gradient-to-r lg:from-white/40 lg:via-white/10 lg:to-[#030305] dark:from-black/80 dark:via-black/90 dark:to-[#030305]" />
                
                {/* Background grid */}
                <div
                    className="absolute inset-0 opacity-[0.03] dark:opacity-10"
                    style={{
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.8) 1px, transparent 1px)`,
                        backgroundSize: "64px 64px",
                    }}
                />
                
                {/* Fractal Noise Overlay for Texture */}
                <div 
                    className="absolute inset-0 opacity-[0.03] mix-blend-overlay" 
                    style={{ 
                        backgroundImage: `url('data:image/svg+xml;utf8,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E')` 
                    }}
                />
            </div>

            {/* Error Content Card */}
            <div className="relative z-10 max-w-xl w-full px-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Animated Logo/Warning Icon Cluster */}
                <div className="flex justify-center mb-6">
                    <div className="relative group cursor-not-allowed">
                        <div className="absolute inset-0 bg-destructive/20 blur-2xl rounded-full transition-all duration-500 group-hover:bg-destructive/40 group-hover:blur-xl" />
                        <div className="w-16 h-16 bg-background/60 backdrop-blur-2xl border border-destructive/20 rounded-2xl flex items-center justify-center shadow-2xl relative transition-transform duration-500 hover:scale-105">
                            <DreyvMark size={32} className="drop-shadow-md ring-2 ring-destructive/35 rounded-lg" />
                            <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-xl border-2 border-background">
                                <AlertTriangle size={12} strokeWidth={3} />
                            </div>
                        </div>
                    </div>
                </div>

                <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-zinc-900 dark:text-white mb-2 drop-shadow-sm">
                    System Exception
                </h1>
                
                <p className="text-sm md:text-base text-zinc-800/80 dark:text-zinc-300/80 mb-6 max-w-md mx-auto font-medium leading-relaxed">
                    Something went wrong! An unexpected error occurred. Please try again or hang tight while we investigate the disturbance.
                </p>

                {/* Crash Report Readout */}
                <div className="p-4 bg-background/40 backdrop-blur-2xl border border-border rounded-2xl shadow-xl mb-8 text-left overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent pointer-events-none" />
                    
                    <div className="flex items-center justify-between mb-3 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/90 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                <div className="w-2.5 h-2.5 rounded-full bg-orange-500/90 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/90" />
                            </div>
                            <span className="text-[10px] font-mono font-black text-muted-foreground uppercase tracking-[0.2em]">Diagnostic Payload</span>
                        </div>
                    </div>
                    
                    <code className="block relative z-10 text-[11px] font-mono text-destructive break-words p-3.5 bg-background/50 rounded-xl border border-border/50 shadow-inner">
                        {error.message || "Unknown Runtime Disturbance"}
                        {error.digest && (
                            <span className="block mt-3 pt-3 border-t border-border/50 text-[9px] text-muted-foreground uppercase tracking-widest font-black">
                                Digest ID: {error.digest}
                            </span>
                        )}
                    </code>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                        onClick={() => reset()}
                        className="w-full sm:w-auto px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-wider text-[11px] rounded-xl shadow-[0_0_20px_rgba(var(--primary-glow),0.3)] transition-all flex items-center justify-center gap-2.5 group border border-primary/20"
                    >
                        <RefreshCw size={14} strokeWidth={2.5} className="group-hover:rotate-180 transition-transform duration-700" />
                        <span>Reinitialize Sequence</span>
                    </button>
                    <Link
                        href="/app"
                        className="w-full sm:w-auto px-6 py-2.5 bg-background/50 hover:bg-muted/80 text-foreground font-black uppercase tracking-wider text-[11px] border border-border/50 hover:border-border rounded-xl transition-all flex items-center justify-center gap-2.5 backdrop-blur-xl shadow-lg group"
                    >
                        <MoveLeft size={14} strokeWidth={2.5} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Return to workspace</span>
                    </Link>
                </div>
            </div>
            
            {/* Branding Footer */}
            <div className="absolute bottom-8 flex items-center justify-center w-full z-10 opacity-40 hover:opacity-100 transition-opacity duration-500">
                <div className="flex items-center gap-3 cursor-default">
                    <Logo size={20} fillColor="currentColor" className="text-foreground" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground">dreyv Treasury OS</span>
                </div>
            </div>
        </div>
    );
}
