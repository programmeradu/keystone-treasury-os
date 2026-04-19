"use client";

import React, { useState, useRef, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { VersionedTransaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { toast } from "@/lib/toast-notifications";
import { Loader2, ArrowRight, FlaskConical } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ScoreGauge as LabScoreGauge,
  YieldProjectionChart as LabYieldChart,
  RiskBar as LabRiskBar,
  StrategyCompare as LabStrategyCompare,
  PulseDot as LabPulseDot,
} from "@/components/atlas/StrategyLabCharts";
import { AtlasShell } from "@/components/atlas/atlas-shell";
import { useAtlasCommand } from "@/hooks/use-atlas-command";
import { useAtlasData, fetchJsonWithRetry } from "@/hooks/use-atlas-data";

type StrategyKind = "stake_marinade" | "swap_jupiter" | "lp_sol_usdc";

const MINTS = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  MSOL: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
  JITOSOL: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
  BSOL: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
} as const;

const LST_OPTIONS = [
  { id: "MSOL",    mint: MINTS.MSOL,    name: "Marinade",   symbol: "mSOL",    apyBoost: 2.8,  maturity: 20, riskNote: "Largest LST by TVL", icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png" },
  { id: "JITOSOL", mint: MINTS.JITOSOL, name: "Jito",       symbol: "jitoSOL", apyBoost: 4.2,  maturity: 18, riskNote: "MEV-boosted rewards", icon: "https://storage.googleapis.com/token-metadata/JitoSOL-256.png" },
  { id: "BSOL",    mint: MINTS.BSOL,    name: "BlazeStake", symbol: "bSOL",    apyBoost: 2.0,  maturity: 14, riskNote: "BLZE incentives + staking", icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1/logo.png" },
] as const;

function resolveStakeProvider(provider?: string): string {
  if (!provider) return "MSOL";
  const p = provider.toLowerCase().replace(/[-_\s]/g, "");
  if (p === "jito" || p === "jitosol") return "JITOSOL";
  if (p === "blaze" || p === "blazestake" || p === "bsol") return "BSOL";
  return "MSOL"; // default to Marinade
}

export function StrategyLabClient() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const { prices, solBalance, inflationApy } = useAtlasData();
  const { lastCommand } = useAtlasCommand();

  const [kind, setKind] = useState<StrategyKind>("stake_marinade");
  const [amountSol, setAmountSol] = useState<number>(5);
  const [selectedLst, setSelectedLst] = useState<string>("MSOL");
  const [quote, setQuote] = useState<any>(null);
  const [nlpText, setNlpText] = useState("");
  const [nlpLoading, setNlpLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [execLoading, setExecLoading] = useState(false);
  
  const nlpInputRef = useRef<HTMLInputElement | null>(null);
  const simulateAbortRef = useRef<AbortController | null>(null);

  // Prefill from URL (deep link)
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const k = sp.get("kind") as StrategyKind | null;
      const amt = sp.get("amountSol");
      const nlp = sp.get("nlp");
      if (k === "stake_marinade" || k === "swap_jupiter" || k === "lp_sol_usdc") setKind(k);
      if (amt && !Number.isNaN(Number(amt))) setAmountSol(Number(amt));
      if (nlp) setNlpText(nlp);
      if (k && amt) {
        setTimeout(() => simulateRef.current(), 50);
      }
    } catch {}
  }, []);

  // Listen for strategy-lab specific commands
  useEffect(() => {
    if (!lastCommand) return;
    const { tool_id, parameters } = lastCommand;

    switch (tool_id) {
      case "stake_sol": {
        const lstId = resolveStakeProvider(parameters.provider);
        setKind("stake_marinade");
        setSelectedLst(lstId);
        if (parameters.amount) setAmountSol(parameters.amount);
        const lstLabel = LST_OPTIONS.find(l => l.id === lstId)?.name || "Marinade";
        setTimeout(() => simulateRef.current(lstId), 100);
        toast.info(`Staking${parameters.amount ? ` ${parameters.amount} SOL` : ""} via ${lstLabel}`);
        break;
      }
      case "provide_liquidity":
        setKind("lp_sol_usdc");
        if (parameters.amount) setAmountSol(parameters.amount);
        setTimeout(() => simulateRef.current(), 100);
        toast.info(`LP simulation${parameters.amount ? ` for ${parameters.amount} SOL` : ""} started`);
        break;
      case "swap_tokens":
        // Wait, main page executes swap inline. Only do this if we are ALREADY in the lab tab!
        // But we are in the lab tab since this component is mounted!
        setKind("swap_jupiter");
        if (parameters.amount) setAmountSol(parameters.amount);
        setTimeout(() => simulateRef.current(), 100);
        toast.info(`Swap simulation initiated.`);
        break;
    }
  }, [lastCommand]);

  async function simulate(overrideLst?: string) {
    if (!Number.isFinite(amountSol) || amountSol <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }
    if (amountSol > 1_000_000) {
      setError("Amount too large — please enter a realistic value");
      return;
    }

    if (simulateAbortRef.current) simulateAbortRef.current.abort();
    simulateAbortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setQuote(null);
    try {
      const solPrice = prices.SOL ?? 0;
      const inputUsd = amountSol * solPrice;

      if (kind === "swap_jupiter") {
        const amount = Math.max(0, amountSol) * LAMPORTS_PER_SOL;
        const url = new URL("/api/jupiter/quote", window.location.origin);
        url.searchParams.set("inputMint", MINTS.SOL);
        url.searchParams.set("outputMint", MINTS.USDC);
        url.searchParams.set("amount", String(Math.floor(amount)));
        url.searchParams.set("slippageBps", "50");
        const r = await fetch(url.toString(), { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Quote failed");
        const outAmount = Number(j?.outAmount || j?.data?.outAmount || 0) / 1e6;
        const priceImpact = Number(j?.priceImpactPct || j?.data?.priceImpactPct || 0);
        const slippageBps = Number(j?.slippageBps || j?.data?.slippageBps || 50);
        const routeCount = j?.routePlan?.length || j?.data?.routePlan?.length || 1;
        const swapUsdValue = Number(j?.swapUsdValue || j?.data?.swapUsdValue || inputUsd);

        const impactPenalty = Math.min(40, priceImpact * 2000);
        const slippagePenalty = slippageBps > 200 ? 15 : slippageBps > 100 ? 8 : 0;
        const routeBonus = routeCount === 1 ? 5 : routeCount <= 3 ? 0 : -5;
        const sizeFactor = Math.min(10, Math.max(0, (Math.log10(swapUsdValue + 1) - 1) * 3));
        const marketJitter = (Math.sin(Date.now() / 60000) + 1) * 2.5;
        const rateEff = solPrice > 0 ? Math.min(10, (outAmount / (amountSol * solPrice)) * 10) : 5;
        const score = Math.max(0, Math.min(100, Math.round(85 - impactPenalty - slippagePenalty + routeBonus + sizeFactor + marketJitter + rateEff)));

        const riskLevel: "low" | "medium" | "high" = priceImpact > 0.01 || amountSol > 500 ? "high" : priceImpact > 0.002 || amountSol > 100 ? "medium" : "low";
        const riskLabel = priceImpact > 0.005 ? "High Impact" : amountSol > 200 ? "Large Trade" : "Execution Risk";

        setQuote({ ...j, _parsed: { outAmount, priceImpact, slippageBps, routeCount, inputUsd, score, riskLevel, riskLabel } });
        toast.success("Jupiter quote ready");

      } else if (kind === "stake_marinade") {
        const lstId = overrideLst || selectedLst;
        const lst = LST_OPTIONS.find(l => l.id === lstId) || LST_OPTIONS[0];
        const baseApy = inflationApy ?? 4.0;
        let protocolApy = baseApy + lst.apyBoost;
        try {
          const lstPrice = prices[lst.id] ?? 0;
          const solPriceLive = prices.SOL ?? 0;
          if (lstPrice > 0 && solPriceLive > 0) {
            const premium = lstPrice / solPriceLive;
            const expectedPremium = 1 + (protocolApy / 100);
            const liveAdjustment = premium > 1 ? ((premium - 1) / (expectedPremium - 1)) * protocolApy - protocolApy : 0;
            protocolApy = Math.max(baseApy, protocolApy + Math.min(2, Math.max(-2, liveAdjustment * 0.3)));
          }
        } catch (_e) {}

        const apy = Math.round(protocolApy * 100) / 100;
        const yield12m = amountSol * (apy / 100);
        const yieldUsd = yield12m * solPrice;

        const apyScore = Math.min(35, Math.round(apy * 4.5));
        const yieldRatio = amountSol > 0 ? Math.min(20, Math.round((yield12m / amountSol) * 280)) : 0;
        const protocolBonus = lst.maturity;
        const amtBonus = amountSol >= 0.5 ? Math.min(12, Math.round(Math.log10(amountSol + 1) * 7)) : 0;
        const timeJitter = (Math.cos(Date.now() / 90000) + 1) * 2;
        const score = Math.max(0, Math.min(100, Math.round(apyScore + yieldRatio + protocolBonus + amtBonus + timeJitter)));

        const riskLevel: "low" | "medium" | "high" = amountSol > 10000 ? "high" : amountSol > 1000 || lst.maturity < 15 ? "medium" : "low";
        const riskLabel = amountSol > 5000 ? "Concentration Risk" : apy < 3 ? "Low Yield Environment" : lst.riskNote;

        setQuote({ kind, apy, yield12m, yieldUsd, inputUsd, score, riskLevel, riskLabel, lstId: selectedLst });
        toast.success(`${lst.name} projection ready`);

      } else if (kind === "lp_sol_usdc") {
        let pools: any[] = [];
        try {
          const lpRes = await fetch("/api/lp/apy", { cache: "no-store" });
          if (lpRes.ok) {
            const lpData = await lpRes.json();
            pools = lpData?.pools || [];
          }
        } catch (_e) {}
        const bestPool = pools[0] || { dex: "Orca", pair: "SOL/USDC", apy: 12.5, tvl: 45_000_000 };
        const lpApy = bestPool.apy;
        const yield12m = amountSol * (lpApy / 100);
        const yieldUsd = yield12m * solPrice;

        const apyScore = Math.min(30, Math.round(lpApy * 0.6));
        const tvlScore = bestPool.tvl > 20_000_000 ? 25 : bestPool.tvl > 5_000_000 ? 18 : bestPool.tvl > 1_000_000 ? 12 : 5;
        const volRatio = (bestPool.volume24h || 0) / Math.max(bestPool.tvl, 1);
        const utilizationScore = Math.min(15, Math.round(volRatio * 30));
        const ilPenalty = Math.round(Math.min(20, lpApy * 0.15));
        const feeBonus = bestPool.fee && bestPool.fee <= 0.003 ? 10 : 5;
        const lpJitter = (Math.sin(Date.now() / 75000) + 1) * 2;
        const score = Math.max(0, Math.min(100, Math.round(apyScore + tvlScore + utilizationScore - ilPenalty + feeBonus + lpJitter)));

        const riskLevel: "low" | "medium" | "high" = bestPool.tvl < 1_000_000 || lpApy > 100 ? "high" : bestPool.tvl < 10_000_000 || lpApy > 50 ? "medium" : "low";
        const riskLabel = bestPool.tvl < 2_000_000 ? "Low Liquidity" : lpApy > 60 ? "Volatile Yield" : "IL + Protocol Risk";

        setQuote({ kind, pools, bestPool, lpApy, yield12m, yieldUsd, inputUsd, solPrice, score, riskLevel, riskLabel });
        toast.success("LP data ready");
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const simulateRef = useRef(simulate);
  simulateRef.current = simulate;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "/") {
        e.preventDefault();
        nlpInputRef.current?.focus();
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        simulateRef.current();
      } else if (["1", "2", "3"].includes(e.key)) {
        e.preventDefault();
        const map: Record<string, StrategyKind> = { "1": "stake_marinade", "2": "swap_jupiter", "3": "lp_sol_usdc" };
        setKind(map[e.key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleParse() {
    const text = nlpText.trim();
    if (!text) return;
    setNlpLoading(true);
    try {
      let parsed: any | null = null;
      try {
        const r = await fetch("/api/ai/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text })
        });
        if (r.ok) parsed = await r.json();
      } catch {}

      if (!parsed || !parsed.ok) {
        const lower = text.toLowerCase();
        const amtMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)\s*sol/);
        const amt = amtMatch ? Number(amtMatch[1]) : amountSol;
        if (/\b(stake|staking)\b/.test(lower)) parsed = { action: "stake", amount: amt, asset: "SOL", venue: "marinade", confidence: 0.5 };
        else if (/\b(swap|buy|sell|convert)\b/.test(lower)) parsed = { action: "swap", amount: amt, asset: "SOL", venue: "jupiter", confidence: 0.5 };
        else if (/\b(lp|liquidity|pool)\b/.test(lower)) parsed = { action: "lp", amount: amt, asset: "SOL", venue: "orca", confidence: 0.5 };
      }

      if (!parsed || !parsed.action) {
        toast.error("Could not understand that. Try: 'stake 5 sol', 'swap 10 sol to usdc', or 'lp 5 sol'");
        return;
      }

      let nextKind: StrategyKind = "stake_marinade";
      if (parsed.action === "swap" || parsed.action === "dca") nextKind = "swap_jupiter";
      if (parsed.action === "lp") nextKind = "lp_sol_usdc";
      setKind(nextKind);
      if (typeof parsed.amount === "number" && !Number.isNaN(parsed.amount)) setAmountSol(parsed.amount);

      const conf = parsed.confidence ? ` (${(parsed.confidence * 100).toFixed(0)}% conf)` : "";
      toast.success(`Parsed: ${parsed.action} ${parsed.amount ?? ""} ${parsed.asset ?? "SOL"}${parsed.venue ? " via " + parsed.venue : ""}${conf}`);
      await simulateRef.current();
    } finally {
      setNlpLoading(false);
    }
  }

  function shareLink() {
    try {
      const url = new URL(window.location.href);
      const sp = url.searchParams;
      sp.set("kind", kind);
      sp.set("amountSol", String(amountSol));
      if (nlpText.trim()) sp.set("nlp", nlpText.trim());else sp.delete("nlp");
      url.search = sp.toString();
      const href = url.toString();
      navigator.clipboard.writeText(href);
      toast.success("Link copied", { description: "Shareable Strategy Lab link copied to clipboard" });
    } catch (e: any) {
      toast.error("Failed to copy link", { description: e?.message || String(e) });
    }
  }

  async function executeSwap() {
    try {
      if (!publicKey) { toast.error("Connect wallet to execute"); return; }
      if (!quote || kind !== "swap_jupiter") { toast.error("No quote to execute"); return; }
      setExecLoading(true);

      const rawQuote = quote?.data ?? quote;
      const { _parsed, ...quoteResponse } = rawQuote as any;

      const res = await fetch("/api/jupiter/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey: publicKey.toBase58(),
          wrapAndUnwrapSol: true,
          asLegacyTransaction: false
        })
      });
      const j = await res.json();
      if (!res.ok || !j?.swapTransaction) throw new Error(j?.error || "Failed to build swap transaction");

      const b64 = j.swapTransaction as string;
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const vtx = VersionedTransaction.deserialize(bytes);

      const signedTx = await signTransaction!(vtx);
      const signature = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true });
      toast.success("Transaction sent");
    } catch (e: any) {
      toast.error("Swap failed", { description: e?.message || String(e) });
    } finally {
      setExecLoading(false);
    }
  }

  async function executeStake() {
    try {
      if (!publicKey) { toast.error("Connect wallet to execute"); return; }
      if (kind !== "stake_marinade") { toast.error("Not in staking mode"); return; }
      const lamports = Math.floor(Math.max(0, amountSol) * LAMPORTS_PER_SOL);
      if (!lamports) { toast.error("Enter amount > 0"); return; }
      setExecLoading(true);

      const lst = LST_OPTIONS.find(l => l.id === selectedLst) || LST_OPTIONS[0];
      const quoteUrl = new URL("/api/jupiter/quote", window.location.origin);
      quoteUrl.searchParams.set("inputMint", MINTS.SOL);
      quoteUrl.searchParams.set("outputMint", lst.mint);
      quoteUrl.searchParams.set("amount", String(lamports));
      quoteUrl.searchParams.set("slippageBps", "10"); 
      const quoteRes = await fetch(quoteUrl.toString(), { cache: "no-store" });
      const quoteData = await quoteRes.json();
      if (!quoteRes.ok || !quoteData) throw new Error(quoteData?.error || "Failed to get staking quote");

      const swapRes = await fetch("/api/jupiter/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: publicKey.toBase58(),
          wrapAndUnwrapSol: true,
          asLegacyTransaction: false
        })
      });
      const swapData = await swapRes.json();
      if (!swapRes.ok || !swapData?.swapTransaction) throw new Error(swapData?.error || "Failed to build stake transaction");

      const b64 = swapData.swapTransaction as string;
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const vtx = VersionedTransaction.deserialize(bytes);

      const signedTx = await signTransaction!(vtx);
      await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true });
      toast.success(`Staked via ${lst.name}`);
    } catch (e: any) {
      toast.error("Stake failed", { description: e?.message || String(e) });
    } finally {
      setExecLoading(false);
    }
  }

  async function executeLp() {
    try {
      if (!publicKey) { toast.error("Connect wallet to execute"); return; }
      if (kind !== "lp_sol_usdc") { toast.error("Not in LP mode"); return; }
      const halfSol = amountSol / 2;
      const lamports = Math.floor(Math.max(0, halfSol) * LAMPORTS_PER_SOL);
      if (!lamports) { toast.error("Enter amount > 0"); return; }
      setExecLoading(true);

      const quoteUrl = new URL("/api/jupiter/quote", window.location.origin);
      quoteUrl.searchParams.set("inputMint", MINTS.SOL);
      quoteUrl.searchParams.set("outputMint", MINTS.USDC);
      quoteUrl.searchParams.set("amount", String(lamports));
      quoteUrl.searchParams.set("slippageBps", "50");
      const quoteRes = await fetch(quoteUrl.toString(), { cache: "no-store" });
      const quoteData = await quoteRes.json();
      if (!quoteRes.ok || !quoteData) throw new Error(quoteData?.error || "Failed to get LP swap quote");

      const swapRes = await fetch("/api/jupiter/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: publicKey.toBase58(),
          wrapAndUnwrapSol: true,
          asLegacyTransaction: false,
        }),
      });
      const swapData = await swapRes.json();
      if (!swapRes.ok || !swapData?.swapTransaction) throw new Error(swapData?.error || "Failed to build LP swap transaction");

      const b64 = swapData.swapTransaction as string;
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const vtx = VersionedTransaction.deserialize(bytes);
      const signedTx = await signTransaction!(vtx);
      await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true });

      toast.success(`Swapped ${halfSol.toFixed(3)} SOL → USDC for LP pair`, {
        description: "Opening pool deposit…",
      });

      const bestPool = quote?.bestPool;
      let poolUrl: string;
      if (bestPool?.dex === "Raydium" && bestPool?.pool && bestPool.pool !== "unknown" && bestPool.pool !== "estimated") {
        poolUrl = `https://raydium.io/liquidity/increase/?mode=add&pool_id=${bestPool.pool}`;
      } else if (bestPool?.pool && bestPool.pool !== "unknown" && bestPool.pool !== "estimated") {
        poolUrl = `https://www.orca.so/pools/${bestPool.pool}`;
      } else {
        poolUrl = "https://www.orca.so/?tokenA=SOL&tokenB=USDC";
      }

      setTimeout(() => {
        window.open(poolUrl, "_blank", "noopener,noreferrer");
      }, 1500);
    } catch (e: any) {
      toast.error("LP execution failed", { description: e?.message || String(e) });
    } finally {
      setExecLoading(false);
    }
  }

  return (
    <AtlasShell activeSection="strategy-lab">
      <section id="strategy-lab" className="atlas-glass p-6 min-h-[80vh]">
        <div className="space-y-4">
          {/* Hero: NLP Command */}
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical className="text-violet-600 h-5 w-5" />
            <h2 className="text-base font-bold text-slate-900">Strategy Lab</h2>
            <LabPulseDot />
            <span className="text-xs text-slate-400 ml-auto">Press / to focus</span>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 mb-4">
            <form onSubmit={(e) => { e.preventDefault(); handleParse(); }} className="relative">
              <Input ref={nlpInputRef} value={nlpText} onChange={(e) => setNlpText(e.target.value)}
                placeholder="stake 5 SOL · swap 10 SOL to USDC · provide liquidity 3 SOL"
                className="h-11 pr-24 text-sm bg-white border-slate-200 rounded-xl text-slate-900 placeholder-slate-400" />
              <button type="submit" disabled={nlpLoading || !nlpText.trim()}
                className="absolute right-1 top-1 h-9 px-4 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50">
                {nlpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Run <ArrowRight className="h-3.5 w-3.5 ml-1" /></>}
              </button>
            </form>
          </div>

          {/* Strategy Selector + Amount */}
          <div className="flex items-center gap-2 flex-wrap">
            {(["stake_marinade", "swap_jupiter", "lp_sol_usdc"] as StrategyKind[]).map((k) => {
              const labels: Record<StrategyKind, string> = { stake_marinade: "Stake", swap_jupiter: "Swap", lp_sol_usdc: "LP" };
              const active = kind === k;
              return (
                <button key={k} onClick={() => { setKind(k); setQuote(null); }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${active ? "bg-violet-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {labels[k]}
                </button>
              );
            })}
            <div className="ml-auto flex items-center gap-2">
              <input type="number" min={0} step={0.1} value={amountSol} onChange={(e) => setAmountSol(Number(e.target.value))}
                className="h-9 w-24 text-sm text-center border border-slate-200 rounded-xl bg-white text-slate-900 outline-none focus:ring-2 focus:ring-violet-500/50" />
              <span className="text-xs text-slate-400">SOL</span>
              <button onClick={() => simulate()} disabled={loading} className="h-9 px-4 text-sm font-medium bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Simulate"}
              </button>
              <button onClick={shareLink} className="h-9 px-3 text-sm text-slate-400 hover:text-slate-600 transition-colors">Share</button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="rounded-xl border border-border/30 bg-card/60 backdrop-blur-md p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin opacity-50" />
                <span className="text-xs opacity-50">Analyzing strategy…</span>
              </div>
              <Skeleton className="h-16 w-full rounded-lg" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-12 rounded-lg" />
                <Skeleton className="h-12 rounded-lg" />
                <Skeleton className="h-12 rounded-lg" />
              </div>
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          )}

          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          {/* Strategy Comparison (shown before simulation) */}
          {!quote && !loading && (
            <div className="rounded-xl border border-border/30 bg-card/60 backdrop-blur-md p-4 space-y-3">
              <div className="text-[11px] font-medium opacity-60">Compare Strategies</div>
              <LabStrategyCompare strategies={[
                { name: "Stake", apy: inflationApy ?? 7.0, risk: "Low", active: kind === "stake_marinade" },
                { name: "Swap", apy: 0, risk: "None", active: kind === "swap_jupiter" },
                { name: "LP", apy: 12.5, risk: "Med", active: kind === "lp_sol_usdc" },
              ]} />
              <div className="text-[10px] opacity-30 text-center">Select a strategy and hit Simulate, or type a command above</div>
            </div>
          )}

          {/* Swap Results */}
          {quote && kind === "swap_jupiter" && (() => {
            const p = quote._parsed || {};
            const score = p.score ?? 0;
            return (
            <div className="rounded-xl border border-border/30 bg-card/60 backdrop-blur-md overflow-hidden">
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-4">
                  <LabScoreGauge score={score} size={64} label="Strategy" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">Swap via Jupiter</span>
                      <LabPulseDot />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg p-2.5 bg-background/30">
                        <div className="text-[10px] opacity-40">You Send</div>
                        <div className="font-mono text-sm font-semibold">{amountSol} SOL</div>
                        <div className="text-[10px] opacity-30 font-mono">${p.inputUsd?.toFixed(2) ?? "-"}</div>
                      </div>
                      <div className="rounded-lg p-2.5 bg-background/30">
                        <div className="text-[10px] opacity-40">You Receive</div>
                        <div className="font-mono text-sm font-semibold text-emerald-500">{p.outAmount?.toFixed(2) ?? "-"} USDC</div>
                        <div className="text-[10px] opacity-30 font-mono">{p.outAmount && amountSol ? (p.outAmount / amountSol).toFixed(2) : "-"}/SOL</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Price Impact", value: `${((p.priceImpact ?? 0) * 100).toFixed(3)}%`, warn: (p.priceImpact ?? 0) > 0.01 },
                    { label: "Slippage", value: `${((p.slippageBps ?? 50) / 100).toFixed(1)}%`, warn: false },
                    { label: "Route Hops", value: String(p.routeCount ?? 1), warn: false },
                  ].map((m, i) => (
                    <div key={i} className="rounded-lg py-1.5 bg-background/25">
                      <div className="text-[9px] opacity-40">{m.label}</div>
                      <div className={`font-mono text-[11px] font-medium ${m.warn ? "text-red-400" : ""}`}>{m.value}</div>
                    </div>
                  ))}
                </div>

                <LabRiskBar level={p.riskLevel || "low"} label={p.riskLabel || "Execution Risk"} />
              </div>
              <div className="border-t border-border/20 p-3">
                <Button size="sm" onClick={executeSwap} disabled={!publicKey || execLoading} className="w-full h-9 rounded-lg">
                  {execLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : !publicKey ? "Connect Wallet" : "Execute Swap →"}
                </Button>
              </div>
            </div>);
          })()}

          {/* Stake Results */}
          {quote && kind === "stake_marinade" && (() => {
            const score = quote.score ?? 0;
            const apy = quote.apy ?? 7;
            const activeLst = LST_OPTIONS.find(l => l.id === selectedLst) || LST_OPTIONS[0];
            return (
            <div className="rounded-xl border border-border/30 bg-card/60 backdrop-blur-md overflow-hidden">
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-1.5 mb-1">
                  {LST_OPTIONS.map((lst) => (
                    <button
                      key={lst.id}
                      onClick={() => { if (selectedLst !== lst.id) { setSelectedLst(lst.id); simulate(lst.id); } }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all cursor-pointer ${selectedLst === lst.id ? "bg-foreground/10 text-foreground ring-1 ring-foreground/10" : "bg-card/40 text-foreground/40 hover:text-foreground/60"}`}
                    >
                      <img src={lst.icon} alt={lst.symbol} className="h-3.5 w-3.5 rounded-full" />
                      {lst.symbol}
                    </button>
                  ))}
                </div>

                <div className="flex items-start gap-4">
                  <LabScoreGauge score={score} size={64} label="Strategy" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">Stake via {activeLst.name}</span>
                      <LabPulseDot />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg p-2.5 bg-background/30">
                        <div className="text-[10px] opacity-40">Deposit</div>
                        <div className="font-mono text-sm font-semibold">{amountSol} SOL</div>
                        <div className="text-[10px] opacity-30 font-mono">${quote.inputUsd?.toFixed(2) ?? "-"}</div>
                      </div>
                      <div className="rounded-lg p-2.5 bg-background/30">
                        <div className="text-[10px] opacity-40">APY</div>
                        <div className="font-mono text-sm font-semibold text-emerald-500">{apy.toFixed(2)}%</div>
                        <div className="text-[10px] opacity-30">{activeLst.name}</div>
                      </div>
                      <div className="rounded-lg p-2.5 bg-background/30">
                        <div className="text-[10px] opacity-40">12m Yield</div>
                        <div className="font-mono text-sm font-semibold">{quote.yield12m?.toFixed(3)} SOL</div>
                        <div className="text-[10px] opacity-30 font-mono">${quote.yieldUsd?.toFixed(2) ?? "-"}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg p-3 bg-background/20">
                  <div className="text-[10px] opacity-40 mb-1">Projected Growth (12 months)</div>
                  <LabYieldChart principal={amountSol} apy={apy} />
                </div>

                <LabRiskBar level={(quote as any).riskLevel || "low"} label={(quote as any).riskLabel || "Protocol Risk"} />
              </div>
              <div className="border-t border-border/20 p-3">
                <Button size="sm" onClick={executeStake} disabled={!publicKey || execLoading} className="w-full h-9 rounded-lg">
                  {execLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : !publicKey ? "Connect Wallet" : `Stake → ${activeLst.symbol}`}
                </Button>
              </div>
            </div>);
          })()}

          {/* LP Results */}
          {quote && kind === "lp_sol_usdc" && (() => {
            const score = quote.score ?? 0;
            const pools = quote.pools || [];
            const lpApy = quote.lpApy ?? 12.5;
            return (
            <div className="rounded-xl border border-border/30 bg-card/60 backdrop-blur-md overflow-hidden">
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-4">
                  <LabScoreGauge score={score} size={64} label="Strategy" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">LP SOL/USDC</span>
                      <LabPulseDot />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg p-2.5 bg-background/30">
                        <div className="text-[10px] opacity-40">Deposit</div>
                        <div className="font-mono text-sm font-semibold">{amountSol} SOL</div>
                        <div className="text-[10px] opacity-30 font-mono">${quote.inputUsd?.toFixed(2) ?? "-"}</div>
                      </div>
                      <div className="rounded-lg p-2.5 bg-background/30">
                        <div className="text-[10px] opacity-40">Best APY</div>
                        <div className="font-mono text-sm font-semibold text-emerald-500">{lpApy.toFixed(1)}%</div>
                        <div className="text-[10px] opacity-30">{quote.bestPool?.dex ?? "Orca"}</div>
                      </div>
                      <div className="rounded-lg p-2.5 bg-background/30">
                        <div className="text-[10px] opacity-40">12m Yield</div>
                        <div className="font-mono text-sm font-semibold">{quote.yield12m?.toFixed(3)} SOL</div>
                        <div className="text-[10px] opacity-30 font-mono">${quote.yieldUsd?.toFixed(2) ?? "-"}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg p-3 bg-background/20">
                  <div className="text-[10px] opacity-40 mb-1">Projected Growth (12 months, excl. IL)</div>
                  <LabYieldChart principal={amountSol} apy={lpApy} color="#6366f1" />
                </div>

                {pools.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-medium opacity-50">Pools</div>
                    {pools.slice(0, 4).map((pool: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-[10px] rounded-lg px-2.5 py-1.5 bg-background/20">
                        <span className="opacity-60">{pool.dex}</span>
                        <span className="opacity-40">{pool.pair}</span>
                        <span className="font-mono text-emerald-500">{pool.apy?.toFixed(1)}%</span>
                        <span className="opacity-30">${(pool.tvl / 1e6).toFixed(1)}M</span>
                      </div>
                    ))}
                  </div>
                )}

                <LabRiskBar level={(quote as any).riskLevel || "low"} label={(quote as any).riskLabel || "IL + Protocol Risk"} />
              </div>
              <div className="border-t border-border/20 p-3">
                <Button size="sm" onClick={executeLp} disabled={!publicKey || execLoading} className="w-full h-9 rounded-lg">
                  {execLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : !publicKey ? "Connect Wallet" : `Deposit on ${quote.bestPool?.dex ?? "Orca"} →`}
                </Button>
              </div>
            </div>);
          })()}

        </div>
      </section>
    </AtlasShell>
  );
}
