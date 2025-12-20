"use client";

import { useEffect, useState, useRef } from "react";
import { Terminal, Cpu, Activity, ShieldCheck, Zap } from "lucide-react";
import { useAppEvent } from "@/lib/events";
import { IntentRegistry } from "@/lib/agents/registry";

interface LogEntry {
    id: string;
    timestamp: string;
    message: string;
    type: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | "SYSTEM";
}

export function AgentCommandCenter() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Initial simulated boot sequence
    useEffect(() => {
        addLog("Initializing Keystone Command Layer...", "SYSTEM");
        setTimeout(() => addLog("Connecting to Solana Devnet [43ms]", "INFO"), 800);
        setTimeout(() => addLog("Agent Neural Weights loaded.", "SUCCESS"), 1600);
        setTimeout(() => addLog("Monitoring 12 Active Intents.", "INFO"), 2400);
    }, []);

    // Listen to real app events
    useAppEvent((event) => {
        if (event.type === "UI_NOTIFICATION") {
            addLog(event.payload.message, "WARNING");
        } else if (event.type === "REFRESH_DASHBOARD") {
            addLog("Manual dashboard sync requested.", "INFO");
        }
    });

    // Simulated "Liveness" Heartbeat
    useEffect(() => {
        const tasks = [
            "Scanning Squads Protocol for pending txs...",
            "Verifying multisig thresholds...",
            "Oracizing price feeds for SOL/USDC...",
            "Checking rebalance conditions...",
            "Syncing validator metrics...",
            "Background simulation: No risks detected."
        ];

        const interval = setInterval(() => {
            const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
            // Only add log occasionally to avoid spam
            if (Math.random() > 0.6) {
                addLog(randomTask, "SYSTEM");
            }
        }, 4000);

        return () => clearInterval(interval);
    }, []);

    // Auto-scroll to bottom of container ONLY (prevent window jump)
    useEffect(() => {
        if (scrollContainerRef.current) {
            const { scrollHeight, clientHeight } = scrollContainerRef.current;
            // Smooth scroll to bottom
            scrollContainerRef.current.scrollTo({
                top: scrollHeight - clientHeight,
                behavior: 'smooth'
            });
        }
    }, [logs]);

    const addLog = (message: string, type: LogEntry["type"]) => {
        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        setLogs(prev => [...prev.slice(-50), { // Keep last 50 logs
            id: Math.random().toString(36),
            timestamp: timeString,
            message,
            type
        }]);
    };

    return (
        <div className="h-[400px] w-full bg-[#0F1115] border border-white/5 rounded-2xl relative overflow-hidden flex flex-col font-mono text-xs group">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(54,226,123,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(54,226,123,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-[#0B0C10]/80 flex items-center justify-between z-10 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-[#36e27b]/10 flex items-center justify-center border border-[#36e27b]/20 text-[#36e27b]">
                        <Terminal size={14} />
                    </div>
                    <div>
                        <h3 className="font-bold text-white uppercase tracking-wider">Command Layer</h3>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#36e27b] animate-pulse" />
                            <span className="text-[9px] text-[#9eb7a8]">AGENT ACTIVE</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[#9eb7a8]">
                    <Cpu size={14} className="animate-pulse" />
                    <span className="text-[10px]">12ms</span>
                </div>
            </div>

            {/* Log Area using custom scrollbar */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-1.5 relative z-10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-[#36e27b]/20"
            >
                {logs.map((log) => (
                    <div key={log.id} className="flex gap-3 group/line hover:bg-white/5 p-0.5 rounded transition-colors">
                        <span className="text-white/30 shrink-0 select-none">[{log.timestamp}]</span>
                        <span className={`
                            break-all
                            ${log.type === 'INFO' ? 'text-[#9eb7a8]' : ''}
                            ${log.type === 'SUCCESS' ? 'text-[#36e27b]' : ''}
                            ${log.type === 'WARNING' ? 'text-yellow-500 font-bold' : ''}
                            ${log.type === 'ERROR' ? 'text-red-500 font-bold' : ''}
                            ${log.type === 'SYSTEM' ? 'text-blue-400' : ''}
                        `}>
                            {log.type === 'SYSTEM' && '> '}
                            {log.message}
                        </span>
                    </div>
                ))}
            </div>

            {/* Input / Status Bar */}
            <div className="p-2 border-t border-white/5 bg-[#0B0C10]/50 z-10 shrink-0">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-black/40 border border-white/5 text-white/50">
                    <span className="text-[#36e27b] animate-pulse">_</span>
                    <span className="italic">Awaiting instructions...</span>
                </div>
            </div>
            <style jsx>{`
                .scrollbar-thin::-webkit-scrollbar {
                    width: 4px;
                }
                .scrollbar-thin::-webkit-scrollbar-track {
                    background: transparent;
                }
                .scrollbar-thin::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                }
                .scrollbar-thin:hover::-webkit-scrollbar-thumb {
                    background: rgba(54, 226, 123, 0.2);
                }
            `}</style>
        </div>
    );
}
