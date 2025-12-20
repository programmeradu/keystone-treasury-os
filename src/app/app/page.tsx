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
import { RiskRadar } from "@/components/dashboard/RiskRadar";
import { VaultAssetsCompact } from "@/components/dashboard/VaultAssetsCompact";
import { Suspense } from "react";

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
  const [vaultAddress, setVaultAddress] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [tokens, setTokens] = useState<TokenAccount[]>([]);
  const [loading, setLoading] = useState(false);

  useAppEvent((event) => {
    if (event.type === "REFRESH_DASHBOARD") {
      fetchVaultData();
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
          const prices = await client.getTokenPrices([monitor.condition.target]);
          const currentPrice = prices[monitor.condition.target] || 0;

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
  }, []);

  async function fetchVaultData() {
    if (!vaultAddress) return;
    setLoading(true);
    try {
      const client = new SquadsClient(connection, {});

      // 1. Fetch Balances
      const [bal, tks] = await Promise.all([
        client.getVaultBalance(vaultAddress),
        client.getVaultTokens(vaultAddress)
      ]);

      // 2. Fetch Prices
      const mints = tks.map(t => t.mint);
      // Add SOL price fetching too
      const solMint = "So11111111111111111111111111111111111111112";
      if (!mints.includes(solMint)) mints.push(solMint);

      const prices = await client.getTokenPrices(mints);

      // 3. Enrich Data
      const enrichedTokens = tks.map(t => ({
        ...t,
        price: prices[t.mint] || 0,
        value: t.amount * (prices[t.mint] || 0)
      }));

      // Calculate Total Treasury Value (Tokens + SOL Balance)
      const solPrice = prices[solMint] || 0;
      const solValue = bal * solPrice;
      const tokenValue = enrichedTokens.reduce((acc, t) => acc + t.value, 0);

      setBalance(solValue + tokenValue); // Showing Total Value in USD now, not SOL amount
      setTokens(enrichedTokens);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#0B0C10] overflow-hidden">
      {/* Dashboard Header (Consolidated) */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0B0C10]/50 backdrop-blur-md z-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#36e27b] shadow-[0_0_8px_#36e27b]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9eb7a8]">Keystone OS // Primary Node</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight text-white uppercase">Dashboard</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 rounded-lg hover:bg-white/5 text-[#9eb7a8] transition-colors relative">
            <Bell size={18} />
            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#36e27b]" />
          </button>

          <button className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1F2833]/40 border border-white/5 hover:bg-white/5 transition-colors">
            <div className="w-1.5 h-1.5 rounded-full bg-[#36e27b] shadow-[0_0_8px_rgba(54,226,123,0.5)]" />
            <span className="text-xs font-medium text-white">Devnet</span>
          </button>

          <Suspense fallback={<div className="h-8 w-24 bg-white/5 animate-pulse rounded-full" />}>
            <CollaborativeHeader />
          </Suspense>

          <div className="w-px h-6 bg-white/5 mx-1" />

          <WalletButton />
        </div>
      </header>

      <div className="flex-1 p-6 pt-4 overflow-y-auto custom-scrollbar">

        <div className="grid grid-cols-1 lg:grid-cols-3 grid-rows-[minmax(200px,auto)_auto] gap-4 max-w-[1600px] mx-auto pb-6">

          {/* 1. Total Treasury Card (Compact) */}
          <div className="lg:col-span-2 rounded-2xl bg-[#1F2833]/30 backdrop-blur-xl border border-white/5 p-6 relative overflow-hidden group min-h-[220px] flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-0 w-full h-full opacity-40 group-hover:opacity-100 transition-opacity pointer-events-none z-0">
              <TreasuryChart />
            </div>

            <div className="relative z-10">
              <div className="flex flex-col gap-1">
                <h2 className="text-[#9eb7a8] uppercase tracking-widest text-[10px] font-semibold">Total Treasury Value</h2>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl md:text-5xl font-bold text-white tracking-tighter drop-shadow-[0_0_15px_rgba(54,226,123,0.2)]">
                    {balance !== null ? `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$ --,--"}
                  </span>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#36e27b]/10 border border-[#36e27b]/20">
                    <span className="text-[#36e27b] text-[10px] font-bold">+12.5%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Input
                className="h-8 w-56 bg-black/40 border-white/10 text-white placeholder:text-white/20 rounded-lg text-xs font-mono"
                placeholder="Enter Vault Address..."
                value={vaultAddress}
                onChange={(e) => setVaultAddress(e.target.value)}
              />
              <Button
                className="h-8 bg-[#36e27b] text-[#0B0C10] hover:bg-[#25a85c] font-bold rounded-lg shadow-[0_0_10px_rgba(54,226,123,0.2)] text-xs px-4"
                onClick={fetchVaultData}
                disabled={loading}
              >
                {loading ? "Syncing..." : "Sync Vault"}
              </Button>
            </div>
          </div>

          {/* 2. Yield Optimizer (Compact) */}
          <div className="lg:col-span-1 rounded-2xl bg-[#1F2833]/30 backdrop-blur-xl border border-white/5 p-6 flex flex-row items-center justify-between relative min-h-[220px]">
            <div className="flex flex-col gap-1 z-10 h-full justify-between py-2">
              <div>
                <h2 className="text-[#9eb7a8] uppercase tracking-widest text-[10px] font-semibold">Yield Optimizer</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#36e27b] animate-pulse" />
                  <span className="text-[10px] font-medium text-white">Strategies Active</span>
                </div>
              </div>

              <button className="flex items-center gap-2 px-3 py-1.5 bg-[#1c2e24] border border-[#2d4a3a] rounded-lg text-[#36e27b] text-[10px] font-bold hover:bg-[#233b2e] transition-colors w-max">
                Auto-Compound
              </button>
            </div>

            <div className="relative w-32 h-32 flex items-center justify-center">
              <div className="text-center z-10">
                <span className="text-2xl font-bold text-white block">8.4%</span>
                <span className="text-[10px] text-[#9eb7a8]">APY</span>
              </div>
              {/* Thin Rings */}
              <div className="absolute inset-0 rounded-full border-[6px] border-[#1c232b]" />
              <div className="absolute inset-0 rounded-full border-[6px] border-[#36e27b] border-t-transparent border-l-transparent rotate-45" />
            </div>
          </div>

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
              <VaultAssetsCompact tokens={tokens} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}