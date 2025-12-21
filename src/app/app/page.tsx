"use client";

import { useState, useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { SquadsClient } from "@/lib/squads";
import { useAppEvent, AppEventBus } from "@/lib/events";
import { IntentRegistry } from "@/lib/agents/registry";
import { WalletButton } from "@/components/WalletButton";
import { RefreshCw, ChevronDown, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VaultTable } from "@/components/VaultTable";
import { TreasuryChart } from "@/components/TreasuryChart";
import { CollaborativeHeader } from "@/components/CollaborativeHeader";
import { AgentCommandCenter } from "@/components/dashboard/AgentCommandCenter";
import { PayrollStreams } from "@/components/dashboard/PayrollStreams";
import { RiskRadar } from "@/components/dashboard/RiskRadar";
import { VaultAssetsCompact } from "@/components/dashboard/VaultAssetsCompact";
import { YieldOptimizer } from "@/components/dashboard/YieldOptimizer";
import { DirectiveHub } from "@/components/dashboard/DirectiveHub";
import { useVault } from "@/lib/contexts/VaultContext";
import { Suspense } from "react";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { useNetwork } from "@/lib/contexts/NetworkContext";
import { NetworkSelector } from "@/components/NetworkSelector";

// Define locally or import from types
interface TokenAccount {
  mint: string;
  amount: number;
  decimals: number;
  symbol?: string;
  price?: number;
  value?: number;
}

export default function AppPortalPage() {
  const { connection } = useConnection();
  const { setActiveVault, refresh, vaultValue, vaultChange24h, loading, vaultTokens } = useVault();
  const { theme } = useTheme();
  const { network, setNetwork } = useNetwork();
  const [localVaultAddress, setLocalVaultAddress] = useState("");

  useAppEvent((event) => {
    if (event.type === "REFRESH_DASHBOARD") {
      refresh();
    }
  });

  // Background Monitoring Heartbeat (Phase 9)
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      const activeMonitors = IntentRegistry.getActive();
      if (activeMonitors.length === 0) return;

      console.log(`[AgentPulse] Evaluating ${activeMonitors.length} active monitors...`);

      activeMonitors.forEach(async (monitor) => {
        try {
          // Phase 11.4: Real balance/price check for monitor
          const client = new SquadsClient(connection, {});
          const prices = await client.getTokenMetadata([monitor.condition.target]);
          const currentPrice = prices[monitor.condition.target]?.price || 0;

          if (currentPrice === 0) return;

          const isTriggered =
            (monitor.condition.operator === "<" && currentPrice < monitor.condition.value) ||
            (monitor.condition.operator === ">" && currentPrice > monitor.condition.value);

          if (isTriggered) {
            console.log(`[AgentPulse] TRIGGERED: ${monitor.type} for ${monitor.condition.target}`);

            AppEventBus.emit("UI_NOTIFICATION", {
              message: `🚨 Proactive Alert: ${monitor.condition.target} has hit your threshold (${monitor.condition.operator}${monitor.condition.value}). Current: $${currentPrice.toFixed(2)}`
            });

            IntentRegistry.markTriggered(monitor.id);
          }
        } catch (err) {
          console.error("[AgentPulse] Evaluation Error:", err);
        }
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(pulseInterval);
  }, [connection]);

  const handleSyncVault = async () => {
    if (!localVaultAddress) return;
    setActiveVault(localVaultAddress);
    // refreshing is handled by VaultContext's useEffect on activeVault change
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-background overflow-hidden relative">
      {/* Dashboard Header (Consolidated) */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50 backdrop-blur-md z-10 shadow-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--dashboard-accent)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-70">Keystone OS // Primary Node</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight text-foreground uppercase">Dashboard</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors relative">
            <Bell size={18} />
            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary" />
          </button>
          <button
            onClick={() => setNetwork(network === 'mainnet-beta' ? 'devnet' : 'mainnet-beta')}
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${network === 'mainnet-beta' ? 'bg-primary/10 border-primary/20 hover:bg-primary/20' : 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20'}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor] ${network === 'mainnet-beta' ? 'bg-primary' : 'bg-orange-500'}`} />
            <span className="text-xs font-medium text-foreground uppercase">{network === 'mainnet-beta' ? 'Mainnet' : 'Devnet'}</span>
          </button>

          <Suspense fallback={<div className="h-8 w-24 bg-muted animate-pulse rounded-full" />}>
            <CollaborativeHeader />
          </Suspense>

          <div className="w-px h-6 bg-border mx-1" />

          <WalletButton />
        </div>
      </header>

      <div className="flex-1 p-6 pt-4 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-3 grid-rows-[minmax(200px,auto)_auto] gap-4 max-w-[1600px] mx-auto pb-6">
          {/* 1. Total Treasury Card (Compact) */}
          <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-6 relative overflow-hidden group min-h-[220px] flex flex-col justify-between shadow-lg">
            <div className={`absolute top-0 right-0 p-0 w-full h-full ${theme === 'light' ? 'opacity-70' : 'opacity-40'} group-hover:opacity-100 transition-opacity pointer-events-none z-0`}>
              <TreasuryChart />
            </div>

            <div className="relative z-10 text-shadow-sm">
              <div className="flex flex-col gap-1">
                <h2 className="text-muted-foreground uppercase tracking-widest text-[10px] font-semibold">Total Treasury Value</h2>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl md:text-5xl font-bold text-foreground tracking-tighter drop-shadow-md">
                    {vaultValue !== null ? `$${vaultValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$ --,--"}
                  </span>
                  {vaultChange24h !== null && (
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${vaultChange24h >= 0 ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                      <span className="text-[10px] font-bold">
                        {vaultChange24h >= 0 ? '+' : ''}{vaultChange24h.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 relative z-10">
                <Input
                  className="h-8 w-56 bg-input border-border text-foreground placeholder:text-muted-foreground/30 rounded-lg text-xs font-mono shadow-inner"
                  placeholder="Enter Vault Address..."
                  value={localVaultAddress}
                  onChange={(e) => setLocalVaultAddress(e.target.value)}
                />
                <Button
                  className="h-8 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-lg shadow-md text-xs px-4"
                  onClick={handleSyncVault}
                  disabled={loading}
                >
                  {loading ? "Syncing..." : "Sync Vault"}
                </Button>
              </div>
            </div>
          </div>

          {/* 2. Yield Optimizer (Standalone Component) */}
          <YieldOptimizer />

          {/* 3. Visionary Dashboard Row (3-Column Grid) */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[300px]">
            {/* 3.1 Agent Command Layer */}
            <div className="h-full">
              <AgentCommandCenter />
            </div>

            {/* 3.2 Risk Radar */}
            <div className="h-full">
              <RiskRadar />
            </div>

            {/* 3.3 Asset List (Data) */}
            <div className="h-full">
              <VaultAssetsCompact tokens={vaultTokens} />
            </div>
          </div>

          {/* 4. Money Flow Row (Payroll Streams & Directives) */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 4.1 Payroll Streams (2/3 Width) */}
            <div className="md:col-span-2 h-full">
              <PayrollStreams />
            </div>

            {/* 4.2 Directive Hub (1/3 Width) */}
            <div className="md:col-span-1 h-full min-h-[450px]">
              <DirectiveHub />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
