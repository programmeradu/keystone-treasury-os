"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { ComponentType } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL, VersionedTransaction } from "@solana/web3.js";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowRight, ArrowLeft, Sun, Moon } from "lucide-react";
import { toast } from "@/lib/toast-notifications";
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
import { useAtlasCommand } from "@/hooks/use-atlas-command";
import dynamic from "next/dynamic";
import {
  IconAirDropScout,
  IconStrategyLab,
  IconTokenSwap,
  IconMarketPulse,
  IconHolderAnalytics,
  IconMEVDetector,
  IconTxExplorer,
  IconDCAScheduler,
  IconTokenAuditor,
  IconWalletCopy,
  IconFeeOptimizer,
  IconPortfolioBalancer,
} from "@/components/ui/icons";
// Dynamically load heavier client-only Atlas widgets to reduce initial build/SSR memory footprint.
// Each component is already "use client"; disabling SSR avoids bundling their large deps during the
// server build phase which previously hit memory SIGTERM.
const JupiterSwapCard = dynamic(() => import("@/components/atlas/JupiterSwapCard").then(m => (m as any).default || (m as any).JupiterSwapCard), {
  ssr: false,
  loading: () => <div className="atlas-card relative overflow-hidden min-h-[300px] flex items-center justify-center text-xs opacity-60">Loading swap…</div>
});
import { TokenIntelCard } from "@/components/atlas/TokenIntelCard";
import {
  ScoreGauge as LabScoreGauge,
  YieldProjectionChart as LabYieldChart,
  RiskBar as LabRiskBar,
  StrategyCompare as LabStrategyCompare,
  PulseDot as LabPulseDot,
} from "@/components/atlas/StrategyLabCharts";
const DCABotCard = dynamic(() => import("@/components/atlas/DCABotCard").then(m => (m as any).default || (m as any).DCABotCard), { ssr: false, loading: () => <Skeleton className="h-[360px] w-full" /> });
const MEVScanner = dynamic(() => import("@/components/atlas/MEVScanner").then(m => (m as any).default || (m as any).MEVScanner), { ssr: false, loading: () => <Skeleton className="h-[360px] w-full" /> });
const TransactionTimeMachine = dynamic(() => import("@/components/atlas/TransactionTimeMachine").then(m => (m as any).default || (m as any).TransactionTimeMachine), { ssr: false, loading: () => <Skeleton className="h-[360px] w-full" /> });
const CopyMyWallet = dynamic(() => import("@/components/atlas/CopyMyWallet").then(m => (m as any).default || (m as any).CopyMyWallet), { ssr: false, loading: () => <Skeleton className="h-[360px] w-full" /> });
const FeeSaver = dynamic(() => import("@/components/atlas/FeeSaver").then(m => (m as any).default || (m as any).FeeSaver), { ssr: false, loading: () => <Skeleton className="h-[360px] w-full" /> });
const PortfolioRebalancer = dynamic(() => import("@/components/atlas/PortfolioRebalancer").then(m => (m as any).default || (m as any).PortfolioRebalancer), { ssr: false, loading: () => <Skeleton className="h-[360px] w-full" /> });
const RugPullDetector = dynamic(() => import("@/components/atlas/RugPullDetector").then(m => (m as any).default || (m as any).RugPullDetector), { ssr: false, loading: () => <Skeleton className="h-[360px] w-full" /> });
import { AirdropScoutCard } from "@/components/atlas/AirdropScoutCard";
import { OpportunitiesCard } from "@/components/atlas/OpportunitiesCard";
import { MarketPulseCard } from "@/components/atlas/MarketPulseCard";
const CreateDCABotModal = dynamic<ComponentType<{ isOpen?: boolean; onClose?: () => void }>>(() => import("@/components/atlas/CreateDCABotModal").then(m => (m as any).default || (m as any).CreateDCABotModal), { ssr: false });

// Wrapper to help TypeScript understand the dynamic component accepts these props
function CreateDCABotModalWrapper(props: { isOpen?: boolean; onClose?: () => void }) {
  const C = CreateDCABotModal as unknown as ComponentType<{ isOpen?: boolean; onClose?: () => void }>;
  return <C {...props} />;
}

// Section heading for Quests tab layout
function SectionHeading({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest opacity-50">{title}</h2>
      <div className="flex-1 h-px bg-border/40" />
    </div>
  );
}

// Jupiter core mints (mainnet)
const MINTS = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  MSOL: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
  JITOSOL: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
  BSOL: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
} as const;

// Token symbol → mint address resolver (case-insensitive lookup)
// Covers all commonly traded Solana tokens. Used by the command bar to map
// natural language token names (e.g. "JUP", "bonk") to on-chain mint addresses.
const TOKEN_MINT_MAP: Record<string, string> = {
  SOL:     "So11111111111111111111111111111111111111112",
  USDC:    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT:    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  MSOL:    "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
  JITOSOL: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
  BSOL:    "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
  JUP:     "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  BONK:    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  PYTH:    "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
  RAY:     "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  ORCA:    "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
  WIF:     "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
  JTO:     "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
  DRIFT:   "DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7",
  RENDER:  "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof",
  HNT:     "hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux",
  W:       "85VBFQZC9TZkfaptBWjvUw7YbZjy52A6mjtPGjstQAmQ",
};

/** Resolve a token symbol (case-insensitive) to its mint address. Returns undefined if unknown. */
function resolveTokenMint(symbolOrMint: string): string | undefined {
  if (!symbolOrMint) return undefined;
  const upper = symbolOrMint.toUpperCase().replace(/[-_\s]/g, "");
  // Direct match in map
  if (TOKEN_MINT_MAP[upper]) return TOKEN_MINT_MAP[upper];
  // Check common aliases
  if (upper === "WSOLANA" || upper === "WSOL") return TOKEN_MINT_MAP.SOL;
  if (upper === "MARINADE" || upper === "MNDE") return TOKEN_MINT_MAP.MSOL;
  if (upper === "JITO") return TOKEN_MINT_MAP.JITOSOL;
  if (upper === "BLAZE" || upper === "BLAZESTAKE") return TOKEN_MINT_MAP.BSOL;
  if (upper === "JUPITER") return TOKEN_MINT_MAP.JUP;
  if (upper === "RAYDIUM") return TOKEN_MINT_MAP.RAY;
  if (upper === "WORMHOLE") return TOKEN_MINT_MAP.W;
  // If it looks like a base58 mint address already (32+ chars), return as-is
  if (symbolOrMint.length >= 32 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(symbolOrMint)) return symbolOrMint;
  return undefined;
}

/** Map provider name from LLM to LST_OPTIONS id */
function resolveStakeProvider(provider?: string): string {
  if (!provider) return "MSOL";
  const p = provider.toLowerCase().replace(/[-_\s]/g, "");
  if (p === "jito" || p === "jitosol") return "JITOSOL";
  if (p === "blaze" || p === "blazestake" || p === "bsol") return "BSOL";
  return "MSOL"; // default to Marinade
}

// Available liquid staking tokens with metadata
// apyBoost = extra APY on top of base Solana inflation from MEV, validator optimization, incentives
// maturity: higher = more battle-tested protocol
const LST_OPTIONS = [
  { id: "MSOL",    mint: MINTS.MSOL,    name: "Marinade",   symbol: "mSOL",    apyBoost: 2.8,  maturity: 20, riskNote: "Largest LST by TVL", icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png" },
  { id: "JITOSOL", mint: MINTS.JITOSOL, name: "Jito",       symbol: "jitoSOL", apyBoost: 4.2,  maturity: 18, riskNote: "MEV-boosted rewards", icon: "https://storage.googleapis.com/token-metadata/JitoSOL-256.png" },
  { id: "BSOL",    mint: MINTS.BSOL,    name: "BlazeStake", symbol: "bSOL",    apyBoost: 2.0,  maturity: 14, riskNote: "BLZE incentives + staking", icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1/logo.png" },
] as const;

// Core tokens displayed in the Market Pulse hero section (symbol must match Jupiter price API key)
const CORE_TOKENS: { id: string; symbol: string; icon: string }[] = [
  { id: "SOL",     symbol: "SOL",     icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" },
  { id: "MSOL",    symbol: "mSOL",    icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png" },
  { id: "JITOSOL", symbol: "jitoSOL", icon: "https://storage.googleapis.com/token-metadata/JitoSOL-256.png" },
  { id: "BSOL",    symbol: "bSOL",    icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1/logo.png" },
  { id: "USDC",    symbol: "USDC",    icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png" },
  { id: "JUP",     symbol: "JUP",     icon: "https://static.jup.ag/jup/icon.png" },
  { id: "BONK",    symbol: "BONK",    icon: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I" },
  { id: "PYTH",    symbol: "PYTH",    icon: "https://pyth.network/token.svg" },
  { id: "RAY",     symbol: "RAY",     icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png" },
  { id: "ORCA",    symbol: "ORCA",    icon: "https://arweave.net/jQJRDpMM7NWRAQ3VQyr7K_Me6K6UZbOacJ62blhdsNg" },
];
const CORE_TOKEN_IDS = CORE_TOKENS.map((t) => t.id).join(",");

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

// Bespoke section glyphs - REPLACED BY CUSTOM ICON SYSTEM
// See src/components/ui/icons/ for new implementations

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
  const isClay = searchParams?.get("style") === "clay";
  const { setVisible } = useWalletModal();
  const { dispatch, lastCommand } = useAtlasCommand();

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
  const [selectedLst, setSelectedLst] = useState<string>("MSOL"); // default to Marinade
  const [quote, setQuote] = useState<any>(null);
  const [nlpText, setNlpText] = useState("");
  const [nlpLoading, setNlpLoading] = useState(false);
  const nlpInputRef = useRef<HTMLInputElement | null>(null);
  const [execLoading, setExecLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("quests");

  // AbortController refs for cancelling in-flight requests on rapid re-invocation
  const simulateAbortRef = useRef<AbortController | null>(null);
  const refreshAbortRef = useRef<AbortController | null>(null);
  const scanAbortRef = useRef<AbortController | null>(null);
  const holderAbortRef = useRef<AbortController | null>(null);

  // Airdrop Compass state
  const [compassLoading, setCompassLoading] = useState(false);
  const [compassError, setCompassError] = useState<string | null>(null);
  const [compassData, setCompassData] = useState<any | null>(null);
  const [selectedAirdropId, setSelectedAirdropId] = useState<string | null>(null);

  // Modal States
  const [isCreateDcaOpen, setCreateDcaOpen] = useState(false);

  // Command handler effect
  useEffect(() => {
    if (!lastCommand) return;

    const { tool_id, parameters } = lastCommand;

    switch (tool_id) {
      // ── Navigation ─────────────────────────────────────────────────
      case "navigate_to_tab":
        if (parameters.tab_id) {
          handleTabChange(parameters.tab_id);
          setTimeout(() => {
            const elementId = parameters.tab_id === 'lab' ? 'strategy-lab' : 'quests-content';
            document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth' });
            toast.info(`Navigated to the ${parameters.tab_id} tab.`);
          }, 100);
        }
        break;

      // ── Discover ───────────────────────────────────────────────────
      case "scan_airdrops":
        handleTabChange("quests");
        setTimeout(() => {
          scanAirdrops();
          document.getElementById('airdrop-compass')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        toast.info("Scanning for airdrops...");
        break;

      // ── Trade (swap) ───────────────────────────────────────────────
      case "swap_tokens": {
        // Resolve token symbols from LLM to mint addresses; fall back to SOL->USDC
        const inputSymbol = parameters.input_token || parameters.input_mint || "SOL";
        const outputSymbol = parameters.output_token || parameters.output_mint || "USDC";
        const resolvedInput = resolveTokenMint(inputSymbol) || MINTS.SOL;
        const resolvedOutput = resolveTokenMint(outputSymbol) || MINTS.USDC;
        const swapAmount = typeof parameters.amount === "number" ? parameters.amount : 0.1;

        // Also route through Strategy Lab if the user typed "swap X SOL to Y"
        handleTabChange("lab");
        setKind("swap_jupiter");
        setAmountSol(swapAmount);
        setTimeout(() => {
          simulate();
          document.getElementById('strategy-lab')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);

        // Additionally drive the Jupiter widget on the Quests tab
        setTimeout(() => {
          tryInitiateJupiterSwap({
            amount: swapAmount,
            inputMint: resolvedInput,
            outputMint: resolvedOutput,
          });
        }, 200);

        toast.info(`Swap: ${swapAmount} ${inputSymbol.toUpperCase()} → ${outputSymbol.toUpperCase()}`);
        break;
      }

      // ── Strategy Lab: Stake ────────────────────────────────────────
      case "stake_sol": {
        const lstId = resolveStakeProvider(parameters.provider);
        handleTabChange("lab");
        setKind("stake_marinade");
        setSelectedLst(lstId);
        if (parameters.amount) {
          setAmountSol(parameters.amount);
        }
        const lstLabel = LST_OPTIONS.find(l => l.id === lstId)?.name || "Marinade";
        setTimeout(() => {
          simulate(lstId);
          document.getElementById('strategy-lab')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        toast.info(`Staking${parameters.amount ? ` ${parameters.amount} SOL` : ""} via ${lstLabel}`);
        break;
      }

      // ── Strategy Lab: LP ───────────────────────────────────────────
      case "provide_liquidity":
        handleTabChange("lab");
        setKind("lp_sol_usdc");
        if (parameters.amount) {
          setAmountSol(parameters.amount);
        }
        setTimeout(() => {
          simulate();
          document.getElementById('strategy-lab')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        toast.info(`LP simulation${parameters.amount ? ` for ${parameters.amount} SOL` : ""} started`);
        break;

      // ── Analyze ────────────────────────────────────────────────────
      case "view_holder_insights":
        handleTabChange("quests");
        if (parameters.mint_address) {
          setMintInput(parameters.mint_address);
          setTimeout(() => {
            fetchHolderInsights();
            document.getElementById('holder-insights-card')?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
        break;

      case "scan_mev":
        handleTabChange("quests");
        setTimeout(() => {
          document.getElementById('mev-scanner-card')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        toast.info("MEV Scanner is now in view.");
        break;

      case "rug_pull_detector":
        handleTabChange("quests");
        setTimeout(() => {
          document.getElementById('rug-pull-detector-card')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        toast.info("Rug Pull Detector opened. Paste a token mint to analyze.");
        break;

      // ── Trade (DCA) ────────────────────────────────────────────────
      case "create_dca_bot":
        setCreateDcaOpen(true);
        break;

      // ── Manage ─────────────────────────────────────────────────────
      case "transaction_time_machine":
        handleTabChange("quests");
        setTimeout(() => {
          document.getElementById('transaction-time-machine-card')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        toast.info("Transaction Time Machine is now in view.");
        break;

      case "copy_trader":
        handleTabChange("quests");
        setTimeout(() => {
          document.getElementById('copy-my-wallet-card')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        toast.info("Copy Wallet tool is now in view.");
        break;

      case "portfolio_rebalancer":
        handleTabChange("quests");
        setTimeout(() => {
          document.getElementById('portfolio-rebalancer-card')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        toast.info("Portfolio Rebalancer is now in view.");
        break;

      case "fee_saver_insights":
        handleTabChange("quests");
        setTimeout(() => {
          document.getElementById('fee-saver-card')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        toast.info("Fee Saver Insights is now in view.");
        break;

      // ── Info commands ──────────────────────────────────────────────
      case "price_check": {
        const tokenSym = (parameters.token || "SOL").toUpperCase();
        const price = prices[tokenSym] ?? prices[tokenSym.toLowerCase()];
        if (price !== undefined && price > 0) {
          toast.success(`${tokenSym} price: $${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`);
        } else {
          // Try scrolling to market pulse where all prices are visible
          handleTabChange("quests");
          setTimeout(() => {
            document.getElementById('market-pulse-card')?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
          toast.info(`Checking ${tokenSym} price — see Market Pulse above.`);
        }
        break;
      }

      case "show_portfolio": {
        const bal = solBalance !== null ? `${solBalance.toFixed(4)} SOL` : "unknown";
        const usd = solBalance !== null && prices.SOL ? `($${(solBalance * prices.SOL).toFixed(2)})` : "";
        toast.success(`Wallet balance: ${bal} ${usd}`);
        // Scroll to Market Pulse which shows the portfolio overview
        handleTabChange("quests");
        setTimeout(() => {
          document.getElementById('market-pulse-card')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        break;
      }

      case "market_overview":
        handleTabChange("quests");
        setTimeout(() => {
          document.getElementById('market-pulse-card')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        toast.info("Market overview is now in view.");
        break;

      default:
        toast.error("Sorry, I didn't understand that command.");
        break;
    }
  }, [lastCommand]);


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
        const btn = container?.querySelector('button:has(span),button') as HTMLButtonElement | null;
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
      setKind("lp_sol_usdc");
      setAmountSol(val);
      await executeLp();
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
  const [dasData, setDasData] = useState<any | null>(null);
  const [holderError, setHolderError] = useState<string | null>(null);

  // NEW: Live OHLCV (SSE)
  const [lastCandle, setLastCandle] = useState<any | null>(null);
  const [ohlcvActive, setOhlcvActive] = useState(false);

  // Sparkline price history for all core tokens (keyed by uppercase ID)
  const [coreHistory, setCoreHistory] = useState<Record<string, number[]>>({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesUpdatedAt, setPricesUpdatedAt] = useState<number | null>(null);

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

  const [cmdText, setCmdText] = useState("");
  const [cmdLoading, setCmdLoading] = useState(false);

  /**
   * Local regex fallback parser — works when LLM API is down.
   * Returns { tool_id, parameters } or null if no match.
   */
  function regexFallbackParse(text: string): { tool_id: string; parameters: Record<string, any> } | null {
    const lower = text.toLowerCase().trim();
    const amtMatch = lower.match(/([0-9]+(?:\.[0-9]+)?)/);
    const amt = amtMatch ? Number(amtMatch[1]) : undefined;

    // ── Stake ──
    if (/\b(stake|staking)\b/.test(lower)) {
      let provider = "marinade";
      if (/\bjito\b/.test(lower)) provider = "jito";
      else if (/\bblaze\b|\bbsol\b/.test(lower)) provider = "blazestake";
      return { tool_id: "stake_sol", parameters: { amount: amt, provider } };
    }

    // ── Swap ──
    if (/\b(swap|buy|sell|convert|trade)\b/.test(lower)) {
      // Try to extract "X SOL to Y" or "buy Y with X"
      const swapMatch = lower.match(/(\d+(?:\.\d+)?)\s*(\w+)\s*(?:to|for|into|→)\s*(\w+)/);
      if (swapMatch) {
        return { tool_id: "swap_tokens", parameters: { amount: Number(swapMatch[1]), input_token: swapMatch[2], output_token: swapMatch[3] } };
      }
      const buyMatch = lower.match(/buy\s+(\d+(?:\.\d+)?)\s*(\w+)\s*(?:with|using)?\s*(\w+)?/);
      if (buyMatch) {
        return { tool_id: "swap_tokens", parameters: { amount: Number(buyMatch[1]), input_token: buyMatch[3] || "SOL", output_token: buyMatch[2] } };
      }
      return { tool_id: "swap_tokens", parameters: { amount: amt, input_token: "SOL", output_token: "USDC" } };
    }

    // ── LP / Liquidity ──
    if (/\b(lp|liquidity|pool)\b/.test(lower)) {
      return { tool_id: "provide_liquidity", parameters: { amount: amt } };
    }

    // ── Price check ──
    if (/\b(price|how much|worth|cost)\b/.test(lower)) {
      const tokenMatch = lower.match(/(?:price\s+(?:of\s+)?|how much (?:is )?|worth of )(\w+)/);
      return { tool_id: "price_check", parameters: { token: tokenMatch ? tokenMatch[1].toUpperCase() : "SOL" } };
    }

    // ── Portfolio / Balance ──
    if (/\b(balance|portfolio|holdings|what do i have)\b/.test(lower)) {
      return { tool_id: "show_portfolio", parameters: {} };
    }

    // ── Market overview ──
    if (/\b(market|overview|pulse|trend)\b/.test(lower)) {
      return { tool_id: "market_overview", parameters: {} };
    }

    // ── Airdrops ──
    if (/\b(airdrop|quest)\b/.test(lower)) {
      return { tool_id: "scan_airdrops", parameters: {} };
    }

    // ── MEV ──
    if (/\bmev\b/.test(lower)) {
      return { tool_id: "scan_mev", parameters: {} };
    }

    // ── DCA ──
    if (/\bdca\b/.test(lower)) {
      return { tool_id: "create_dca_bot", parameters: {} };
    }

    // ── Rug pull / safety ──
    if (/\b(rug|scam|safe|audit)\b/.test(lower)) {
      const mintMatch = lower.match(/([1-9A-HJ-NP-Za-km-z]{32,44})/);
      return { tool_id: "rug_pull_detector", parameters: { mint_address: mintMatch ? mintMatch[1] : undefined } };
    }

    // ── Rebalance ──
    if (/\brebalanc/.test(lower)) {
      return { tool_id: "portfolio_rebalancer", parameters: {} };
    }

    // ── Fee saver ──
    if (/\bfee\b/.test(lower)) {
      return { tool_id: "fee_saver_insights", parameters: {} };
    }

    // ── Time machine / tx lookup ──
    if (/\b(time machine|transaction|tx|lookup)\b/.test(lower)) {
      const sigMatch = lower.match(/([1-9A-HJ-NP-Za-km-z]{64,88})/);
      return { tool_id: "transaction_time_machine", parameters: { signature: sigMatch ? sigMatch[1] : undefined } };
    }

    // ── Copy wallet ──
    if (/\bcopy\b/.test(lower)) {
      return { tool_id: "copy_trader", parameters: {} };
    }

    // ── Navigation: lab ──
    if (/\blab\b|\bstrategy\b/.test(lower)) {
      return { tool_id: "navigate_to_tab", parameters: { tab_id: "lab" } };
    }

    // ── Navigation: quests ──
    if (/\bquest\b|\btool\b/.test(lower)) {
      return { tool_id: "navigate_to_tab", parameters: { tab_id: "quests" } };
    }

    return null;
  }

  const handleBottomSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = cmdText.trim();
    if (!text) return;

    setCmdLoading(true);
    try {
      let command: { tool_id: string; parameters: Record<string, any> } | null = null;

      // Try LLM-powered parser first
      try {
        const response = await fetch("/api/ai/parse-atlas-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (response.ok) {
          const parsed = await response.json();
          // Accept only if the LLM returned a real tool_id (not "unknown" or empty)
          if (parsed && parsed.tool_id && parsed.tool_id !== "unknown") {
            command = parsed;
          }
        }
      } catch {
        // LLM API failed — fall through to regex
      }

      // Fallback: local regex parser
      if (!command) {
        command = regexFallbackParse(text);
      }

      if (command && command.tool_id) {
        dispatch(command);
      } else {
        toast.error("Sorry, I couldn't understand that command. Try: 'swap 10 SOL to USDC', 'stake 5 SOL with Jito', or 'show SOL price'.");
      }
    } catch (error: any) {
      toast.error("Error processing command", { description: error.message });
    } finally {
      setCmdLoading(false);
      setCmdText("");
    }
  };

  async function simulate(overrideLst?: string) {
    // Validate input before making any API calls
    if (!Number.isFinite(amountSol) || amountSol <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }
    if (amountSol > 1_000_000) {
      setError("Amount too large — please enter a realistic value");
      return;
    }

    // Cancel any in-flight simulate request
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

        // Dynamic score from live quote data
        const impactPenalty = Math.min(40, priceImpact * 2000);
        const slippagePenalty = slippageBps > 200 ? 15 : slippageBps > 100 ? 8 : 0;
        const routeBonus = routeCount === 1 ? 5 : routeCount <= 3 ? 0 : -5;
        const sizeFactor = Math.min(10, Math.max(0, (Math.log10(swapUsdValue + 1) - 1) * 3));
        const marketJitter = (Math.sin(Date.now() / 60000) + 1) * 2.5;
        const rateEff = solPrice > 0 ? Math.min(10, (outAmount / (amountSol * solPrice)) * 10) : 5;
        const score = Math.max(0, Math.min(100, Math.round(85 - impactPenalty - slippagePenalty + routeBonus + sizeFactor + marketJitter + rateEff)));

        // Dynamic risk from price impact & trade size
        const riskLevel: "low" | "medium" | "high" = priceImpact > 0.01 || amountSol > 500 ? "high" : priceImpact > 0.002 || amountSol > 100 ? "medium" : "low";
        const riskLabel = priceImpact > 0.005 ? "High Impact" : amountSol > 200 ? "Large Trade" : "Execution Risk";

        setQuote({ ...j, _parsed: { outAmount, priceImpact, slippageBps, routeCount, inputUsd, score, riskLevel, riskLabel } });
        toast.success("Jupiter quote ready");

      } else if (kind === "stake_marinade") {
        const lstId = overrideLst || selectedLst;
        const lst = LST_OPTIONS.find(l => l.id === lstId) || LST_OPTIONS[0];
        const baseApy = inflationApy ?? 4.0;

        // Each LST has a different effective APY: base Solana inflation + protocol-specific boost
        // Try to refine with live Jupiter price data (LST/SOL ratio implies real yield)
        let protocolApy = baseApy + lst.apyBoost;
        try {
          const lstPrice = prices[lst.id] ?? 0;
          const solPriceLive = prices.SOL ?? 0;
          if (lstPrice > 0 && solPriceLive > 0) {
            // LST premium over SOL reflects accumulated yield
            const premium = lstPrice / solPriceLive;
            // If premium > 1, LST has appreciated vs SOL (expected for yield-bearing tokens)
            // Adjust APY estimate based on live premium deviation from expected
            const expectedPremium = 1 + (protocolApy / 100);
            const liveAdjustment = premium > 1 ? ((premium - 1) / (expectedPremium - 1)) * protocolApy - protocolApy : 0;
            protocolApy = Math.max(baseApy, protocolApy + Math.min(2, Math.max(-2, liveAdjustment * 0.3)));
          }
        } catch (_e) {
          // Live price adjustment failed — use base APY estimate
        }

        const apy = Math.round(protocolApy * 100) / 100;
        const yield12m = amountSol * (apy / 100);
        const yieldUsd = yield12m * solPrice;

        // Dynamic score: protocol-specific APY, maturity, yield ratio
        const apyScore = Math.min(35, Math.round(apy * 4.5));
        const yieldRatio = amountSol > 0 ? Math.min(20, Math.round((yield12m / amountSol) * 280)) : 0;
        const protocolBonus = lst.maturity;
        const amtBonus = amountSol >= 0.5 ? Math.min(12, Math.round(Math.log10(amountSol + 1) * 7)) : 0;
        const timeJitter = (Math.cos(Date.now() / 90000) + 1) * 2;
        const score = Math.max(0, Math.min(100, Math.round(apyScore + yieldRatio + protocolBonus + amtBonus + timeJitter)));

        // Risk scales with concentration + protocol maturity
        const riskLevel: "low" | "medium" | "high" = amountSol > 10000 ? "high" : amountSol > 1000 || lst.maturity < 15 ? "medium" : "low";
        const riskLabel = amountSol > 5000 ? "Concentration Risk" : apy < 3 ? "Low Yield Environment" : lst.riskNote;

        setQuote({ kind, apy, yield12m, yieldUsd, inputUsd, score, riskLevel, riskLabel, lstId: selectedLst });
        toast.success(`${lst.name} projection ready`);

      } else if (kind === "lp_sol_usdc") {
        // Fetch real LP APY data
        let pools: any[] = [];
        try {
          const lpRes = await fetch("/api/lp/apy", { cache: "no-store" });
          if (lpRes.ok) {
            const lpData = await lpRes.json();
            pools = lpData?.pools || [];
          }
        } catch (_e) {
          // LP APY fetch failed — will use fallback values below
        }
        const bestPool = pools[0] || { dex: "Orca", pair: "SOL/USDC", apy: 12.5, tvl: 45_000_000 };
        const lpApy = bestPool.apy;
        const yield12m = amountSol * (lpApy / 100);
        const yieldUsd = yield12m * solPrice;

        // Dynamic score from live pool metrics
        const apyScore = Math.min(30, Math.round(lpApy * 0.6));
        const tvlScore = bestPool.tvl > 20_000_000 ? 25 : bestPool.tvl > 5_000_000 ? 18 : bestPool.tvl > 1_000_000 ? 12 : 5;
        const volRatio = (bestPool.volume24h || 0) / Math.max(bestPool.tvl, 1);
        const utilizationScore = Math.min(15, Math.round(volRatio * 30));
        const ilPenalty = Math.round(Math.min(20, lpApy * 0.15));
        const feeBonus = bestPool.fee && bestPool.fee <= 0.003 ? 10 : 5;
        const lpJitter = (Math.sin(Date.now() / 75000) + 1) * 2;
        const score = Math.max(0, Math.min(100, Math.round(apyScore + tvlScore + utilizationScore - ilPenalty + feeBonus + lpJitter)));

        // Dynamic risk from TVL and APY
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

  // Manual refresh for Market Snapshot
  async function refreshPrices() {
    if (refreshAbortRef.current) refreshAbortRef.current.abort();
    refreshAbortRef.current = new AbortController();
    try {
      setPricesLoading(true);
      const j = await fetchJsonWithRetry(`/api/jupiter/price?ids=${CORE_TOKEN_IDS}`, { cache: "no-store" });
      if ((j as any)?.data) {
        const map: Record<string, number> = {};
        for (const k of Object.keys((j as any).data)) {
          const p = (j as any).data[k]?.price;
          if (typeof p === "number") map[k.toUpperCase()] = p;
        }
        setPrices(map);
        setCoreHistory((prev) => {
          const next = { ...prev };
          for (const t of CORE_TOKENS) {
            const p = map[t.id];
            if (typeof p === "number") next[t.id] = [...(next[t.id] || []).slice(-47), p];
          }
          return next;
        });
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

  // Fetch price snapshots for all core tokens via Jupiter Price API proxy
  useEffect(() => {
    let abort = false;
    async function run() {
      try {
        const j = await fetchJsonWithRetry(`/api/jupiter/price?ids=${CORE_TOKEN_IDS}`, { cache: "no-store" });
        if (!abort && (j as any)?.data) {
          const map: Record<string, number> = {};
          for (const k of Object.keys((j as any).data)) {
            const p = (j as any).data[k]?.price;
            if (typeof p === "number") map[k.toUpperCase()] = p;
          }
          setPrices(map);
          setPricesUpdatedAt(Date.now());
          setCoreHistory((prev) => {
            const next = { ...prev };
            for (const t of CORE_TOKENS) {
              const p = map[t.id];
              if (typeof p === "number") next[t.id] = [...(next[t.id] || []).slice(-47), p];
            }
            return next;
          });
        }
      } catch (_e) {
        // Price polling failed — will retry on next interval
      }
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
        const items = Array.isArray((j as any)?.items) ? (j as any).items : (j as any)?.data || [];
        if (mounted) {
          setSpecItems(items);
        }
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
    if (holderAbortRef.current) holderAbortRef.current.abort();
    holderAbortRef.current = new AbortController();
    setHolderLoading(true);
    setHolderError(null);
    setMoralisStats(null);
    setDasCount(null);
    setDasData(null);
    try {
      // Moralis
      const mJson = await fetchJsonWithRetry(`/api/moralis/solana/holders/${mint}/stats`, { cache: "no-store" });
      setMoralisStats(mJson);
      // Helius DAS
      const hJson = await fetchJsonWithRetry(`/api/helius/das/token-accounts?mint=${mint}`, { cache: "no-store" });
      const list = (hJson as any)?.result || (hJson as any)?.data || (hJson as any)?.token_accounts || [];
      setDasCount(Array.isArray(list) ? list.length : typeof (hJson as any)?.total === "number" ? (hJson as any).total : null);
      // Store full Helius data for display
      setDasData(Array.isArray(list) ? list : []);
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

      // Fallback lightweight parser (client-side)
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

      // Map parsed action → StrategyKind
      let nextKind: StrategyKind = "stake_marinade";
      if (parsed.action === "swap" || parsed.action === "dca") nextKind = "swap_jupiter";
      if (parsed.action === "lp") nextKind = "lp_sol_usdc";
      setKind(nextKind);
      if (typeof parsed.amount === "number" && !Number.isNaN(parsed.amount)) setAmountSol(parsed.amount);

      const conf = parsed.confidence ? ` (${(parsed.confidence * 100).toFixed(0)}% conf)` : "";
      toast.success(`Parsed: ${parsed.action} ${parsed.amount ?? ""} ${parsed.asset ?? "SOL"}${parsed.venue ? " via " + parsed.venue : ""}${conf}`);
      await simulate();
    } finally {
      setNlpLoading(false);
    }
  }

  // Keyboard shortcuts: "/" focus NLP, "s" simulate, 1/2/3 switch strategies
  const simulateRef = useRef(simulate);
  simulateRef.current = simulate;
  const refreshPricesRef = useRef(refreshPrices);
  refreshPricesRef.current = refreshPrices;

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
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        refreshPricesRef.current();
      } else if (e.key.toLowerCase() === "g") {
        e.preventDefault();
        document.getElementById("quick-scan")?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

      // Strip internal _parsed analysis data before sending to Jupiter swap API
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
      if (!res.ok || !j?.swapTransaction) {
        throw new Error(j?.error || "Failed to build swap transaction");
      }

      // Decode base64 -> Uint8Array
      const b64 = j.swapTransaction as string;
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const vtx = VersionedTransaction.deserialize(bytes);

      // skipPreflight avoids simulation errors from address lookup tables or stale blockhash;
      // Jupiter already validates the route server-side.
      const signature = await sendTransaction!(vtx, connection, { skipPreflight: true });
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

  // Execute liquid stake: SOL → mSOL via Jupiter (routes through Marinade/Jito/etc.)
  // Using Jupiter instead of the Marinade SDK for reliability in serverless environments.
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

      // Step 1: Get Jupiter quote for SOL → LST (liquid staking)
      const lst = LST_OPTIONS.find(l => l.id === selectedLst) || LST_OPTIONS[0];
      const quoteUrl = new URL("/api/jupiter/quote", window.location.origin);
      quoteUrl.searchParams.set("inputMint", MINTS.SOL);
      quoteUrl.searchParams.set("outputMint", lst.mint);
      quoteUrl.searchParams.set("amount", String(lamports));
      quoteUrl.searchParams.set("slippageBps", "10"); // tight slippage for staking
      const quoteRes = await fetch(quoteUrl.toString(), { cache: "no-store" });
      const quoteData = await quoteRes.json();
      if (!quoteRes.ok || !quoteData) {
        throw new Error(quoteData?.error || "Failed to get staking quote");
      }

      // Step 2: Build swap transaction via Jupiter
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
      if (!swapRes.ok || !swapData?.swapTransaction) {
        throw new Error(swapData?.error || "Failed to build stake transaction");
      }

      // Step 3: Deserialize and send
      const b64 = swapData.swapTransaction as string;
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const vtx = VersionedTransaction.deserialize(bytes);

      const sig = await sendTransaction!(vtx, connection, { skipPreflight: true });
      toast.success(`Staked via ${lst.name}`, { description: `SOL → ${lst.symbol} sent` });
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

  // Execute LP deposit: swap half SOL → USDC via Jupiter, then open pool for deposit
  async function executeLp() {
    try {
      if (!publicKey) {
        toast.error("Connect wallet to execute");
        return;
      }
      if (kind !== "lp_sol_usdc") {
        toast.error("Not in LP mode");
        return;
      }
      const halfSol = amountSol / 2;
      const lamports = Math.floor(Math.max(0, halfSol) * LAMPORTS_PER_SOL);
      if (!lamports) {
        toast.error("Enter amount > 0");
        return;
      }
      setExecLoading(true);

      // Step 1: Swap half SOL → USDC to create the LP pair
      const quoteUrl = new URL("/api/jupiter/quote", window.location.origin);
      quoteUrl.searchParams.set("inputMint", MINTS.SOL);
      quoteUrl.searchParams.set("outputMint", MINTS.USDC);
      quoteUrl.searchParams.set("amount", String(lamports));
      quoteUrl.searchParams.set("slippageBps", "50");
      const quoteRes = await fetch(quoteUrl.toString(), { cache: "no-store" });
      const quoteData = await quoteRes.json();
      if (!quoteRes.ok || !quoteData) {
        throw new Error(quoteData?.error || "Failed to get LP swap quote");
      }

      // Step 2: Build swap transaction via Jupiter
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
      if (!swapRes.ok || !swapData?.swapTransaction) {
        throw new Error(swapData?.error || "Failed to build LP swap transaction");
      }

      // Step 3: Deserialize and send
      const b64 = swapData.swapTransaction as string;
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const vtx = VersionedTransaction.deserialize(bytes);
      const sig = await sendTransaction!(vtx, connection, { skipPreflight: true });

      const txUrl = `https://solscan.io/tx/${sig}`;
      toast.success(`Swapped ${halfSol.toFixed(3)} SOL → USDC for LP pair`, {
        description: "Opening pool deposit…",
      });
      toast.message("View swap on Solscan", {
        description: txUrl,
        action: {
          label: "Open",
          onClick: () => window.open(txUrl, "_blank", "noopener,noreferrer"),
        },
      });

      // Step 4: Open the pool deposit page on the best DEX
      const bestPool = quote?.bestPool;
      let poolUrl: string;
      if (bestPool?.dex === "Raydium" && bestPool?.pool && bestPool.pool !== "unknown" && bestPool.pool !== "estimated") {
        poolUrl = `https://raydium.io/liquidity/increase/?mode=add&pool_id=${bestPool.pool}`;
      } else if (bestPool?.pool && bestPool.pool !== "unknown" && bestPool.pool !== "estimated") {
        poolUrl = `https://www.orca.so/pools/${bestPool.pool}`;
      } else {
        poolUrl = "https://www.orca.so/?tokenA=SOL&tokenB=USDC";
      }

      // Open pool UI for the deposit step
      setTimeout(() => {
        toast.message("Complete LP deposit", {
          description: `Deposit SOL + USDC on ${bestPool?.dex || "Orca"}`,
          action: {
            label: "Open Pool",
            onClick: () => window.open(poolUrl, "_blank", "noopener,noreferrer"),
          },
        });
      }, 1500);
    } catch (e: any) {
      toast.error("LP execution failed", { description: e?.message || String(e) });
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
    if (scanAbortRef.current) scanAbortRef.current.abort();
    scanAbortRef.current = new AbortController();
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
  const [trendingSource, setTrendingSource] = useState<"bitquery" | "jupiter" | "moralis">("bitquery");

  // Fetch trending token list — Moralis primary, Jupiter fallback, Bitquery SSE overlay
  useEffect(() => {
    let closed = false;
    let baseline: TrendingToken[] = [];

    // Helper to insert token uniquely and cap per-source
    const upsert = (list: TrendingToken[], t: TrendingToken, cap: number) => {
      if (!t.mint || !t.symbol) return list;
      if (list.find((x) => x.mint === t.mint)) return list;
      const next = [...list, t];
      return next.slice(0, cap);
    };

    // Local buffers per SSE subscription
    let fromJumps: TrendingToken[] = [];
    let fromCurve: TrendingToken[] = [];

    const recompute = () => {
      // SSE tokens first, then fill with baseline (deduped)
      const sseTokens: TrendingToken[] = [...fromJumps, ...fromCurve];
      const sseMints = new Set(sseTokens.map((t) => t.mint));
      const baselineFill = baseline.filter((t) => !sseMints.has(t.mint));
      const combined = [...sseTokens, ...baselineFill];
      setTrending(() => {
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

    // Load trending tokens: try Moralis first, fall back to Jupiter
    const loadBaseline = async () => {
      // Try Moralis trending (primary)
      try {
        const m = await fetchJsonWithRetry("/api/moralis/trending?limit=8", { cache: "no-store" });
        const items = (m as any)?.items || [];
        if (!closed && Array.isArray(items) && items.length >= 3) {
          baseline = items;
          setTrendingSource("moralis");
          recompute();
          setTrendingLoading(false);
          return;
        }
      } catch {}

      // Jupiter fallback
      try {
        const j = await fetchJsonWithRetry("/api/jupiter/trending?limit=8", { cache: "no-store" });
        const items = (j as any)?.items || [];
        if (!closed && Array.isArray(items) && items.length > 0) {
          baseline = items;
          setTrendingSource("jupiter");
          recompute();
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

        // 1. Load baseline immediately
        loadBaseline();

        // 2. Bitquery SSE overlay — prepends real-time discoveries
        const es1 = new EventSource(`/api/bitquery/pumpfun/marketcap-jumps`);
        const es2 = new EventSource(`/api/bitquery/pumpfun/curve-95`);

        const processSseMsg = (ev: MessageEvent, buf: "jumps" | "curve") => {
          if (closed) return;
          try {
            const msg = JSON.parse(ev.data);
            let payload: any = null;
            if (msg?.type === "data" && msg?.data) {
              payload = { data: msg.data };
            } else if (msg?.type === "frame" && msg?.msg?.payload) {
              payload = msg.msg.payload;
            }
            if (!payload) return;
            const tok = extractToken(payload);
            if (tok) {
              setTrendingLoading(false);
              if (buf === "jumps") fromJumps = upsert(fromJumps, tok, 3);
              else fromCurve = upsert(fromCurve, tok, 3);
              recompute();
            }
          } catch {}
        };
        const onMsg1 = (ev: MessageEvent) => processSseMsg(ev, "jumps");
        const onMsg2 = (ev: MessageEvent) => processSseMsg(ev, "curve");
        const onErr = () => {};

        es1.addEventListener("message", onMsg1 as any);
        es2.addEventListener("message", onMsg2 as any);
        es1.addEventListener("error", onErr as any);
        es2.addEventListener("error", onErr as any);

        return () => {
          closed = true;
          es1.removeEventListener("message", onMsg1 as any);
          es2.removeEventListener("message", onMsg2 as any);
          es1.removeEventListener("error", onErr as any);
          es2.removeEventListener("error", onErr as any);
          es1.close();
          es2.close();
        };
      } catch (e) {
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
                      <IconMarketPulse className="h-3 w-3" />
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
                <span className="flex items-center gap-1.5 whitespace-nowrap"><IconAirDropScout className="h-3.5 w-3.5" /><span>Quests</span></span>
              </TabsTrigger>
              <TabsTrigger value="lab" className="h-7 px-3 text-[12px] rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer w-full justify-center">
                <span className="flex items-center gap-1.5 whitespace-nowrap"><IconStrategyLab className="h-3.5 w-3.5" /><span>Strategy Lab</span></span>
              </TabsTrigger>
            </TabsList>

            {/* Quests View */}
            <TabsContent value="quests" className="mt-8 space-y-8">

              {/* ── Market Overview (hero) ────────────────────────── */}
              <section id="market-pulse-card">
                <MarketPulseCard
                  coreTokens={CORE_TOKENS}
                  prices={prices}
                  coreHistory={coreHistory}
                  pricesLoading={pricesLoading}
                  pricesUpdatedAt={pricesUpdatedAt}
                  refreshPrices={refreshPrices}
                  trending={trending}
                  trendingPrices={trendingPrices}
                  trendingHist={trendingHist}
                  trendingUpdatedAt={trendingUpdatedAt}
                  trendingLoading={trendingLoading}
                  trendingError={trendingError}
                  trendingSource={trendingSource}
                />
              </section>

              {/* ── Trade ─────────────────────────────────────────── */}
              <section>
                <SectionHeading title="Trade" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-full min-h-[360px]" id="jupiter-integrated-card">
                    <JupiterSwapCard />
                  </div>
                  <DCABotCard />
                </div>
              </section>

              {/* ── Analyze ───────────────────────────────────────── */}
              <section>
                <SectionHeading title="Analyze" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TokenIntelCard
                    mintInput={mintInput}
                    setMintInput={setMintInput}
                    holderLoading={holderLoading}
                    holderError={holderError}
                    moralisStats={moralisStats}
                    dasCount={dasCount}
                    dasData={dasData}
                    fetchHolderInsights={fetchHolderInsights}
                  />
                  <div id="mev-scanner-card"><MEVScanner /></div>
                </div>
              </section>

              {/* ── Discover ──────────────────────────────────────── */}
              <section>
                <SectionHeading title="Discover" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AirdropScoutCard
                    publicKey={publicKey}
                    compassLoading={compassLoading}
                    compassError={compassError}
                    compassData={compassData}
                    scanAirdrops={scanAirdrops}
                    selectedAirdropId={selectedAirdropId}
                    setSelectedAirdropId={setSelectedAirdropId}
                    handleSimulateTask={handleSimulateTask}
                    handleExecuteTask={handleExecuteTask}
                  />
                  <OpportunitiesCard specLoading={specLoading} specError={specError} specItems={specItems} />
                </div>
              </section>

              {/* ── Manage ────────────────────────────────────────── */}
              <section>
                <SectionHeading title="Manage" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div id="portfolio-rebalancer-card"><PortfolioRebalancer /></div>
                  <div id="copy-my-wallet-card"><CopyMyWallet /></div>
                  <div id="fee-saver-card"><FeeSaver /></div>
                </div>
              </section>

              {/* ── Research ──────────────────────────────────────── */}
              <section>
                <SectionHeading title="Research" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div id="transaction-time-machine-card"><TransactionTimeMachine /></div>
                  <div id="rug-pull-detector-card"><RugPullDetector /></div>
                </div>
              </section>

            </TabsContent>

            {/* Strategy Lab */}
            <TabsContent value="lab" className="mt-8" id="strategy-lab">
              <div className="space-y-4">

                {/* ── Hero: NLP Command ─────────────────────────────── */}
                <div className="relative rounded-xl border border-border/30 bg-card/60 backdrop-blur-md p-4 overflow-hidden">
                  <span className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/25%,transparent_70%)]" />
                  <span className="pointer-events-none absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-[radial-gradient(closest-side,hsl(var(--chart-2))/20%,transparent_70%)]" />

                  <div className="flex items-center gap-2 mb-3">
                    <IconStrategyLab className="h-4 w-4 opacity-70" />
                    <span className="text-xs font-medium opacity-70">Strategy Lab</span>
                    <LabPulseDot />
                    <span className="text-[10px] opacity-40 ml-auto">Press / to focus</span>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleParse(); }} className="relative">
                    <Input
                      ref={nlpInputRef}
                      value={nlpText}
                      onChange={(e) => setNlpText(e.target.value)}
                      placeholder="stake 5 SOL · swap 10 SOL to USDC · provide liquidity 3 SOL"
                      className="h-11 pr-24 text-sm bg-background/30 border-border/30 rounded-lg placeholder:opacity-40"
                    />
                    <Button
                      size="sm"
                      type="submit"
                      disabled={nlpLoading || !nlpText.trim()}
                      className="absolute right-1 top-1 h-9 px-4 rounded-md"
                    >
                      {nlpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Run <ArrowRight className="h-3.5 w-3.5 ml-1" /></>}
                    </Button>
                  </form>
                </div>

                {/* ── Strategy Selector + Amount (inline, compact) ──── */}
                <div className="flex items-center gap-2 flex-wrap">
                  {(["stake_marinade", "swap_jupiter", "lp_sol_usdc"] as StrategyKind[]).map((k) => {
                    const labels: Record<StrategyKind, string> = { stake_marinade: "Stake", swap_jupiter: "Swap", lp_sol_usdc: "LP" };
                    const icons: Record<StrategyKind, string> = { stake_marinade: "◈", swap_jupiter: "⇄", lp_sol_usdc: "◉" };
                    const active = kind === k;
                    return (
                      <button key={k} onClick={() => { setKind(k); setQuote(null); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${active ? "bg-foreground/10 text-foreground shadow-sm ring-1 ring-foreground/10" : "bg-card/40 text-foreground/50 hover:bg-card/60 hover:text-foreground/70"}`}>
                        <span className="text-xs">{icons[k]}</span>{labels[k]}
                      </button>
                    );
                  })}
                  <div className="ml-auto flex items-center gap-1.5">
                    <Input
                      type="number" min={0} step={0.1} value={amountSol}
                      onChange={(e) => setAmountSol(Number(e.target.value))}
                      className="h-8 w-20 text-xs text-center bg-background/30 border-border/30 rounded-lg"
                    />
                    <span className="text-[10px] opacity-40">SOL</span>
                    <Button size="sm" variant="ghost" onClick={() => simulate()} disabled={loading} className="h-8 px-2 text-[11px]">
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Simulate"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={shareLink} className="h-8 px-2 text-[11px] opacity-50 hover:opacity-80">Share</Button>
                  </div>
                </div>

                {/* ── Loading State ─────────────────────────────────── */}
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

                {/* ── Strategy Comparison (shown before simulation) ── */}
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

                {/* ── Swap Results ──────────────────────────────────── */}
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

                {/* ── Stake Results ─────────────────────────────────── */}
                {quote && kind === "stake_marinade" && (() => {
                  const score = quote.score ?? 0;
                  const apy = quote.apy ?? 7;
                  const activeLst = LST_OPTIONS.find(l => l.id === selectedLst) || LST_OPTIONS[0];
                  return (
                  <div className="rounded-xl border border-border/30 bg-card/60 backdrop-blur-md overflow-hidden">
                    <div className="p-4 space-y-3">
                      {/* LST Protocol Selector — re-simulates on switch */}
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

                {/* ── LP Results ────────────────────────────────────── */}
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

                      <LabRiskBar level={(quote as any).riskLevel || "medium"} label={(quote as any).riskLabel || "IL + Protocol Risk"} />
                    </div>
                    <div className="border-t border-border/20 p-3">
                      <Button size="sm" onClick={executeLp} disabled={!publicKey || execLoading} className="w-full h-9 rounded-lg">
                        {execLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : !publicKey ? "Connect Wallet" : `Deposit LP → ${quote.bestPool?.dex ?? "Orca"}`}
                      </Button>
                    </div>
                  </div>);
                })()}

              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <form onSubmit={handleBottomSubmit} className="fixed inset-x-0 bottom-4 z-50">
        <div className="mx-auto max-w-xl px-4">
          <div className="flex items-center gap-2 rounded-full bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/90 shadow-lg px-2 py-1 border border-border/30">
            <Input
              value={cmdText}
              onChange={(e) => setCmdText(e.target.value)}
              placeholder="Atlas prompt on Solana… e.g., swap 10 SOL to USDC"
              className="h-8 flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              aria-label="Atlas command" />

            <Button type="submit" size="icon" className="h-8 w-8 rounded-full" disabled={cmdLoading}>
              {cmdLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </form>
  <CreateDCABotModalWrapper isOpen={isCreateDcaOpen} onClose={() => setCreateDcaOpen(false)} />
    </div>);

}

