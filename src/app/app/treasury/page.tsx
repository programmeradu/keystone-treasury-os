"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CollaborativeHeader } from "@/components/CollaborativeHeader";
import { WalletButton } from "@/components/WalletButton";
import { OperationsNexus } from "@/components/treasury/OperationsNexus";
import { StreamingVelocity } from "@/components/treasury/StreamingVelocity";
import { GovernanceOracle } from "@/components/treasury/GovernanceOracle";
import { DataNexus } from "@/components/treasury/DataNexus";
import { VaultProvider } from "@/lib/contexts/VaultContext";
import { useUpdateMyPresence, useOthers } from "@/liveblocks.config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Ghost, Settings, LayoutDashboard } from "lucide-react";
import { TreasurySidebar } from "@/components/treasury/TreasurySidebar";
import { TreasuryRightPanel } from "@/components/treasury/TreasuryRightPanel";
import { VaultAssetsView } from "@/components/treasury/VaultAssetsView";
import { NetworkSelector } from "@/components/NetworkSelector";
import { useVault } from "@/lib/contexts/VaultContext";
import { toast } from "@/lib/toast-notifications";
import { useRouter } from "next/navigation";

type Module = "OPERATIONS" | "STREAMING" | "GOVERNANCE" | "DATA" | "SETTINGS" | "VAULT";

export default function TreasuryHubPage() {
  return (
    <VaultProvider>
      <TreasuryHubContent />
    </VaultProvider>
  );
}

function TreasuryHubContent() {
  const [activeModule, setActiveModule] = useState<Module>("OPERATIONS");
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const updatePresence = useUpdateMyPresence();
  const others = useOthers();
  const { vaultValue, vaultChange24h, vaultTokens } = useVault();
  const router = useRouter();

  const handleExport = () => {
    if (vaultTokens.length === 0) {
      toast.info("No vault data to export. Sync a vault first.");
      return;
    }
    const header = "Symbol,Mint,Amount,Price,Value";
    const rows = vaultTokens.map(t =>
      `${t.symbol || "Unknown"},${t.mint},${t.amount},${t.price || 0},${t.value || 0}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `keystone-vault-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Vault data exported as CSV");
  };

  // Broadcast active module to the team
  useEffect(() => {
    updatePresence({ status: "online", module: activeModule } as any);
  }, [activeModule, updatePresence]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* 1. Command Hub Header */}
      <header className="flex items-center justify-between px-6 py-4 z-30 border-b border-border bg-background/95 backdrop-blur-xl h-16 shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none mb-1">Keystone Treasury</div>
            <h1 className="text-lg font-bold text-foreground tracking-tight leading-none">Treasury Hub</h1>
          </div>

          <div className="h-8 w-px bg-white/10" />

          {/* Quick Stats */}
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider leading-none mb-1">Total Value</span>
              <span className="text-sm font-mono font-bold text-foreground leading-none tracking-tight">
                {vaultValue ? `$${vaultValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$ --,--"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider leading-none mb-1">24h Change</span>
              <span className={`text-sm font-mono font-bold leading-none tracking-tight ${vaultChange24h !== null && vaultChange24h >= 0 ? 'text-primary' : 'text-orange-500'}`}>
                {vaultChange24h !== null ? `${vaultChange24h >= 0 ? '+' : ''}${vaultChange24h.toFixed(2)}%` : "--"} <span className="opacity-50 text-[10px]">/24h</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <NetworkSelector />

          <div className="h-4 w-px bg-white/10 hidden md:block" />

          {/* Panel Toggle */}
          <button
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className={`hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${isPanelOpen ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/10 border-white/5 text-muted-foreground hover:text-white"}`}
          >
            <span className="text-[9px] font-semibold uppercase tracking-wider">{isPanelOpen ? "Hide Panel" : "Show Panel"}</span>
            <LayoutDashboard size={14} />
          </button>

          <div className="h-6 w-px bg-white/10" />

          {/* Team Presence (Compact) */}
          <div className="flex -space-x-2 overflow-hidden">
            {others.map((other) => (
              <div key={other.connectionId} className="relative group cursor-pointer">
                <Avatar className="h-8 w-8 ring-2 ring-background grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                  <AvatarImage src={other.info?.avatar} />
                  <AvatarFallback className="bg-primary/5 flex items-center justify-center">
                    <Ghost size={14} className="text-primary/50 group-hover:text-primary transition-colors" />
                  </AvatarFallback>
                </Avatar>
                {/* Status Dot */}
                <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border-2 border-background" />
                <div className="absolute top-full mt-2 right-0 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[9px] font-medium text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                  {other.info?.name || "Anonymous"}
                </div>
              </div>
            ))}
          </div>

          <CollaborativeHeader />
          <div className="h-6 w-px bg-white/10" />
          <WalletButton />
        </div>
      </header>

      {/* 2. Three-Column Main Layout */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Left Column: Navigation Sidebar */}
        <TreasurySidebar
          activeModule={activeModule}
          setActiveModule={setActiveModule}
          others={others}
        />

        {/* Center Column: Content Workspace */}
        <main className="flex-1 min-w-0 overflow-y-auto scrollbar-thin p-1 bg-background relative">

          {/* Header for Active Module - Minimal */}
          <div className="mb-4 px-4 pt-4 flex items-end justify-between border-b border-border/40 pb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground tracking-tight leading-none mb-1">
                {activeModule === "VAULT" ? "Vault Assets" : activeModule === "DATA" ? "Data Nexus" : activeModule === "OPERATIONS" ? "Operations" : activeModule === "STREAMING" ? "Streaming" : activeModule === "GOVERNANCE" ? "Governance" : activeModule}
              </h2>
              <p className="text-[10px] text-muted-foreground">
                {activeModule === "OPERATIONS" ? "Mass payouts, airdrops & transfers" : activeModule === "VAULT" ? "Token balances & positions" : activeModule === "STREAMING" ? "Real-time flow analytics" : activeModule === "GOVERNANCE" ? "Proposals & voting" : activeModule === "DATA" ? "Accounting & compliance" : ""}
              </p>
            </div>

            {/* Quick Action / Export */}
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="h-8 px-4 rounded-lg bg-muted/50 border border-border hover:bg-muted text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-all"
              >
                Export
              </button>
            </div>
          </div>

          {/* Content Render - Full Bleed */}
          <div className="relative z-10 h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeModule}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {activeModule === "OPERATIONS" && <OperationsNexus />}
                {activeModule === "VAULT" && <VaultAssetsView />}
                {activeModule === "STREAMING" && <StreamingVelocity />}
                {activeModule === "GOVERNANCE" && <GovernanceOracle />}
                {activeModule === "DATA" && <DataNexus />}
                {activeModule === "SETTINGS" && (() => { router.push("/app/settings"); return null; })()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Right Column: Widgets & Data */}
        <AnimatePresence>
          {isPanelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="overflow-hidden border-l border-border/40 bg-sidebar/50 hidden xl:block"
            >
              <div className="w-80 h-full"> {/* Fixed width container to prevent layout thrashing */}
                <TreasuryRightPanel />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div >

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
    </div >
  );
}
