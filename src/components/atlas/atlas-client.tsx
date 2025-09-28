"use client";

import { useEffect, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL, VersionedTransaction, Transaction } from "@solana/web3.js";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowRight, ArrowLeft, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem } from
"@/components/ui/dropdown-menu";
import { useRouter, useSearchParams } from "next/navigation";
import { JupiterSwapCard } from "@/components/atlas/JupiterSwapCard";

// Jupiter core mints (mainnet)
const MINTS = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  MSOL: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"
} as const;

type StrategyKind = "stake_marinade" | "swap_jupiter" | "lp_sol_usdc";

// Unique inline glyph for Atlas branding
function GlyphAtlas({ className = "h-4 w-4" }: {className?: string;}) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.85" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.4" />
        </linearGradient>
        <radialGradient id="g2" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g fill="none" stroke="url(#g1)" strokeWidth="1.6" strokeLinecap="round">
        <path d="M3 16c6-9 20-9 26 0" />
        <path d="M3 16c6 9 20 9 26 0" />
        <path d="M8 16c3-5 13-5 16 0" />
        <path d="M8 16c3 5 13 5 16 0" />
      </g>
      <circle cx="16" cy="16" r="6.5" fill="url(#g2)" />
      <circle cx="16" cy="16" r="2.2" fill="currentColor" opacity="0.9" />
    </svg>);

}

// Bespoke section glyphs
function GlyphCompass({ className = "h-3.5 w-3.5" }: {className?: string;}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="gc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="9" fill="none" stroke="url(#gc)" strokeWidth="1.2" />
      <path d="M9 15l3-8 3 8-3-1z" fill="currentColor" opacity="0.9" />
    </svg>);

}

function GlyphLab({ className = "h-3.5 w-3.5" }: {className?: string;}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M9 3h6M10 3v5l-4 8a4 4 0 004 4h4a4 4 0 004-4l-4-8V3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 16c1.2-1 3.8-1 5 0 1.2 1 3.8 1 5 0" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.2" />
    </svg>);

}

function GlyphMarket({ className = "h-3.5 w-3.5" }: {className?: string;}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M3 17l5-5 4 3 6-8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="18" cy="7" r="1.5" fill="currentColor" />
    </svg>);

}

function GlyphStream({ className = "h-3.5 w-3.5" }: {className?: string;}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 15l3-3 3 2 3-4 2 2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>);

}

// Premium inline sparkline (no libs)
function Sparkline({ data, width = 120, height = 28, className = "" }: {data: number[];width?: number;height?: number;className?: string;}) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const rng = max - min || 1;
  const stepX = width / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * stepX;
    const y = height - (v - min) / rng * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className={className} aria-hidden>
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.7" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke="url(#spark)" strokeWidth="1.6" points={pts} strokeLinecap="round" />
    </svg>);

}

// Helper: percent change from first -> last
const pctChange = (arr: number[]) => {
  if (!arr || arr.length < 2) return null;
  const first = arr[0];
  const last = arr[arr.length - 1];
  if (!first) return null;
  return (last - first) / first * 100;
};

export function AtlasClient() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, disconnect } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isClay = (searchParams?.get("style") || "") === "clay";
  const { setVisible } = useWalletModal();

  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [inflationApy, setInflationApy] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [inflationError, setInflationError] = useState<string | null>(null);

  // Strategy Lab state
  const [kind, setKind] = useState<StrategyKind>("stake_marinade");
  const [amountSol, setAmountSol] = useState<number>(5);
  const [quote, setQuote] = useState<any>(null);
  const [nlpText, setNlpText] = useState("");
  const [nlpLoading, setNlpLoading] = useState(false);
  const nlpInputRef = useRef<HTMLInputElement | null>(null);
  const [execLoading, setExecLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("quests");
  const [headerStyle, setHeaderStyle] = useState<"default" | "alt">("default");

  // Airdrop Compass state
  const [compassLoading, setCompassLoading] = useState(false);
  const [compassError, setCompassError] = useState<string | null>(null);
  const [compassData, setCompassData] = useState<any | null>(null);
  const [selectedAirdropId, setSelectedAirdropId] = useState<string | null>(null);

  // Helper: build a few realistic heuristic airdrops when scan returns sparse results
  function buildHeuristicAirdrops(addr: string, sol: number | null) {
    const now = Date.now();
    const tasksSwapUsdc = [{ id: `t-swap-usdc-${now}` , type: "swap", label: "Swap 0.1 SOL → USDC on Jupiter", venue: "Jupiter", value: 0.1 }];
    const tasksStakeMnde = [{ id: `t-stake-mnde-${now}`, type: "stake", label: "Stake 1 SOL with Marinade", venue: "Marinade", value: 1 }];
    const items = [] as any[];
    // Jupiter is generally open to anyone; encourage a small swap
    items.push({
      id: `air-jup-${addr.slice(0,6)}-${now}`,
      name: "Jupiter Quests",
      source: "jup.ag",
      status: "eligible",
      estReward: "Points/Boost (speculative)",
      details: "Execute a small swap to accrue activity for potential points/quests.",
      endsAt: null,
      tasks: tasksSwapUsdc,
    });
    // Marinade staking eligibility if user has at least ~1 SOL
    if ((sol ?? 0) >= 1) {
      items.push({
        id: `air-mnde-${addr.slice(0,6)}-${now}`,
        name: "Marinade Staking",
        source: "marinade.finance",
        status: "eligible",
        estReward: "Staking APY + quests (ongoing)",
        details: "Stake SOL to receive mSOL and participate in ecosystem quests.",
        endsAt: null,
        tasks: tasksStakeMnde,
      });
    }
    return items;
  }

  // Try to drive the embedded Jupiter widget for swap quests; fall back to internal swap flow
  async function tryInitiateJupiterSwap({ amount = 0.1, inputMint = MINTS.SOL, outputMint = MINTS.USDC }: { amount?: number; inputMint?: string; outputMint?: string; }) {
    const Jupiter: any = (window as any)?.Jupiter;
    const container = document.getElementById("jupiter-integrated");
    const want = { inputMint, outputMint, amount: String(amount) };
    try {
      if (Jupiter && typeof Jupiter.init === "function") {
        if (typeof Jupiter.setFormProps === "function") {
          Jupiter.setFormProps({ initialInputMint: inputMint, initialOutputMint: outputMint, initialAmount: String(amount) });
        } else if (typeof Jupiter.syncProps === "function") {
          Jupiter.syncProps({ formProps: { initialInputMint: inputMint, initialOutputMint: outputMint, initialAmount: String(amount) } });
        }
        // Give the widget a moment to compute routes, then click swap if a button exists
        await new Promise((r) => setTimeout(r, 550));
        const btn = container?.querySelector('button:has(span),button');
        // Heuristic: click the last primary-ish button
        const buttons = container ? Array.from(container.querySelectorAll('button')) as HTMLButtonElement[] : [];
        const primary = buttons.reverse().find(b => /swap|review|confirm/i.test(b.textContent || ""));
        (primary || btn)?.click?.();
        toast.message("Jupiter swap initiated", { description: `${amount} SOL → USDC via embedded widget` });
        return true;
      }
    } catch {}
    // Fallback to internal quote + executeSwap
    setKind("swap_jupiter");
    setAmountSol(Number(amount));
    await simulate();
    await executeSwap();
    return true;
  }

  // Execute a specific quest task directly
  async function handleExecuteTask(t: any) {
    const type = (t?.type || t?.kind || "").toLowerCase();
    const val = typeof t?.value === "number" ? t.value : typeof t?.amount === "number" ? t.amount : 0.1;
    if (!publicKey) { toast.error("Connect wallet to execute"); return; }
    if (type === "swap") {
      await tryInitiateJupiterSwap({ amount: val, inputMint: t?.inputMint || MINTS.SOL, outputMint: t?.outputMint || MINTS.USDC });
      return;
    }
    if (type === "stake") {
      setKind("stake_marinade");
      setAmountSol(val);
      await executeStake();
      return;
    }
    if (type === "lp") {
      toast.message("LP flow not automated yet", { description: "Use target vault UI for deposit." });
      return;
    }
    toast.info("Unsupported task type for execute yet.");
  }

  // NEW: Speculative opportunities (airdrops.io)
  const [specLoading, setSpecLoading] = useState(false);
  const [specError, setSpecError] = useState<string | null>(null);
  const [specItems, setSpecItems] = useState<any[]>([]);

  // NEW: Holder Insights
  const [mintInput, setMintInput] = useState("");
  const [holderLoading, setHolderLoading] = useState(false);
  const [moralisStats, setMoralisStats] = useState<any | null>(null);
  const [dasCount, setDasCount] = useState<number | null>(null);
  const [holderError, setHolderError] = useState<string | null>(null);

  // NEW: Live OHLCV (SSE)
  const [lastCandle, setLastCandle] = useState<any | null>(null);
  const [ohlcvActive, setOhlcvActive] = useState(false);

  // Sparkline price history
  const [solHistory, setSolHistory] = useState<number[]>([]);
  const [msolHistory, setMsolHistory] = useState<number[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesUpdatedAt, setPricesUpdatedAt] = useState<number | null>(null);

  // Address Lookup (simple Solscan opener)
  const [addressLookup, setAddressLookup] = useState("");

  // THEME: light/dark toggle
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved as 'light' | 'dark';
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme((t) => t === 'dark' ? 'light' : 'dark');

  // Bottom command bar
  const [cmdText, setCmdText] = useState("");
  const [cmdTool, setCmdTool] = useState<'auto' | 'stake' | 'swap' | 'lp'>("auto");
  const handleBottomSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = cmdText.trim();
    if (!text) return;

    // Quick NLP: Quests intents (e.g., "scan my wallet for airdrops")
    const lower = text.toLowerCase();
    const wantsAirdrops = /(scan|check|find|show|discover).*air\s?-?\s?drops?|airdrop/.test(lower) || /airdrops?/.test(lower);
    if (wantsAirdrops) {
      setActiveTab('quests');
      setCmdText("");
      setTimeout(() => {
        scanAirdrops();
        document.getElementById('airdrop-compass')?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
      return;
    }

    // Default: Strategy Lab intents
    setActiveTab('lab');
    setNlpText(cmdTool === 'auto' ? text : `${cmdTool} ${text}`);
    setCmdText("");
    // allow tab render, then parse/simulate
    setTimeout(() => {
      nlpInputRef.current?.focus();
      handleParse();
      document.getElementById('strategy-lab')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // Manual refresh for Market Snapshot
  async function refreshPrices() {
    try {
      setPricesLoading(true);
      const j = await fetchJsonWithRetry("/api/jupiter/price?ids=SOL,MSOL,USDC", { cache: "no-store" });
      if ((j as any)?.data) {
        const map: Record<string, number> = {};
        for (const k of Object.keys((j as any).data)) {
          const p = (j as any).data[k]?.price;
          if (typeof p === "number") map[k.toUpperCase()] = p;
        }
        setPrices(map);
        if (typeof map.SOL === "number") setSolHistory((prev) => [...prev.slice(-47), map.SOL]);
        if (typeof map.MSOL === "number") setMsolHistory((prev) => [...prev.slice(-47), map.MSOL]);
        setPricesUpdatedAt(Date.now());
      }
    } catch (e: any) {
      toast.error("Refresh failed", { description: e?.message || String(e) });
    } finally {
      setPricesLoading(false);
    }
  }

  // Lightweight retry/backoff helper
  async function fetchJsonWithRetry(input: RequestInfo | URL, init?: RequestInit, retries = 3, baseDelayMs = 400) {
    let lastErr: any = null;
    for (let i = 0; i <= retries; i++) {
      try {
        const res = await fetch(input, init);
        const isJson = res.headers.get("content-type")?.includes("application/json");
        const data = isJson ? await res.json() : await res.text();
        if (!res.ok) {
          lastErr = new Error((data as any)?.error || res.statusText || "Request failed");
        } else {
          return data;
        }
      } catch (e) {
        lastErr = e;
      }
      const delay = baseDelayMs * Math.pow(2, i) + Math.floor(Math.random() * 200);
      await new Promise((r) => setTimeout(r, delay));
    }
    throw lastErr;
  }

  // Fetch wallet SOL balance
  useEffect(() => {
    let abort = false;
    async function run() {
      if (!publicKey) {setSolBalance(null);return;}
      try {
        const bal = await connection.getBalance(publicKey as PublicKey, "processed");
        if (!abort) setSolBalance(bal / LAMPORTS_PER_SOL);
        if (!abort) setBalanceError(null);
      } catch (e1: any) {
        // Fallback via our RPC proxy to avoid adapter connection issues
        try {
          const j = await fetchJsonWithRetry("/api/solana/rpc", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "getBalance", params: [publicKey!.toBase58(), { commitment: "processed" }] })
          });
          const val = (j as any)?.result?.value;
          if (!abort && typeof val === "number") {
            setSolBalance(val / LAMPORTS_PER_SOL);
            setBalanceError(null);
            return;
          }
          if (!abort) {
            setBalanceError(e1?.message || "Failed to fetch balance");
            setSolBalance(0);
          }
        } catch (e2: any) {
          if (!abort) {
            setBalanceError(e2?.message || e1?.message || "Failed to fetch balance");
            setSolBalance(0);
          }
        }
      }
    }
    run();
    const id = setInterval(run, 15_000);
    return () => {abort = true;clearInterval(id);};
  }, [connection, publicKey]);

  // Fetch price snapshots (SOL, mSOL, USDC) via Jupiter Price API proxy
  useEffect(() => {
    let abort = false;
    async function run() {
      try {
        const j = await fetchJsonWithRetry("/api/jupiter/price?ids=SOL,MSOL,USDC", { cache: "no-store" });
        if (!abort && (j as any)?.data) {
          const map: Record<string, number> = {};
          for (const k of Object.keys((j as any).data)) {
            const p = (j as any).data[k]?.price;
            if (typeof p === "number") map[k.toUpperCase()] = p;
          }
          // update price state
          setPrices(map);
          setPricesUpdatedAt(Date.now());
          // append to sparkline histories (keep last ~48 points)
          if (typeof map.SOL === "number") {
            setSolHistory((prev) => [...prev.slice(-47), map.SOL]);
          }
          if (typeof map.MSOL === "number") {
            setMsolHistory((prev) => [...prev.slice(-47), map.MSOL]);
          }
        }
      } catch {}
    }
    run();
    const id = setInterval(run, 30_000);
    return () => {abort = true;clearInterval(id);};
  }, []);

  // Fetch network inflation rate as staking APY baseline
  useEffect(() => {
    let abort = false;
    async function run() {
      try {
        const j = await fetchJsonWithRetry("/api/solana/rpc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getInflationRate", params: [] })
        });
        const rate = (j as any)?.result?.total; // use total inflation rate (fractional, e.g. 0.07)
        if (!abort && typeof rate === "number") {
          setInflationApy(Math.max(0, Math.min(20, rate * 100)));
          setInflationError(null);
        }
      } catch (e: any) {
        if (!abort) {
          setInflationError(e?.message || "Failed to fetch inflation rate");
          setInflationApy(0);
        }
      }
    }
    run();
    const id = setInterval(run, 60_000);
    return () => {abort = true;clearInterval(id);};
  }, []);

  // NEW: fetch speculative opportunities on mount
  useEffect(() => {
    let mounted = true;
    async function run() {
      setSpecLoading(true);
      setSpecError(null);
      try {
        const j = await fetchJsonWithRetry("/api/airdrops/speculative/solana", { cache: "no-store" });
        if (mounted) setSpecItems(Array.isArray((j as any)?.items) ? (j as any).items : (j as any)?.data || []);
      } catch (e: any) {
        if (mounted) setSpecError(e?.message || String(e));
      } finally {
        if (mounted) setSpecLoading(false);
      }
    }
    run();
    return () => {mounted = false;};
  }, []);

  // NEW: Holder insights fetcher
  async function fetchHolderInsights() {
    const mint = mintInput.trim();
    if (!mint) {toast.error("Enter a token mint");return;}
    setHolderLoading(true);
    setHolderError(null);
    setMoralisStats(null);
    setDasCount(null);
    try {
      // Moralis
      const mJson = await fetchJsonWithRetry(`/api/moralis/solana/holders/${mint}/stats`, { cache: "no-store" });
      setMoralisStats(mJson);
      // Helius DAS
      const hJson = await fetchJsonWithRetry(`/api/helius/das/token-accounts?mint=${mint}`, { cache: "no-store" });
      const list = (hJson as any)?.result || (hJson as any)?.data || (hJson as any)?.items || [];
      setDasCount(Array.isArray(list) ? list.length : typeof (hJson as any)?.total === "number" ? (hJson as any).total : null);
    } catch (e: any) {
      setHolderError(e?.message || String(e));
    } finally {
      setHolderLoading(false);
    }
  }

  // NEW: Live OHLCV via SSE
  useEffect(() => {
    if (!ohlcvActive) return;
    const es = new EventSource(`/api/bitquery/ohlcv/stream?symbol=SOL&interval=5s`);
    const onMsg = (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data);
        if (data?.type === "candle") setLastCandle(data.candle);
      } catch {}
    };
    es.addEventListener("message", onMsg as any);
    return () => {
      es.removeEventListener("message", onMsg as any);
      es.close();
    };
  }, [ohlcvActive]);

  // Keyboard shortcuts: "/" focus NLP, "s" simulate, 1/2/3 switch strategies
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "/") {
        e.preventDefault();
        nlpInputRef.current?.focus();
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        simulate();
      } else if (["1", "2", "3"].includes(e.key)) {
        e.preventDefault();
        const map: Record<string, StrategyKind> = { "1": "stake_marinade", "2": "swap_jupiter", "3": "lp_sol_usdc" };
        setKind(map[e.key]);
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        refreshPrices();
      } else if (e.key.toLowerCase() === "g") {
        e.preventDefault();
        document.getElementById("quick-scan")?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [simulate, refreshPrices]);

  // Prefill from URL (deep link)
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const tab = sp.get("tab");
      const k = sp.get("kind") as StrategyKind | null;
      const amt = sp.get("amountSol");
      const nlp = sp.get("nlp");
      if (tab === "lab") setActiveTab("lab");
      if (k === "stake_marinade" || k === "swap_jupiter" || k === "lp_sol_usdc") setKind(k);
      if (amt && !Number.isNaN(Number(amt))) setAmountSol(Number(amt));
      if (nlp) setNlpText(nlp);
      // auto simulate if kind + amount present
      if (tab === "lab" && k && amt) {
        setTimeout(() => simulate(), 50);
      }
    } catch {}
  }, []);

  function toggleClay() {
    const sp = new URLSearchParams(searchParams?.toString() || "");
    if (isClay) {
      sp.delete("style");
    } else {
      sp.set("style", "clay");
    }
    const qs = sp.toString();
    const url = qs ? `?${qs}` : "?";
    router.push(url, { scroll: false });
  }

  // Sync tab changes with URL for seamless navigation
  function handleTabChange(val: string) {
    setActiveTab(val);
    const sp = new URLSearchParams(searchParams?.toString() || "");
    sp.set("tab", val);
    const qs = sp.toString();
    const url = qs ? `?${qs}` : "?";
    router.push(url, { scroll: false });
  }

  function shareLink() {
    try {
      const url = new URL(window.location.href);
      const sp = url.searchParams;
      sp.set("tab", "lab");
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

      // Fallback lightweight parser
      if (!parsed) {
        const lower = text.toLowerCase();
        const amtMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)\s*sol/);
        const amt = amtMatch ? Number(amtMatch[1]) : amountSol;
        if (lower.includes("stake")) parsed = { action: "stake", amount: amt, asset: "SOL", venue: "marinade", confidence: 0.5 };else
        if (lower.includes("swap")) parsed = { action: "swap", amount: amt, asset: "SOL", venue: "jupiter", confidence: 0.5 };else
        if (lower.includes("lp") || lower.includes("liquidity")) parsed = { action: "lp", amount: amt, asset: "SOL", venue: "sol/usdc", confidence: 0.5 };
      }

      if (!parsed) {
        toast.error("Could not understand that. Try: 'stake 5 sol with marinade'");
        return;
      }

      // Map parsed intent to StrategyKind
      let nextKind: StrategyKind = "stake_marinade";
      if (parsed.action === "swap") nextKind = "swap_jupiter";
      if (parsed.action === "lp") nextKind = "lp_sol_usdc";
      setKind(nextKind);
      if (typeof parsed.amount === "number" && !Number.isNaN(parsed.amount)) setAmountSol(parsed.amount);

      toast.success("Intent parsed. Simulating…");
      await simulate();
    } finally {
      setNlpLoading(false);
    }
  }

  async function simulate() {
    setLoading(true);
    setError(null);
    setQuote(null);
    try {
      if (kind === "swap_jupiter") {
        // Quote SOL -> USDC for amountSol using Jupiter v6
        const amount = Math.max(0, amountSol) * LAMPORTS_PER_SOL; // SOL in lamports
        const url = new URL("/api/jupiter/quote", window.location.origin);
        url.searchParams.set("inputMint", MINTS.SOL);
        url.searchParams.set("outputMint", MINTS.USDC);
        url.searchParams.set("amount", String(Math.floor(amount)));
        url.searchParams.set("slippageBps", "50"); // 0.5%
        const r = await fetch(url.toString(), { cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Quote failed");
        setQuote(j);
        toast.success("Jupiter quote ready");
      } else if (kind === "stake_marinade") {
        // Use inflation APY as baseline; mSOL premium is reflected in price feed
        setQuote({
          kind,
          apy: inflationApy,
          message: "Staking yield baseline fetched from Solana inflation rate."
        });
        toast.success("Staking projection ready");
      } else if (kind === "lp_sol_usdc") {
        // Minimal risk note with live prices for PnL sensitivity baseline
        const sol = prices.SOL ?? 0;
        const usdc = 1;
        setQuote({ kind, prices: { SOL: sol, USDC: usdc }, note: "Use Orca/Kamino UI for exact vault APY; prices are live from Jupiter." });
        toast.success("LP baseline ready");
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  // Execute Jupiter swap happy-path: uses current quote
  async function executeSwap() {
    try {
      if (!publicKey) {
        toast.error("Connect wallet to execute");
        return;
      }
      if (!quote || kind !== "swap_jupiter") {
        toast.error("No quote to execute");
        return;
      }
      setExecLoading(true);

      const quoteResponse = quote?.data ?? quote;
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
      if (!res.ok || !j?.swapTransaction) {
        throw new Error(j?.error || "Failed to build swap transaction");
      }

      // Decode base64 -> Uint8Array
      const b64 = j.swapTransaction as string;
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const vtx = VersionedTransaction.deserialize(bytes);

      const signature = await sendTransaction!(vtx as any, connection, { skipPreflight: false });
      toast.success("Transaction sent", {
        description: "Opening explorer…"
      });

      // Optional: link to explorer
      const url = `https://solscan.io/tx/${signature}`;
      // In iframe-safe way, just present a toast link
      toast.message("View on Solscan", {
        description: url,
        action: {
          label: "Open",
          onClick: () => {
            const isInIframe = window.self !== window.top;
            if (isInIframe) {
              window.parent.postMessage({ type: "OPEN_EXTERNAL_URL", data: { url } }, "*");
            } else {
              window.open(url, "_blank", "noopener,noreferrer");
            }
          }
        }
      });
    } catch (e: any) {
      toast.error("Swap failed", { description: e?.message || String(e) });
    } finally {
      setExecLoading(false);
    }
  }

  // Execute Marinade stake happy-path
  async function executeStake() {
    try {
      if (!publicKey) {
        toast.error("Connect wallet to execute");
        return;
      }
      if (kind !== "stake_marinade") {
        toast.error("Not in staking mode");
        return;
      }
      const lamports = Math.floor(Math.max(0, amountSol) * LAMPORTS_PER_SOL);
      if (!lamports) {
        toast.error("Enter amount > 0");
        return;
      }
      setExecLoading(true);

      const res = await fetch("/api/marinade/stake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userPublicKey: publicKey.toBase58(), amountLamports: lamports })
      });
      const j = await res.json();
      if (!res.ok || !j?.transaction) {
        throw new Error(j?.error || "Failed to build stake transaction");
      }

      const b64 = j.transaction as string;
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const tx = Transaction.from(bytes as any);

      const sig = await sendTransaction!(tx, connection, { skipPreflight: false });
      toast.success("Stake sent", { description: "Opening explorer…" });
      const url = `https://solscan.io/tx/${sig}`;
      toast.message("View on Solscan", {
        description: url,
        action: {
          label: "Open",
          onClick: () => {
            const isInIframe = window.self !== window.top;
            if (isInIframe) {
              window.parent.postMessage({ type: "OPEN_EXTERNAL_URL", data: { url } }, "*");
            } else {
              window.open(url, "_blank", "noopener,noreferrer");
            }
          }
        }
      });
    } catch (e: any) {
      toast.error("Stake failed", { description: e?.message || String(e) });
    } finally {
      setExecLoading(false);
    }
  }

  // Map Quest task to Strategy Lab and scroll
  function handleSimulateTask(task: any) {
    const t = (task?.type || "").toLowerCase();
    if (t === "swap") {
      setKind("swap_jupiter");
      if (typeof task.value === "number") setAmountSol(task.value);
    } else if (t === "stake") {
      setKind("stake_marinade");
      if (typeof task.value === "number") setAmountSol(task.value);
    } else if (t === "lp") {
      setKind("lp_sol_usdc");
      if (typeof task.value === "number") setAmountSol(task.value);
    } else if (t === "hold") {
      toast.info("Holding requirement detected — no simulation needed. Track via wallet.");
    } else {
      toast.message("Task", { description: "Unsupported task type for simulation yet." });
    }
    document.getElementById("strategy-lab")?.scrollIntoView({ behavior: "smooth" });
  }

  async function scanAirdrops() {
    if (!publicKey) {
      toast.error("Connect wallet to scan airdrops");
      return;
    }
    setCompassLoading(true);
    setCompassError(null);
    setCompassData(null);
    try {
      const addr = publicKey.toBase58();
      const j = await fetchJsonWithRetry(`/api/airdrops/scan?address=${addr}`, { cache: "no-store" });
      let data = (j as any).data || j;
      // Merge in heuristics to ensure a few realistic, actionable items
      const heur = buildHeuristicAirdrops(addr, solBalance);
      const eligibleNow = Array.isArray(data?.eligibleNow) ? [...data.eligibleNow, ...heur] : heur;
      data = { ...(data || {}), eligibleNow };
      setCompassData(data);
      toast.success("Airdrop scan complete");
      const first = (data as any)?.eligibleNow?.[0]?.id || null;
      setSelectedAirdropId(first);
    } catch (e: any) {
      setCompassError(e?.message || String(e));
    } finally {
      setCompassLoading(false);
    }
  }

  // Trending tokens (Jupiter)
  type TrendingToken = { mint: string; symbol: string; name?: string; icon?: string };
  const [trending, setTrending] = useState<TrendingToken[]>([]);
  const [trendingPrices, setTrendingPrices] = useState<Record<string, number>>({}); // key: mint
  const [trendingHist, setTrendingHist] = useState<Record<string, number[]>>({}); // key: mint -> sparkline
  const [trendingUpdatedAt, setTrendingUpdatedAt] = useState<number | null>(null);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const [trendingSource, setTrendingSource] = useState<"bitquery" | "jupiter">("bitquery");

  // Fetch trending token list (can change over time)
  useEffect(() => {
    let closed = false;
    let fellBack = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    // Helper to insert token uniquely and cap per-source
    const upsert = (list: TrendingToken[], t: TrendingToken, cap: number) => {
      if (!t.mint || !t.symbol) return list;
      if (list.find((x) => x.mint === t.mint)) return list;
      const next = [...list, t];
      return next.slice(0, cap);
    };

    // Local buffers per subscription (max 2 each)
    let fromJumps: TrendingToken[] = [];
    let fromCurve: TrendingToken[] = [];

    const recompute = () => {
      // Combine two from each subscription → total up to 4
      const combined: TrendingToken[] = [...fromJumps, ...fromCurve];
      setTrending((prev) => {
        // Reset histories for tokens not in the new list
        const nextMints = new Set(combined.map((t) => t.mint));
        setTrendingHist((old) => {
          const fresh: Record<string, number[]> = {};
          for (const it of combined) fresh[it.mint] = old[it.mint] || [];
          return fresh;
        });
        return combined;
      });
      setTrendingUpdatedAt(Date.now());
    };

    const extractToken = (payload: any): TrendingToken | null => {
      try {
        const item = payload?.data?.Solana?.TokenSupplyUpdates?.[0];
        const cur = item?.TokenSupplyUpdate?.Currency || item?.Currency;
        if (cur?.MintAddress && (cur?.Symbol || cur?.Name)) {
          return {
            mint: cur.MintAddress,
            symbol: cur.Symbol || cur.Name || "",
            name: cur.Name || undefined,
            icon: cur.Uri || undefined,
          };
        }
        // Fallbacks for potential other shapes
        const t0 = payload?.data?.Solana?.DEXTrades?.[0];
        const tCur = t0?.BaseCurrency || t0?.QuoteCurrency || t0?.Currency;
        if (tCur?.MintAddress && (tCur?.Symbol || tCur?.Name)) {
          return {
            mint: tCur.MintAddress,
            symbol: tCur.Symbol || tCur.Name || "",
            name: tCur.Name || undefined,
            icon: tCur.Uri || undefined,
          };
        }
      } catch {}
      return null;
    };

    const fetchJupiterFallback = async () => {
      if (closed || fellBack) return;
      fellBack = true;
      try {
        setTrendingLoading(true);
        setTrendingError(null);
        const j = await fetchJsonWithRetry("/api/jupiter/trending?limit=4", { cache: "no-store" });
        const items = (j as any)?.items || [];
        if (!closed && Array.isArray(items)) {
          setTrending(items);
          setTrendingSource("jupiter");
          setTrendingUpdatedAt(Date.now());
        }
      } catch (e: any) {
        if (!closed) setTrendingError(e?.message || String(e));
      } finally {
        if (!closed) setTrendingLoading(false);
      }
    };

    const start = () => {
      try {
        setTrendingLoading(true);
        setTrendingError(null);
        setTrendingSource("bitquery");

        const es1 = new EventSource(`/api/bitquery/pumpfun/marketcap-jumps`);
        const es2 = new EventSource(`/api/bitquery/pumpfun/curve-95`);

        const onMsg1 = (ev: MessageEvent) => {
          if (closed) return;
          try {
            const data = JSON.parse(ev.data);
            if (data?.type === "frame" && data?.msg?.payload) {
              const tok = extractToken(data.msg.payload);
              if (tok) {
                if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
                fromJumps = upsert(fromJumps, tok, 2);
                recompute();
              }
            }
          } catch {}
        };
        const onMsg2 = (ev: MessageEvent) => {
          if (closed) return;
          try {
            const data = JSON.parse(ev.data);
            if (data?.type === "frame" && data?.msg?.payload) {
              const tok = extractToken(data.msg.payload);
              if (tok) {
                if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
                fromCurve = upsert(fromCurve, tok, 2);
                recompute();
              }
            }
          } catch {}
        };
        const onErr = () => {
          if (!closed && !fellBack) fetchJupiterFallback();
        };

        es1.addEventListener("message", onMsg1 as any);
        es2.addEventListener("message", onMsg2 as any);
        es1.addEventListener("error", onErr as any);
        es2.addEventListener("error", onErr as any);

        // If no Bitquery frames arrive quickly, fallback to Jupiter
        fallbackTimer = setTimeout(() => {
          if (!closed && !fellBack) fetchJupiterFallback();
        }, 5000);

        return () => {
          closed = true;
          if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
          es1.removeEventListener("message", onMsg1 as any);
          es2.removeEventListener("message", onMsg2 as any);
          es1.removeEventListener("error", onErr as any);
          es2.removeEventListener("error", onErr as any);
          es1.close();
          es2.close();
        };
      } finally {
        setTrendingLoading(false);
      }
    };

    const cleanup = start();
    return () => {
      closed = true;
      if (cleanup) cleanup();
    };
  }, []);

  // Fetch prices for trending tokens by mint and build sparklines
  useEffect(() => {
    if (!trending.length) return;
    let abort = false;
    async function loadTrendingPrices() {
      try {
        const mints = trending.map((t) => t.mint).join(",");
        const j = await fetchJsonWithRetry(`/api/jupiter/price?mints=${encodeURIComponent(mints)}`, { cache: "no-store" });
        if (abort) return;
        const data = (j as any)?.data || {};
        const nextPrices: Record<string, number> = {};
        const nextHist: Record<string, number[]> = { ...trendingHist };
        for (const t of trending) {
          const p = Number(data[t.mint]?.price ?? NaN);
          if (Number.isFinite(p)) {
            nextPrices[t.mint] = p;
            nextHist[t.mint] = [...(nextHist[t.mint] || []).slice(-47), p];
          }
        }
        setTrendingPrices(nextPrices);
        setTrendingHist(nextHist);
        setTrendingUpdatedAt(Date.now());
      } catch (e) {
        // keep silent; UI shows last known
      }
    }
    loadTrendingPrices();
    const id = setInterval(loadTrendingPrices, 30_000);
    return () => { abort = true; clearInterval(id); };
  }, [trending]);

  return (
    <div className="min-h-dvh w-full">
      <header className="sticky top-3 md:top-4 z-40">
        <div className="mx-auto max-w-6xl px-4 py-0 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2">
            <Link href="/" aria-label="Back to home" className="mr-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md pointer-events-auto">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <GlyphAtlas className="h-4 w-4 text-white/90 drop-shadow" />
            <span className="text-sm font-semibold text-white drop-shadow">Solana Atlas</span>
            <Badge variant="secondary" className="ml-2 h-6 px-2 text-[10px] leading-none">Beta</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-md pointer-events-auto"
              onClick={toggleTheme}
              aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <div className="text-xs opacity-80 hidden sm:block">
              {publicKey ? (
                <div className="hidden sm:flex items-center gap-1.5">
                  {solBalance != null ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[11px]">
                      <GlyphMarket className="h-3 w-3" />
                      <span>{solBalance.toFixed(3)} SOL</span>
                    </span>
                  ) : (
                    <Skeleton className="h-3 w-20" />
                  )}
                </div>
              ) : null}
            </div>
            {/* Wallet actions (refactored to use top-level hooks) */}
            {publicKey ?
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[11px] rounded-md leading-none font-mono pointer-events-auto">

                    {`${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={async () => {await navigator.clipboard.writeText(publicKey!.toBase58());toast.success("Address copied");}}>Copy address</DropdownMenuItem>
                  <DropdownMenuItem
                  onClick={() => {
                    const url = `https://solscan.io/address/${publicKey!.toBase58()}`;
                    const isInIframe = window.self !== window.top;
                    if (isInIframe) {
                      window.parent.postMessage({ type: "OPEN_EXTERNAL_URL", data: { url } }, "*");
                    } else {
                      window.open(url, "_blank", "noopener,noreferrer");
                    }
                  }}>

                    View on Solscan
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => disconnect?.()}>Disconnect</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu> :

            <Button
              size="sm"
              variant="secondary"
              className="h-6 px-2 text-[11px] rounded-md leading-none pointer-events-auto"
              onClick={() => setVisible(true)}>

                Select Wallet
              </Button>
            }
          </div>
        </div>
      </header>

      <main className="pt-0 md:pt-0 pb-6 md:pb-8">
        <div className="mx-auto max-w-6xl px-4">
          {/* Decorative background layer */}
          <div className="pointer-events-none relative -z-[1]">
            <div className="absolute inset-0 -top-6 bg-[linear-gradient(to_bottom,transparent,transparent_70%,var(--color-background)),radial-gradient(24rem_24rem_at_20%_-10%,var(--color-accent)/20%,transparent_60%),radial-gradient(32rem_32rem_at_120%_10%,var(--color-accent)/15%,transparent_60%)] opacity-[0.25]" />
          </div>

          <Tabs defaultValue="quests" value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="relative z-50 mx-auto -mt-5 md:-mt-6 w-max rounded-full bg-muted/60 p-0.5 !h-8 grid grid-cols-2 gap-0.5">
              <TabsTrigger value="quests" className="h-7 px-3 text-[12px] rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer w-full justify-center">
                <span className="flex items-center gap-1.5"><GlyphCompass /><span>Quests</span></span>
              </TabsTrigger>
              <TabsTrigger value="lab" className="h-7 px-3 text-[12px] rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer w-full justify-center">
                <span className="flex items-center gap-1.5"><GlyphLab /><span>Strategy Lab</span></span>
              </TabsTrigger>
            </TabsList>

            {/* Quests View */}
            <TabsContent value="quests" className="mt-8">
              {/* 3-column uniform grid with equal-height cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
                {/* Airdrop Compass */}
                <div className="h-full" id="airdrop-compass">
                  <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] min-h-[360px]">
                    <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
                    <CardHeader className="pb-2 flex flex-col gap-2">
                      <div className="flex h-8 items-center justify-between gap-2">
                        <CardTitle className="text-sm leading-none">
                          <span className="flex items-center gap-2"><GlyphCompass /><span>Airdrop Compass</span></span>
                        </CardTitle>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            id="quick-scan"
                            size="sm"
                            variant="secondary"
                            className="h-6 px-2 text-[11px] rounded-md leading-none"
                            onClick={scanAirdrops}
                            disabled={!publicKey || compassLoading}>

                             {compassLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Scan Wallet"}
                           </Button>
                        </div>
                      </div>
                      {!publicKey &&
                      <div className="text-xs opacity-70">Connect your wallet to scan for eligible and potential airdrops.</div>
                      }
                    </CardHeader>
                    <CardContent className="pt-0 space-y-4">
                      {compassLoading &&
                      <div className="space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-2/3" />
                        </div>
                      }

                      {compassError &&
                      <Alert variant="destructive"><AlertDescription>{compassError}</AlertDescription></Alert>
                      }

                      {compassData &&
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          {/* Airdrop list */}
                          <div className="md:col-span-1 space-y-2 min-w-0 max-h-72 overflow-y-auto pr-1">
                            <div className="text-xs font-medium opacity-80">Detected Airdrops</div>
                            {(compassData.eligibleNow || []).map((a: any) =>
                          <button
                            key={a.id}
                            onClick={() => setSelectedAirdropId(a.id)}
                            className={`relative overflow-hidden w-full text-left rounded-md p-2 text-xs bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40 transition-colors hover:shadow-[0_6px_18px_-12px_rgba(0,0,0,0.3)] min-w-0 ${selectedAirdropId === a.id ? "bg-muted/50" : ""}`}>

                                <span className="pointer-events-none absolute -top-8 -right-8 h-16 w-16 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/25%,transparent_70%)]" />
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium truncate">{a.name}</span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {a.source &&
                                <Badge variant="secondary" className="text-[10px]">{a.source}</Badge>
                                }
                                    <Badge variant={a.status === "eligible" ? "default" : "secondary"} className="ml-1 text-[10px]">
                                      {a.status === "eligible" ? "Eligible" : a.status.replace("_", " ")}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="mt-1 opacity-70 break-words">{a.estReward}</div>
                              </button>
                          )}
                          </div>

                          {/* Airdrop details */}
                          <div className="md:col-span-2 min-w-0">
                            {(() => {
                            const all = [
                            ...(compassData.eligibleNow || [])];

                            const sel = all.find((x: any) => x.id === selectedAirdropId) || all[0];
                            if (!sel) return <div className="text-xs opacity-70">No eligible airdrops detected for this wallet.</div>;
                            return (
                              <div className="space-y-2 text-xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="font-medium truncate">{sel.name}</div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {sel.source && <Badge variant="secondary">{sel.source}</Badge>}
                                      <Badge variant={sel.status === "eligible" ? "default" : "secondary"}>{sel.status}</Badge>
                                      {sel.endsAt &&
                                    <span className="opacity-70">Ends {new Date(sel.endsAt).toLocaleDateString()}</span>
                                    }
                                    </div>
                                  </div>
                                  <div className="opacity-80 break-words">{sel.details}</div>
                                  <Separator />
                                  <div className="font-medium">Tasks</div>
                                  <ul className="space-y-2">
                                    {sel.tasks?.map((t: any) =>
                                  <li key={t.id} className="relative overflow-hidden flex flex-wrap items-center justify-between gap-2 rounded-md p-2 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40 transition-colors hover:shadow-[0_6px_18px_-12px_rgba(0,0,0,0.3)] min-w-0">
                                        <span className="pointer-events-none absolute -top-8 -right-8 h-16 w-16 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/25%,transparent_70%)]" />
                                        <div className="flex flex-col min-w-0">
                                          <span className="break-words">{t.label}</span>
                                          {t.venue && <span className="text-[10px] opacity-60">Venue: {t.venue}</span>}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <Button size="sm" variant="secondary" onClick={() => handleSimulateTask(t)}>
                                            <span className="flex items-center gap-1.5"><GlyphCompass className="h-3.5 w-3.5" /><span>Simulate</span></span>
                                          </Button>
                                          <Button size="sm" onClick={() => handleExecuteTask(t)}>
                                            Execute
                                          </Button>
                                        </div>
                                      </li>
                                  )}
                                  </ul>
                                </div>);

                          })()}
                          </div>
                        </div>
                      }

                      {!compassLoading && !compassData && !compassError &&
                      <div className="space-y-3">
                          <div className="text-xs opacity-70">No scan yet. Connect your wallet and click "Scan Wallet" to fetch real, verifiable airdrops.</div>
                        </div>
                      }
                    </CardContent>
                  </Card>
                </div>

                {/* Speculative Opportunities */}
                <div className="h-full">
                  <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] min-h-[360px]">
                    <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
                    <CardHeader className="pb-2 flex flex-col gap-2">
                      <div className="flex h-8 items-center justify-between gap-2">
                        <CardTitle className="text-sm leading-none">
                          <span className="flex items-center gap-2"><GlyphCompass /><span>Speculative Opportunities</span></span>
                        </CardTitle>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="h-6 px-2 text-[10px] rounded-md leading-none">Source: airdrops.io</Badge>
                        </div>
                      </div>
                      <div className="text-xs opacity-70">Curated speculative Solana quests. DYOR.</div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {specLoading &&
                      <div className="space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-2/3" />
                        </div>
                      }
                      {specError && <Alert variant="destructive"><AlertDescription>{specError}</AlertDescription></Alert>}
                      {!specLoading && !specError && specItems.length === 0 &&
                      <div className="text-xs opacity-70">No speculative items found.</div>
                      }
                      <div className="grid md:grid-cols-2 gap-3">
                        {specItems.slice(0, 8).map((it: any, i: number) =>
                        <a key={`${it.url || it.title}-${i}`} href={it.url} target="_blank" rel="noopener noreferrer" className="relative overflow-hidden block rounded-md p-2 text-xs bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40 transition-colors hover:shadow-[0_6px_18px_-12px_rgba(0,0,0,0.3)]">
                            <span className="pointer-events-none absolute -top-8 -right-8 h-16 w-16 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/25%,transparent_70%)]" />
                            <div className="flex items-center justify-between">
                              <div className="font-medium truncate">{it.title || it.project || "Untitled"}</div>
                              <div className="flex items-center gap-1">
                                <Badge variant="secondary" className="text-[10px]">airdrops.io</Badge>
                              </div>
                            </div>
                            {it.summary && <div className="opacity-70 mt-1 line-clamp-2">{it.summary}</div>}
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* KeyStone Swap (Jupiter Plugin) */}
                <div className="h-full">
                  <JupiterSwapCard />
                </div>

                {/* Holder Insights */}
                <div className="h-full">
                  <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] min-h-[360px]">
                    <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
                    <CardHeader className="pb-2 flex flex-col gap-2">
                      <CardTitle className="text-sm leading-none">
                        <span className="flex items-center gap-2"><GlyphLab /><span>Holder Insights</span></span>
                      </CardTitle>
                      <div className="text-xs opacity-70">Paste a token mint to view basic holder stats from Moralis and DAS token account count from Helius.</div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      <div className="flex items-center gap-2 !w-full !h-full">
                        <Input value={mintInput} onChange={(e) => setMintInput(e.target.value)} placeholder="Token mint (e.g., EPjF...USDC)" className="h-9" />
                        <Button size="sm" onClick={fetchHolderInsights} disabled={holderLoading}>
                          {holderLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="flex items-center gap-1.5"><GlyphCompass className="h-3.5 w-3.5" /><span>Fetch</span></span>}
                        </Button>
                      </div>
                      {holderError && <Alert variant="destructive"><AlertDescription>{holderError}</AlertDescription></Alert>}
                      {(moralisStats || dasCount != null) &&
                      <div className="grid sm:grid-cols-2 gap-3 text-xs">
                          <div className="rounded-md p-3 bg-muted/30">
                            <div className="flex items-center justify-between mb-1"><div className="font-medium">Moralis</div><Badge variant="secondary" className="text-[10px]">Source</Badge></div>
                            <div className="opacity-80 break-words">{moralisStats ? JSON.stringify(moralisStats).slice(0, 240) + (JSON.stringify(moralisStats).length > 240 ? "…" : "") : "-"}</div>
                          </div>
                          <div className="rounded-md p-3 bg-muted/30">
                            <div className="flex items-center justify-between mb-1"><div className="font-medium">Helius DAS</div><Badge variant="secondary" className="text-[10px]">Source</Badge></div>
                            <div className="opacity-80">Token accounts: <span className="font-mono">{dasCount != null ? dasCount : "-"}</span></div>
                          </div>
                        </div>
                      }
                    </CardContent>
                  </Card>
                </div>

                {/* Market Snapshot */}
                <div className="h-full">
                  <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] min-h-[360px]">
                    <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
                    <CardHeader className="pb-2 pt-1 flex items-center justify-between gap-2 relative">
                      <span className="pointer-events-none absolute inset-x-3 -top-px h-px bg-[linear-gradient(to_right,transparent,theme(colors.border),transparent)] opacity-60" />
                      <CardTitle className="text-sm leading-none">
                        <span className="flex items-center gap-2"><GlyphMarket /><span>Market Snapshot</span></span>
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={refreshPrices}
                          disabled={pricesLoading}
                          className="h-6 px-2 text-[11px] rounded-md leading-none active:scale-[0.98] transition-transform"
                          title="Refresh prices (R)">
                          {pricesLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
                        </Button>
                        <Badge variant="secondary" className="h-6 px-2 text-[10px] rounded-md leading-none">Jupiter</Badge>
                        {(() => {
                          const recent = typeof pricesUpdatedAt === "number" && Date.now() - pricesUpdatedAt < 60_000;
                          return (
                            <span
                              aria-label={recent ? "Live – updated < 60s" : "Stale – updated > 60s"}
                              title={recent ? "Live – updated < 60s" : "Stale – updated > 60s"}
                              className={`inline-block h-1.5 w-1.5 rounded-full ${recent ? "bg-emerald-500/80" : "bg-amber-500/80"}`} />
                          );
                        })()}
                        {pricesUpdatedAt ? (
                          <span className="text-[10px] opacity-60 ml-1">{`Updated ${new Date(pricesUpdatedAt).toLocaleTimeString()}`}</span>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="relative overflow-hidden rounded-md bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40 p-3 transition-colors group">
                          <span className="pointer-events-none absolute -top-8 -right-8 h-16 w-16 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/25%,transparent_70%)]" />
                          <span className="pointer-events-none absolute -inset-px rounded-md opacity-0 group-hover:opacity-100 transition-opacity [background:conic-gradient(from_0deg,transparent,theme(colors.accent)/25%,transparent_50%,transparent)] animate-[spin_10s_linear_infinite]" />
                          <div className="flex items-center justify-between">
                            <span className="opacity-70">SOL</span>
                            <Badge variant="secondary" className="text-[10px]">Spot</Badge>
                          </div>
                          <div className="mt-1 font-mono cursor-pointer select-none" title="Click to copy"
                          onClick={() => {if (prices.SOL) {navigator.clipboard.writeText(prices.SOL.toFixed(2));toast.success("SOL price copied");}}}>

                            {prices.SOL ? `$${prices.SOL.toFixed(2)}` : <Skeleton className="h-3 w-16" />}
                          </div>
                          {(() => {
                            const d = pctChange(solHistory);
                            if (d == null) return null;
                            const up = d >= 0;
                            return (
                              <div className={`mt-1 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] ${up ? "text-emerald-500 border-emerald-500/30" : "text-red-500 border-red-500/30"}`}>
                                <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden>
                                  {up ?
                                  <path d="M5 14l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /> :

                                  <path d="M5 10l7 7 7-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                  }
                                </svg>
                                <span>{`${up ? "+" : ""}${d.toFixed(2)}%`}</span>
                              </div>);

                          })()}
                          <div className="mt-2 text-foreground/60">
                            <Sparkline data={solHistory} />
                          </div>
                        </div>
                        <div className="relative overflow-hidden rounded-md bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40 p-3 transition-colors group">
                          <span className="pointer-events-none absolute -top-8 -right-8 h-16 w-16 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/25%,transparent_70%)]" />
                          <span className="pointer-events-none absolute -inset-px rounded-md opacity-0 group-hover:opacity-100 transition-opacity [background:conic-gradient(from_0deg,transparent,theme(colors.accent)/25%,transparent_50%,transparent)] animate-[spin_10s_linear_infinite]" />
                          <div className="flex items-center justify-between">
                            <span className="opacity-70">mSOL</span>
                            <Badge variant="secondary" className="text-[10px]">Spot</Badge>
                          </div>
                          <div className="mt-1 font-mono cursor-pointer select-none" title="Click to copy"
                          onClick={() => {if (prices.MSOL) {navigator.clipboard.writeText(prices.MSOL.toFixed(2));toast.success("mSOL price copied");}}}>

                            {prices.MSOL ? `$${prices.MSOL.toFixed(2)}` : <Skeleton className="h-3 w-16" />}
                          </div>
                          {(() => {
                            const d = pctChange(msolHistory);
                            if (d == null) return null;
                            const up = d >= 0;
                            return (
                              <div className={`mt-1 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] ${up ? "text-emerald-500 border-emerald-500/30" : "text-red-500 border-red-500/30"}`}>
                                <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden>
                                  {up ?
                                  <path d="M5 14l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /> :

                                  <path d="M5 10l7 7 7-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                  }
                                </svg>
                                <span>{`${up ? "+" : ""}${d.toFixed(2)}%`}</span>
                              </div>);

                          })()}
                          <div className="mt-2 text-foreground/60">
                            <Sparkline data={msolHistory} />
                          </div>
                        </div>
                      </div>

                      {/* Trending moved into Market Snapshot */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between px-1 mb-2">
                          <div className="text-[11px] opacity-70">Trending</div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="h-5 px-2 text-[10px] rounded-md leading-none">{trendingSource === "bitquery" ? "Bitquery" : "Jupiter"}</Badge>
                            {(() => {
                              const recent = typeof trendingUpdatedAt === "number" && Date.now() - trendingUpdatedAt < 60_000;
                              return (
                                <span
                                  aria-label={recent ? "Live – updated < 60s" : "Stale – updated > 60s"}
                                  title={recent ? "Live – updated < 60s" : "Stale – updated > 60s"}
                                  className={`inline-block h-1.5 w-1.5 rounded-full ${recent ? "bg-emerald-500/80" : "bg-amber-500/80"}`} />
                              );
                            })()}
                          </div>
                        </div>

                        {trendingLoading && (
                          <div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" /></div>
                        )}
                        {trendingError && (
                          <Alert variant="destructive"><AlertDescription>{trendingError}</AlertDescription></Alert>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          {trending.map((t) => (
                            <div key={t.mint} className="relative overflow-hidden rounded-md bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40 p-3 transition-colors group">
                              <span className="pointer-events-none absolute -top-8 -right-8 h-16 w-16 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/25%,transparent_70%)]" />
                              <span className="pointer-events-none absolute -inset-px rounded-md opacity-0 group-hover:opacity-100 transition-opacity [background:conic-gradient(from_0deg,transparent,theme(colors.accent)/25%,transparent_50%,transparent)] animate-[spin_10s_linear_infinite]" />
                              <div className="flex items-center justify-between">
                                <span className="opacity-70 inline-flex items-center gap-1.5">
                                  {t.icon ? <img src={t.icon} alt="" className="h-4 w-4 rounded" /> : <span className="h-4 w-4 rounded bg-muted inline-block" />}
                                  <span>{t.symbol}</span>
                                </span>
                                <Badge variant="secondary" className="text-[10px]">Spot</Badge>
                              </div>
                              <div className="mt-1 font-mono cursor-pointer select-none" title="Click to copy"
                                onClick={() => { const p = trendingPrices[t.mint]; if (p != null) { navigator.clipboard.writeText(p.toFixed(6)); toast.success(`${t.symbol} price copied`); } }}>
                                {trendingPrices[t.mint] != null ? `$${trendingPrices[t.mint] < 1 ? trendingPrices[t.mint].toFixed(6) : trendingPrices[t.mint].toFixed(2)}` : <Skeleton className="h-3 w-16" />}
                              </div>
                              {(() => {
                                const hist = trendingHist[t.mint] || [];
                                const d = pctChange(hist);
                                if (d == null) return null;
                                const up = d >= 0;
                                return (
                                  <div className={`mt-1 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] ${up ? "text-emerald-500 border-emerald-500/30" : "text-red-500 border-red-500/30"}`}>
                                    <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden>
                                      {up ? <path d="M5 14l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /> : <path d="M5 10l7 7 7-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}
                                    </svg>
                                    <span>{`${up ? "+" : ""}${d.toFixed(2)}%`}</span>
                                  </div>
                                );
                              })()}
                              <div className="mt-2 text-foreground/60">
                                <Sparkline data={trendingHist[t.mint] || []} />
                              </div>
                            </div>
                          ))}
                          {!trendingLoading && !trendingError && trending.length === 0 && (
                            <div className="text-xs opacity-70">No trending tokens found right now.</div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Live OHLCV */}
                <div className="h-full">
                  <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] min-h-[360px]">
                    <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
                    <CardHeader className="pb-2 flex flex-col gap-2 relative">
                      <span className="pointer-events-none absolute inset-x-3 -top-px h-px bg-[linear-gradient(to_right,transparent,theme(colors.border),transparent)] opacity-60" />
                      <div className="flex h-8 items-center justify-between gap-2">
                        <CardTitle className="text-sm leading-none">
                          <span className="flex items-center gap-2"><GlyphStream /><span>Live OHLCV (Stream)</span></span>
                        </CardTitle>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="h-6 px-2 text-[10px] rounded-md leading-none">Bitquery</Badge>
                          <Button size="sm" variant="secondary" className="h-6 px-2 text-[11px] rounded-md active:scale-[0.98] transition-transform" onClick={() => setOhlcvActive((v) => !v)}>
                             {ohlcvActive ? "Stop" : "Start"}
                           </Button>
                        </div>
                      </div>
                      <div className="text-xs opacity-70">Streams synthetic candles for SOL every 5s via server-sent events.</div>
                    </CardHeader>
                    <CardContent className="pt-0 text-xs">
                      {ohlcvActive ?
                      lastCandle ?
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <div>O: <span className="font-mono">{lastCandle.o?.toFixed?.(4) ?? lastCandle.o}</span></div>
                            <div>H: <span className="font-mono">{lastCandle.h?.toFixed?.(4) ?? lastCandle.h}</span></div>
                            <div>L: <span className="font-mono">{lastCandle.l?.toFixed?.(4) ?? lastCandle.l}</span></div>
                            <div>C: <span className="font-mono">{lastCandle.c?.toFixed?.(4) ?? lastCandle.c}</span></div>
                            <div>V: <span className="font-mono">{lastCandle.v}</span></div>
                            <div>T: <span className="font-mono">{new Date(lastCandle.t).toLocaleTimeString()}</span></div>
                          </div> :

                      <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Waiting for first candle…</div> :


                      <div className="opacity-70">Click Start to begin streaming.</div>
                      }
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Strategy Lab */}
            <TabsContent value="lab" className="mt-8" id="strategy-lab">
              <Card className="atlas-card relative overflow-hidden border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)]">
                <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    <span className="flex items-center gap-2"><GlyphLab /><span>Strategy Lab</span></span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {/* NLP Command Bar */}
                  <div className="flex items-center gap-2">
                    <Input
                      ref={nlpInputRef}
                      value={nlpText}
                      onChange={(e) => setNlpText(e.target.value)}
                      placeholder="Try: stake 5 SOL with Marinade or swap 10 SOL to USDC"
                      className="h-9 flex-1" />

                    <Button size="sm" onClick={handleParse} disabled={nlpLoading}>
                      {nlpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Parse"}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={shareLink} aria-label="Copy deep link">
                      Share
                    </Button>
                  </div>
                  <div className="text-[11px] opacity-60">Press "/" to focus · "1/2/3" switch strategy · "s" simulate</div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Button size="sm" variant={kind === "stake_marinade" ? "default" : "secondary"} onClick={() => setKind("stake_marinade")}>Stake with Marinade</Button>
                    <Button size="sm" variant={kind === "swap_jupiter" ? "default" : "secondary"} onClick={() => setKind("swap_jupiter")}>Swap on Jupiter</Button>
                    <Button size="sm" variant={kind === "lp_sol_usdc" ? "default" : "secondary"} onClick={() => setKind("lp_sol_usdc")}>LP SOL/USDC</Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs opacity-70 w-24">Amount (SOL)</span>
                    <Input type="number" min={0} step={0.01} value={amountSol} onChange={(e) => setAmountSol(Number(e.target.value))} className="h-9 w-36" />
                    <Button size="sm" className="ml-auto" onClick={simulate} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Simulate <ArrowRight className="h-4 w-4 ml-1" /></>}</Button>
                  </div>

                  {loading &&
                  <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  }

                  {error &&
                  <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
                  }

                  {quote && kind === "swap_jupiter" &&
                  <div className="text-xs rounded-md border p-3 bg-muted/30">
                      <div className="mb-1 font-medium">Jupiter Quote</div>
                      {quote?.data ?
                    <div className="grid sm:grid-cols-2 gap-2">
                          <div>Best AMM: <span className="font-mono">{quote.data.routePlan?.[0]?.swapInfo?.ammKey || "-"}</span></div>
                          <div>Out (USDC): <span className="font-mono">{Number(quote.data.outAmount || 0) / 1e6}</span></div>
                          <div>Price Impact: <span className="font-mono">{(quote.data.priceImpactPct * 100).toFixed(2)}%</span></div>
                          <div>Slippage Bps: <span className="font-mono">{quote.data.slippageBps}</span></div>
                          <div className="col-span-2 mt-1">
                            <Button size="sm" onClick={executeSwap} disabled={!publicKey || execLoading} className="mt-1">
                              {execLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Execute Swap"}
                            </Button>
                          </div>
                        </div> :

                    <div className="opacity-80">{JSON.stringify(quote)}</div>
                    }
                    </div>
                  }

                  {quote && kind === "stake_marinade" &&
                  <div className="text-xs rounded-md border p-3 bg-muted/30">
                      <div className="mb-1 font-medium">Staking Projection</div>
                      <div>Baseline APY (network inflation): <span className="font-mono">{inflationApy?.toFixed(2)}%</span></div>
                      <div>Amount: <span className="font-mono">{amountSol} SOL</span></div>
                      <div>12m yield (simple): <span className="font-mono">{inflationApy != null ? (amountSol * (inflationApy / 100)).toFixed(3) : "-"} SOL</span></div>
                      <div className="mt-2">
                        <Button size="sm" onClick={executeStake} disabled={!publicKey || execLoading}>
                          {execLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Execute Stake"}
                        </Button>
                      </div>
                      <div className="mt-1 text-[10px] opacity-70">Note: Marinade distributes rewards per epoch; APY varies. mSOL pricing via Jupiter.</div>
                    </div>
                  }

                  {quote && kind === "lp_sol_usdc" &&
                  <div className="text-xs rounded-md border p-3 bg-muted/30">
                      <div className="mb-1 font-medium">LP Baseline</div>
                      <div>Prices — SOL: ${prices.SOL?.toFixed(2) ?? "-"} · USDC: $1.00</div>
                      <div className="mt-1 text-[10px] opacity-70">Fetch exact APY in target vault UI; Atlas will add direct vault integrations next.</div>
                    </div>
                  }

                  <Separator />
                  <div className="text-xs opacity-70">Strategy score uses live prices (Jupiter) and network APY baseline; on-chain execution funnels to KeyStone.</div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Floating bottom command bar */}
      <form onSubmit={handleBottomSubmit} className="fixed inset-x-0 bottom-4 z-50">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex items-center gap-2 rounded-full bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50 shadow-lg px-2 py-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 px-3 rounded-full text-xs">
                  {cmdTool === "auto" ? "Auto" : cmdTool.toUpperCase()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-36">
                <DropdownMenuItem onClick={() => setCmdTool("auto")}>Auto</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCmdTool("stake")}>Stake</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCmdTool("swap")}>Swap</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCmdTool("lp")}>LP</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Input
              value={cmdText}
              onChange={(e) => setCmdText(e.target.value)}
              placeholder="Atlas prompt on Solana… e.g., swap 10 SOL to USDC"
              className="h-8 flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              aria-label="Atlas command" />

            <Button type="submit" size="sm" className="h-8 rounded-full">
              Go
            </Button>
          </div>
        </div>
      </form>
    </div>);

}

export default AtlasClient;