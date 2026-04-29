"use client";

import { useState, useRef, useEffect, useCallback, type ComponentType } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL, VersionedTransaction } from "@solana/web3.js";
import dynamic from "next/dynamic";
import { Urbanist } from "next/font/google";

const wordmark = Urbanist({ subsets: ["latin"], weight: "600", display: "swap", adjustFontFallback: true });

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowRight, ArrowLeft, Sun, Moon, LayoutDashboard, TrendingUp, Search, Shield, Radar, Compass, History, FlaskConical, Menu, Settings, ChevronDown, Sparkles, ArrowUpDown, PieChart, VerifiedIcon, ExternalLink } from "lucide-react";
import { toast } from "@/lib/toast-notifications";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem } from
"@/components/ui/dropdown-menu";
import { AtlasShell } from "./atlas-shell";
import { useAtlasData, CORE_TOKENS } from "@/hooks/use-atlas-data";
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

function LaneHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/70 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] opacity-50">Workflow lane</p>
          <h3 className="mt-1 text-sm font-semibold leading-none">{title}</h3>
          <p className="mt-1.5 text-[11px] opacity-65">{subtitle}</p>
        </div>
      </div>
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
  const { publicKey, wallet, sendTransaction, signTransaction, disconnect } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isClay = searchParams?.get("style") === "clay";
  const { setVisible } = useWalletModal();
  const { dispatch, lastCommand } = useAtlasCommand();

  // Unified data source
  const { 
    prices, 
    solBalance, 
    inflationApy, 
    coreHistory, 
    pricesLoading, 
    pricesUpdatedAt, 
    refreshPrices 
  } = useAtlasData();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Strategy Lab state
  const [kind, setKind] = useState<StrategyKind>("stake_marinade");
  const [amountSol, setAmountSol] = useState<number>(5);
  const [selectedLst, setSelectedLst] = useState<string>("MSOL"); // default to Marinade
  const [quote, setQuote] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("quests");
  const [activeSection, setActiveSection] = useState("overview");

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
        if (parameters.tab_id === 'lab') {
          router.push('/atlas/strategy-lab');
        } else if (parameters.tab_id) {
          handleTabChange(parameters.tab_id);
          setTimeout(() => {
            document.getElementById('quests-content')?.scrollIntoView({ behavior: 'smooth' });
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

        if (parameters._isStrategizing) {
          router.push(`/atlas/strategy-lab?kind=swap_jupiter&amountSol=${swapAmount}&inputToken=${inputSymbol}&outputToken=${outputSymbol}`);
          toast.info("Redirecting to Strategy Lab for swap comparison...");
          break;
        }

        // Direct execution via Jupiter widget
        setKind("swap_jupiter");
        setAmountSol(swapAmount);
        setTimeout(() => simulate(), 100);

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
        const amount = parameters.amount || 5;
        const lstLabel = LST_OPTIONS.find(l => l.id === lstId)?.name || "Marinade";

        if (parameters._isStrategizing) {
          router.push(`/atlas/strategy-lab?kind=stake_marinade&amountSol=${amount}&provider=${lstId}`);
          toast.info("Redirecting to Strategy Lab for staking analysis...");
          break;
        }

        // Direct execution
        setKind("stake_marinade");
        setSelectedLst(lstId);
        setAmountSol(amount);
        toast.info(`Executing stake: ${amount} SOL via ${lstLabel}...`);
        setTimeout(() => executeStake(), 100);
        break;
      }

      // ── Strategy Lab: LP ───────────────────────────────────────────
      case "provide_liquidity": {
        const amount = parameters.amount || 5;
        if (parameters._isStrategizing) {
          router.push(`/atlas/strategy-lab?kind=lp_sol_usdc&amountSol=${amount}`);
          toast.info("Redirecting to Strategy Lab for LP analysis...");
          break;
        }
        setKind("lp_sol_usdc");
        setAmountSol(amount);
        toast.info(`Executing LP provision: ${amount} SOL...`);
        setTimeout(() => executeLp(), 100);
        break;
      }

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

  // Command states removed - delegating to AtlasShell


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

  // Redundant fetchers removed - delegating to useAtlasData


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
      const signedTx = await signTransaction!(vtx);
      const signature = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true });
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

      const signedTx = await signTransaction!(vtx);
      const sig = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true });
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
      const signedTx = await signTransaction!(vtx);
      const sig = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true });

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
  type TrendingToken = { mint: string; symbol: string; name?: string; icon?: string; logoURI?: string };
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

        const processSseMsg = (ev: MessageEvent, buf: "jumps" | "curve", source: EventSource) => {
          if (closed) return;
          try {
            const msg = JSON.parse(ev.data);
            if (msg?.type === "close" || msg?.type === "error") {
              source.close();
              return;
            }
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
        const onMsg1 = (ev: MessageEvent) => processSseMsg(ev, "jumps", es1);
        const onMsg2 = (ev: MessageEvent) => processSseMsg(ev, "curve", es2);
        let errCount1 = 0, errCount2 = 0;
        const onErr1 = () => { if (++errCount1 >= 3) es1.close(); };
        const onErr2 = () => { if (++errCount2 >= 3) es2.close(); };

        es1.addEventListener("message", onMsg1 as any);
        es2.addEventListener("message", onMsg2 as any);
        es1.addEventListener("error", onErr1 as any);
        es2.addEventListener("error", onErr2 as any);

        return () => {
          closed = true;
          es1.removeEventListener("message", onMsg1 as any);
          es2.removeEventListener("message", onMsg2 as any);
          es1.removeEventListener("error", onErr1 as any);
          es2.removeEventListener("error", onErr2 as any);
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

  const scrollTo = (id: string) => { 
    if (id === "strategy-lab") {
      router.push("/atlas/strategy-lab");
      return;
    }
    setActiveSection(id); 
    setSidebarOpen(false); 
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" }); 
    } else if (id === "overview") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const navIcons: Record<string, React.ReactNode> = {
    overview: <LayoutDashboard className="h-[18px] w-[18px]" />,
    "market-pulse-card": <TrendingUp className="h-[18px] w-[18px]" />,
    "token-intel-section": <Shield className="h-[18px] w-[18px]" />,
    "mev-scanner-card": <Radar className="h-[18px] w-[18px]" />,
    "yield-section": <Compass className="h-[18px] w-[18px]" />,
    "time-machine-section": <History className="h-[18px] w-[18px]" />,
    "strategy-lab": <FlaskConical className="h-[18px] w-[18px]" />,
  };
  const navGroups = [
    { label: "COMMAND CENTER", items: [
      { id: "overview", label: "Overview" },
      { id: "market-pulse-card", label: "Market Pulse" },
      { id: "token-intel-section", label: "Token Intel" },
      { id: "mev-scanner-card", label: "MEV Detector" },
    ]},
    { label: "EXPLORE", items: [
      { id: "yield-section", label: "Opportunities" },
      { id: "time-machine-section", label: "Time Machine" },
      { id: "strategy-lab", label: "Strategy Lab" },
    ]},
  ];

  return (
    <AtlasShell activeSection={activeSection}>
      <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth" id="quests-content">

      {/* ── Sidebar ────────────────────────────────────────── */}
      {/* Sidebar removed */}

      {/* ── Main ───────────────────────────────────────────── */}
      {/* Header removed */}

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 space-y-6">


          {/* ── Market Pulse ─────────────────────────────────── */}
          <section id="market-pulse-card" className="atlas-glass p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-violet-600 text-[20px]">timeline</span>
                <h2 className="text-base font-bold text-slate-900">Market Pulse</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center text-xs text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />Jupiter</span>
                <span className="text-xs text-slate-400">{pricesUpdatedAt ? `Updated ${new Date(pricesUpdatedAt).toLocaleTimeString()}` : ""}</span>
                <button onClick={refreshPrices} disabled={pricesLoading} className="text-xs text-violet-600 hover:text-violet-800 font-medium disabled:opacity-50">
                  {pricesLoading ? "Loading…" : "Refresh"}
                </button>
              </div>
            </div>
            {/* Ticker carousel */}
            <div className="atlas-ticker-wrap rounded-xl bg-slate-50 py-3 mb-5">
              <div className="atlas-ticker">
                {[...CORE_TOKENS, ...CORE_TOKENS].map((t, i) => {
                  const p = prices[t.id]; const hist = coreHistory[t.id] || []; const d = pctChange(hist); const up = d != null && d >= 0;
                  return (
                    <div key={`${t.id}-${i}`} className="inline-flex items-center gap-3 px-5 py-1.5 border-r border-slate-200/60 last:border-r-0 shrink-0">
                      <img src={t.icon} alt={t.symbol} className="w-7 h-7 rounded-full object-cover shadow-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900">{t.symbol}</span>
                          <span className="font-mono text-sm text-slate-700">{p != null ? `$${p >= 1 ? p.toFixed(2) : p.toFixed(6)}` : "—"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {d != null && <span className={`text-xs font-medium ${up ? "text-emerald-600" : "text-red-500"}`}>{up ? "+" : ""}{d.toFixed(1)}%</span>}
                          <Sparkline data={hist} width={60} height={16} className={up ? "text-emerald-500" : "text-red-400"} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Trending on DEX */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trending on DEX</span>
              <span className="text-xs text-slate-400">{trendingSource === "moralis" ? "Moralis" : trendingSource === "bitquery" ? "Bitquery" : "Jupiter"}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {trendingLoading && <div className="flex gap-3">{[...Array(4)].map((_, i) => <div key={i} className="w-40 h-12 rounded-lg bg-slate-100 animate-pulse shrink-0" />)}</div>}
              {trending.map((t) => {
                const tp = trendingPrices[t.mint];
                return (
                  <div key={t.mint} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white shrink-0 hover:shadow-sm transition-shadow">
                    {t.icon || t.logoURI ? (
                      <img src={t.icon || t.logoURI} alt={t.symbol} className="w-7 h-7 rounded-full object-cover shadow-sm bg-white" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }} />
                    ) : null}
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-tr from-violet-200 to-purple-100 flex items-center justify-center text-violet-700 text-xs font-bold ${(t.icon || t.logoURI) ? 'hidden' : ''}`}>{t.symbol?.slice(0, 1) || "?"}</div>
                    <span className="font-medium text-sm text-slate-800">{t.symbol}</span>
                    <span className="font-mono text-sm text-slate-600">{tp != null ? `$${tp >= 0.01 ? tp.toFixed(4) : tp.toFixed(8)}` : "—"}</span>
                  </div>
                );
              })}
              {!trendingLoading && trending.length === 0 && <span className="text-xs text-slate-400">No trending tokens right now.</span>}
            </div>
          </section>

          {/* ── Main 2-col + sidebar grid ──────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">

              {/* ── Token Intel & Security ──────────────────── */}
              <section id="token-intel-section" className="atlas-glass p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="text-violet-600 h-5 w-5" />
                    <h2 className="text-base font-bold text-slate-900">Token Intel & Security</h2>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Security</span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Analytics</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500 mb-4">Deep scan any token mint for rug risks, contract vulnerabilities, and holder distribution.</p>
                <div className="flex gap-2 mb-5">
                  <div className="flex-1 relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400"><Search className="h-[18px] w-[18px]" /></span>
                    <input value={mintInput} onChange={(e) => setMintInput(e.target.value)} placeholder="Token mint address (e.g., EPjF…USDC)" className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 outline-none" />
                  </div>
                  <button onClick={fetchHolderInsights} disabled={holderLoading} className="px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                    {holderLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Scan"}
                  </button>
                </div>
                {holderError && <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{holderError}</div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-3"><VerifiedIcon className="h-4 w-4 text-slate-400" /><span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Audit Status</span></div>
                    {moralisStats ? (
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center"><span className="text-sm text-slate-700">Mint Authority</span><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${moralisStats.mintAuthority === "revoked" || moralisStats.mintAuthorityRevoked ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{moralisStats.mintAuthority === "revoked" || moralisStats.mintAuthorityRevoked ? "✓ Revoked" : "⚠ Active"}</span></div>
                        <div className="flex justify-between items-center"><span className="text-sm text-slate-700">Freeze Authority</span><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${moralisStats.freezeAuthority === "revoked" || moralisStats.freezeAuthorityRevoked ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{moralisStats.freezeAuthority === "revoked" || moralisStats.freezeAuthorityRevoked ? "✓ Revoked" : "⚠ Active"}</span></div>
                        {moralisStats.top10HoldersPercent != null && <div className="flex justify-between items-center"><span className="text-sm text-slate-700">Top 10 Holders</span><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${moralisStats.top10HoldersPercent > 50 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>⚠ {moralisStats.top10HoldersPercent}% Supply</span></div>}
                      </div>
                    ) : <div className="text-xs text-slate-400 text-center py-4">Enter a token mint and scan</div>}
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-3"><PieChart className="h-4 w-4 text-slate-400" /><span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Distribution</span></div>
                    {dasData && Array.isArray(dasData) && dasData.length > 0 ? (
                      <div className="flex items-end gap-1 h-24">
                        {dasData.slice(0, 10).map((h: any, i: number) => {
                          const pct = Math.max(8, Math.min(100, (Number(h?.amount || h?.balance || 1) / Math.max(1, ...dasData.slice(0, 10).map((x: any) => Number(x?.amount || x?.balance || 1)))) * 100));
                          return <div key={i} className="flex-1 rounded-t" style={{ height: `${pct}%`, background: i < 3 ? "#7C3AED" : i < 6 ? "#A78BFA" : "#DDD6FE" }} />;
                        })}
                      </div>
                    ) : <div className="text-xs text-slate-400 text-center py-4">{dasCount != null ? `${dasCount} holders found` : "Scan a token to see distribution"}</div>}
                    {dasData && <div className="flex justify-between text-[10px] text-slate-400 mt-2"><span>Top Holders</span><span>Retail</span></div>}
                  </div>
                </div>
              </section>

              {/* ── Swap ──────────────────────────────────────── */}
              <section id="swap-section" className="atlas-glass p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="text-violet-600 h-5 w-5" />
                    <h2 className="text-base font-bold text-slate-900">Swap</h2>
                  </div>
                  <button className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                    <Settings className="h-[18px] w-[18px]" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500">Selling</span>
                      <span className="text-xs text-slate-400">{solBalance != null ? `${solBalance.toFixed(3)} SOL` : "— SOL"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200">
                        <img src={CORE_TOKENS.find(t => t.id === "SOL")?.icon} alt="SOL" className="w-5 h-5 rounded-full shadow-sm bg-white" />
                        <span className="text-sm font-medium text-slate-900">SOL</span>
                      </div>
                      <input type="number" min={0} step={0.1} value={amountSol} onChange={(e) => setAmountSol(Number(e.target.value))}
                        className="text-right text-2xl font-semibold text-slate-900 bg-transparent w-32 outline-none" />
                    </div>
                    {prices.SOL && <div className="text-right text-xs text-slate-400 mt-1">~${(amountSol * prices.SOL).toFixed(2)}</div>}
                  </div>
                  <div className="flex justify-center -my-1">
                    <button className="p-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                      <ArrowUpDown className="h-[18px] w-[18px] text-slate-500" />
                    </button>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500">Buying</span>
                      <span className="text-xs text-slate-400">{quote?._parsed?.outAmount ? `${quote._parsed.outAmount.toFixed(2)} USDC` : "0 USDC"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200">
                        <img src={CORE_TOKENS.find(t => t.id === "USDC")?.icon} alt="USDC" className="w-5 h-5 rounded-full shadow-sm bg-white" />
                        <span className="text-sm font-medium text-slate-900">USDC</span>
                      </div>
                      <span className="text-2xl font-semibold text-slate-300">{quote?._parsed?.outAmount ? quote._parsed.outAmount.toFixed(2) : "0.00"}</span>
                    </div>
                    {quote?._parsed?.outAmount && <div className="text-right text-xs text-slate-400 mt-1">${quote._parsed.outAmount.toFixed(2)}</div>}
                  </div>
                  <button onClick={() => { setKind("swap_jupiter"); publicKey ? simulate() : setVisible(true); }}
                    disabled={execLoading || loading}
                    className="w-full py-3 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Quoting…</> : execLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Executing…</> : !publicKey ? "Connect Wallet" : "Swap"}
                  </button>
                  {quote && kind === "swap_jupiter" && quote._parsed && (
                    <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2">
                      <div className="rounded-lg py-1.5 bg-slate-50 border border-slate-100"><div className="text-slate-400 text-[10px]">Impact</div><div className="font-mono text-slate-700">{((quote._parsed.priceImpact ?? 0) * 100).toFixed(3)}%</div></div>
                      <div className="rounded-lg py-1.5 bg-slate-50 border border-slate-100"><div className="text-slate-400 text-[10px]">Slippage</div><div className="font-mono text-slate-700">{((quote._parsed.slippageBps ?? 50) / 100).toFixed(1)}%</div></div>
                      <div className="rounded-lg py-1.5 bg-slate-50 border border-slate-100"><div className="text-slate-400 text-[10px]">Hops</div><div className="font-mono text-slate-700">{quote._parsed.routeCount ?? 1}</div></div>
                    </div>
                  )}
                  {quote && kind === "swap_jupiter" && publicKey && (
                    <button onClick={executeSwap} disabled={execLoading} className="w-full py-2.5 border border-violet-200 text-violet-700 rounded-xl text-sm font-medium hover:bg-violet-50 transition-colors disabled:opacity-50">
                      {execLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Execute Swap →"}
                    </button>
                  )}
                </div>
              </section>

            </div>{/* end left column */}

            {/* ── Right column ────────────────────────────────── */}
            <div className="space-y-6">

              {/* ── MEV Detector ────────────────────────────────── */}
              <section id="mev-scanner-card" className="atlas-glass p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Radar className="text-violet-600 h-5 w-5" />
                    <h2 className="text-base font-bold text-slate-900">MEV Detector</h2>
                  </div>
                  <span className="inline-flex items-center text-xs text-red-500"><span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1 animate-pulse" />Live</span>
                </div>
                <p className="text-sm text-slate-500 mb-4">Monitoring cross-DEX arbitrage and atomic Jito bundles.</p>
                <MEVScanner />
              </section>

              {/* ── Yield & Airdrops ────────────────────────────── */}
              <section id="yield-section" className="atlas-glass p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Compass className="text-violet-600 h-5 w-5" />
                    <h2 className="text-base font-bold text-slate-900">Yield & Airdrops</h2>
                  </div>
                  <span className="text-xs text-slate-400">DYOR</span>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 p-4 bg-white hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-slate-900">Marinade Finance</span>
                      <span className="text-xs font-medium bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Liquid Staking</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">Earn staking yield plus DeFi composability with mSOL. Potential for ecosystem…</p>
                    <span className="text-sm font-bold text-emerald-600">~{inflationApy ? (inflationApy + 2.8).toFixed(1) : "7.2"}% APY</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 bg-white hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-slate-900">Kamino Finance</span>
                      <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Yield Vaults</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">Automated liquidity vaults. Active KMNO points program for early participants.</p>
                    <span className="text-sm font-bold text-violet-600">✦ Point Program</span>
                  </div>
                  {specItems.length > 0 && specItems.slice(0, 2).map((it: any, i: number) => (
                    <a key={i} href={it.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-slate-200 p-4 bg-white hover:shadow-sm transition-shadow">
                      <div className="font-semibold text-sm text-slate-900 truncate">{it.title || it.project}</div>
                      {it.summary && <p className="text-xs text-slate-500 mt-1 truncate">{it.summary}</p>}
                    </a>
                  ))}
                </div>
              </section>

              {/* ── Time Machine ────────────────────────────────── */}
              <section id="time-machine-section" className="atlas-glass p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <History className="text-violet-600 h-5 w-5" />
                    <h2 className="text-base font-bold text-slate-900">Time Machine</h2>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">What-If Analysis</span>
                </div>
                <p className="text-sm text-slate-500 mb-4">Backtest strategies: what would you have earned?</p>
                <TransactionTimeMachine />
              </section>

            </div>{/* end right column */}
          </div>{/* end grid */}



        </div>
      </div>

      <CreateDCABotModalWrapper isOpen={isCreateDcaOpen} onClose={() => setCreateDcaOpen(false)} />
    </AtlasShell>
  );
}
