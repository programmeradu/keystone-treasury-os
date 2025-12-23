"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    Send,
    Waves,
    Gavel,
    Database,
    Settings,
    LayoutGrid
} from "lucide-react";
import { VaultSelector } from "./VaultSelector";

type Module = "OPERATIONS" | "STREAMING" | "GOVERNANCE" | "DATA" | "SETTINGS" | "VAULT";

interface TreasurySidebarProps {
    activeModule: Module;
    setActiveModule: (module: Module) => void;
    others?: readonly any[];
}

export function TreasurySidebar({ activeModule, setActiveModule, others = [] }: TreasurySidebarProps) {
    const menuItems = [
        { id: "OPERATIONS", label: "Operations", icon: Send, sub: "Mass Payouts & Airdrops" },
        { id: "VAULT", label: "Vault Assets", icon: LayoutGrid, sub: "Inventory & Yield" },
        { id: "STREAMING", label: "Streaming", icon: Waves, sub: "Real-time Flow Analytics" },
        { id: "GOVERNANCE", label: "Governance", icon: Gavel, sub: "Proposals & Voting Power" },
        { id: "DATA", label: "Data Nexus", icon: Database, sub: "Accounting & Compliance" },
    ];

    return (
        <aside className="w-72 bg-sidebar border-r border-border/40 flex flex-col p-4 shrink-0 z-20">
            {/* Vault Selector - Now part of the sleek sidebar */}
            <div className="mb-6">
                <VaultSelector />
            </div>

            <nav className="flex-1 flex flex-col gap-1">
                {menuItems.map((item) => {
                    const isActive = activeModule === item.id;
                    // Count users present in this module
                    const presentUsers = others.filter(o => (o.presence as any)?.module === item.id);

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveModule(item.id as Module)}
                            className={`relative group flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-all duration-200 overflow-hidden
                ${isActive
                                    ? "bg-primary/10 text-primary shadow-[0_0_15px_-3px_rgba(54,226,123,0.15)]"
                                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                                }`}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_10px_rgba(54,226,123,0.5)]" />
                            )}

                            <item.icon size={18} className={`shrink-0 ${isActive ? "text-primary" : "text-zinc-500 group-hover:text-zinc-300"}`} />

                            <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase tracking-widest leading-none mb-1">
                                    {item.label}
                                </span>
                                <span className={`text-[9px] font-medium leading-none ${isActive ? "text-primary/60" : "text-zinc-600 group-hover:text-zinc-500"}`}>
                                    {item.sub}
                                </span>
                            </div>

                            {/* Presence Indicators */}
                            {presentUsers.length > 0 && (
                                <div className="ml-auto flex -space-x-1">
                                    {presentUsers.map(u => (
                                        <div key={u.connectionId} className="w-1.5 h-1.5 rounded-full bg-emerald-400 ring-2 ring-sidebar" />
                                    ))}
                                </div>
                            )}
                        </button>
                    );
                })}
            </nav>

            <div className="mt-auto border-t border-white/5 pt-4">
                <button
                    onClick={() => setActiveModule("SETTINGS")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
             ${activeModule === "SETTINGS"
                            ? "bg-zinc-800 text-white"
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                        }`}
                >
                    <Settings size={18} />
                    <span className="text-xs font-bold uppercase tracking-widest">System_Config</span>
                </button>
            </div>
        </aside>
    );
}
