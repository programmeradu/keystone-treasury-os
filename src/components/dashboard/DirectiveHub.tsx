"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionTemplate, useMotionValue } from "framer-motion";
import { Activity, Cpu, Hexagon } from "lucide-react";
import { useTheme } from "@/lib/contexts/ThemeContext";

interface Directive {
    id: string;
    type: "SIGNATURE" | "INFRA" | "SWAP";
    title: string;
    subtitle: string;
    priority: "CRITICAL" | "ROUTINE" | "LOW";
    progress?: number;
    timestamp: string;
}

const DIRECTIVES: Directive[] = [
    {
        id: "dir_01",
        type: "SIGNATURE",
        title: "DEV_GUILD_GRANT",
        subtitle: "5,000 USDC • 2/3 SIGS",
        priority: "CRITICAL",
        progress: 66,
        timestamp: "2M_AGO"
    },
    {
        id: "dir_02",
        type: "INFRA",
        title: "AWS_SERVER_SYNC",
        subtitle: "240.21 USDC • COMPLETED",
        priority: "ROUTINE",
        progress: 100,
        timestamp: "1H_AGO"
    },
    {
        id: "dir_03",
        type: "SWAP",
        title: "SOL_USDC_VECTOR",
        subtitle: "CONFIRM RATE • PENDING",
        priority: "LOW",
        progress: 0,
        timestamp: "4H_AGO"
    }
];

const CharacterShuffle = ({ text }: { text: string }) => {
    const [displayText, setDisplayText] = useState(text);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>[]{}/\\|";

    useEffect(() => {
        let iteration = 0;
        const interval = setInterval(() => {
            setDisplayText(
                text
                    .split("")
                    .map((char, index) => {
                        if (index < iteration) return text[index];
                        return chars[Math.floor(Math.random() * chars.length)];
                    })
                    .join("")
            );
            if (iteration >= text.length) clearInterval(interval);
            iteration += 1 / 2.5;
        }, 30);
        return () => clearInterval(interval);
    }, [text]);

    return <span>{displayText}</span>;
};

const HexStatusNode = ({ color, critical = false }: { color: string; critical?: boolean }) => (
    <div className="relative w-12 h-12 flex items-center justify-center">
        {/* Outer Rotating Ring */}
        <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
            <svg viewBox="0 0 100 100" className="w-full h-full opacity-20">
                <path d="M50 5 L90 27 L90 73 L50 95 L10 73 L10 27 Z" fill="none" stroke={color} strokeWidth="2" strokeDasharray="10 5" />
            </svg>
        </motion.div>

        {/* Core Hexagon */}
        <div className="relative z-10">
            <Hexagon size={24} style={{ color, fill: `${color}11` }} className={critical ? "animate-pulse" : ""} />
            {critical && (
                <div className="absolute inset-0 bg-current blur-md opacity-40 animate-pulse rounded-full" style={{ color }} />
            )}
        </div>
    </div>
);

export function DirectiveHub() {
    const { theme } = useTheme();
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = ({ currentTarget, clientX, clientY }: React.MouseEvent) => {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    };

    const holographicBackground = useMotionTemplate`
        radial-gradient(
            400px circle at ${mouseX}px ${mouseY}px,
            ${theme === 'light' ? 'rgba(22, 163, 74, 0.08)' : 'rgba(54, 226, 123, 0.08)'},
            transparent 80%
        )
    `;

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            className="bg-card backdrop-blur-[40px] border border-border rounded-[2rem] overflow-hidden flex flex-col h-full group/hub relative shadow-xl"
        >
            {/* Holographic Mouse Reflection */}
            <motion.div
                className="absolute inset-0 pointer-events-none z-0"
                style={{ background: holographicBackground }}
            />

            {/* Tactical Grid Background */}
            <div className={`absolute inset-0 ${theme === 'light' ? 'opacity-[0.01]' : 'opacity-[0.03]'} pointer-events-none z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay`} />

            <div className="p-4 border-b border-border flex justify-between items-center bg-white/[0.03] z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center relative overflow-hidden group-hover/hub:border-primary/50 transition-colors">
                        <Cpu className="text-primary" size={16} />
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-t from-transparent via-primary/20 to-transparent"
                            animate={{ y: ["100%", "-100%"] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        />
                    </div>
                    <div>
                        <h2 className="text-foreground font-black text-[10px] tracking-[0.3em] uppercase leading-none mb-1">Tactical Feed</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-[8px] text-primary font-mono animate-pulse font-bold tracking-tighter opacity-70">OS_KERNEL::DIRECTIVES_READY</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                    <div className="text-[8px] text-foreground/40 font-mono tracking-widest uppercase">Enc_High</div>
                    <div className="flex gap-0.5">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`w-1 h-1 rounded-sm ${i <= 3 ? 'bg-primary' : 'bg-muted'}`} />
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-3 flex flex-col gap-3 overflow-y-auto flex-1 custom-scrollbar z-10">
                <AnimatePresence>
                    {DIRECTIVES.map((directive, index) => (
                        <motion.div
                            key={directive.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative group/directive"
                        >
                            {/* Slanted Armor Card */}
                            <div
                                className="relative bg-background border border-border p-4 transition-all duration-500 hover:scale-[1.01] group-hover/directive:border-primary/40 overflow-hidden"
                                style={{
                                    clipPath: "polygon(0 0, 93% 0, 100% 15%, 100% 100%, 7% 100%, 0 85%)"
                                }}
                            >
                                {/* Hex-Grid Overlay for Card Inner */}
                                <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[radial-gradient(var(--dashboard-accent)_1px,transparent_1px)] bg-[size:8px_8px]" />

                                <div className="flex gap-3 relative z-10">
                                    {/* Advanced Hex Node - Slightly Smaller */}
                                    <div className="scale-75 origin-center">
                                        <HexStatusNode
                                            color={directive.priority === "CRITICAL" ? "#ff5b39" : (theme === 'light' ? "#16A34A" : "#36e27b")}
                                            critical={directive.priority === "CRITICAL"}
                                        />
                                    </div>

                                    <div className="flex-1 min-w-0 flex flex-col justify-center -ml-2">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[9px] font-black tracking-[0.1em] uppercase ${directive.priority === "CRITICAL" ? "text-[#ff5b39]" : "text-primary"
                                                    }`}>
                                                    <CharacterShuffle text={directive.title} />
                                                </span>
                                                {directive.priority === "CRITICAL" && (
                                                    <div className="px-1 py-0.2 bg-[#ff5b39]/10 border border-[#ff5b39]/30 rounded-[2px] leading-none">
                                                        <span className="text-[7px] font-black text-[#ff5b39] animate-pulse">REQ</span>
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[8px] font-mono text-foreground/20 font-bold uppercase tracking-widest">{directive.timestamp}</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mb-3 font-mono uppercase tracking-tight leading-none italic">{directive.subtitle}</p>

                                        {/* Laser-Sync Progress Line */}
                                        {directive.progress !== undefined && (
                                            <div className="relative h-[2px] w-full bg-muted rounded-full">
                                                <motion.div
                                                    className="absolute h-full shadow-[0_0_8px_currentColor] bg-current"
                                                    style={{ color: directive.priority === "CRITICAL" ? "#ff5b39" : (theme === 'light' ? "#16A34A" : "#36e27b") }}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${directive.progress}%` }}
                                                    transition={{ duration: 1.2, delay: 0.6, ease: "circOut" }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Tactical Corner Accent */}
                            <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none opacity-0 group-hover/directive:opacity-100 transition-opacity">
                                <div className="absolute top-0 right-0 w-[1px] h-full bg-[#36e27b]/50" />
                                <div className="absolute top-0 right-0 h-[1px] w-full bg-[#36e27b]/50" />
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Tactical Footer Action - Compact */}
            <div className="p-4 border-t border-border bg-white/[0.02] z-10">
                <button className="w-full py-2 group/btn relative overflow-hidden flex items-center justify-center gap-2 rounded-lg border border-border hover:border-primary/30 transition-all">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000" />
                    <Activity size={14} className="text-primary" />
                    <span className="text-[9px] font-black text-foreground tracking-[0.3em] uppercase group-hover/btn:text-primary transition-colors">INIT_VECT_ALL</span>
                </button>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(54, 226, 123, 0.3);
                }
            `}</style>
        </div>
    );
}
