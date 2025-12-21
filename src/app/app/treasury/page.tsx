"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Send,
  Waves,
  Gavel,
  Database,
  Settings,
  ChevronRight,
  Search,
  Plus,
  Activity,
  ShieldCheck,
  Ghost
} from "lucide-react";
import { CollaborativeHeader } from "@/components/CollaborativeHeader";
import { WalletButton } from "@/components/WalletButton";
import { OperationsNexus } from "@/components/treasury/OperationsNexus";
import { StreamingVelocity } from "@/components/treasury/StreamingVelocity";
import { GovernanceOracle } from "@/components/treasury/GovernanceOracle";
import { DataNexus } from "@/components/treasury/DataNexus";
import { VaultProvider, useVault } from "@/lib/contexts/VaultContext";
import { VaultSelector } from "@/components/treasury/VaultSelector";
import { useUpdateMyPresence, useOthers } from "@/liveblocks.config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { KeystoneAgentInput } from "@/components/dashboard/KeystoneAgentInput";

type Module = "OPERATIONS" | "STREAMING" | "GOVERNANCE" | "DATA" | "SETTINGS";

export default function TreasuryHubPage() {
  return (
    <VaultProvider>
      <TreasuryHubContent />
    </VaultProvider>
  );
}

function TreasuryHubContent() {
  const [activeModule, setActiveModule] = useState<Module>("OPERATIONS");
  const { activeVault } = useVault();
  const updatePresence = useUpdateMyPresence();
  const others = useOthers();

  // Broadcast active module to the team
  useEffect(() => {
    updatePresence({ status: "online", module: activeModule } as any);
  }, [activeModule, updatePresence]);

  const menuItems = [
    { id: "OPERATIONS", label: "Operations", icon: Send, description: "Mass Payouts & Airdrops" },
    { id: "STREAMING", label: "Streaming", icon: Waves, description: "Real-time Flow Analytics" },
    { id: "GOVERNANCE", label: "Governance", icon: Gavel, description: "Proposals & Voting Power" },
    { id: "DATA", label: "Data Nexus", icon: Database, description: "Accounting & Compliance" },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* 1. Tactical Top HUD */}
      <header className="flex items-center justify-between px-6 py-3 z-30 border-b border-border bg-background/80 backdrop-blur-xl h-16 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">

            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground leading-none mb-0.5">Keystone // Treasury</div>
              <h1 className="text-lg font-black text-foreground uppercase tracking-tight leading-none">Command_Hub</h1>
            </div>
          </div>

          <div className="h-6 w-px bg-border/50 mx-2" />

          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-0.5">Total_Volume</span>
              <span className="text-sm font-mono font-bold text-foreground leading-none">$12,492,108.42</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-0.5">Net_Burn</span>
              <span className="text-sm font-mono font-bold text-[#ff5b39] leading-none">- $1,240.20 <span className="text-[8px] opacity-50">/hr</span></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Team Presence */}
          <div className="flex -space-x-2 overflow-hidden">
            {others.map((other) => (
              <div key={other.connectionId} className="relative group">
                <Avatar className="h-8 w-8 ring-2 ring-background group-hover:ring-primary transition-all">
                  <AvatarImage src={other.info?.avatar} />
                  <AvatarFallback className="bg-primary/5 flex items-center justify-center">
                    <Ghost size={14} className="text-primary/50 group-hover:text-primary transition-colors" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background shadow-[0_0_5px_var(--dashboard-accent-muted)]" />
                {/* Tooltip */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-popover border border-border text-[8px] font-black text-popover-foreground uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  {other.info?.name || "Anonymous Ghost"}
                </div>
              </div>
            ))}
          </div>

          <CollaborativeHeader />
          <div className="h-6 w-px bg-white/10" />
          <WalletButton />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 2. Tactical Sidebar Navigation */}
        <aside className="w-80 border-r border-border bg-sidebar/40 backdrop-blur-md flex flex-col p-6 z-20">
          <VaultSelector />

          <div className="flex-1 flex flex-col gap-3">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id as Module)}
                className={`flex flex-col p-5 rounded-[1.8rem] transition-all duration-300 group relative overflow-hidden ${activeModule === item.id
                  ? "bg-primary/10 border border-primary/30 shadow-[0_0_20px_var(--dashboard-accent-muted)]"
                  : "hover:bg-muted/50 border border-transparent"
                  }`}
              >
                {/* Module Presence Dots */}
                <div className="absolute top-4 right-4 flex gap-1">
                  {others.filter(o => (o.presence as any)?.module === item.id).map(o => (
                    <div key={o.connectionId} className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_var(--dashboard-accent-muted)]" />
                  ))}
                </div>

                <div className="flex items-center gap-4 mb-2">
                  <div className={`p-2.5 rounded-xl transition-colors ${activeModule === item.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:text-foreground"
                    }`}>
                    <item.icon size={18} />
                  </div>
                  <span className={`text-sm font-black uppercase tracking-widest ${activeModule === item.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    }`}>
                    {item.label}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground font-medium leading-relaxed group-hover:text-foreground transition-colors uppercase">
                  {item.description}
                </p>

                {activeModule === item.id && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 border border-primary/50 rounded-[1.8rem]"
                    initial={false}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="mt-auto px-2">
            <button className="flex items-center gap-3 w-full p-4 rounded-2xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all group">
              <Settings size={18} />
              <span className="text-xs font-black uppercase tracking-widest">System_Config</span>
            </button>
          </div>
        </aside>

        {/* 3. Primary Module Content Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-background">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="max-w-[1400px] mx-auto"
            >
              {activeModule === "OPERATIONS" && <OperationsNexus />}
              {activeModule === "STREAMING" && <StreamingVelocity />}
              {activeModule === "GOVERNANCE" && <GovernanceOracle />}
              {activeModule === "DATA" && <DataNexus />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Floating Agent Input */}
        <KeystoneAgentInput />
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(54, 226, 123, 0.2);
        }
      `}</style>
    </div>
  );
}
