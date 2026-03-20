"use client";

import { useEffect, useState, useRef } from "react";
import { Terminal, Cpu, Activity, ShieldCheck, Zap } from "lucide-react";
import { useAppEvent, AppEventBus } from "@/lib/events";
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

    // Initial boot
    useEffect(() => {
        addLog("Keystone Agent Interface Linked.", "SYSTEM");
    }, []);

    // Listen to real app events
    useAppEvent((event) => {
        if (event.type === "UI_NOTIFICATION") {
            addLog(event.payload.message, "WARNING");
        } else if (event.type === "REFRESH_DASHBOARD") {
            addLog("Manual dashboard sync requested.", "INFO");
        } else if (event.type === "AGENT_COMMAND") {
            // 1. Log the incoming directive
            addLog(`Received external directive: "${event.payload.command}"`, "SYSTEM");
            addLog(`Source: ${event.payload.source || "Unknown"}`, "INFO");

            // 2. ROUTING LOGIC (The Brain)
            // The Agent interprets the command and triggers the appropriate UI/Action
            if (event.payload.command.includes("Analyze") || event.payload.command.includes("Deploy")) {
                setTimeout(() => {
                    // Instruct the UI to show the strategy modal, which will then trigger the YieldEngine
                    AppEventBus.emit("SHOW_STRATEGY_MODAL");
                }, 800);
            }
        } else if (event.type === "AGENT_LOG") {
            // Real-time logs from the Engine
            // System check for debug
            // console.log("ACC Received Log:", event.payload);
            addLog(event.payload.message, event.payload.level || "INFO");
        }
    });

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
            id: globalThis.crypto.randomUUID().replace(/-/g, '').substring(0, 16),
            timestamp: timeString,
            message,
            type
        }]);
    };

    return (
        <div className="h-[400px] w-full bg-card border border-border rounded-2xl relative overflow-hidden flex flex-col font-mono text-xs group shadow-lg">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(var(--dashboard-accent-muted)_1px,transparent_1px),linear-gradient(90deg,var(--dashboard-accent-muted)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-20" />

            {/* Header */}
            <div className="p-4 border-b border-border bg-background/80 flex items-center justify-between z-10 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                        <Terminal size={14} />
                    </div>
                    <div>
                        <h3 className="font-bold text-foreground uppercase tracking-wider">Command Layer</h3>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="text-[9px] text-muted-foreground uppercase tracking-tighter">Agent Active</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Cpu size={14} className="animate-pulse" />
                    <span className="text-[10px]">12ms</span>
                </div>
            </div>

            {/* Log Area using custom scrollbar */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-1.5 relative z-10 scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent hover:scrollbar-thumb-primary/20"
            >
                {logs.map((log) => (
                    <div key={log.id} className="flex gap-3 group/line hover:bg-primary/5 p-0.5 rounded transition-colors">
                        <span className="text-foreground/30 shrink-0 select-none">[{log.timestamp}]</span>
                        <span className={`
                            break-all
                            ${log.type === 'INFO' ? 'text-muted-foreground' : ''}
                            ${log.type === 'SUCCESS' ? 'text-primary' : ''}
                            ${log.type === 'WARNING' ? 'text-yellow-500 font-bold' : ''}
                            ${log.type === 'ERROR' ? 'text-red-500 font-bold' : ''}
                            ${log.type === 'SYSTEM' ? 'text-blue-500' : ''}
                        `}>
                            {log.type === 'SYSTEM' && '> '}
                            {log.message}
                        </span>
                    </div>
                ))}
            </div>

            {/* Input / Status Bar */}
            <div className="p-2 border-t border-border bg-background/50 z-10 shrink-0">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-input border border-border text-foreground/50">
                    <span className="text-primary animate-pulse">_</span>
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
