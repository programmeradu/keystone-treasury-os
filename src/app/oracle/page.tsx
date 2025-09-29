"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Zap,
  Layers,
  TrendingUp,
  Shield,
  Clock,
  DollarSign,
  Loader2,
  Settings,
  Info,
  Fuel,
  Search,
  ArrowLeftRight,
  Calendar,
  Copy,
  Download,
  Sun,
  Moon
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// RainbowKit Connect Button
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { resolveChainFromText, resolveChain, toDefiLlamaChainFromText, toEvmChainId } from "@/lib/chains";

export default function ChainFlowOracle() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Intent preview + planner state
  const [intentPreview, setIntentPreview] = useState<any>(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [planResult, setPlanResult] = useState<any>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [prevPlanResult, setPrevPlanResult] = useState<any>(null);
  const [examples, setExamples] = useState<string[]>([]);
  const [simulationMode, setSimulationMode] = useState(true); // vs live
  const [includeYields, setIncludeYields] = useState(true);
  const [aiProvider, setAiProvider] = useState<"nlpcloud" | "github" | "groq">("groq");
  // NEW: NLP Cloud settings
  const [nlpUseGpu, setNlpUseGpu] = useState(false);
  const [nlpModel, setNlpModel] = useState("");
  // NEW: GitHub Models settings
  const [githubModel, setGithubModel] = useState("");
  // NEW: Groq settings
  const [groqModel, setGroqModel] = useState("");
  // Agent tool state
  const [selectedTool, setSelectedTool] = useState<"gas" | "yield" | "bridge" | "swap" | "defi_protocol_tvl" | "defi_chain_tvl" | null>(null);
  const [toolLoading, setToolLoading] = useState(false);
  const [toolError, setToolError] = useState<string | null>(null);
  const [toolResult, setToolResult] = useState<any>(null);
  // NEW: persistence & sharing state
  const [saveLoading, setSaveLoading] = useState(false);
  const [savedShortId, setSavedShortId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);
  // NEW: run label (for save) and pagination limit
  const [runLabel, setRunLabel] = useState("");
  const [recentLimit, setRecentLimit] = useState(5);
  // Sensitivity controls (percentages interpreted as multipliers)
  const [sensAmountPct, setSensAmountPct] = useState(100); // 50–150%
  const [sensApyDelta, setSensApyDelta] = useState(0);    // -3% – +3%
  const [sensGasPct, setSensGasPct] = useState(100);      // 50–200%
  // Planning mode: auto (quick sim) vs plan (force planner first)
  const [plannerMode, setPlannerMode] = useState<"auto" | "plan">("plan");
  // Shared link banner
  const [sharedMeta, setSharedMeta] = useState<{ runId?: string } | null>(null);
  // Prevent SSR/client mismatch for any render-time randomness (e.g., Monte Carlo)
  const [mounted, setMounted] = useState(false);
  // Theme toggle
  const [isDark, setIsDark] = useState(true);
  const [signOpen, setSignOpen] = useState(false);
  const [validationReport, setValidationReport] = useState<{
    ok: boolean;
    errors: string[];
    warnings: string[];
    txs: Array<{
      id: string;
      type: string;
      chainId: number;
      to: string;
      data: string;
      value: string;
      gasEst: number;
      note?: string;
    }>;
  } | null>(null);
  const [signValidating, setSignValidating] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [signedTxs, setSignedTxs] = useState<string[]>([]);
  // NEW: sign-all sequential state
  const [signAllRunning, setSignAllRunning] = useState(false);
  const [signAllProgress, setSignAllProgress] = useState<{ total: number; current: number }>({ total: 0, current: 0 });
  const [signAllCancelled, setSignAllCancelled] = useState(false);
  // Enrichment + diffs + readiness state
  const [enrichedTxMap, setEnrichedTxMap] = useState<Record<string, Partial<{ to: string; data: string; value: string; gasEst: number }>>>({});
  const [autoEnriching, setAutoEnriching] = useState(false);
  const [plannerDiffs, setPlannerDiffs] = useState<{ added: number[]; removed: number[]; modified: number[] }>({ added: [], removed: [], modified: [] });
  const [walletReady, setWalletReady] = useState<{ connected: boolean; correctChain: boolean; gasSane: boolean }>({ connected: false, correctChain: false, gasSane: false });
  // Fallback: remember if we've auto-run a tool for this planner run
  const [autoToolRunId, setAutoToolRunId] = useState<string | null>(null);
  // Fallback txs when planner yields no executable steps
  const [fallbackTxs, setFallbackTxs] = useState<Array<{ id: string; type: string; chainId: number; to: string; data: string; value: string; gasEst: number }>>([]);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  // Unified 4K background image (light mode only)
  const bgUnified =
    "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/839a9d0f-c8ea-4ee9-aa5d-ded18c4cf0d9/generated_images/ultra-realistic-4k-wide-cinematic-backgr-8762bc9d-20250926022941.jpg?";
  // RainbowKit availability (only show connect if configured)
  const hasWalletConnect = Boolean(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID);

  // Assumptions / constraints to steer the planner
  const [riskAppetite, setRiskAppetite] = useState<"conservative" | "balanced" | "aggressive">("balanced");
  const [preferredChain, setPreferredChain] = useState<"base" | "ethereum" | "arbitrum" | "optimism" | "polygon">("base");
  const [bridgePreference, setBridgePreference] = useState<"fastest" | "cheapest" | "mostSecure">("cheapest");
  const [maxSlippagePct, setMaxSlippagePct] = useState<number>(0.5); // %
  const [minLiquidityUsd, setMinLiquidityUsd] = useState<number>(100000); // USD
  // NEW: Assistant text response + suggested tool
  const [assistantText, setAssistantText] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [suggestedTool, setSuggestedTool] = useState<"gas" | "yield" | "bridge" | "swap" | "defi_protocol_tvl" | "defi_chain_tvl" | null>(null);
  // NEW: streaming cancel controller for assistant
  const [assistantAbort, setAssistantAbort] = useState<AbortController | null>(null);
  // NEW: session chat state
  const [chat, setChat] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  // NEW: tool raw toggle
  const [showRawTool, setShowRawTool] = useState(false);
  // NEW: tailored loading copy
  const [toolLoadingMsg, setToolLoadingMsg] = useState<string>("");
  const [globalLoadingMsg, setGlobalLoadingMsg] = useState<string>("");
  // Auto-scroll anchor for assistant/chat
  const bottomRef = useRef<HTMLDivElement | null>(null);
  // NEW: Yield mini‑calculator state
  const [yieldCalcAmount, setYieldCalcAmount] = useState<number>(1000);
  const [yieldCalcMonths, setYieldCalcMonths] = useState<number>(12);
  const [yieldCalcApy, setYieldCalcApy] = useState<number | null>(null);
  // NEW: gas email alert subscribe state
  const [alertEmail, setAlertEmail] = useState<string>("");
  const [alertThreshold, setAlertThreshold] = useState<number>(12);
  const [alertMinGas, setAlertMinGas] = useState<number>(100000);
  const [alertSubmitting, setAlertSubmitting] = useState<boolean>(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [alertErr, setAlertErr] = useState<string | null>(null);

  // Helper: strip markdown asterisk emphasis (bold/italics) without touching code blocks
  function stripAsteriskEmphasis(text: string): string {
    try {
      const parts = text.split(/(```[\s\S]*?```)/g);
      const clean = (t: string) => {
        let out = t.replace(/\*\*(.+?)\*\*/g, "$1");
        out = out.replace(/\*(\S[^*]*?)\*/g, "$1");
        // collapse markdown hard line breaks (two spaces before newline)
        out = out.replace(/[ \t]+\n/g, "\n");
        return out;
      };
      return parts.map(p => (p.startsWith("```") ? p : clean(p))).join("");
    } catch {
      return text;
    }
  }

  // Helper: remove markdown tables and overly long line lists, favoring a short sentence
  function stripTablesAndLongLists(text: string): string {
    try {
      // Remove markdown tables
      let out = text.replace(/(^|\n)\|[^\n]*\|(?=\n)/g, "");
      // Remove consecutive table-like rows
      out = out.replace(/(\n\|[^\n]*\|)+/g, "");
      // If too many lines, keep first 6 lines max
      const lines = out.split(/\n+/);
      if (lines.length > 6) {
        out = lines.slice(0, 6).join("\n");
      }
      // Trim excessive spaces
      return out.trim();
    } catch {
      return text;
    }
  }

  // NEW: Craft a friendly gas explanation with $ estimates
  async function composeGasAssistant(data: any, chain: string): Promise<string> {
    try {
      const summary: string = String(data?.summary || "");
      // Try to extract base and fast gwei from summary text
      const baseMatch = summary.match(/Base fee\s*~\s*([0-9]*\.?[0-9]+)/i);
      const fastMatch = summary.match(/Fast\s*([0-9]*\.?[0-9]+)/i);
      const stdMatch = summary.match(/Std\s*([0-9]*\.?[0-9]+)/i);
      const safeMatch = summary.match(/Safe\s*([0-9]*\.?[0-9]+)/i);

      const baseGwei = baseMatch ? parseFloat(baseMatch[1]) : (typeof data?.baseFeeGwei === "number" ? data.baseFeeGwei : NaN);
      const fastGwei = fastMatch ? parseFloat(fastMatch[1]) : (typeof data?.fastGwei === "number" ? data.fastGwei : NaN);
      const stdGwei = stdMatch ? parseFloat(stdMatch[1]) : (typeof data?.stdGwei === "number" ? data.stdGwei : NaN);
      const safeGwei = safeMatch ? parseFloat(safeMatch[1]) : (typeof data?.safeGwei === "number" ? data.safeGwei : NaN);

      const gwei = Number.isFinite(fastGwei) ? fastGwei : (Number.isFinite(stdGwei) ? stdGwei : (Number.isFinite(safeGwei) ? safeGwei : baseGwei));
      const chainName = chain?.charAt(0).toUpperCase() + chain?.slice(1);

      // Fetch ETH price in USD (Base/Arbitrum/etc. native token is ETH)
      const priceRes = await fetchJsonWithRetry<any>(`/api/price?ids=${encodeURIComponent("ethereum")}&vs_currencies=usd`, { cache: "no-store" });
      const ethUsd = Number(priceRes?.ethereum?.usd) || 0;

      const gweiToUsd = (gweiPerGas: number, gasUnits: number) => (gweiPerGas * 1e-9) * gasUnits * ethUsd;
      const usd21k = ethUsd > 0 && Number.isFinite(gwei) ? gweiToUsd(gwei, 21000) : 0;
      const usd100k = ethUsd > 0 && Number.isFinite(gwei) ? gweiToUsd(gwei, 100000) : 0;

      const fmtUsd = (n: number) => n >= 0.01 ? `$${n.toFixed(2)}` : (n >= 0.001 ? `$${n.toFixed(3)}` : (n > 0 ? `$${n.toFixed(4)}` : "$0.00"));
      const parts: string[] = [];
      if (Number.isFinite(baseGwei)) parts.push(`base fee ~${baseGwei.toFixed(2)} gwei`);
      if (Number.isFinite(safeGwei) && Number.isFinite(stdGwei) && Number.isFinite(fastGwei)) {
        parts.push(`safe ${safeGwei.toFixed(2)} · std ${stdGwei.toFixed(2)} · fast ${fastGwei.toFixed(2)} gwei`);
      }

      const headline = parts.length ? parts.join(" · ") : (summary || "Gas estimates ready.");
      const costLine = (usd21k > 0 && usd100k > 0)
        ? `At the fast setting, a simple transfer (~21k gas) is about ${fmtUsd(usd21k)}, and a heavier tx (~100k gas) is about ${fmtUsd(usd100k)}.`
        : `Use Fast for speed or Safe for savings; costs vary with gas used.`;

      return `${chainName} gas right now: ${headline}. ${costLine}`;
    } catch {
      return typeof data?.summary === "string" ? data.summary : "Gas estimates ready.";
    }
  }

  // Generate a short tailored loading line for the current tool
  async function updateToolLoadingMsg(toolId: string, p: string) {
    try {
      // sensible default immediately
      const defaults: Record<string, string> = {
        gas: "Checking current gas and safe fee ranges…",
        yield: "Scanning live yields and safety signals…",
        bridge: "Fetching cross‑chain bridge routes and fees…",
        swap: "Quoting best DEX routes and price impact…",
        defi_protocol_tvl: "Fetching protocol TVL history…",
        defi_chain_tvl: "Fetching chain TVL history…",
      };
      setToolLoadingMsg(defaults[toolId] || "Working on your request…");

      // refine with AI when available
      const ai = await fetchJsonWithRetry<{ text?: string }>("/api/ai/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiProvider,
          temperature: 0.2,
          prompt: `Write a single short present-progress status line for a Web3 ${toolId} request. Base it on: \n"${p}".\nMax 80 chars, no emojis, no markdown, action-oriented (e.g., \'Quoting routes…\').`,
          ...(aiProvider === "github" && githubModel.trim() ? { model: githubModel.trim() } : {}),
          ...(aiProvider === "groq" && groqModel.trim() ? { model: groqModel.trim() } : {}),
        }),
        cache: "no-store",
      });
      if (ai?.text) setToolLoadingMsg(stripAsteriskEmphasis(ai.text).trim());
    } catch {
      // keep default
    }
  }

  // Generate a short tailored loading line for planning/orchestration
  async function updateGlobalLoadingMsg(p: string, intent?: string) {
    try {
      // quick default
      setGlobalLoadingMsg(intent ? `Planning: ${intent}…` : "Planning steps and fetching live quotes…");
      const ai = await fetchJsonWithRetry<{ text?: string }>("/api/ai/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiProvider,
          temperature: 0.2,
          prompt: `Write a single short status line describing what's being planned now for this Web3 request: \n"${p}".\nMax 90 chars, present-progress (e.g., \'Orchestrating bridge→swap with slippage guard…\'). No emojis/markdown.`,
          ...(aiProvider === "github" && githubModel.trim() ? { model: githubModel.trim() } : {}),
          ...(aiProvider === "groq" && groqModel.trim() ? { model: groqModel.trim() } : {}),
        }),
        cache: "no-store",
      });
      if (ai?.text) setGlobalLoadingMsg(stripAsteriskEmphasis(ai.text).trim());
    } catch {
      // keep default
    }
  }

  // Hotkeys: Alt+1..4 to select tools, Esc to clear
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedTool(null);
        setToolResult(null);
        setToolError(null);
        return;
      }
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === "1") setSelectedTool("gas");
        if (e.key === "2") setSelectedTool("yield");
        if (e.key === "3") setSelectedTool("bridge");
        if (e.key === "4") setSelectedTool("swap");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Mark as mounted to avoid SSR/client render mismatches for random-derived UI
  useEffect(() => {
    setMounted(true);
  }, []);

  // Persist lightweight preferences to improve UX
  useEffect(() => {
    try {
      const raw = localStorage.getItem("oracle_prefs");
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p === "object") {
          if (p.aiProvider === "nlpcloud" || p.aiProvider === "github" || p.aiProvider === "groq") setAiProvider(p.aiProvider);
          if (typeof p.nlpUseGpu === "boolean") setNlpUseGpu(p.nlpUseGpu);
          if (typeof p.nlpModel === "string") setNlpModel(p.nlpModel);
          if (typeof p.githubModel === "string") setGithubModel(p.githubModel);
          if (typeof p.groqModel === "string") setGroqModel(p.groqModel);
          if (typeof p.isDark === "boolean") setIsDark(p.isDark);
          if (p.plannerMode === "auto" || p.plannerMode === "plan") setPlannerMode(p.plannerMode);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const prefs = {
        aiProvider,
        nlpUseGpu,
        nlpModel,
        githubModel,
        groqModel,
        isDark,
        plannerMode,
      };
      localStorage.setItem("oracle_prefs", JSON.stringify(prefs));
    } catch {}
  }, [aiProvider, nlpUseGpu, nlpModel, githubModel, groqModel, isDark, plannerMode]);

  // NEW: Chat behavior update — clear chat after refresh (do not restore from localStorage)
  useEffect(() => {
    try { localStorage.removeItem("oracle_chat"); } catch {}
    setChat([]);
  }, []);

  useEffect(() => {
    try { localStorage.setItem("oracle_chat", JSON.stringify(chat)); } catch {}
  }, [chat]);

  // Auto-scroll to latest assistant/chat/tool result
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [assistantText, chat, toolResult]);

  // Load any previously stored signed tx hashes (post-sign tracking stub)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("oracle_signed_hashes");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setSignedTxs(arr.filter((x) => typeof x === "string"));
      }
    } catch {}
  }, []);

  // Lightweight JSON fetch with retry/backoff
  async function fetchJsonWithRetry<T = any>(
    input: RequestInfo | URL,
    init?: RequestInit,
    retries: number = 2,
    backoffMs: number = 350,
    timeoutMs: number = 15000
  ): Promise<T> {
    let attempt = 0;
    let lastErr: any;
    // Derive a readable URL for better error messages
    const urlStr = typeof input === "string"
      ? input
      : (input instanceof URL)
        ? input.toString()
        : (typeof (input as any)?.url === "string" ? (input as any).url : "");
    while (attempt <= retries) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(input, { ...(init || {}), signal: controller.signal });
        const ct = res.headers.get("content-type") || "";
        const isJson = ct.includes("application/json");
        const payload = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => "");
        if (!res.ok) {
          const errMsg = (isJson && (payload as any)?.error) || (isJson && (payload as any)?.message) || (typeof payload === "string" && payload.slice(0, 400)) || `HTTP ${res.status}`;
          throw new Error(errMsg);
        }
        return (payload as any) as T;
      } catch (e: any) {
        // Normalize common network errors into a clearer message with endpoint context
        const isAbort = e?.name === "AbortError";
        const isNetwork = e?.name === "TypeError" || /fetch failed/i.test(String(e?.message || ""));
        if (isAbort) {
          lastErr = new Error(`Request timed out while calling ${urlStr || "API"}. Please try again.`);
        } else if (isNetwork) {
          lastErr = new Error(`Network error while calling ${urlStr || "API"}. Check your connection, ad-blockers, and that the route exists.`);
        } else {
          lastErr = e;
        }
        if (attempt === retries) break;
        await new Promise((r) => setTimeout(r, backoffMs * Math.pow(2, attempt)));
      } finally {
        clearTimeout(id);
      }
      attempt++;
    }
    throw lastErr;
  }

  // Generate dynamic examples on mount
  useEffect(() => {
    async function fetchDynamicExamples() {
      try {
        // Add randomness controls to reduce repetition
        const seed = Math.floor(Math.random() * 1e9);
        const data = await fetchJsonWithRetry<{ text?: string }>("/api/ai/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            // Remove biased exemplars; enforce novelty and diversity
            prompt: "Generate 3 novel, diverse personal onchain assistant commands for an individual user. Avoid business/treasury/multisig/DAO contexts entirely. Vary chains and assets randomly. Do not use or paraphrase these phrases: 'check wallet balances', 'estimate gas on Base', 'bridge small amounts', 'swap a token'. Keep each line concise and practical. Return a simple numbered list.",
            provider: aiProvider, // Optional, if API supports
            temperature: 0.9,
            seed,
            nonce: Date.now(),
            ...(aiProvider === "nlpcloud" ? { useGpu: nlpUseGpu, ...(nlpModel.trim() ? { model: nlpModel.trim() } : {}) } : {}),
            ...(aiProvider === "github" && githubModel.trim() ? { model: githubModel.trim() } : {}),
            ...(aiProvider === "groq" && groqModel.trim() ? { model: groqModel.trim() } : {}),
          }),
          cache: "no-store"
        });
        const defaults = [
          "Bridge 25 USDC from Base to Arbitrum using the cheapest route",
          "Swap 0.05 ETH to USDC on Base with max 0.3% slippage",
          "Find a low‑risk yield for 200 USDC on Base and estimate APY"
        ];
        if (data?.text) {
          const text = data.text;
          const raw = text.split(/(\d+\.)/).filter(p => p.trim() && !p.match(/^\d+\.$/)).map(p => p.trim().replace(/^\d+\.\s*/, ''));
          const banned = /(treasury|dao|multi-?sig|governance|payroll|corporate|board|investor|foundation)/i;
          const parsed = raw.filter((p) => !banned.test(p)).slice(0, 3);
          // Merge with learned suggestions (if available) and dedupe, keep 3
          try {
            const learned = await fetchJsonWithRetry<{ ok: boolean; suggestions: string[] }>(`/api/learn/suggestions?limit=6`, { cache: "no-store" });
            const learnedList = Array.isArray(learned?.suggestions) ? learned.suggestions : [];
            const validLearned = learnedList.filter((s) => typeof s === 'string' && s.trim().length >= 8);
            // Hard filter repeatedly suggested phrases from learned source
            const repeatBan = /(check\s+(my\s+)?wallet\s+balances?|estimate\s+gas\s+(on\s+)?base)/i;
            const safeLearned = validLearned.filter((s) => !repeatBan.test(s));
            // Order rule: 1 from learned, then 2 from AI (parsed). Backfill if needed.
            const chosen: string[] = [];
            if (safeLearned[0]) chosen.push(safeLearned[0]);
            for (const p of parsed) {
              if (chosen.length >= 3) break;
              if (!chosen.includes(p)) chosen.push(p);
            }
            if (chosen.length < 3) {
              for (const l of safeLearned.slice(1)) {
                if (chosen.length >= 3) break;
                if (!chosen.includes(l)) chosen.push(l);
              }
            }
            const finalList = (chosen.length ? chosen.slice(0,3) : parsed).filter(Boolean);
            setExamples(finalList.length ? finalList : defaults);
          } catch {
            const finalList = parsed.filter(Boolean);
            setExamples(finalList.length ? finalList : defaults);
          }
        } else {
          // No text returned – fallback to defaults
          setExamples(defaults);
        }
      } catch (err) {
        console.warn("Failed to generate dynamic examples:", err);
        // Network/API error – ensure we still show suggestions
        setExamples([
          "Bridge 25 USDC from Base to Arbitrum using the cheapest route",
          "Swap 0.05 ETH to USDC on Base with max 0.3% slippage",
          "Find a low‑risk yield for 200 USDC on Base and estimate APY"
        ]);
      }
    }
    fetchDynamicExamples();
  }, [aiProvider]);

  // Debounced intent parsing as user types
  useEffect(() => {
    if (!prompt.trim()) {
      setIntentPreview(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setParseLoading(true);
        const data = await fetchJsonWithRetry("/api/ai/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
          cache: "no-store",
        });
        setIntentPreview(data);
      } catch {
        setIntentPreview(null);
      } finally {
        setParseLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [prompt]);

  // NEW: Auto-load from saved shortId (?id=SHORTID)
  useEffect(() => {
    const loadById = async (sid: string) => {
      try {
        const data = await fetchJsonWithRetry<any>(`/api/runs/${sid}`, { headers: { "Content-Type": "application/json" } });
        if (!data?.ok) throw new Error(data?.error || `Failed to load run ${sid}`);
        const run = data.run;
        setPrompt(run.prompt || "");
        setPlanResult(run.planResult || null);
        setToolResult(run.toolResult || null);
        setSharedMeta({ runId: run.shortId });
        setSavedShortId(run.shortId);
        setPlannerMode("plan");
      } catch (e: any) {
        setRecentError(e?.message || String(e));
      }
    };
    try {
      const params = new URLSearchParams(window.location.search);
      const sid = params.get("id");
      if (sid && sid.length === 12) {
        loadById(sid);
      }
    } catch {}
  }, []);

  // NEW: Fetch recent runs
  useEffect(() => {
    const fetchRecent = async () => {
      setRecentLoading(true);
      try {
        const data = await fetchJsonWithRetry<any>(`/api/runs?limit=${recentLimit}`, { headers: { "Content-Type": "application/json" } });
        if (!data?.ok) throw new Error(data?.error || "Failed to fetch recent runs");
        setRecentRuns(Array.isArray(data.runs) ? data.runs : []);
      } catch (e: any) {
        setRecentError(e?.message || String(e));
      } finally {
        setRecentLoading(false);
      }
    };
    fetchRecent();
  }, [recentLimit]);

  // NEW: Save current run
  async function saveCurrentRun(label?: string) {
    if (!planResult?.ok) {
      setSaveError("Nothing to save – generate a plan first.");
      return;
    }
    try {
      setSaveLoading(true);
      setSaveError(null);
      const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
      const data = await fetchJsonWithRetry<any>("/api/runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt, planResult, toolResult, runLabel: label }),
      });
      if (!data?.ok) throw new Error(data?.error || "Save failed");
      setSavedShortId(data.shortId);
      // Update URL
      const url = new URL(window.location.href);
      url.searchParams.set("id", data.shortId);
      url.searchParams.delete("q");
      url.searchParams.delete("runId");
      window.history.replaceState({}, "", url.toString());
      // Refresh recent
      try {
        const j = await fetchJsonWithRetry<any>(`/api/runs?limit=${recentLimit}`);
        if (j?.ok) setRecentRuns(j.runs || []);
      } catch {}
    } catch (e: any) {
      setSaveError(e?.message || String(e));
    } finally {
      setSaveLoading(false);
    }
  }

  // NEW: Load a run by shortId (used by Recent Runs buttons)
  async function loadRunById(sid: string) {
    try {
      const data = await fetchJsonWithRetry<any>(`/api/runs/${sid}`, { headers: { "Content-Type": "application/json" } });
      if (!data?.ok) throw new Error(data?.error || `Failed to load run ${sid}`);
      const run = data.run;
      setPrompt(run.prompt || "");
      setPlanResult(run.planResult || null);
      setToolResult(run.toolResult || null);
      setSharedMeta({ runId: run.shortId });
      setSavedShortId(run.shortId);
      setPlannerMode("plan");
      router.replace(`/oracle?id=${sid}`);
    } catch (e: any) {
      setRecentError(e?.message || String(e));
    }
  }

  // NEW: Delete a run by shortId and refresh recent list
  async function deleteRunById(sid: string) {
    try {
      setRecentLoading(true);
      const data = await fetchJsonWithRetry<any>(`/api/runs/${sid}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (data?.ok === false) {
        throw new Error(data?.error || "Delete failed");
      }
      // Refresh recent list
      try {
        const j = await fetchJsonWithRetry<any>(`/api/runs?limit=${recentLimit}`);
        if (j?.ok) setRecentRuns(j.runs || []);
      } catch {}
      // If current run was deleted, clear state and URL
      if (savedShortId === sid) {
        setSavedShortId(null);
        setSharedMeta(null);
        const url = new URL(window.location.href);
        url.searchParams.delete("id");
        window.history.replaceState({}, "", url.toString());
      }
    } catch (e: any) {
      setRecentError(e?.message || String(e));
    } finally {
      setRecentLoading(false);
    }
  }

  // NEW: Auto-apply settings from parsed prompt (NLP-driven filters) and amount→USD liquidity
  useEffect(() => {
    const ents: any = intentPreview?.entities;
    if (!ents) return;

    // Adjust planner mode if multi-step
    if (intentPreview?.intent === "plan" || (Array.isArray(intentPreview?.steps) && intentPreview.steps.length > 1)) {
      setPlannerMode("plan");
    }

    // Include yields if step detected
    if (Array.isArray(intentPreview?.steps) && intentPreview.steps.some((s: any) => (s.type || "") === "yield")) {
      setIncludeYields(true);
    }

    // Slippage → Max Slippage
    if (typeof ents.slippage === "number" && isFinite(ents.slippage)) {
      setMaxSlippagePct(Math.max(0, Math.min(3, ents.slippage)));
    }

    // Personal mode: ignore project/treasury vesting entities entirely

    // Chain preference
    const allowedChains = ["base", "ethereum", "arbitrum", "optimism", "polygon"] as const;
    const pickChain = (c?: string) => (c && (allowedChains as readonly string[]).includes(c) ? (c as typeof allowedChains[number]) : undefined);
    const prefer = pickChain(ents.toChain) || pickChain(ents.fromChain);
    if (prefer) setPreferredChain(prefer);

    // Bridge preference NLP mapping from prompt phrases
    {
      const ptxt = (intentPreview?.raw || prompt || "").toLowerCase();
      if (ptxt.includes("lowest fee") || ptxt.includes("cheapest")) {
        setBridgePreference("cheapest");
      } else if (ptxt.includes("fastest") || ptxt.includes("quickest")) {
        setBridgePreference("fastest");
      } else if (ptxt.includes("most secure") || ptxt.includes("securest") || ptxt.includes("safest")) {
        setBridgePreference("mostSecure");
      }
    }

    // Amount in token → USD to set Min Liquidity
    async function applyLiquidityFromAmount() {
      const sym: string | undefined = ents.token ? String(ents.token).toUpperCase() : undefined;
      const amt: number | undefined = typeof ents.amount === "number" ? ents.amount : undefined;
      if (!sym || !amt || !(amt > 0)) return;

      const idMap: Record<string, string> = {
        BTC: "bitcoin",
        WBTC: "wrapped-bitcoin",
        ETH: "ethereum",
        WETH: "ethereum",
        USDC: "usd-coin",
        USDT: "tether",
        DAI: "dai",
        ARB: "arbitrum",
        OP: "optimism",
      };
      let id = idMap[sym];

      // Fallback: try CoinGecko search to resolve any token symbol globally
      if (!id) {
        try {
          const search = await fetchJsonWithRetry<any>(`/api/price?endpoint=search&query=${encodeURIComponent(sym)}`, { cache: "no-store" });
          const coins: any[] = Array.isArray(search?.coins) ? search.coins : [];
          const exact = coins.find(c => String(c.symbol || "").toUpperCase() === sym);
          const best = exact || coins[0];
          id = best?.id;
        } catch {
          // ignore search failures
        }
      }

      if (!id) return;
      try {
        const data = await fetchJsonWithRetry<any>(`/api/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`, { cache: "no-store" });
        const px = data?.[id]?.usd;
        if (typeof px === "number" && isFinite(px) && px > 0) {
          const usd = Math.round(amt * px);
          // Directly set Min Liquidity to the dollar-equivalent to guide routing depth
          setMinLiquidityUsd(usd);
        }
      } catch (e) {
        // ignore price failures; keep existing liquidity
      }
    }
    applyLiquidityFromAmount();
  }, [intentPreview]);

  // Auto-load from shared link (?q=...&runId=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      const runId = params.get("runId") || undefined;
      if (q && q !== prompt) {
        setPrompt(q);
        setSharedMeta({ runId });
        // Force planner-first to avoid generic sim
        setPlannerMode("plan");
        // Defer to allow state to flush
        setTimeout(() => {
          runPlanner();
        }, 10);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function simulateFlow(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    // Hide suggestions on submit
    if (examples.length) setExamples([]);

    // Fire-and-forget: log user input to learning loop
    (async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
        await fetchJsonWithRetry("/api/learn/log-input", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ text: prompt, intent: intentPreview?.intent || undefined }),
        });
        // After every 50 inputs, trigger background retraining
        let cnt = 0;
        try {
          cnt = parseInt(localStorage.getItem("oracle_input_count") || "0", 10) || 0;
        } catch {}
        cnt += 1;
        try {
          localStorage.setItem("oracle_input_count", String(cnt));
        } catch {}
        if (cnt % 50 === 0) {
          await fetchJsonWithRetry("/api/learn/retrain", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ days: 30 }),
          });
        }
      } catch {}
    })();

    // Always use real APIs: parse → tool or planner. No mocked simulations.
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      setPlanResult(null);
      setToolResult(null);
      // reset assistant section
      setAssistantText("");
      setAssistantError(null);
      setAssistantLoading(false);

      // If a tool is explicitly selected, run it directly
      if (selectedTool) {
        // Avoid showing global simulating alert when a specific tool is running
        setLoading(false);
        await runTool();
        return;
      }

      // Parse the prompt to decide the correct path
      const parsed: any = await fetchJsonWithRetry("/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        cache: "no-store",
      });
      setIntentPreview(parsed);

      const pIntent = String(parsed?.intent || "").toLowerCase();
      const steps: any[] = Array.isArray(parsed?.steps) ? parsed.steps : [];
      const hasType = (t: string) => steps.some((s) => String(s?.type || "").toLowerCase() === t);
      const lowerPrompt = (prompt || "").toLowerCase();

      // Decide tool based on parsed intent/steps
      let toolId = (
        pIntent === "bridge" || hasType("bridge") ? "bridge" :
        pIntent === "swap" || hasType("swap") ? "swap" :
        pIntent === "yield" || hasType("yield") ? "yield" :
        pIntent === "gas" || hasType("gas") ? "gas" :
        null
      ) as typeof selectedTool;

      // Heuristic: handle TVL queries explicitly
      if (!toolId) {
        if (lowerPrompt.includes("tvl")) {
          toolId = (lowerPrompt.includes("chain") || /arbitrum|arbi|arb|base|optimism|op|polygon|matic|ethereum|eth/.test(lowerPrompt))
            ? ("defi_chain_tvl" as any)
            : ("defi_protocol_tvl" as any);
        }
      }

      // 1) Always produce a concise assistant text first
      try {
        setAssistantLoading(true);
        if (aiProvider === "github" || aiProvider === "groq") {
          // Streamed responses for GitHub Models and Groq
          const controller = new AbortController();
          setAssistantAbort(controller);
          setAssistantText("");
          const res = await fetch("/api/ai/text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: aiProvider,
              temperature: 0.4,
              stream: true,
              prompt: `You are ChainFlow Oracle for Web3. User query: ${prompt}.\nRespond in 2 short sentences max: 1) a brief plain-English takeaway, 2) a recommended next step (and why).\nCRITICAL: Do NOT list raw datasets or markdown tables. If the data is long (like TVL history), summarize trend and refer to the chart ("see chart"). Keep it conversational and beginner-friendly. If a tool is applicable, name it (gas/yield/bridge/swap/TVL).`,
              ...(aiProvider === "github" && githubModel.trim() ? { model: githubModel.trim() } : {}),
              ...(aiProvider === "groq" && groqModel.trim() ? { model: groqModel.trim() } : {}),
            }),
            signal: controller.signal,
          });
          if (!res.ok) {
            const ct = res.headers.get("content-type") || "";
            const payload = ct.includes("application/json") ? await res.json().catch(() => ({})) : await res.text().catch(() => "");
            const msg = typeof payload === "string" ? payload : (payload?.error || payload?.message || `HTTP ${res.status}`);
            throw new Error(msg);
          }
          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          if (reader) {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              if (chunk) setAssistantText((prev) => prev + chunk);
            }
          }
          // Normalize formatting after stream completes
          setAssistantText((prev) => stripTablesAndLongLists(stripAsteriskEmphasis(prev)));
          setAssistantError(null);
          setAssistantAbort(null);
        } else {
          // Fallback: non-stream JSON flow for other providers
          const ai = await fetchJsonWithRetry<{ text?: string }>("/api/ai/text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: aiProvider,
              temperature: 0.4,
              prompt: `You are ChainFlow Oracle for Web3. User query: ${prompt}.\nRespond in 2 short sentences max: 1) a brief plain-English takeaway, 2) a recommended next step (and why).\nCRITICAL: Do NOT list raw datasets or markdown tables. If the data is long (like TVL history), summarize trend and refer to the chart ("see chart"). Keep it conversational and beginner-friendly. If a tool is applicable, name it (gas/yield/bridge/swap/TVL).`,
              ...(aiProvider === "nlpcloud" ? { useGpu: nlpUseGpu, ...(nlpModel.trim() ? { model: nlpModel.trim() } : {}) } : {}),
            }),
            cache: "no-store"
          }, 1, 400, 35000);
          if (ai?.text) {
            setAssistantText(stripTablesAndLongLists(stripAsteriskEmphasis(ai.text)));
            setAssistantError(null);
          } else {
            setAssistantText("");
            setAssistantError("Provider returned no text.");
          }
        }
      } catch (e: any) {
        setAssistantText("");
        setAssistantError(e?.message || "Failed to generate assistant reply");
        setAssistantAbort(null);
      } finally {
        setAssistantLoading(false);
      }

      // 2) Suggest a tool (don't auto-run; show CTA)
      setSuggestedTool(toolId);
      if (toolId) {
        // Auto-run for TVL queries; otherwise, suggest and wait for user action
        if (toolId === "defi_chain_tvl" || toolId === "defi_protocol_tvl") {
          setSelectedTool(toolId);
          await runTool();
          return;
        }
        setSelectedTool(toolId);
        return;
      }

      if (toolId) {
        setSelectedTool(toolId);
        await runTool();
      } else {
        // Otherwise, run the planner with current constraints
        await runPlanner();
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  // Plan orchestrator
  async function runPlanner() {
    if (!prompt.trim()) return;
    setPlanLoading(true);
    setPlanError(null);
    // kick off tailored planning message
    updateGlobalLoadingMsg(prompt, intentPreview?.intent);
    // Preserve previous result for delta comparison
    setPrevPlanResult((curr: any) => (planResult ? planResult : curr));
    setPlanResult(null);
    try {
      const data = await fetchJsonWithRetry("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, constraints: { riskAppetite, preferredChain, bridgePreference, maxSlippagePct, minLiquidityUsd }, objective: bridgePreference }),
      });
      if (!data?.ok) {
        throw new Error((data as any)?.error || "Planner failed");
      }
      // Compute diffs vs prevPlanResult
      try {
        const prev = prevPlanResult?.steps || [];
        const next = (data as any)?.steps || [];
        const sig = (s: any) => `${String(s?.type||'').toLowerCase()}|${String(s?.summary||'').toLowerCase()}`;
        const prevMap = new Map<string, number>();
        prev.forEach((s: any, i: number) => prevMap.set(sig(s), i));
        const nextMap = new Map<string, number>();
        next.forEach((s: any, i: number) => nextMap.set(sig(s), i));
        const added: number[] = [];
        const removed: number[] = [];
        const modified: number[] = [];
        next.forEach((s: any, i: number) => { if (!prevMap.has(sig(s))) added.push(i); });
        prev.forEach((s: any, i: number) => { if (!nextMap.has(sig(s))) removed.push(i); });
        const minLen = Math.min(prev.length, next.length);
        for (let i = 0; i < minLen; i++) {
          if (String(prev[i]?.type).toLowerCase() === String(next[i]?.type).toLowerCase() && sig(prev[i]) !== sig(next[i])) {
            modified.push(i);
          }
        }
        setPlannerDiffs({ added, removed, modified });
      } catch { setPlannerDiffs({ added: [], removed: [], modified: [] }); }
      setPlanResult(data);
    } catch (err: any) {
      setPlanError(err?.message || String(err));
    } finally {
      setPlanLoading(false);
      setGlobalLoadingMsg("");
    }
  }

  // Run selected agent tool via unified executor
  async function runTool(tool?: typeof selectedTool) {
    const toolId = tool ?? selectedTool;
    if (!toolId || !prompt.trim()) return;
    // kick off tailored tool message
    updateToolLoadingMsg(String(toolId), prompt);
    setToolLoading(true);
    setToolError(null);
    setToolResult(null);
    try {
      // Support Gas and DeFiLlama TVL tools
      if (toolId === "gas") {
        try {
          const url = `/api/gas/estimate?chain=${encodeURIComponent(preferredChain)}`;
          const data = await fetchJsonWithRetry(url, { method: "GET", headers: { "Content-Type": "application/json" }, cache: "no-store" }, 2, 350, 20000);
          setToolResult(data);
          const line = await composeGasAssistant(data, preferredChain).catch(() => (typeof (data as any)?.summary === "string" ? (data as any).summary : "Gas estimates ready."));
          setAssistantText(line);
          return;
        } catch (e) {
          // Fallback to POST if GET fails in some environments
          const data = await fetchJsonWithRetry("/api/gas/estimate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chain: preferredChain })
          }, 2, 350, 20000);
          setToolResult(data);
          const line = await composeGasAssistant(data, preferredChain).catch(() => (typeof (data as any)?.summary === "string" ? (data as any).summary : "Gas estimates ready."));
          setAssistantText(line);
          return;
        }
      }
      // NEW: Swap tool support
      if (toolId === "swap") {
        // Heuristic parse from prompt for amount/symbols
        const txt = (intentPreview?.raw || prompt || "").trim();
        const amtMatch = txt.match(/([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]{2,6})\b.*?\bto\b\s*([a-zA-Z]{2,6})/i) || txt.match(/swap\s*([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]{2,6})\s*(?:for|to)\s*([a-zA-Z]{2,6})/i);
        let amount = amtMatch ? parseFloat(amtMatch[1]) : 0.02; // default 0.02
        let sellSym = (amtMatch ? amtMatch[2] : "ETH").toUpperCase();
        let buySym = (amtMatch ? amtMatch[3] : "USDC").toUpperCase();
        // Common decimals map
        const decimals: Record<string, number> = { ETH: 18, WETH: 18, USDC: 6, USDT: 6, DAI: 18, WBTC: 8 };
        const dec = decimals[sellSym] ?? 18;
        const toBaseAmount = (val: number, d: number) => {
          // return as string integer in smallest units
          const [i, f = ""] = String(val).split(".");
          const frac = (f + "0".repeat(d)).slice(0, d);
          return i.replace(/^0+/, "") + frac; // simple concat; safe for small numbers
        };
        const sellAmount = toBaseAmount(amount, dec);
        const chainId = (() => {
          switch (preferredChain) {
            case "base": return 8453;
            case "arbitrum": return 42161;
            case "optimism": return 10;
            case "polygon": return 137;
            default: return 1;
          }
        })();
        // Use POST to ensure reliable param parsing across runtimes
        const q = await fetchJsonWithRetry<{ data?: any; error?: string }>(
          "/api/swap/quote",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sellToken: sellSym, buyToken: buySym, sellAmount, chainId }),
            cache: "no-store",
          },
          1,
          350,
          30000
        );
        if (!q?.data) {
          throw new Error(q?.error || "No quote available");
        }
        const d = q.data;
        const summary = (() => {
          const prov = d.provider || "DEX";
          const px = typeof d.price === "number" && isFinite(d.price) ? d.price : null;
          const chainName = preferredChain.charAt(0).toUpperCase() + preferredChain.slice(1);
          // derive buy estimate when price is null using grossBuyAmount + token decimals
          const lc = (s: string) => (typeof s === "string" ? s.toLowerCase() : "");
          const DECIMALS: Record<string, number> = {
            "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": 18, // WETH
            "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": 6,  // USDC
            "0xdac17f958d2ee523a2206206994597c13d831ec7": 6,  // USDT
            "0x6b175474e89094c44da98b954eedeac495271d0f": 18, // DAI
          };
          const buyDec = DECIMALS[lc(d.buyTokenAddress || "")] ?? 18;
          // Robust formatUnits (string) to avoid precision/NaN issues in summary
          const formatUnits = (val: string | number, dec: number): string => {
            try {
              const bi = BigInt(String(val));
              const base = BigInt(10) ** BigInt(dec);
              const whole = bi / base;
              const frac = bi % base;
              const fracStr = frac.toString().padStart(dec, "0").slice(0, 6).replace(/0+$/, "");
              return fracStr ? `${whole.toString()}.${fracStr}` : whole.toString();
            } catch {
              return String(val);
            }
          };
          const buyAmtStrRaw = d.grossBuyAmount ? formatUnits(d.grossBuyAmount, buyDec) : null;
          const buyEstStr = (() => {
            if (typeof px === "number" && isFinite(px)) {
              const v = amount * px;
              return isFinite(v) ? (v >= 1 ? v.toFixed(3) : v.toPrecision(3)) : "?";
            }
            if (buyAmtStrRaw) {
              const n = Number(buyAmtStrRaw);
              if (Number.isFinite(n)) return n >= 1 ? n.toFixed(3) : n.toPrecision(3);
              return buyAmtStrRaw; // fallback to already-formatted units string
            }
            return "?";
          })();
          // gas hint in ETH when available
          const gasEth = d.gasPrice && d.estimatedGas ? (Number(d.gasPrice) / 1e18) * Number(d.estimatedGas) : null;
          const gasStr = d.estimatedGas ? ` · est gas ${d.estimatedGas}${gasEth ? ` (~${gasEth.toFixed(5)} ETH)` : ""}` : "";
          return `${prov} quote on ${chainName}: ${amount} ${sellSym} → ~${buyEstStr} ${buySym}${gasStr}`;
        })();
        setToolResult({
          summary,
          details: { quote: d },
          references: d.sources ? d.sources.map((s: any) => (typeof s === "string" ? s : s?.name || s?.id || "source")) : [],
        });
        setAssistantText(summary);
        return;
      }
      // NEW: Bridge tool support (via LI.FI proxy)
      if (toolId === "bridge") {
        // Parse amount/token/from/to chains from prompt heuristically
        const txt = (intentPreview?.raw || prompt || "").trim();
        // e.g., "Bridge 25 USDC from Ethereum to Base" OR "bridge 0.1 ETH to Arbitrum"
        const reg1 = /bridge\s+([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]{2,6})\s*(?:from\s+([a-zA-Z]+))?\s*(?:to\s+([a-zA-Z]+))?/i;
        const m = txt.match(reg1);
        let amount = m ? parseFloat(m[1]) : 25;
        let sym = (m ? m[2] : "USDC").toUpperCase();
        let fromChainTxt = (m && m[3]) ? m[3].toLowerCase() : undefined;
        let toChainTxt = (m && m[4]) ? m[4].toLowerCase() : undefined;
        // Fallback chains from preferences if not specified
        const fromChain = fromChainTxt || (preferredChain === "ethereum" ? "ethereum" : "ethereum");
        const toChain = toChainTxt || (preferredChain !== "ethereum" ? preferredChain : "base");
        // Decimals map
        const decimals: Record<string, number> = { ETH: 18, WETH: 18, USDC: 6, USDT: 6, DAI: 18, WBTC: 8 };
        const dec = decimals[sym] ?? 18;
        const toBaseAmount = (val: number, d: number) => {
          const [i, f = ""] = String(val).split(".");
          const frac = (f + "0".repeat(d)).slice(0, d);
          return (i.replace(/^0+/, "") || "0") + frac;
        };
        const fromAmount = toBaseAmount(amount, dec);

        const payload = {
          fromChain,
          toChain,
          fromToken: sym,
          toToken: sym,
          fromAmount,
        };
        const q = await fetchJsonWithRetry<{ data?: any; error?: string }>(
          "/api/bridge/quote",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            cache: "no-store",
          },
          1,
          350,
          30000
        );
        if (!q?.data) {
          throw new Error(q?.error || "No bridge route available");
        }
        const d = q.data;
        const bridgeName = d.bridge || (Array.isArray(d.steps) && d.steps[0]?.tool) || "Bridge";
        const dur = typeof d.estimatedDuration === "number" ? `${Math.round(d.estimatedDuration/60)} min` : null;
        const toAmtMin = d.toAmountMin ? String(d.toAmountMin) : null;
        const summary = (() => {
          const fromLabel = (fromChain.charAt(0).toUpperCase() + fromChain.slice(1));
          const toLabel = (toChain.charAt(0).toUpperCase() + toChain.slice(1));
          const durStr = dur ? ` · ETA ${dur}` : "";
          return `${bridgeName} route: ${amount} ${sym} ${fromLabel} → ${toLabel}${durStr}${toAmtMin ? " · min receive set" : ""}`;
        })();
        setToolResult({
          summary,
          // include raw Rango payload for debugging alongside normalized data
          details: { ...d, ...(q as any)?.raw ? { raw: (q as any).raw } : {} },
          references: ["https://api.rango.exchange/"],
        });
        // Enriched assistant line from Rango payload
        try {
          const formatUnits = (val?: string | null, dec = 18) => {
            if (!val) return "—";
            try {
              const bi = BigInt(val);
              const base = BigInt(10) ** BigInt(dec);
              const whole = bi / base;
              const frac = bi % base;
              const s = frac.toString().padStart(dec, "0").slice(0, 6).replace(/0+$/, "");
              return s ? `${whole.toString()}.${s}` : whole.toString();
            } catch { return "—"; }
          };
          const route = (d as any)?.raw?.route || {};
          const toSym = route?.to?.symbol || sym;
          // Robust decimals fallback by symbol to avoid 0 values for 6-dec tokens
          const symDecMap: Record<string, number> = { USDC: 6, USDT: 6, DAI: 18, WETH: 18, ETH: 18 };
          const toDec = ((): number => {
            const dec = Number(route?.to?.decimals);
            if (Number.isFinite(dec) && dec > 0 && dec <= 36) return dec;
            const bySym = symDecMap[(toSym || "").toUpperCase()];
            return typeof bySym === "number" ? bySym : 18;
          })();
          const out = d.toAmount || route.outputAmount;
          const outMin = d.toAmountMin || route.outputAmountMin;
          const outUsd = Number(route.outputAmountUsd);
          const piPct = route?.priceImpactUsdPercent != null ? String(route.priceImpactUsdPercent) : undefined;
          const fees = Array.isArray(d.feeCosts) ? d.feeCosts : Array.isArray(route.fee) ? route.fee : [];
          const totalFeeUsd = fees.reduce((acc: number, f: any) => {
            const dec = Number(f?.token?.decimals) || 18;
            const px = Number(f?.token?.usdPrice) || 0;
            const amtStr = formatUnits(f?.amount, dec);
            const amt = Number(amtStr);
            return acc + (isFinite(amt) && isFinite(px) ? amt * px : 0);
          }, 0);
          const eta = route?.estimatedTimeInSeconds ? `${Math.round(Number(route.estimatedTimeInSeconds)/60)} min` : (typeof d.estimatedDuration === "number" ? `${Math.round(d.estimatedDuration/60)} min` : null);
          // Compute numeric amounts and truncate to 3 decimals
          const outNum = out ? Number(formatUnits(out, toDec)) : NaN;
          const outMinNum = outMin ? Number(formatUnits(outMin, toDec)) : NaN;
          const outStr = Number.isFinite(outNum) ? `${outNum.toFixed(3)} ${toSym}` : "—";
          const outMinStr = Number.isFinite(outMinNum) ? `${outMinNum.toFixed(3)} ${toSym}` : "—";
          const usdStr = isFinite(outUsd) && outUsd > 0 ? ` (~$${outUsd.toFixed(2)})` : "";
          const via = route?.swapper?.title || route?.swapper?.id ? ` · via ${route?.swapper?.title || route?.swapper?.id}` : "";
          const fromNice = (fromChain.charAt(0).toUpperCase() + fromChain.slice(1));
          const toNice = (toChain.charAt(0).toUpperCase() + toChain.slice(1));
          const parts1: string[] = [];
          parts1.push(`I found a ${bridgePreference === "cheapest" ? "low‑fee" : bridgePreference === "fastest" ? "fast" : "secure"} ${bridgeName.toLowerCase()} route from ${fromNice} to ${toNice}`);
          if (via) parts1.push(via.replace(/^ \u00B7 /, ""));
          const s1 = parts1.join(" ") + ":";
          const parts2: string[] = [];
          if (outStr && outStr !== "—") parts2.push(`you'll receive about ${outStr}${usdStr}`);
          if (outMinStr && outMinStr !== "—") parts2.push(`(minimum ${outMinStr})`);
          if (totalFeeUsd > 0) parts2.push(`after around $${totalFeeUsd.toFixed(2)} in fees`);
          if (piPct) parts2.push(`with ~${Number(piPct).toFixed(2)}% price impact`);
          if (eta) parts2.push(`; ETA ${eta}`);
          const s2 = parts2.join(" ");
          setAssistantText(`${s1} ${s2}`.trim());
        } catch {
          setAssistantText(summary);
        }
        return;
      }
      // NEW: Yield tool support (DeFiLlama Yields proxy)
      if (toolId === "yield") {
        // Heuristic parse for asset and optional chain
        const txt = (intentPreview?.raw || prompt || "").trim();
        const symMatch = txt.match(/\b(USDC|USDT|DAI|ETH|WETH|WBTC|stETH)\b/i);
        const asset = (symMatch ? symMatch[1] : "USDC").toUpperCase();
        // Resolve chain via central registry (supports tron, ton, solana, bsc, op, etc.)
        const llamaChain = toDefiLlamaChainFromText(txt) || resolveChain(preferredChain)?.defillamaChain || "base";
        const query = `/api/yields?asset=${encodeURIComponent(asset)}&chain=${encodeURIComponent(llamaChain)}`;
        const res = await fetchJsonWithRetry<any>(query, { method: "GET", headers: { "Content-Type": "application/json" }, cache: "no-store" }, 1, 300, 20000);
        const items: any[] = Array.isArray(res?.data) ? res.data : [];
        if (!items.length) throw new Error("No yield pools found for your filters.");
        // Compose concise summary
        const top = items.slice(0, 3);
        const fmtUsd = (n: number) => `$${Math.round(n).toLocaleString()}`;
        const parts = top.map((p) => `${p.project} ${Number(p.apy||0).toFixed(2)}%${typeof p.tvlUsd === 'number' ? ` · TVL ${fmtUsd(p.tvlUsd)}` : ""}`);
        const chainNice = llamaChain.charAt(0).toUpperCase() + llamaChain.slice(1);
        const summary = `Top ${asset} yields on ${chainNice}: ${parts.join(" | ")}`;
        setToolResult({
          summary,
          details: { data: items },
          references: [
            { label: "DeFiLlama Yields", url: "https://yields.llama.fi/pools" },
          ],
        });
        // Assistant: helpful guidance + next steps
        // Respect queries like "lowest apy" or "minimum apy"
        const wantLowest = /\b(low(?:est)?|min(?:imum)?)\b/i.test(txt);
        // Choose candidate: prefer apyBase when available, else apy
        const pickApy = (p: any) => {
          const base = Number(p?.apyBase);
          const raw = Number(p?.apy);
          if (Number.isFinite(base) && base > 0) return base;
          return Number.isFinite(raw) ? raw : NaN;
        };
        const candidate = (() => {
          if (wantLowest) {
            return items.reduce((min: any, p: any) => (pickApy(p) < pickApy(min) ? p : min), items[0]);
          }
          return items[0];
        })();
        const apyRaw = Number(candidate?.apy || 0);
        const apyBase = Number(candidate?.apyBase || NaN);
        const apy = Number.isFinite(apyBase) && apyBase > 0 ? apyBase : apyRaw;
        const tvl = Number(candidate?.tvlUsd || 0);
        const lowTvl = tvl > 0 && tvl < 500_000;
        const amt = yieldCalcAmount || 1000;
        const months = 3;
        // Conservative earnings estimate: prefer apyBase; if APY > 300%, use simple APR (no compounding)
        const useSimpleApr = Number.isFinite(apy) && apy > 300;
        const est = (() => {
          if (!Number.isFinite(apy) || apy <= 0) return 0;
          if (useSimpleApr) return amt * (apy / 100) * (months / 12);
          return amt * Math.pow(1 + (apy / 100) / 12, months) - amt;
        })();
        const tip = lowTvl ? "TVL is on the low side—size positions modestly or diversify." : "TVL looks healthy—still start small and monitor incentives.";
        const method = useSimpleApr ? "(simple APR, no compounding due to extreme APY)" : "(monthly compounding)";
        const qualifier = wantLowest ? "Lowest APY" : "Best APY";
        setAssistantText(
          `${qualifier}: ${candidate.project} ${Number(apy).toFixed(2)}% on ${chainNice}. If you test with $${amt.toLocaleString()} for ${months}m, you'd earn roughly $${est.toFixed(2)} before fees ${method}. ${tip} You can swap into ${asset} or bridge funds, then stake via the links below.`
        );
        return;
      }
      if (toolId !== "defi_chain_tvl" && toolId !== "defi_protocol_tvl") {
        setToolError("This tool is temporarily disabled. Only Gas, Swap, Yield and TVL (DeFiLlama) are available right now.");
        return;
      }
      const data = await fetchJsonWithRetry("/api/defillama/tvl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId, prompt })
      }, 2, 350, 45000);
      setToolResult(data);
      // Always update assistant with a concise summary for every action
      if (Array.isArray((data as any)?.details)) {
        // TVL-style payload detected – craft a compact but comprehensive one-liner
        try {
          type Pt = { date: number | string; totalLiquidityUSD?: number; total?: number; tvl?: number };
          const raw: Pt[] = (toolResult as any).details as any;
          const pts = raw
            .map((p: Pt) => ({
              t: typeof p.date === "string" ? parseInt(p.date, 10) : Number(p.date),
              v: Number((p.totalLiquidityUSD ?? p.total ?? p.tvl) || 0),
            }))
            .filter((x) => Number.isFinite(x.t) && Number.isFinite(x.v))
            .sort((a, b) => a.t - b.t);
          if (pts.length > 1) {
            const now = pts[pts.length - 1].t;
            const findClosest = (targetSec: number) => {
              let lo = 0, hi = pts.length - 1;
              while (lo < hi) { const mid = (lo + hi) >> 1; if (pts[mid].t < targetSec) lo = mid + 1; else hi = mid; }
              return Math.max(0, Math.min(pts.length - 1, lo));
            };
            const day = 86400;
            const i1d = findClosest(now - 1 * day);
            const i7d = findClosest(now - 7 * day);
            const i30d = findClosest(now - 30 * day);
            const curr = pts[pts.length - 1].v;
            const pv1d = pts[i1d]?.v ?? curr;
            const pv7d = pts[i7d]?.v ?? curr;
            const pv30d = pts[i30d]?.v ?? curr;
            const pct = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : 0);
            const c1 = pct(curr, pv1d);
            const c7 = pct(curr, pv7d);
            const c30 = pct(curr, pv30d);
            const ath = Math.max(...pts.map((p) => p.v));
            const fmtFull = (n: number) => `$${Math.round(n).toLocaleString()}`;
            const name = typeof (data as any)?.summary === "string" ? (data as any).summary.replace(/^Summary:\s*/i, "").replace(/:\s*\d+\s*points.*$/i, "").trim() : "TVL";
            setAssistantText(`${name}: ${fmtFull(curr)} · 24h ${c1 >= 0 ? "+" : ""}${c1.toFixed(2)}% · 7d ${c7 >= 0 ? "+" : ""}${c7.toFixed(2)}% · 30d ${c30 >= 0 ? "+" : ""}${c30.toFixed(2)}% · ATH ${fmtFull(ath)}`);
          } else if ((data as any)?.summary) {
            setAssistantText(`Summary: ${(data as any).summary}`);
          } else {
            setAssistantText("Action completed. See results panel.");
          }
        } catch {
          if ((data as any)?.summary) {
            setAssistantText(`Summary: ${(data as any).summary}`);
          } else {
            setAssistantText("Action completed. See results panel.");
          }
        }
      } else if ((data as any)?.summary) {
        setAssistantText(`Summary: ${(data as any).summary}`);
      } else {
        setAssistantText("Action completed. See results panel.");
      }
    } catch (err: any) {
      setToolError(err?.message || String(err));
      setAssistantText(`Tool error: ${err?.message || err}`);
    } finally {
      setToolLoading(false);
      setToolLoadingMsg("");
    }
  }

  // Derive scenario APRs from planner yield steps (fallback to simulated topYield)
  function deriveScenarioAprs(): { baseApr: number; altAApr: number; altBApr: number } {
    try {
      const steps: any[] = Array.isArray(planResult?.steps) ? planResult.steps : [];
      const apys: number[] = [];
      for (const s of steps) {
        const t = String(s?.type || "").toLowerCase();
        if (t !== "yield") continue;
        const list: any[] = Array.isArray(s?.details?.data) ? s.details.data : [];
        for (const it of list) {
          const a = Number(it?.apy ?? it?.apr ?? it?.apyPct ?? 0);
          if (Number.isFinite(a) && a > 0 && a < 10_000) apys.push(a);
        }
        const single = Number(s?.details?.apy ?? s?.apy ?? 0);
        if (Number.isFinite(single) && single > 0 && single < 10_000) apys.push(single);
      }
      if (apys.length === 0 && typeof result?.topYield?.apy === "number") {
        const ty = Number(result.topYield.apy);
        if (Number.isFinite(ty) && ty > 0) apys.push(ty);
      }
      apys.sort((a, b) => b - a);
      const baseApr = apys[0] ?? 0;
      const altBApr = (apys[1] ?? (baseApr ? baseApr + 0.3 : 0));
      const altAApr = baseApr ? Math.max(0, baseApr - 0.4) : 0;
      return { baseApr, altAApr, altBApr };
    } catch {
      return { baseApr: 0, altAApr: 0, altBApr: 0 };
    }
  }

  // Normalize plan steps into txs and apply safety checks
  function normalizeAndValidate(): {
    ok: boolean;
    errors: string[];
    warnings: string[];
    txs: Array<{ id: string; type: string; chainId: number; to: string; data: string; value: string; gasEst: number; note?: string }>;
  } {
    const steps: any[] = Array.isArray(planResult?.steps) ? planResult!.steps : [];
    const errors: string[] = [];
    const warnings: string[] = [];
    const hexRegex = /^0x[a-fA-F0-9]*$/;
    const addrRegex = /^0x[a-fA-F0-9]{40}$/;

    // Treat these as informational-only; they do not produce signable txs
    const NON_TX_TYPES = new Set(["yield", "vest", "analysis", "note"]);

    // Known router/target fallbacks by step type and chainId (non-executing preview only)
    const KNOWN_TARGETS: Record<string, Record<number, string>> = {
      swap: {
        1: "0xDef1C0ded9bec7F1a1670819833240f027b25EfF",
        8453: "0xDef1C0ded9bec7F1a1670819833240f027b25EfF",
        42161: "0xDef1C0ded9bec7F1a1670819833240f027b25EfF",
        10: "0xDef1C0ded9bec7F1a1670819833240f027b25EfF",
        137: "0xDef1C0ded9bec7F1a1670819833240f027b25EfF",
      },
      bridge: {
        1: "0x1111111254EEB25477B68fb85Ed929f73A960582",
        8453: "0x1111111254EEB25477B68fb85Ed929f73A960582",
        42161: "0x1111111254EEB25477B68fb85Ed929f73A960582",
        10: "0x1111111254EEB25477B68fb85Ed929f73A960582",
        137: "0x1111111254EEB25477B68fb85Ed929f73A960582",
      },
    };
    const EXTRA_ALLOWLIST = new Set([
      "0xDef1C0ded9bec7F1a1670819833240f027b25EfF",
      "0x1111111254EEB25477B68fb85Ed929f73A960582",
      "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    ].map(a => a.toLowerCase()));

    const toAllowlist = new Set<string>();
    EXTRA_ALLOWLIST.forEach((a) => toAllowlist.add(a));

    const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
    const resolveDefaultTo = (type?: string, chainId?: number, summary?: string): string | null => {
      const t = (type || "").toLowerCase();
      const s = (summary || "").toLowerCase();
      const useSwap = t.includes("swap") || s.includes("swap") || s.includes("dex") || s.includes("0x") || s.includes("uniswap");
      const useBridge = t.includes("bridge") || s.includes("bridge");
      if (!chainId) return null;
      if (useSwap) return KNOWN_TARGETS.swap[chainId] || null;
      if (useBridge) return KNOWN_TARGETS.bridge[chainId] || null;
      return null;
    };

    const txs = steps.slice(0, 20).map((s: any, idx: number) => {
      // Skip non-transactional steps entirely from signing set
      const tType = String(s.type || "").toLowerCase();
      if (NON_TX_TYPES.has(tType)) return null as any;

      const chainName = (s.chain || s.toChain || s.fromChain || "ethereum").toString().toLowerCase();
      let chainId = Number(s.chainId) || (chainName.includes("base") ? 8453 : chainName.includes("arbitrum") ? 42161 : chainName.includes("optimism") ? 10 : chainName.includes("polygon") ? 137 : 1);
      if (!Number.isInteger(chainId) || chainId <= 0) {
        errors.push(`Step ${idx + 1}: invalid chainId (${s.chainId}).`);
        chainId = 1;
      }

      // Prefer live quote tx fields when present (e.g., from /api/swap/quote or /api/bridge/quote)
      const quoteTx = (s?.details?.data?.tx || s?.details?.tx || {}) as any;
      const rawToCandidate = String(quoteTx.to || s.contract || s.router || "");
      const fallbackTo = resolveDefaultTo(s.type, chainId, s.summary);
      const isZero = rawToCandidate.toLowerCase() === "0x0000000000000000000000000000000000000000";
      const isValidAddr = addrRegex.test(rawToCandidate);
      let resolvedTo = rawToCandidate;

      if (!isValidAddr || isZero) {
        if (fallbackTo) {
          resolvedTo = fallbackTo;
          warnings.push(`Step ${idx + 1}: replaced missing/zero 'to' with known router for ${(s.type || "operation")} on chain ${chainId}.`);
        } else {
          // If still no viable target, skip producing a tx for this step instead of erroring
          warnings.push(`Step ${idx + 1}: no executable target found; step excluded from signing.`);
          return null as any;
        }
      }

      const toLower = resolvedTo.toLowerCase();
      if (!addrRegex.test(toLower)) {
        errors.push(`Step ${idx + 1}: invalid or missing 'to' address (${resolvedTo || "<missing>"}).`);
      } else if (!toAllowlist.has(toLower)) {
        warnings.push(`Step ${idx + 1}: target ${resolvedTo} not in allowlist.`);
      }

      let data = String(quoteTx.data || s.calldata || s.data || "0x");
      if (!hexRegex.test(data)) {
        errors.push(`Step ${idx + 1}: calldata is not valid hex.`);
      }

      let value = String(quoteTx.value || s.valueWei || "0x0");
      if (!hexRegex.test(value)) {
        warnings.push(`Step ${idx + 1}: value is not hex; coercing to 0x0.`);
        value = "0x0";
      }
      if (value !== "0x0") {
        warnings.push(`Step ${idx + 1}: non-zero value present; confirm intent.`);
      }

      let gasEst = Number(quoteTx.gas || s.gas) || 210000;
      if (!Number.isFinite(gasEst)) gasEst = 210000;
      gasEst = clamp(gasEst, 21000, 5_000_000);

      return {
        id: `${idx + 1}`,
        type: s.type,
        chainId,
        to: resolvedTo,
        data,
        value,
        gasEst,
        note: s.summary || `Auto-derived from ${s.type}`,
      };
    }).filter(Boolean);

    const ok = errors.length === 0;
    return { ok, errors, warnings, txs };
  }

  // Auto-enrich empty calldata before preview and tag enriched fields
  useEffect(() => {
    if (!planResult?.ok) return;
    // Enrichment temporarily disabled while bridge/swap executors are offline
    // (execute API removed). Skip auto-enrichment to avoid 404s.
    return;
    // const rep = normalizeAndValidate();
    // const targets = rep.txs.filter((t) => !t.data || t.data === "0x");
    // if (targets.length === 0) return;
    // let cancelled = false;
    // (async () => {
    //   setAutoEnriching(true);
    //   for (const tx of targets.slice(0, 3)) {
    //     if (cancelled) break;
    //     // enrichment disabled
    //   }
    //   setAutoEnriching(false);
    // })();
    // return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planResult?.runId]);

  // If planner yields 0 executable txs, auto-run Bridge/Swap tool and build a fallback preview tx
  useEffect(() => {
    const runFallback = async () => {
      try {
        if (!planResult?.ok) return;
        // Fallback temporarily disabled while bridge/swap executors are offline
        setFallbackTxs([]);
        setFallbackNotice(null);
        return;
      } catch (e) {
        // Swallow fallback errors; keep UI stable
      }
    };
    runFallback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planResult?.runId, preferredChain]);

  // One-click enrichment for a specific step (Quick fix)
  async function enrichStep(stepIndex: number, stepType?: string) {
    // Enrichment temporarily disabled while bridge/swap executors are offline
    setToolError("Live quote enrichment is temporarily disabled. TVL tools remain available.");
    return;
  }

  // Wallet readiness computation when dialog opens
  useEffect(() => {
    if (!signOpen) return;
    let active = true;
    (async () => {
      try {
        const anyWin = window as any;
        let eth = anyWin?.ethereum as any | undefined;
        if (!eth && Array.isArray(anyWin?.ethereum?.providers) && anyWin.ethereum.providers.length > 0) {
          eth = anyWin.ethereum.providers.find((p: any) => p.isMetaMask) || anyWin.ethereum.providers[0];
        }
        const accounts: string[] = eth ? await eth.request({ method: 'eth_accounts' }) : [];
        const connected = !!(accounts && accounts[0]);
        const rep = normalizeAndValidate();
        const first = rep.txs[0];
        const chainHex = eth ? await eth.request({ method: 'eth_chainId' }) : '0x0';
        const currentChain = parseInt(chainHex || '0x0', 16);
        const correctChain = !!first && currentChain === first.chainId;
        const gasSane = !!first && Number(first.gasEst) >= 21000 && Number(first.gasEst) <= 5_000_000;
        if (active) setWalletReady({ connected, correctChain, gasSane });
      } catch {
        if (active) setWalletReady({ connected: false, correctChain: false, gasSane: false });
      }
    })();
    return () => { active = false; };
  }, [signOpen, planResult]);

  // Request wallet signature by sending the first normalized transaction (with chain switching)
  async function requestWalletSignature() {
    try {
      const rep = normalizeAndValidate();
      if (!rep.ok) {
        setSignError("Validation failed – cannot request signature.");
        return;
      }
      let tx = rep.txs[0];
      if (!tx) {
        setSignError("No executable transactions found.");
        return;
      }

      // Enrichment of empty calldata disabled while bridge/swap executors are offline

      // Resolve an injected EVM provider (handle EIP-6963/multiprovider case)
      const anyWin = window as any;
      let eth = anyWin?.ethereum as any | undefined;
      if (!eth && Array.isArray(anyWin?.ethereum?.providers) && anyWin.ethereum.providers.length > 0) {
        eth = anyWin.ethereum.providers.find((p: any) => p.isMetaMask) || anyWin.ethereum.providers[0];
      }
      if (!eth) {
        setSignError("No EVM wallet provider detected (window.ethereum missing).");
        return;
      }

      const toHex = (n: number) => `0x${Math.max(0, Math.floor(n)).toString(16)}`;
      // Ensure correct chain
      const currentChainHex: string = await eth.request({ method: "eth_chainId" });
      const currentChain = parseInt(currentChainHex, 16);
      if (currentChain !== tx.chainId) {
        try {
          await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${tx.chainId.toString(16)}` }] });
        } catch (switchErr: any) {
          setSignError(`Switch chain failed for chainId ${tx.chainId}: ${switchErr?.message || switchErr}`);
          return;
        }
      }

      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      const from = accounts?.[0];
      if (!from) {
        setSignError("No wallet account available.");
        return;
      }

      const txParams: any = {
        from,
        to: tx.to,
        data: tx.data || "0x",
        value: tx.value || "0x0",
        gas: toHex(tx.gasEst || 210000),
      };

      // Prevent attempting to send a no-op transaction with empty data and zero value
      if ((!txParams.data || txParams.data === "0x") && (txParams.value === "0x0" || txParams.value === "0x")) {
        setSignError("This step has no executable calldata or value. Generate live quotes first (Bridge/Swap) and try again.");
        return;
      }

      setSigning(true);
      setSignError(null);
      const hash: string = await eth.request({ method: "eth_sendTransaction", params: [txParams] });
      setSignedTxs((prev) => {
        const next = [...prev, hash];
        try { localStorage.setItem("oracle_signed_hashes", JSON.stringify(next)); } catch {}
        return next;
      });
    } catch (err: any) {
      setSignError(err?.message || String(err));
    } finally {
      setSigning(false);
    }
  }

  // NEW: Sign-all sequential flow with progress, cancel, and live enrichment
  async function signAllSequential() {
    const report = normalizeAndValidate();
    setValidationReport(report);
    if (!report.ok) {
      setSignError("Validation failed – fix issues before signing all.");
      return;
    }
    const txs = report.txs;
    if (!txs.length) {
      setSignError("No executable transactions found.");
      return;
    }
    setSignAllCancelled(false);
    setSignAllRunning(true);
    setSignAllProgress({ total: txs.length, current: 0 });
    setSignError(null);

    const anyWin = window as any;
    let eth = anyWin?.ethereum as any | undefined;
    if (!eth && Array.isArray(anyWin?.ethereum?.providers) && anyWin.ethereum.providers.length > 0) {
      eth = anyWin.ethereum.providers.find((p: any) => p.isMetaMask) || anyWin.ethereum.providers[0];
    }
    if (!eth) {
      setSignError("No EVM wallet provider detected (window.ethereum missing).");
      setSignAllRunning(false);
      return;
    }

    const toHex = (n: number) => `0x${Math.max(0, Math.floor(n)).toString(16)}`;

    try {
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      const from = accounts?.[0];
      if (!from) throw new Error("No wallet account available.");

      for (let i = 0; i < txs.length; i++) {
        if (signAllCancelled) break;
        let tx = txs[i];

        // Enrichment disabled while bridge/swap executors are offline

        // Ensure correct chain per tx
        const currentChainHex: string = await eth.request({ method: "eth_chainId" });
        const currentChain = parseInt(currentChainHex, 16);
        if (currentChain !== tx.chainId) {
          try {
            await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${tx.chainId.toString(16)}` }] });
          } catch (e: any) {
            setSignError(`Switch chain failed for chainId ${tx.chainId}: ${e?.message || e}`);
            break;
          }
        }

        const txParams: any = {
          from,
          to: tx.to,
          data: tx.data || "0x",
          value: tx.value || "0x0",
          gas: toHex(tx.gasEst || 210000),
        };

        // Skip no-op
        if ((!txParams.data || txParams.data === "0x") && (txParams.value === "0x0" || txParams.value === "0x")) {
          // Advance progress but do not send
          setSignAllProgress((p) => ({ total: p.total, current: i + 1 }));
          continue;
        }

        try {
          const hash: string = await eth.request({ method: "eth_sendTransaction", params: [txParams] });
          setSignedTxs((prev) => {
            const next = [...prev, hash];
            try { localStorage.setItem("oracle_signed_hashes", JSON.stringify(next)); } catch {}
            return next;
          });
        } catch (sendErr: any) {
          setSignError(sendErr?.message || String(sendErr));
          break;
        } finally {
          setSignAllProgress((p) => ({ total: p.total, current: i + 1 }));
        }
      }
    } catch (e: any) {
      setSignError(e?.message || String(e));
    } finally {
      setSignAllRunning(false);
    }
  }

  // NEW: Follow-up chat sender using context
  async function sendFollowUp() {
    const q = chatInput.trim();
    if (!q || chatLoading) return;
    const contextPieces: string[] = [];
    if (intentPreview?.intent) contextPieces.push(`intent=${intentPreview.intent}`);
    if (selectedTool) contextPieces.push(`selectedTool=${selectedTool}`);
    if (toolResult?.summary) contextPieces.push(`toolSummary=${toolResult.summary}`);
    const trimmedDetails = (() => {
      try {
        if (!toolResult?.details) return "";
        const s = JSON.stringify(toolResult.details);
        return s.length > 1800 ? s.slice(0, 1800) + "…" : s;
      } catch { return ""; }
    })();
    if (trimmedDetails) contextPieces.push(`toolDetails=${trimmedDetails}`);

    setChat((c) => [...c, { role: "user", text: q }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetchJsonWithRetry<{ text?: string }>("/api/ai/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiProvider,
          temperature: 0.3,
          prompt: `You are ChainFlow Oracle. Use prior session messages and context to answer succinctly.\nRules: Do NOT output raw datasets or markdown tables; if the result is long (e.g., TVL history), summarize trend in 1–2 sentences and refer to the chart. Keep it beginner-friendly and conversational.\nContext: ${contextPieces.join(" | ")}\n\nChat so far:\n${chat.map(m=>`${m.role}: ${m.text}`).join("\n")}\n\nUser: ${q}\n\nReply:`,
          ...(aiProvider === "nlpcloud" ? { useGpu: nlpUseGpu, ...(nlpModel.trim() ? { model: nlpModel.trim() } : {}) } : {}),
          ...(aiProvider === "github" && githubModel.trim() ? { model: githubModel.trim() } : {}),
          ...(aiProvider === "groq" && groqModel.trim() ? { model: groqModel.trim() } : {}),
        }),
        cache: "no-store",
      }, 1, 350, 35000);
      const text = stripTablesAndLongLists(stripAsteriskEmphasis(res?.text || ""));
      setChat((c) => [...c, { role: "assistant", text: text || "(no response)" }]);
    } catch (e: any) {
      setChat((c) => [...c, { role: "assistant", text: `Follow-up failed: ${e?.message || e}` }]);
    } finally {
      setChatLoading(false);
    }
  }

  // NEW: Subscribe to gas email alerts
  async function subscribeToGasAlerts(e: React.FormEvent) {
    e.preventDefault();
    if (!alertEmail.trim()) {
      setAlertErr("Please enter your email.");
      return;
    }
    try {
      setAlertSubmitting(true);
      setAlertErr(null);
      setAlertMsg(null);
      const res = await fetch("/api/alerts/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: alertEmail.trim(),
          thresholdUsd: Number(alertThreshold) || 12,
          minGasUnits: Number(alertMinGas) || 100000,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || data?.message || `Subscribe failed (${res.status})`);
      }
      setAlertMsg("Subscribed! Please check your inbox to verify your email.");
    } catch (err: any) {
      setAlertErr(err?.message || String(err));
    } finally {
      setAlertSubmitting(false);
    }
  }

  // NEW: Send test email (server-side route should handle validation)
  async function sendTestAlertEmail() {
    try {
      setAlertErr(null);
      setAlertMsg(null);
      const res = await fetch("/api/alerts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: alertEmail.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || data?.message || `Test failed (${res.status})`);
      }
      setAlertMsg("Test email sent (if enabled). Check your inbox.");
    } catch (e: any) {
      setAlertErr(e?.message || String(e));
    }
  }

  // Header with provider toggle
  function Header() {
    return (
      <header className="sticky top-3 md:top-4 z-50 w-full px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.push("/")} className="flex items-center gap-2 text-sm font-medium tracking-wide text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Home
        </button>
        <div className="flex items-center gap-2">
          {hasWalletConnect && (
            <>
              <div className="hidden sm:block">
                <ConnectButton.Custom>
                  {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
                    const connected = mounted && !!account && !!chain;
                    return (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 rounded-md border border-border/60 bg-background/60 dark:bg-background/20 backdrop-blur-sm supports-[backdrop-filter]:bg-background/40 hover:bg-accent/60 dark:hover:bg-accent/30 transition-shadow shadow-sm hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => (connected ? openAccountModal() : openConnectModal())}
                        >
                          {connected ? (
                            <span className="flex items-center gap-2 text-xs">
                              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                              <span className="font-mono">{account.displayName}</span>
                            </span>
                          ) : (
                            <span className="text-xs">Connect</span>
                          )}
                        </Button>
                      </div>
                    );
                  }}
                </ConnectButton.Custom>
              </div>
              <div className="sm:hidden">
                <ConnectButton.Custom>
                  {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
                    const connected = mounted && !!account && !!chain;
                    return (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 rounded-md border border-border/60 bg-background/60 dark:bg-background/20 backdrop-blur-sm supports-[backdrop-filter]:bg-background/40 hover:bg-accent/60 dark:hover:bg-accent/30 transition-shadow shadow-sm hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => (connected ? openAccountModal() : openConnectModal())}
                        aria-label={connected ? `Wallet ${account.displayName}` : "Connect wallet"}
                        title={connected ? "Wallet menu" : "Connect"}
                      >
                        {connected ? (
                          <span className="flex items-center gap-2 text-xs">
                            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                            <span className="font-mono">{account.displayName}</span>
                          </span>
                        ) : (
                          <span className="text-xs">Connect</span>
                        )}
                      </Button>
                    );
                  }}
                </ConnectButton.Custom>
              </div>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            type="button"
            onClick={() => setIsDark((v) => !v)}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => router.push("/#showcase")}>
            Try Commands
          </Button>
        </div>
      </header>
    );
  }

  // New: Integrations Toggles Section
  function IntegrationsToggles() {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-1 text-xs">
        <div className="flex items-center gap-1 bg-muted/50 px-1.5 py-1 rounded-xl">
          <span className="opacity-70 font-medium">Simulation Mode</span>
          <Switch checked={simulationMode} onCheckedChange={setSimulationMode} className="data-[state=checked]:bg-primary transition-all" />
        </div>
        <div className="flex items-center gap-1 bg-muted/50 px-1.5 py-1 rounded-xl">
          <span className="opacity-70 font-medium">Include Yields</span>
          <Switch checked={includeYields} onCheckedChange={setIncludeYields} className="data-[state=checked]:bg-primary transition-all" />
        </div>
        <span className="text-xs opacity-70" aria-busy={toolLoading}>Agent Tools:</span>
        {[
          { id: "gas", label: "Gas", Icon: Fuel },
          { id: "yield", label: "Yield", Icon: Search },
          { id: "bridge", label: "Bridge", Icon: ArrowLeftRight },
          { id: "swap", label: "Swap", Icon: Zap },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelectedTool(t.id as any)}
            className={`px-2 py-0.5 rounded-md border text-xs transition-all flex items-center gap-1 ${
              selectedTool === t.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/60 border-border/50 hover:bg-accent"
            }`}
          >
            <t.Icon className="h-3 w-3" /> {t.label}
          </button>
        ))}
        {selectedTool && (
          <button
            type="button"
            onClick={() => {
              setSelectedTool(null);
              setToolResult(null);
              setToolError(null);
            }}
            className="text-xs opacity-70 hover:opacity-100 underline underline-offset-4"
          >
            Clear
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        className={`${isDark ? "dark bg-neutral-950" : "bg-background bg-no-repeat bg-center bg-cover bg-fixed"} min-h-dvh w-full text-foreground`}
        style={!isDark ? { backgroundImage: `url(${bgUnified})` } : undefined}
      >
        <Header />
        <main className="py-8 md:py-12">
          <div className="mx-auto max-w-5xl px-4">
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl tracking-tight font-bold mb-2 bg-gradient-to-r from-primary to-foreground/80 bg-clip-text text-transparent">ChainFlow Oracle</h1>
              <p className="text-base md:text-[15px] text-muted-foreground max-w-2xl mx-auto leading-relaxed mt-1">
                Your personal onchain copilot. Ask in natural language and simulate actions like swaps, bridges, gas checks, yields, and risks—before you execute.
              </p>
              <Badge variant="secondary" className="mt-4 rounded-full px-3 py-1">First-of-its-kind Web3 Planning Tool</Badge>
            </div>

            <Card className="border-border/60 dark:border-border/40 bg-background/40 dark:bg-background/20 backdrop-blur-md dark:backdrop-blur-lg backdrop-saturate-150 rounded-2xl shadow-lg">
              <CardContent className="pt-6 space-y-4">
                {/* Shared link banner */}
                {sharedMeta?.runId && (
                  <Alert className="border-border/60 dark:border-border/40 bg-muted/30 dark:bg-muted/20">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="flex w-full items-center gap-2 text-sm">
                      <span>Loaded from shared link — Run: <span className="font-mono text-xs">{sharedMeta.runId}</span></span>
                      <span className="ml-auto flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => {
                            // Clear URL params and local state
                            router.replace("/oracle");
                            setSharedMeta(null);
                            setPlanResult(null);
                            setResult(null);
                            setPrompt("");
                            setIntentPreview(null);
                            setPlannerMode("auto");
                          }}
                        >
                          Reset
                        </Button>
                      </span>
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={simulateFlow} className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <DropdownMenu>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <button type="button" aria-label="Open settings" className="p-1 rounded-md hover:bg-muted/60 dark:hover:bg-muted/40 focus:outline-none focus:ring-1 focus:ring-ring data-[state=open]:bg-accent shrink-0">
                                <Layers className="h-4 w-4 opacity-70" />
                              </button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" align="start" className="text-xs">Settings</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <DropdownMenuContent align="start" sideOffset={6} className="w-[min(20rem,calc(100vw-2rem))] p-2 space-y-3 bg-popover/95 dark:bg-popover/90 backdrop-blur supports-[backdrop-filter]:bg-popover/80">
                        {/* AI Provider selector */}
                        <div className="space-y-2">
                          <div className="text-[11px] font-medium opacity-70">AI Provider</div>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {(["nlpcloud","github","groq"] as const).map((prov) => (
                              <button
                                key={prov}
                                type="button"
                                onClick={() => setAiProvider(prov)}
                                className={`px-2 py-0.5 rounded-md border transition-colors capitalize ${
                                  aiProvider === prov
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background hover:bg-accent"
                                }`}
                                aria-pressed={aiProvider === prov}
                              >
                                {prov}
                              </button>
                            ))}
                          </div>
                        </div>
                        {aiProvider === "nlpcloud" && (
                          <div className="space-y-2">
                            <div className="text-[11px] font-medium opacity-70">NLP Cloud</div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="opacity-70">GPU</span>
                              <Switch checked={nlpUseGpu} onCheckedChange={setNlpUseGpu} className="data-[state=checked]:bg-primary" />
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="opacity-70">Model</span>
                              <input
                                type="text"
                                value={nlpModel}
                                onChange={(e) => setNlpModel(e.target.value)}
                                placeholder="e.g., chatdolphin (optional)"
                                className="flex-1 h-7 bg-background border rounded px-2 text-xs"
                              />
                            </div>
                            <div className="text-[10px] opacity-60">Leave model empty to use server default. GPU requires a GPU-enabled model on your NLP Cloud account.</div>
                          </div>
                        )}
                        {aiProvider === "github" && (
                          <div className="space-y-2">
                            <div className="text-[11px] font-medium opacity-70">GitHub Models</div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="opacity-70">Model</span>
                              <input
                                type="text"
                                value={githubModel}
                                onChange={(e) => setGithubModel(e.target.value)}
                                placeholder="e.g., openai/gpt-4o (optional)"
                                className="flex-1 h-7 bg-background border rounded px-2 text-xs"
                              />
                            </div>
                            <div className="text-[10px] opacity-60">Leave model empty to use server default. GitHub requires a GitHub-enabled model on your account.</div>
                          </div>
                        )}
                        {aiProvider === "groq" && (
                          <div className="space-y-2">
                            <div className="text-[11px] font-medium opacity-70">Groq</div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="opacity-70">Model</span>
                              <input
                                type="text"
                                value={groqModel}
                                onChange={(e) => setGroqModel(e.target.value)}
                                placeholder="e.g., openai/gpt-oss-20b (optional)"
                                className="flex-1 h-7 bg-background border rounded px-2 text-xs"
                              />
                            </div>
                            <div className="text-[10px] opacity-60">Leave model empty to use server default. Your server uses GROQ_API_KEY.</div>
                          </div>
                        )}
                        <div className="space-y-2">
                          <div className="text-[11px] font-medium opacity-70">Mode</div>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {(["auto", "plan"] as const).map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setPlannerMode(m)}
                                className={`px-2 py-0.5 rounded-md border transition-colors ${
                                  plannerMode === m
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background hover:bg-accent"
                                }`}
                                aria-pressed={plannerMode === m}
                              >
                                {m === "auto" ? "Auto (Quick Sim)" : "Plan-first (Best)"}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-[11px] font-medium opacity-70">Assumptions</div>
                          <div className="flex flex-col gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="opacity-70">Risk</span>
                              {(["conservative","balanced","aggressive"] as const).map((r) => (
                                <button key={r} type="button" onClick={() => setRiskAppetite(r)}
                                  className={`px-2 py-0.5 rounded-md border text-xs capitalize ${riskAppetite===r?"bg-primary text-primary-foreground border-primary":"bg-background hover:bg-accent"}`}>
                                  {r}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="opacity-70">Chain</span>
                              {(["base","ethereum","arbitrum","optimism","polygon"] as const).map((c) => (
                                <button key={c} type="button" onClick={() => setPreferredChain(c)}
                                  className={`px-2 py-0.5 rounded-md border text-xs capitalize ${preferredChain===c?"bg-primary text-primary-foreground border-primary":"bg-background hover:bg-accent"}`}>
                                  {c}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="opacity-70">Bridge</span>
                              {(["cheapest","fastest","mostSecure"] as const).map((b) => (
                                <button key={b} type="button" onClick={() => setBridgePreference(b as any)}
                                  className={`px-2 py-0.5 rounded-md border text-xs ${bridgePreference===b?"bg-primary text-primary-foreground border-primary":"bg-background hover:bg-accent"}`}>
                                  {b}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="opacity-70">Max Slippage</span>
                              <input type="number" step={0.1} min={0} max={3} value={maxSlippagePct}
                                onChange={(e)=>setMaxSlippagePct(Number(e.target.value)||0)}
                                className="w-20 h-7 bg-background border rounded px-1 text-xs" />
                              <span className="opacity-70">%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="opacity-70">Min Liquidity</span>
                              <input type="number" step={10000} min={0} value={minLiquidityUsd}
                                onChange={(e)=>setMinLiquidityUsd(Number(e.target.value)||0)}
                                className="w-28 h-7 bg-background border rounded px-1 text-xs" />
                              <span className="opacity-70">USD</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-[10px] opacity-60">If unchanged, defaults are applied automatically.</div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Input
                      value={prompt}
                      onChange={(e) => { setPrompt(e.target.value); if (examples.length) setExamples([]); }}
                      placeholder={
                        selectedTool === "gas"
                          ? "e.g., What's current gas on Base and a safe max fee?"
                          : selectedTool === "yield"
                          ? "e.g., Best APY for my USDC on Base (low risk)"
                          : selectedTool === "bridge"
                          ? "e.g., Bridge 25 USDC from Ethereum to Base cheaply"
                          : selectedTool === "swap"
                          ? "e.g., Swap 0.2 ETH to USDC on Base with <0.3% slippage"
                          : selectedTool === "defi_protocol_tvl"
                          ? "e.g., TVL of Uniswap (via DeFiLlama MCP)"
                          : selectedTool === "defi_chain_tvl"
                          ? "e.g., Chain TVL for Arbitrum (via DeFiLlama MCP)"
                          : "Ask Oracle to help with a personal onchain task"
                      }
                      className="w-full sm:flex-1 text-sm bg-background placeholder:text-muted-foreground/70 border-border/30 focus-visible:ring-2 focus-visible:ring-ring rounded-md h-11 px-3"
                      aria-label="Treasury flow prompt"
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                          e.preventDefault();
                          if (examples.length) setExamples([]);
                          runTool();
                        }
                      }}
                    />
                    <Button type="submit" size="sm" disabled={!prompt.trim() || loading || toolLoading} className="shrink-0">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    </Button>
                  </div>

                  {/* removed intent preview per request */}

                  <IntegrationsToggles />

                  {/* Two-column layout: Left = Assistant chat, Right = Tools processing/results */}
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="space-y-3">
                      {(assistantLoading || assistantText || assistantError) && (
                        <Card className="border-border/40 bg-background rounded-lg">
                          <CardHeader className="pb-2 bg-muted/20">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Info className="h-4 w-4" /> Assistant
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-3 p-4 text-sm space-y-2">
                            {assistantLoading && (
                              <div className="flex items-center gap-2 text-xs opacity-80">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                              </div>
                            )}
                            {assistantAbort && (
                              <div className="pt-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2"
                                  onClick={() => {
                                    try { assistantAbort.abort(); } catch {}
                                    setAssistantAbort(null);
                                    setAssistantLoading(false);
                                  }}
                                >
                                  Stop
                                </Button>
                              </div>
                            )}
                            {assistantError && (
                              <Alert variant="destructive" className="mt-1 border-destructive/50">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-xs">{assistantError}</AlertDescription>
                              </Alert>
                            )}
                            {/* NEW: Session chat thread */}
                            {chat.length > 0 && (
                              <div className="space-y-1">
                                {chat.slice(-12).map((m, i) => (
                                  <div key={i} className={`text-xs leading-relaxed ${m.role === 'user' ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    <span className="font-medium mr-1 capitalize">{m.role}:</span>
                                    <span className="whitespace-pre-wrap">{m.text}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {assistantText && (
                              <div className="whitespace-pre-wrap text-sm leading-relaxed">{assistantText}</div>
                            )}
                             {/* Auto-scroll anchor */}
                             <div ref={bottomRef} />
                            {suggestedTool && !toolResult && (
                              <div className="pt-1 inline-flex items-center gap-2 flex-wrap">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  className="h-6 px-2 text-[11px] rounded-full shadow-sm hover:shadow focus-visible:ring-1 capitalize"
                                  disabled={toolLoading}
                                  onClick={async () => {
                                    if (!suggestedTool) return;
                                    if (examples.length) setExamples([]);
                                    await runTool(suggestedTool as any);
                                    setSelectedTool(suggestedTool as any);
                                  }}
                                >
                                  {toolLoading ? (
                                    <span className="flex items-center gap-1 text-[11px]"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Running {suggestedTool}…</span>
                                  ) : (
                                    (() => {
                                      const labelMap: Record<string, string> = {
                                        gas: "Run Gas tool",
                                        yield: "Run Yield tool",
                                        bridge: "Run Bridge tool",
                                        swap: "Run Swap tool",
                                        defi_chain_tvl: "Run Chain TVL",
                                        defi_protocol_tvl: "Run Protocol TVL",
                                      };
                                      return labelMap[suggestedTool] || `Run suggested ${suggestedTool} tool`;
                                    })()
                                  )}
                                </Button>
                              </div>
                            )}
                            {/* Extra CTA: if prompt implies TVL but a different tool was suggested, also show a TVL button */}
                            {!toolResult && /tvl/i.test(prompt) && suggestedTool !== "defi_chain_tvl" && suggestedTool !== "defi_protocol_tvl" && (
                              <div className="pt-1 inline-flex items-center gap-2 flex-wrap">
                                {(() => {
                                  const lp = (prompt || "").toLowerCase();
                                  const runChain = lp.includes("chain") || /(arbitrum|arbi|arb|base|optimism|\bop\b|polygon|matic|ethereum|\beth\b)/i.test(lp);
                                  const tvlTool = runChain ? "defi_chain_tvl" : "defi_protocol_tvl";
                                  return (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-6 px-2 text-[11px] rounded-full shadow-sm hover:shadow focus-visible:ring-1"
                                      disabled={toolLoading}
                                      onClick={async () => {
                                        if (examples.length) setExamples([]);
                                        await runTool(tvlTool as any);
                                        setSelectedTool(tvlTool as any);
                                      }}
                                    >
                                      {toolLoading ? (
                                        <span className="flex items-center gap-1 text-[11px]"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Running {runChain ? "Chain TVL" : "Protocol TVL"}…</span>
                                      ) : (
                                        `Run ${runChain ? "Chain TVL" : "Protocol TVL"}`
                                      )}
                                    </Button>
                                  );
                                })()}
                              </div>
                            )}
                            {/* Chat composer */}
                            <div className="pt-2 flex items-center gap-2">
                              <Input
                                value={chatInput}
                                onChange={(e)=>setChatInput(e.target.value)}
                                placeholder="Ask a follow-up (context is remembered in this session)…"
                                className="h-9 text-xs"
                                onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); sendFollowUp(); } }}
                              />
                              <Button type="button" size="sm" className="h-9 px-3" disabled={chatLoading || !chatInput.trim()} onClick={sendFollowUp}>
                                {chatLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Send'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    <div className="space-y-3">
                      {toolLoading && (
                        <Alert className="border-border/50">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <AlertDescription className="text-sm font-medium">{toolLoadingMsg || ((/tvl/i.test(prompt) || (selectedTool as any)?.startsWith?.("defi_")) ? "Fetching TVL data…" : "Running tool… pulling live quotes and refs.")}</AlertDescription>
                        </Alert>
                      )}

                      {toolError && (
                        <Alert variant="destructive" className="border-destructive/50">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="font-medium">{toolError}</AlertDescription>
                        </Alert>
                      )}

                      {toolResult && (
                        <div role="region" aria-label="Agent tool result" aria-live="polite" aria-atomic="true">
                          <Card className="border-border/40 bg-background rounded-lg">
                            <CardHeader className="pb-2 bg-muted/20">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Info className="h-4 w-4" /> Agent Tool Result
                                {toolResult?.runId && (
                                  <span className="ml-auto text-[10px] opacity-70 font-mono">Run: {toolResult.runId}{toolResult?.timings?.durationMs ? ` · ${toolResult.timings.durationMs}ms` : ""}</span>
                                )}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3 p-4 text-sm">
                              {toolResult.summary && (
                                <div className="mb-3 text-sm">{toolResult.summary}</div>
                              )}
                              {/* Yield pools pretty view + mini calculator */}
                              {Array.isArray((toolResult as any)?.details?.data) && (
                                (() => {
                                  const pools: any[] = (toolResult as any).details.data;
                                  if (!pools.length) return null;
                                  const top = pools.slice(0, 6);
                                  const activeApy = (yieldCalcApy ?? Number(top[0]?.apy || 0));
                                  const amount = Number.isFinite(yieldCalcAmount) ? Math.max(0, yieldCalcAmount) : 0;
                                  const months = Number.isFinite(yieldCalcMonths) ? Math.max(1, Math.min(36, yieldCalcMonths)) : 12;
                                  const estFuture = amount * Math.pow(1 + (activeApy/100)/12, months);
                                  const estEarnings = estFuture - amount;
                                  const fmtUsd = (n:number) => `$${n.toLocaleString(undefined,{maximumFractionDigits:2})}`;
                                  return (
                                    <div className="space-y-3">
                                      {/* Yield opportunities grid */}
                                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                        {top.map((p, i) => {
                                          const apy = Number(p.apy || 0);
                                          const tvl = Number(p.tvlUsd || 0);
                                          const lowTvl = tvl > 0 && tvl < 500000;
                                          const isActive = apy === activeApy;
                                          return (
                                            <div
                                              key={i}
                                              className={`p-3 rounded-lg border bg-muted/10 hover:bg-muted/20 transition cursor-pointer ${isActive ? 'ring-2 ring-primary/60' : ''}`}
                                              onClick={() => setYieldCalcApy(apy)}
                                            >
                                              <div className="flex items-center gap-2 text-xs">
                                                <Badge variant="secondary" className="rounded-full">{p.project || p.pool || 'Pool'}</Badge>
                                                {lowTvl && <Badge variant="outline" className="rounded-full">Low TVL</Badge>}
                                              </div>
                                              <div className="mt-1 flex items-baseline gap-2">
                                                <div className="text-lg font-semibold">{apy.toFixed(2)}%</div>
                                                <div className="text-xs opacity-70">APY</div>
                                              </div>
                                              <div className="mt-1 text-xs opacity-80">TVL {tvl ? fmtUsd(Math.round(tvl)) : '—'}</div>
                                              {p.chain && <div className="text-[11px] opacity-70 mt-0.5 capitalize">{p.chain}</div>}
                                              <div className="mt-2 flex gap-2">
                                                {p.url && (
                                                  <a href={p.url} target="_blank" rel="noreferrer" className="text-[11px] underline underline-offset-4 opacity-90 hover:opacity-100">Open pool</a>
                                                )}
                                                <a href="https://yields.llama.fi/pools" target="_blank" rel="noreferrer" className="text-[11px] underline underline-offset-4 opacity-90 hover:opacity-100">DeFiLlama</a>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {/* Mini calculator below, landscape form */}
                                      <div className="p-3 rounded-lg border bg-muted/10">
                                        <div className="text-xs font-medium mb-2">Yield calculator</div>
                                        <div className="flex flex-wrap items-end gap-3 text-xs">
                                          <div className="flex items-center gap-2">
                                            <span className="opacity-70">Amount</span>
                                            <input
                                              type="number"
                                              className="h-8 w-32 bg-background border rounded px-2 text-right"
                                              value={yieldCalcAmount}
                                              onChange={(e)=>setYieldCalcAmount(parseFloat(e.target.value)||0)}
                                            />
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="opacity-70">Months</span>
                                            <input
                                              type="number"
                                              min={1}
                                              max={36}
                                              className="h-8 w-24 bg-background border rounded px-2 text-right"
                                              value={yieldCalcMonths}
                                              onChange={(e)=>setYieldCalcMonths(parseInt(e.target.value)||1)}
                                            />
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="opacity-70">APY</span>
                                            <input
                                              type="number"
                                              step={0.01}
                                              className="h-8 w-24 bg-background border rounded px-2 text-right"
                                              value={activeApy}
                                              onChange={(e)=>setYieldCalcApy(parseFloat(e.target.value)||0)}
                                            />
                                          </div>
                                          <div className="flex items-center gap-2 ml-auto">
                                            <div className="p-2 rounded-md bg-muted/20 text-center min-w-32">
                                              <div className="opacity-70">Future</div>
                                              <div className="font-mono text-sm">{fmtUsd(estFuture)}</div>
                                            </div>
                                            <div className="p-2 rounded-md bg-muted/20 text-center min-w-32">
                                              <div className="opacity-70">Earnings</div>
                                              <div className="font-mono text-sm">{fmtUsd(estEarnings)}</div>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="mt-2 text-[10px] opacity-70">Monthly compounding. Excludes gas, incentives decay, and IL.</div>
                                      </div>
                                    </div>
                                  );
                                })()
                              )}
                              {/* Pretty Swap Quote presentation */}
                              {(() => {
                                const q: any = (toolResult as any)?.details?.quote;
                                if (!q) return null;
                                const lc = (s: string) => (typeof s === "string" ? s.toLowerCase() : "");
                                // Minimal decimals/symbols map for common mainnet tokens
                                const DECIMALS: Record<string, number> = {
                                  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": 18, // WETH
                                  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": 6,  // USDC
                                  "0xdac17f958d2ee523a2206206994597c13d831ec7": 6,  // USDT
                                  "0x6b175474e89094c44da98b954eedeac495271d0f": 18, // DAI
                                };
                                const SYMBOL: Record<string, string> = {
                                  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH",
                                  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",
                                  "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
                                  "0x6b175474e89094c44da98b954eedeac495271d0f": "DAI",
                                };
                                const sellAddr = lc(q.sellTokenAddress || "");
                                const buyAddr = lc(q.buyTokenAddress || "");
                                const sellDec = DECIMALS[sellAddr] ?? 18;
                                const buyDec = DECIMALS[buyAddr] ?? 18;
                                function formatUnits(val: string | number | null | undefined, dec: number) {
                                  if (!val && val !== 0) return "-";
                                  try {
                                    const bi = BigInt(String(val));
                                    const base = BigInt(10) ** BigInt(dec);
                                    const whole = bi / base;
                                    const frac = bi % base;
                                    // keep up to 6 fractional digits trimmed
                                    const fracStr = frac.toString().padStart(dec, "0").slice(0, 6).replace(/0+$/, "");
                                    return fracStr ? `${whole.toString()}.${fracStr}` : whole.toString();
                                  } catch {
                                    return String(val);
                                  }
                                }
                                const sellAmt = formatUnits(q.grossSellAmount, sellDec);
                                const buyAmt = formatUnits(q.grossBuyAmount, buyDec);
                                const price = typeof q.price === "number" && isFinite(q.price)
                                  ? q.price
                                  : (() => {
                                      // derive when missing
                                      try {
                                        const sa = Number(sellAmt);
                                        const ba = Number(buyAmt);
                                        if (isFinite(sa) && sa > 0 && isFinite(ba)) return ba / sa;
                                      } catch {}
                                      return null;
                                    })();
                                const sellSym = SYMBOL[sellAddr] || (sellAddr ? `${sellAddr.slice(0,6)}…${sellAddr.slice(-4)}` : "");
                                const buySym = SYMBOL[buyAddr] || (buyAddr ? `${buyAddr.slice(0,6)}…${buyAddr.slice(-4)}` : "");
                                const gwei = q.gasPrice ? Number(q.gasPrice) / 1e9 : null;
                                const gasEth = q.gasPrice && q.estimatedGas ? (Number(q.gasPrice) / 1e18) * Number(q.estimatedGas) : null;
                                const short = (a?: string | null) => (a && a.startsWith("0x") ? `${a.slice(0,6)}…${a.slice(-4)}` : a || "-");
                                const needsApproval = !!q.allowanceTarget && sellSym !== "ETH";
                                const fmtNum = (n: number) => (Math.abs(n) >= 1 ? n.toFixed(6) : n.toPrecision(6));
                                // New: min receive using UI slippage control
                                const buyAmtNum = Number(buyAmt);
                                const minReceive = Number.isFinite(buyAmtNum)
                                  ? buyAmtNum * Math.max(0, (100 - (Number(maxSlippagePct) || 0)) / 100)
                                  : null;
                                // New: 0x fee (volume fee) in sell token units if present
                                const zeroExFeeAmt = q?.fees?.zeroExFee?.amount ? formatUnits(q.fees.zeroExFee.amount, sellDec) : null;
                                const blockNumber = q?.blockNumber ? String(q.blockNumber) : null;
                                return (
                                  <div className="space-y-3">
                                    <div className="grid gap-2 sm:grid-cols-3 text-xs">
                                      <div className="p-2 rounded-md border bg-muted/20">
                                        <div className="opacity-70">Sell</div>
                                        <div className="font-mono text-sm tabular-nums truncate" title={`${sellAmt} {sellSym}`}>{sellAmt} {sellSym}</div>
                                      </div>
                                      <div className="p-2 rounded-md border bg-muted/20">
                                        <div className="opacity-70">Buy (est)</div>
                                        <div className="font-mono text-sm tabular-nums truncate" title={`${buyAmt} {buySym}`}>{Number.isFinite(Number(buyAmt)) ? Number(buyAmt).toFixed(3) : buyAmt} {buySym}</div>
                                       </div>
                                       <div className="p-2 rounded-md border bg-muted/20">
                                         <div className="opacity-70">Price</div>
                                         <div className="font-mono text-sm tabular-nums">{price ? `${fmtNum(price)} ${buySym}/${sellSym}` : "—"}</div>
                                       </div>
                                     </div>
                                     <div className="grid gap-2 sm:grid-cols-3 text-xs">
                                       <div className="p-2 rounded-md border bg-muted/20">
                                         <div className="opacity-70">Est. Gas</div>
                                         <div className="font-mono">{q.estimatedGas ?? "—"} units</div>
                                         {gwei ? <div className="font-mono opacity-70">{gwei.toFixed(1)} gwei</div> : null}
                                       </div>
                                       <div className="p-2 rounded-md border bg-muted/20">
                                         <div className="opacity-70">Gas (native)</div>
                                         <div className="font-mono">{gasEth ? `${gasEth.toFixed(6)} ETH` : "—"}</div>
                                       </div>
                                       <div className="p-2 rounded-md border bg-muted/20">
                                         <div className="opacity-70">Allowance Target</div>
                                         <div className="w-full flex flex-col items-center text-center gap-1">
                                           <span className="font-mono text-xs truncate max-w-full">{short(q.allowanceTarget)}</span>
                                           {needsApproval && (
                                             <Badge
                                               variant="outline"
                                               className="h-5 px-2 text-[10px] whitespace-nowrap rounded-full"
                                             >
                                               approval needed
                                             </Badge>
                                           )}
                                           {/* Details */}
                                           <div className="mt-0.5 grid grid-cols-1 gap-0.5 text-[10px] opacity-80">
                                             {/* remove Spender row for now */}
                                             {sellAddr && (
                                               <div className="inline-flex items-center justify-center gap-1">
                                                 <span className="opacity-70">Token:</span>
                                                 <span className="font-mono">{short(sellAddr)}</span>
                                                 <button
                                                   type="button"
                                                   className="inline-flex items-center gap-1 hover:opacity-100"
                                                   onClick={() => navigator.clipboard?.writeText(String(sellAddr))}
                                                 >
                                                   <Copy className="h-3 w-3" /> Copy
                                                 </button>
                                               </div>
                                             )}
                                           </div>
                                         </div>
                                       </div>
                                     </div>
                                     {/* New: Min receive and Fees */}
                                     <div className="grid gap-2 sm:grid-cols-3 text-xs">
                                       <div className="p-2 rounded-md border bg-muted/20">
                                         <div className="opacity-70">Min receive ({maxSlippagePct}% slippage)</div>
                                         <div className="font-mono">{minReceive ? `${minReceive.toFixed(6)} ${buySym}` : "—"}</div>
                                       </div>
                                       <div className="p-2 rounded-md border bg-muted/20">
                                         <div className="opacity-70">0x Fee</div>
                                         <div className="font-mono">{zeroExFeeAmt ? `${zeroExFeeAmt} ${sellSym}` : "—"}</div>
                                       </div>
                                       <div className="p-2 rounded-md border bg-muted/20">
                                         <div className="opacity-70">Block</div>
                                         <div className="font-mono">{blockNumber || "—"}</div>
                                       </div>
                                     </div>
                                     {Array.isArray(q.sources) && q.sources.length > 0 && (
                                       <div className="text-[11px] opacity-80">
                                         Route sources: {q.sources.map((s: any, i: number) => (typeof s === "string" ? s : (s?.name || s?.id || `src${i+1}`))).join(", ")}
                                       </div>
                                     )}
                                   </div>
                                );
                              })()}
                              {/* Pretty Bridge summary (Rango) */}
                              {(() => {
                                const b: any = (toolResult as any)?.details;
                                if (!b) return null;
                                const looksBridge = (
                                  b.provider === "rango" ||
                                  typeof b.estimatedDuration === "number" ||
                                  typeof b.toAmount === "string" || typeof b.toAmountMin === "string" ||
                                  Array.isArray(b.feeCosts)
                                );
                                if (!looksBridge) return null;
                                // Helpers
                                const formatUnits = (val?: string | null, dec = 18) => {
                                  if (!val) return "—";
                                  try {
                                    const bi = BigInt(val);
                                    const base = BigInt(10) ** BigInt(dec);
                                    const whole = bi / base;
                                    const frac = bi % base;
                                    const s = frac.toString().padStart(dec, "0").slice(0, 6).replace(/0+$/, "");
                                    return s ? `${whole.toString()}.${s}` : whole.toString();
                                  } catch { return "—"; }
                                };
                                // Try to infer decimals/symbol from raw route (if present) without showing raw
                                const rawTo = b?.raw?.route?.to;
                                const rawRoute = b?.raw?.route || {};
                                const toSym = rawTo?.symbol || "";
                                // Determine decimals with robust fallback by symbol (USDC/USDT 6, DAI/WETH/ETH 18)
                                const symDecMap: Record<string, number> = { USDC: 6, USDT: 6, DAI: 18, WETH: 18, ETH: 18 };
                                const toDec = typeof rawTo?.decimals === "number" && isFinite(rawTo.decimals)
                                  ? rawTo.decimals
                                  : (symDecMap[(toSym || "").toUpperCase()] ?? 18);
                                const etaSec = Number(b.estimatedDuration || b?.raw?.route?.estimatedTimeInSeconds || 0);
                                const eta = etaSec ? `${Math.round(etaSec/60)} min` : "—";
                                // Fees
                                const fees: Array<{ label: string; text: string; usd?: string }> = [];
                                if (Array.isArray(b.feeCosts)) {
                                  for (const f of b.feeCosts.slice(0, 2)) {
                                    const name = f?.name || "Fee";
                                    const dec = Number(f?.token?.decimals) || 18;
                                    const sym = f?.token?.symbol || "";
                                    const amt = formatUnits(f?.amount, dec);
                                    let usd: string | undefined;
                                    const px = Number(f?.token?.usdPrice);
                                    const amtNum = Number(amt);
                                    if (isFinite(px) && isFinite(amtNum)) usd = `$${(px * amtNum).toFixed(2)}`;
                                    fees.push({ label: name, text: `${amt} ${sym}`, usd });
                                  }
                                }
                                // Compute receive amounts and truncate to 3 decimals
                                const expRecvNum = b.toAmount ? Number(formatUnits(b.toAmount, toDec)) : NaN;
                                const minRecvNum = b.toAmountMin ? Number(formatUnits(b.toAmountMin, toDec)) : NaN;
                                const expRecv = Number.isFinite(expRecvNum) ? `${expRecvNum.toFixed(3)} ${toSym}` : "—";
                                const minRecv = Number.isFinite(minRecvNum) ? `${minRecvNum.toFixed(3)} ${toSym}` : "—";
                                // New: extra insights from Rango JSON
                                const routerTitle = rawRoute?.swapper?.title || rawRoute?.swapper?.id || b?.swapper?.title || "";
                                const impactPct = rawRoute?.priceImpactUsdPercent != null ? Number(rawRoute.priceImpactUsdPercent) : undefined;
                                const outUsdNum = Number(rawRoute?.outputAmountUsd);
                                const fromDec = Number(rawRoute?.from?.decimals) || 18;
                                const fromSym = rawRoute?.from?.symbol || "";
                                const limits = rawRoute?.amountRestriction;
                                const minInStr = limits?.min ? `${formatUnits(limits.min, fromDec)} ${fromSym}` : null;
                                const maxInStr = limits?.max ? `${formatUnits(limits.max, fromDec)} ${fromSym}` : null;
                                const inputAmtStr = rawRoute?.path?.[0]?.inputAmount ? `${formatUnits(rawRoute.path[0].inputAmount, fromDec)} ${fromSym}` : null;
                                const toAddr: string | undefined = rawTo?.address;
                                const toAddrShort = toAddr && toAddr.startsWith("0x") ? `${toAddr.slice(0,6)}…${toAddr.slice(-4)}` : toAddr || "—";
                                return (
                                  <div className="space-y-3">
                                    {/* Badges row: Router + Impact */}
                                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                      {routerTitle && (
                                        <Badge variant="secondary" className="rounded-full">via {routerTitle}</Badge>
                                      )}
                                      {impactPct != null && (
                                        <Badge variant={Math.abs(impactPct) < 0.2 ? "outline" : (impactPct < 1 ? "secondary" : "destructive")} className="rounded-full">
                                          {Math.abs(impactPct) < 0.2 ? "Low" : impactPct < 1 ? "Moderate" : "High"} impact {impactPct.toFixed(2)}%
                                        </Badge>
                                      )}
                                      {minInStr && maxInStr && (
                                        <Badge variant="outline" className="rounded-full">limits {minInStr} – {maxInStr}</Badge>
                                      )}
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-3 text-xs">
                                      <div className="p-2 rounded-md border bg-muted/20">
                                        <div className="opacity-70">ETA</div>
                                        <div className="font-mono text-sm">{eta}</div>
                                      </div>
                                      <div className="p-2 rounded-md border bg-muted/20">
                                        <div className="opacity-70">Expected receive</div>
                                        <div className="font-mono text-sm truncate" title={expRecv}>{expRecv}</div>
                                      </div>
                                      <div className="p-2 rounded-md border bg-muted/20">
                                        <div className="opacity-70">Min receive</div>
                                        <div className="font-mono text-sm truncate" title={minRecv}>{minRecv}</div>
                                      </div>
                                    </div>
                                    {/* New: Router, Price Impact, Output USD */}
                                    <div className="grid gap-2 sm:grid-cols-3 text-xs">
                                      <div className="p-2 rounded-md border bg-muted/20">
                                        <div className="opacity-70">Router</div>
                                        <div className="font-mono text-sm truncate" title={routerTitle || "—"}>{routerTitle || "—"}</div>
                                      </div>
                                      <div className="p-2 rounded-md border bg-muted/20">
                                        <div className="opacity-70">Price impact</div>
                                        <div className="font-mono text-sm">{impactPct != null ? `${impactPct.toFixed(2)}%` : "—"}</div>
                                      </div>
                                      <div className="p-2 rounded-md border bg-muted/20">
                                        <div className="opacity-70">Output (USD)</div>
                                        <div className="font-mono text-sm">{isFinite(outUsdNum) && outUsdNum > 0 ? `$${outUsdNum.toFixed(2)}` : "—"}</div>
                                      </div>
                                    </div>
                                    {/* New: Input amount + Output token */}
                                    <div className="grid gap-2 sm:grid-cols-3 text-xs">
                                      <div className="p-2 rounded-md border bg-muted/20">
                                        <div className="opacity-70">Input</div>
                                        <div className="font-mono text-sm">{inputAmtStr || "—"}</div>
                                      </div>
                                      <div className="p-2 rounded-md border bg-muted/20 sm:col-span-2">
                                        <div className="opacity-70">Output token</div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono text-xs truncate" title={toAddr || "—"}>{toAddrShort}</span>
                                          {toAddr && (
                                            <button
                                              type="button"
                                              className="inline-flex items-center gap-1 text-[10px] underline underline-offset-4 opacity-80 hover:opacity-100"
                                              onClick={() => navigator.clipboard?.writeText(String(toAddr))}
                                            >
                                              <Copy className="h-3.5 w-3.5" /> Copy
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {/* New: Amount limits */}
                                    {(minInStr || maxInStr) && (
                                      <div className="p-2 rounded-md border bg-muted/20 text-xs">
                                        <div className="opacity-70">Amount limits</div>
                                        <div className="font-mono text-sm">{minInStr || "—"} – {maxInStr || "—"}</div>
                                      </div>
                                    )}
                                    {fees.length > 0 && (
                                      <div className="grid gap-2 sm:grid-cols-2 text-xs">
                                        {fees.map((f, i) => (
                                          <div key={i} className="p-2 rounded-md border bg-muted/20">
                                            <div className="opacity-70">{f.label}</div>
                                            <div className="font-mono text-sm">{f.text}{f.usd ? ` · ${f.usd}` : ""}</div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {/* Quick actions */}
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                      {minRecv !== "—" && (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-7 px-2 text-[11px]"
                                          onClick={() => navigator.clipboard?.writeText(minRecv)}
                                        >
                                          <Copy className="h-3.5 w-3.5 mr-1" /> Copy min receive
                                        </Button>
                                      )}
                                      {toAddr && (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-7 px-2 text-[11px]"
                                          onClick={() => navigator.clipboard?.writeText(String(toAddr))}
                                        >
                                          <Copy className="h-3.5 w-3.5 mr-1" /> Copy token address
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                              {/* Condensed Chain TVL view */}
                              {Array.isArray(toolResult?.details) && (
                                (() => {
                                  type Pt = { date: number | string; totalLiquidityUSD?: number; total?: number; tvl?: number };
                                  const raw: Pt[] = (toolResult as any).details as any;
                                  const pts = raw
                                    .map((p: Pt) => ({
                                      t: typeof p.date === "string" ? parseInt(p.date, 10) : Number(p.date),
                                      v: Number((p.totalLiquidityUSD ?? p.total ?? p.tvl) || 0),
                                    }))
                                    .filter((x) => Number.isFinite(x.t) && Number.isFinite(x.v))
                                    .sort((a, b) => a.t - b.t);
                                  if (pts.length === 0) return null;
                                  const now = pts[pts.length - 1].t;
                                  const findClosest = (targetSec: number) => {
                                    // binary search-ish
                                    let lo = 0, hi = pts.length - 1;
                                    while (lo < hi) {
                                      const mid = (lo + hi) >> 1;
                                      if (pts[mid].t < targetSec) lo = mid + 1; else hi = mid;
                                    }
                                    return Math.max(0, Math.min(pts.length - 1, lo));
                                  };
                                  const day = 86400;
                                  const i1d = findClosest(now - 1 * day);
                                  const i7d = findClosest(now - 7 * day);
                                  const i30d = findClosest(now - 30 * day);
                                  const curr = pts[pts.length - 1].v;
                                  const pv1d = pts[i1d]?.v ?? curr;
                                  const pv7d = pts[i7d]?.v ?? curr;
                                  const pv30d = pts[i30d]?.v ?? curr;
                                  const pct = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : 0);
                                  const c1 = pct(curr, pv1d);
                                  const c7 = pct(curr, pv7d);
                                  const c30 = pct(curr, pv30d);
                                  const ath = Math.max(...pts.map((p) => p.v));
                                  const fmtFull = (n: number) => `$${Math.round(n).toLocaleString()}`;
                                  const fmtCompact = (n: number) => {
                                    const abs = Math.abs(n);
                                    if (abs >= 1e12) return `$${(n/1e12).toFixed(2)}T`;
                                    if (abs >= 1e9) return `$${(n/1e9).toFixed(2)}B`;
                                    if (abs >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
                                    if (abs >= 1e3) return `$${(n/1e3).toFixed(1)}K`;
                                    return `$${Math.round(n).toLocaleString()}`;
                                  };
                                  const pc = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
                                  // Build compact chart dataset (time label + tvl value)
                                  const mini = pts.map(p => ({
                                    time: new Date((Number(p.t) || 0) * 1000).toLocaleDateString(),
                                    tvl: p.v,
                                  }));
                                   return (
                                     <div className="space-y-2">
                                       <div className="grid gap-2 sm:grid-cols-4 text-xs">
                                         <div className="p-2 rounded-md border bg-muted/20">
                                           <div className="opacity-70">Current TVL</div>
                                           <div className="font-mono text-sm tabular-nums max-w-full truncate" title={fmtFull(curr)}>
                                             <span className="whitespace-nowrap">{fmtCompact(curr)}</span>
                                           </div>
                                         </div>
                                         <div className="p-2 rounded-md border bg-muted/20">
                                           <div className="opacity-70">24h</div>
                                           <div className={`font-mono ${c1>=0?"text-green-600":"text-red-600"}`}>{pc(c1)}</div>
                                         </div>
                                         <div className="p-2 rounded-md border bg-muted/20">
                                           <div className="opacity-70">7d</div>
                                           <div className={`font-mono ${c7>=0?"text-green-600":"text-red-600"}`}>{pc(c7)}</div>
                                         </div>
                                         <div className="p-2 rounded-md border bg-muted/20">
                                           <div className="opacity-70">30d</div>
                                           <div className={`font-mono ${c30>=0?"text-green-600":"text-red-600"}`}>{pc(c30)}</div>
                                         </div>
                                       </div>
                                       <div className="text-[11px] opacity-70">
                                         ATH: <span className="font-mono tabular-nums">{fmtFull(ath)}</span>
                                       </div>
                                       <div className="h-28">
                                         <ResponsiveContainer width="100%" height="100%">
                                           <AreaChart data={mini}>
                                             <defs>
                                               <linearGradient id="tvlColor" x1="0" y1="0" x2="0" y2="1">
                                                 <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                                                 <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                                               </linearGradient>
                                             </defs>
                                             <Area type="monotone" dataKey="tvl" stroke="var(--primary)" strokeWidth={2} fill="url(#tvlColor)" />
                                             <XAxis dataKey="time" hide />
                                             <YAxis hide />
                                             <RechartsTooltip contentStyle={{ borderRadius: '8px', backgroundColor: 'var(--background)', border: '1px solid var(--border)' }} formatter={(v:any)=>[fmtFull(Number(v)), "TVL"]} labelFormatter={(l)=>l} />
                                           </AreaChart>
                                         </ResponsiveContainer>
                                       </div>
                                     </div>
                                   );
                                })()
                              )}
                              {/* Fallback raw JSON removed to keep UI clean */}
                              {/* {toolResult.details && !Array.isArray(toolResult.details) && !(toolResult as any)?.details?.quote && (
                                <pre className="text-xs bg-muted/40 p-2 rounded-md overflow-x-auto">{JSON.stringify(toolResult.details, null, 2)}</pre>
                              )} */}
                              {toolResult.references && Array.isArray(toolResult.references) && (
                                <div className="mt-3 text-xs opacity-80 flex flex-wrap gap-2">
                                  {toolResult.references.map((ref: any, idx: number) => {
                                    const label = typeof ref === "string" ? ref : ref.label || ref.url;
                                    const url = typeof ref === "string" ? ref : ref.url;
                                    return (
                                      <a key={idx} href={url} className="underline underline-offset-4 hover:text-foreground/80" target={url?.startsWith("/") ? "_self" : "_blank"} rel="noreferrer">
                                        {label}
                                      </a>
                                    );
                                  })}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      {/* Moved: Planner loading and errors */}
                      {planLoading && (
                        <Alert className="mt-2 border-border/50">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <AlertDescription className="text-sm font-medium">{globalLoadingMsg || "Planning… orchestrating steps and quotes."}</AlertDescription>
                        </Alert>
                      )}
                      {planError && (
                        <Alert variant="destructive" className="mt-2 border-destructive/50">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="font-medium">{planError}</AlertDescription>
                        </Alert>
                      )}

                      {/* Moved: Plan Steps */}
                      {planResult?.ok && Array.isArray(planResult.steps) && planResult.steps.length > 0 && (
                        <Card className="border-border/40 bg-background rounded-lg">
                          <CardHeader className="pb-2 bg-muted/20">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Layers className="h-4 w-4" /> Plan Steps
                              {planResult?.runId && (
                                <span className="ml-auto flex items-center gap-2">
                                  <span className="text-[10px] opacity-70 font-mono">Run: {planResult.runId}{planResult?.timings?.durationMs ? ` · ${planResult.timings.durationMs}ms` : ""}</span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 px-2 text-[10px]"
                                    onClick={() => runPlanner()}
                                    aria-label="Rerun with constraints"
                                  >
                                    Rerun with constraints
                                  </Button>
                                  <Input
                                    value={runLabel}
                                    onChange={(e) => setRunLabel(e.target.value)}
                                    placeholder="Label"
                                    className="h-6 px-2 text-[11px] w-28"
                                    aria-label="Run label"
                                  />
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="h-6 px-2 text-[11px]"
                                    onClick={() => saveCurrentRun(runLabel)}
                                    disabled={saveLoading}
                                    aria-label="Save run"
                                  >
                                    {saveLoading ? "Saving…" : savedShortId ? "Saved" : "Save Run"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 px-2 text-[11px]"
                                    onClick={() => {
                                      const base = `${window.location.origin}/oracle`;
                                      const url = savedShortId
                                        ? `${base}?id=${encodeURIComponent(savedShortId)}`
                                        : `${base}?runId=${encodeURIComponent(String(planResult.runId || ""))}&q=${encodeURIComponent(prompt || "")}`;
                                      navigator.clipboard?.writeText(url);
                                    }}
                                    aria-label="Copy share link"
                                  >
                                    Copy Share Link
                                  </Button>
                                </span>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-3 p-4 space-y-3 text-sm">
                            {prevPlanResult?.steps && Array.isArray(prevPlanResult.steps) && (
                              <div className="text-[11px] opacity-70">
                                Δ steps: {planResult.steps.length - prevPlanResult.steps.length >= 0 ? "+" : ""}{planResult.steps.length - prevPlanResult.steps.length}
                                {` · Added ${plannerDiffs.added.length}, Removed ${plannerDiffs.removed.length}, Modified ${plannerDiffs.modified.length}`}
                              </div>
                            )}
                            <ol className="space-y-2 list-decimal pl-4">
                              {planResult.steps.map((s: any, i: number) => (
                                <li key={i} className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    {s.ok ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-orange-500" />}
                                    <span className="font-medium capitalize">{s.type}</span>
                                    {plannerDiffs.added.includes(i) && <Badge variant="secondary" className="text-[10px]">added</Badge>}
                                    {plannerDiffs.modified.includes(i) && <Badge variant="outline" className="text-[10px]">modified</Badge>}
                                    {s.summary && <span className="opacity-80">— {s.summary}</span>}
                                  </div>
                                  {(() => {
                                    const rep = normalizeAndValidate();
                                    const idx1 = i + 1;
                                    const errs = rep.errors.filter((e) => e.startsWith(`Step ${idx1}:`));
                                    const warns = rep.warnings.filter((w) => w.startsWith(`Step ${idx1}:`));
                                    if (errs.length === 0 && warns.length === 0) return null;
                                    const t = String(s.type || '').toLowerCase();
                                    const canFix = t.includes('swap') || t.includes('bridge');
                                    return (
                                      <div className="pl-6 space-y-1">
                                        {errs.length > 0 && (
                                          <ul className="list-disc pl-4 text-[11px] text-red-600">
                                            {errs.map((er, k) => (<li key={k}>{ er.replace(/^Step \d+:\s*/, '') }</li>))}
                                          </ul>
                                        )}
                                        {warns.length > 0 && (
                                          <ul className="list-disc pl-4 text-[11px] text-amber-600">
                                            {warns.map((wr, k) => (<li key={k}>{ wr.replace(/^Step \d+:\s*/, '') }</li>))}
                                          </ul>
                                        )}
                                        {canFix && (
                                          <div className="pt-1">
                                            <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-[10px]"
                                              onClick={() => enrichStep(i, s.type)}>
                                              Quick fix: generate live quote
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                  {s.type === "yield" && Array.isArray(s?.details?.data) && s.details.data.length > 0 && (
                                    <div className="pl-6 text-[11px] flex flex-wrap gap-2">
                                      {(() => {
                                        const items = [...s.details.data].sort((a: any, b: any) => Number(b?.apy ?? 0) - Number(a?.apy ?? 0));
                                        const top = items[0];
                                        const apy = Number(top?.apy ?? 0);
                                        const tvl = Number(top?.tvlUsd ?? 0);
                                        return (
                                          <>
                                            {apy > 200 && (
                                              <Badge variant="destructive">Extreme APY</Badge>
                                            )}
                                            {tvl > 0 && tvl < 500000 && (
                                              <Badge variant="outline">Low TVL</Badge>
                                            )}
                                            <Badge variant="secondary">Ranked by APY</Badge>
                                            <div className="flex flex-wrap gap-1.5 w-full">
                                              {items.slice(0, 3).map((it: any, idx: number) => (
                                                <span key={idx} className="px-2 py-0.5 rounded-md bg-background border text-[10px]">
                                                  {it?.project || it?.pool || "Yield"} · {Number(it?.apy ?? 0).toFixed(2)}% APY{typeof it?.tvlUsd === "number" ? ` · TVL $${Math.round(it.tvlUsd).toLocaleString()}` : ""}
                                                </span>
                                              ))}
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  )}
                                  {s.references && Array.isArray(s.references) && (
                                    <div className="pl-6 flex flex-wrap gap-2 text-xs">
                                      {s.references.map((ref: any, idx: number) => (
                                        <a key={idx} href={ref.url} className="underline underline-offset-4 hover:text-foreground/80" target={ref.url?.startsWith("/") ? "_self" : "_blank"} rel="noreferrer">
                                          {ref.label || ref.url}
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ol>
                            {planResult.references && Array.isArray(planResult.references) && (
                              <div className="pt-2 border-t border-border/40 text-xs flex flex-wrap gap-2">
                                {planResult.references.map((ref: any, idx: number) => (
                                  <a key={idx} href={ref.url} className="underline underline-offset-4 hover:text-foreground/80" target={ref.url?.startsWith("/") ? "_self" : "_blank"} rel="noreferrer">
                                    {ref.label || ref.url}
                                  </a>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {/* Moved: Scenario Compare */}
                      {planResult?.ok && Array.isArray(planResult.steps) && planResult.steps.length > 0 && (
                        <div className="mt-3 grid gap-2 sm:gap-3 md:grid-cols-3">
                          <Card className="border-border/40 bg-background">
                            <CardHeader className="pb-2 bg-muted/20">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-primary" /> Base Scenario
                                <Badge className="ml-auto" variant="secondary">Recommended</Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3 p-4 text-xs space-y-2">
                              <div className="flex justify-between"><span className="opacity-70">Steps</span><span>{planResult.steps.length}</span></div>
                              <div className="flex justify-between"><span className="opacity-70">Est. Fees</span><span>${((planResult?.optimizer?.estimates?.feesUsd ?? (planResult.steps.length * 12)) as number).toFixed(2)}</span></div>
                              {typeof planResult?.optimizer?.estimates?.timeMinutes === "number" && (
                                <div className="flex justify-between"><span className="opacity-70">Est. Time</span><span>{planResult.optimizer.estimates.timeMinutes} min</span></div>
                              )}
                              <div className="flex justify-between"><span className="opacity-70">Est. APR</span><span>{(() => { const { baseApr } = deriveScenarioAprs(); return `${Number(baseApr || 0).toFixed(2)}%`; })()}</span></div>
                            </CardContent>
                          </Card>
                          <Card className="border-border/40 bg-background">
                            <CardHeader className="pb-2 bg-muted/20">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-primary" /> Alt A (Lower Fees)
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3 p-4 text-xs space-y-2">
                              <div className="flex justify-between"><span className="opacity-70">Steps</span><span>{Math.max(1, planResult.steps.length - 1)}</span></div>
                              <div className="flex justify-between"><span className="opacity-70">Est. Fees</span><span>${((planResult?.optimizer?.estimates?.feesUsd ?? (planResult.steps.length * 12)) as number * 0.66).toFixed(2)}</span></div>
                              <div className="flex justify-between"><span className="opacity-70">Est. APR</span><span>{(() => { const { altAApr } = deriveScenarioAprs(); return `${Number(altAApr || 0).toFixed(2)}%`; })()}</span></div>
                            </CardContent>
                          </Card>
                          <Card className="border-border/40 bg-background">
                            <CardHeader className="pb-2 bg-muted/20">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-primary" /> Alt B (Higher Yield)
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3 p-4 text-xs space-y-2">
                              <div className="flex justify-between"><span className="opacity-70">Steps</span><span>{planResult.steps.length + 1}</span></div>
                              <div className="flex justify-between"><span className="opacity-70">Est. Fees</span><span>${((planResult?.optimizer?.estimates?.feesUsd ?? (planResult.steps.length * 12)) as number * 1.5).toFixed(2)}</span></div>
                              <div className="flex justify-between"><span className="opacity-70">Est. APR</span><span>{(() => { const { altBApr } = deriveScenarioAprs(); return `${Number(altBApr || 0).toFixed(2)}%`; })()}</span></div>
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      {/* Moved: Optimizer rationale */}
                      {planResult?.optimizer?.rationale && (
                        <div className="mt-2 text-[11px] opacity-80">
                          <span className="font-medium">Optimizer:</span> {planResult.optimizer.rationale}
                        </div>
                      )}

                      {/* Moved: Flow Graph */}
                      {planResult?.ok && Array.isArray(planResult.steps) && planResult.steps.length > 0 && (
                        <Card className="mt-3 border-border/40 bg-background">
                          <CardHeader className="pb-2 bg-muted/20">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Layers className="h-4 w-4" /> Flow Graph
                              {planResult?.runId && (
                                <span className="ml-auto text-[10px] opacity-70 font-mono">Run: {planResult.runId}</span>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-3 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              {planResult.steps.map((s: any, i: number) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="px-2 py-1 rounded-md bg-muted/40 border text-xs capitalize">{s.type}</span>
                                  {i < planResult.steps.length - 1 && <ArrowRight className="h-3 w-3 opacity-60" />}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Moved: Sensitivity Analysis */}
                      {planResult?.ok && Array.isArray(planResult.steps) && planResult.steps.length > 0 && (
                        <Card className="mt-3 border-border/40 bg-background">
                          <CardHeader className="pb-2 bg-muted/20">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-primary" /> Sensitivity Analysis
                              {planResult?.runId && (
                                <span className="ml-auto text-[10px] opacity-70 font-mono">Run: {planResult.runId}</span>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-3 p-4 text-xs space-y-3">
                            <div className="grid gap-3 md:grid-cols-3">
                              <div>
                                <div className="flex justify-between mb-1"><span className="opacity-70">Amount</span><span>{sensAmountPct}%</span></div>
                                <input
                                  type="range"
                                  min={50}
                                  max={150}
                                  value={sensAmountPct}
                                  onChange={(e) => setSensAmountPct(parseInt(e.target.value))}
                                  className="w-full"
                                  aria-label="Amount sensitivity percent"
                                />
                                <div className="text-[10px] opacity-70 mt-1">Adjust principal size (50–150%)</div>
                              </div>
                              <div>
                                <div className="flex justify-between mb-1"><span className="opacity-70">APY Δ</span><span>{sensApyDelta}%</span></div>
                                <input
                                  type="range"
                                  min={-3}
                                  max={3}
                                  step={0.1}
                                  value={sensApyDelta}
                                  onChange={(e) => setSensApyDelta(parseFloat(e.target.value))}
                                  className="w-full"
                                  aria-label="APY delta percent"
                                />
                                <div className="text-[10px] opacity-70 mt-1">Change yield assumption (−3% to +3%)</div>
                              </div>
                              <div>
                                <div className="flex justify-between mb-1"><span className="opacity-70">Gas</span><span>{sensGasPct}%</span></div>
                                <input
                                  type="range"
                                  min={50}
                                  max={200}
                                  value={sensGasPct}
                                  onChange={(e) => setSensGasPct(parseInt(e.target.value))}
                                  className="w-full"
                                  aria-label="Gas cost percent"
                                />
                                <div className="text-[10px] opacity-70 mt-1">Gas/fees multiplier (50–200%)</div>
                              </div>
                            </div>

                            {/* Derived quick metrics */}
                            {(() => {
                              const steps = planResult.steps.length;
                              const baseFees = Number((planResult?.optimizer?.estimates?.feesUsd ?? steps * 12) as number);
                              const adjFees = baseFees * (sensGasPct / 100);
                              const { baseApr } = deriveScenarioAprs();
                              const adjApr = Math.max(0, baseApr + sensApyDelta);
                              const note = `Fees $${adjFees.toFixed(2)} · APR ${adjApr.toFixed(1)}% · Amount x${(sensAmountPct/100).toFixed(2)}`;
                              return (
                                <div className="grid gap-2 md:grid-cols-3">
                                  <div className="p-2 rounded-md bg-muted/30 border text-center"><div className="opacity-70">Adj. Fees</div><div className="font-mono">${adjFees.toFixed(2)}</div></div>
                                  <div className="p-2 rounded-md bg-muted/30 border text-center"><div className="opacity-70">Adj. APR</div><div className="font-mono">{adjApr.toFixed(1)}%</div></div>
                                  <div className="p-2 rounded-md bg-muted/30 border text-center"><div className="opacity-70">Scale</div><div className="font-mono">x{(sensAmountPct/100).toFixed(2)}</div></div>
                                  <div className="md:col-span-3 text-[10px] opacity-70 text-center">{note}</div>
                                </div>
                              );
                            })()}
                          </CardContent>
                        </Card>
                      )}

                      {/* Moved: Risk Heatmap */}
                      {planResult?.ok && Array.isArray(planResult.steps) && planResult.steps.length > 0 && (
                        <Card className="mt-3 border-border/40 bg-background">
                          <CardHeader className="pb-2 bg-muted/20">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-orange-500" /> Risk Heatmap
                              {planResult?.runId && (
                                <span className="ml-auto text-[10px] opacity-70 font-mono">Run: {planResult.runId}</span>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-3 p-4">
                            {(() => {
                              const steps: any[] = planResult.steps || [];
                              const hasBridge = steps.some(s => (s.type||"").toLowerCase().includes("bridge"));
                              const hasSwap = steps.some(s => (s.type||"").toLowerCase().includes("swap"));
                              const hasStake = steps.some(s => (s.type||"").toLowerCase().includes("stake") || (s.type||"").toLowerCase().includes("lend"));
                              const categories = [
                                {
                                  key: "counterparty",
                                  label: "Counterparty",
                                  score: hasStake ? 65 : 30,
                                  note: hasStake ? "Lending/staking exposure" : "Minimal CP risk",
                                },
                                {
                                  key: "bridgeDelay",
                                  label: "Bridge Delay",
                                  score: hasBridge ? 70 : 20,
                                  note: hasBridge ? "Cross-chain latency" : "Same-chain ops",
                                },
                                {
                                  key: "slippage",
                                  label: "Slippage",
                                  score: hasSwap ? 55 : 25,
                                  note: hasSwap ? "DEX price impact" : "No swap planned",
                                },
                                {
                                  key: "volatility",
                                  label: "Volatility",
                                  score: hasSwap ? 60 : 35,
                                  note: hasSwap ? "Asset price variance" : "Stable exposure",
                                },
                                {
                                  key: "smartContract",
                                  label: "Smart Contract",
                                  score: steps.length > 2 ? 60 : 40,
                                  note: steps.length > 2 ? "Multi-protocol surface" : "Limited surface",
                                },
                              ];
                              return (
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-1 sm:gap-2">
                                  {categories.map(cat => (
                                    <div key={cat.key} className="p-2 rounded-md border bg-muted/20 text-center">
                                      <div className="text-xs opacity-70">{cat.label}</div>
                                      <div className={`mt-1 text-sm font-semibold ${cat.score >= 70 ? "text-orange-600" : cat.score >= 50 ? "text-amber-600" : "text-green-600"}`}>{cat.score}/100</div>
                                      <div className="mt-1 text-[10px] opacity-70">{cat.note}</div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </CardContent>
                        </Card>
                      )}

                      {/* Moved: Monte Carlo Outcomes */}
                      {mounted && planResult?.ok && result?.amount && Array.isArray(result?.yieldData) && result.yieldData.length > 0 && (
                        <Card className="mt-3 border-border/40 bg-background">
                          <CardHeader className="pb-2 bg-muted/20">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-primary" /> Monte Carlo Outcomes
                              {planResult?.runId && (
                                <span className="ml-auto text-[10px] opacity-70 font-mono">Run: {planResult.runId}</span>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-2 p-3 sm:pt-3 sm:p-4 text-xs">
                            {(() => {
                              const principal = Number(result.amount) || 0;
                              const baseApy = Number(result.topYield?.apy ?? 5) / 100; // as decimal
                              const months = 12;
                              // simulate N paths with monthly random APY noise (Box-Muller)
                              const N = 300;
                              const sigma = 0.6 * baseApy; // variance proxy
                              const samples: number[] = [];
                              function randn() {
                                let u = 0, v = 0;
                                while (u === 0) u = Math.random();
                                while (v === 0) v = Math.random();
                                return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
                              }
                              for (let i = 0; i < N; i++) {
                                let value = principal;
                                for (let m = 0; m < months; m++) {
                                  const monthly = (baseApy + sigma * randn()) / 12;
                                  value = value * (1 + Math.max(-0.99, monthly));
                                }
                                samples.push(value);
                              }
                              samples.sort((a,b)=>a-b);
                              const p = (q: number) => samples[Math.min(samples.length-1, Math.max(0, Math.floor(q*(samples.length-1))))];
                              const p10 = p(0.10);
                              const p50 = p(0.50);
                              const p90 = p(0.90);
                              // histogram bins
                              const bins = 16;
                              const min = samples[0];
                              const max = samples[samples.length-1];
                              const width = (max - min) / bins || 1;
                              const counts = new Array(bins).fill(0);
                              samples.forEach(s => {
                                const idx = Math.min(bins-1, Math.max(0, Math.floor((s - min) / width)));
                                counts[idx]++;
                              });
                              const maxCount = Math.max(...counts);
                              return (
                                <div className="space-y-3">
                                  <div className="grid gap-2 md:grid-cols-3">
                                    <div className="p-2 rounded-md bg-muted/30 border text-center">
                                      <div className="opacity-70">P10</div>
                                      <div className="font-mono">${p10.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                                    </div>
                                    <div className="p-2 rounded-md bg-muted/30 border text-center">
                                      <div className="opacity-70">P50 (Median)</div>
                                      <div className="font-mono">${p50.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                                    </div>
                                    <div className="p-2 rounded-md bg-muted/30 border text-center">
                                      <div className="opacity-70">P90</div>
                                      <div className="font-mono">${p90.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                                    </div>
                                  </div>
                                  <div className="mt-1">
                                    <div className="flex items-end gap-1 h-20 sm:h-24">
                                      {counts.map((c, i) => (
                                        <div key={i} className="flex-1 bg-primary/30 rounded-sm" style={{ height: `${(c/maxCount)*100 || 2}%` }} />
                                      ))}
                                    </div>
                                    <div className="flex justify-between text-[10px] opacity-70 mt-1">
                                      <span>${Math.round(min).toLocaleString()}</span>
                                      <span>${Math.round(max).toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </CardContent>
                        </Card>
                      )}

                      {/* Moved: Execution Preview + Sign dialog + Pre-sign report */}
                      {planResult?.ok && Array.isArray(planResult.steps) && planResult.steps.length > 0 && (
                        <>
                          <Card className="mt-3 border-border/40 bg-background">
                            <CardHeader className="pb-2 bg-muted/20">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Settings className="h-4 w-4" /> Execution Preview
                                {planResult?.runId && (
                                  <span className="ml-auto text-[10px] opacity-70 font-mono">Run: {planResult.runId}</span>
                                )}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3 p-4 text-xs">
                              <div className="mb-2 flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const rep = normalizeAndValidate();
                                    const list = rep.txs.length ? rep.txs : fallbackTxs;
                                    const txs = list.map((t) => ({ ...t, ...(enrichedTxMap[t.id] || {}) }));
                                    const payload = { runId: planResult?.runId, intent: planResult?.intent, txs };
                                    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
                                  }}
                                  className="h-7 px-2"
                                >
                                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy JSON
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const rep = normalizeAndValidate();
                                    const list = rep.txs.length ? rep.txs : fallbackTxs;
                                    const txs = list.map((t) => ({ ...t, ...(enrichedTxMap[t.id] || {}) }));
                                    const payload = { runId: planResult?.runId, intent: planResult?.intent, txs };
                                    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = `execution-preview-${planResult?.runId || Date.now()}.json`;
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                    URL.revokeObjectURL(url);
                                  }}
                                  className="h-7 px-2"
                                >
                                  <Download className="h-3.5 w-3.5 mr-1" /> Download JSON
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-7 px-2"
                                  onClick={() => setSignOpen(true)}
                                >
                                  Review & Sign
                                </Button>
                                 <span className="opacity-70">{(() => { const rep = normalizeAndValidate(); const c = rep.txs.length || fallbackTxs.length; return `Previewing first 3 of ${c} tx(s)` })()}</span>
                                 {autoEnriching && <Badge variant="outline" className="text-[10px]">auto-enriching…</Badge>}
                              </div>
                              {fallbackNotice && (
                                <Alert className="mb-2 border-border/50">
                                  <Info className="h-4 w-4" />
                                  <AlertDescription className="text-xs">{fallbackNotice}</AlertDescription>
                                </Alert>
                              )}
                              <pre className="bg-muted/40 p-2 rounded-md overflow-x-auto">
 {JSON.stringify(
   (() => {
     const rep = normalizeAndValidate();
     const list = rep.txs.length ? rep.txs : fallbackTxs;
     const slice = list.slice(0, 3).map((t) => ({ ...t, ...(enrichedTxMap[t.id] || {}) }));
     return slice;
   })(),
   null,
   2
 )}
                              </pre>
                              <div className="mt-2 text-[10px] opacity-70">
                                This is a client-side preview. {fallbackNotice ? 'Fallback live quote used.' : 'Auto-enrichment applied to empty calldata when possible.'} Copy includes full run payload for all steps.
                              </div>
                            </CardContent>
                          </Card>

                          <Dialog open={signOpen} onOpenChange={setSignOpen}>
                            <DialogContent className="sm:max-w-xl">
                              <DialogHeader>
                                <DialogTitle>Review & Sign</DialogTitle>
                                <DialogDescription>
                                  Carefully review each prepared transaction. Signing does not auto-send; execution remains manual.
                                </DialogDescription>
                              </DialogHeader>
                              {/* Wallet readiness checklist */}
                              <div className="mb-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                                <div className={`p-2 rounded-md border ${walletReady.connected ? 'border-green-500/40 bg-green-500/10' : 'border-border/40 bg-muted/20'}`}>
                                  <div className="flex items-center gap-1">{walletReady.connected ? <CheckCircle className="h-3.5 w-3.5 text-green-500"/> : <AlertCircle className="h-3.5 w-3.5 text-amber-500"/>} Connected</div>
                                </div>
                                <div className={`p-2 rounded-md border ${walletReady.correctChain ? 'border-green-500/40 bg-green-500/10' : 'border-border/40 bg-muted/20'}`}>
                                  <div className="flex items-center gap-1">{walletReady.correctChain ? <CheckCircle className="h-3.5 w-3.5 text-green-500"/> : <AlertCircle className="h-3.5 w-3.5 text-amber-500"/>} Correct chain</div>
                                </div>
                                <div className={`p-2 rounded-md border ${walletReady.gasSane ? 'border-green-500/40 bg-green-500/10' : 'border-border/40 bg-muted/20'}`}>
                                  <div className="flex items-center gap-1">{walletReady.gasSane ? <CheckCircle className="h-3.5 w-3.5 text-green-500"/> : <AlertCircle className="h-3.5 w-3.5 text-amber-500"/>} Gas estimate sanity</div>
                                </div>
                              </div>
                              <div className="space-y-2 text-xs">
                                {(() => {
                                  const rep = normalizeAndValidate();
                                  return rep.txs.slice(0, 5).map((origTx, idx) => {
                                    const tx = { ...origTx, ...(enrichedTxMap[origTx.id] || {}) };
                                    const toShort = `${tx.to.slice(0,6)}…${tx.to.slice(-4)}`;
                                    return (
                                      <div key={idx} className="rounded-md border bg-muted/20 p-2">
                                        <div className="flex items-center justify-between">
                                          <div className="font-medium capitalize">{tx.type || `step ${idx + 1}`}</div>
                                          <div className="opacity-70">Chain ID: {tx.chainId}</div>
                                        </div>
                                        <div className="mt-1 grid grid-cols-2 gap-2">
                                          <div className="space-y-1">
                                            <div className="opacity-70">To</div>
                                            <div className="font-mono text-[11px] flex items-center gap-2">{toShort}{enrichedTxMap[origTx.id]?.to && <Badge variant="secondary" className="text-[9px]">enriched</Badge>}</div>
                                          </div>
                                          <div className="space-y-1">
                                            <div className="opacity-70">Value</div>
                                            <div className="font-mono text-[11px] flex items-center gap-2">{tx.value}{enrichedTxMap[origTx.id]?.value && <Badge variant="secondary" className="text-[9px]">enriched</Badge>}</div>
                                          </div>
                                          <div className="space-y-1 col-span-2">
                                            <div className="opacity-70">Data</div>
                                            <div className="font-mono text-[10px] break-all max-h-16 overflow-y-auto flex items-start gap-2">{tx.data}{enrichedTxMap[origTx.id]?.data && <Badge variant="secondary" className="text-[9px] h-5">enriched</Badge>}</div>
                                          </div>
                                          <div className="space-y-1">
                                            <div className="opacity-70">Gas (est)</div>
                                            <div className="font-mono text-[11px] flex items-center gap-2">{tx.gasEst}{enrichedTxMap[origTx.id]?.gasEst && <Badge variant="secondary" className="text-[9px]">enriched</Badge>}</div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                              <div className="mt-2 rounded-md border bg-muted/20 p-2 text-[11px]">
                                Safety checks applied: allowlist targets, zero-value default, gas bounds. Execution disabled in this preview.
                              </div>
                              {validationReport && (
                                <div className="mt-3 rounded-md border bg-muted/10 p-3 text-xs">
                                  <div className={`font-medium ${validationReport.ok ? "text-green-600" : "text-orange-600"}`}>
                                    {validationReport.ok ? "All checks passed. Ready to request signature (sending disabled)." : "Issues found. Please review before signing."}
                                  </div>
                                  {validationReport.warnings.length > 0 && (
                                    <div className="mt-2">
                                      <div className="opacity-70 mb-1">Warnings</div>
                                      <ul className="list-disc pl-5 space-y-1">
                                        {validationReport.warnings.map((w, i) => (
                                          <li key={i}>{w}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {validationReport.errors.length > 0 && (
                                    <div className="mt-2">
                                      <div className="opacity-70 mb-1">Errors</div>
                                      <ul className="list-disc pl-5 space-y-1 text-red-600">
                                        {validationReport.errors.map((er, i) => (
                                          <li key={i}>{er}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                              {signError && (
                                <Alert variant="destructive" className="mt-3">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription className="text-xs">{signError}</AlertDescription>
                                </Alert>
                              )}
                              {signedTxs.length > 0 && (
                                <Alert className="mt-3">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <AlertDescription className="text-xs">
                                    Submitted tx hash{signedTxs.length > 1 ? "es" : ""}: {signedTxs.map((h, i) => (
                                      <span key={i} className="font-mono break-all">{h}{i < signedTxs.length - 1 ? ", " : ""}</span>
                                    ))}
                                  </AlertDescription>
                                </Alert>
                              )}
                              <DialogFooter className="flex items-center justify-between gap-2">
                                {hasWalletConnect && (
                                  <div>
                                    <ConnectButton.Custom>
                                      {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
                                        const connected = mounted && !!account && !!chain;
                                        return (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => (connected ? openAccountModal() : openConnectModal())}
                                            className="h-8 px-2 rounded-md border border-border/60 bg-background/60 dark:bg-background/20 backdrop-blur-sm supports-[backdrop-filter]:bg-background/40 hover:bg-accent/60 dark:hover:bg-accent/30 transition-shadow shadow-sm hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
                                          >
                                            {connected ? `Wallet: ${account.displayName}` : "Connect Wallet"}
                                          </Button>
                                        );
                                      }}
                                    </ConnectButton.Custom>
                                  </div>
                                )}
                                <div className="ml-auto flex items-center gap-2">
                                  {signAllRunning ? (
                                    <>
                                      <span className="text-[11px] opacity-80">Signing {signAllProgress.current}/{signAllProgress.total}…</span>
                                      <Button type="button" variant="outline" size="sm" onClick={() => setSignAllCancelled(true)}>
                                        Cancel
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      onClick={signAllSequential}
                                      disabled={signValidating || signing}
                                    >
                                      Sign All
                                    </Button>
                                  )}
                                  <Button type="button" variant="outline" size="sm" onClick={() => setSignOpen(false)} disabled={signAllRunning}>
                                    Close
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={async () => {
                                      setSignValidating(true);
                                      try {
                                        const report = normalizeAndValidate();
                                        setValidationReport(report);
                                        if (report.ok) {
                                          await requestWalletSignature();
                                        }
                                      } finally {
                                        setSignValidating(false);
                                      }
                                    }}
                                    disabled={signValidating || signing || signAllRunning}
                                  >
                                    {signing ? "Requesting signature…" : signValidating ? "Validating…" : "Sign Selected"}
                                  </Button>
                                </div>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          {signOpen && validationReport && (
                            <Card className="mt-3 border-border/40 bg-background">
                              <CardHeader className="pb-2 bg-muted/20">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <Info className="h-4 w-4" /> Pre-sign Safety Report
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-3 p-4 text-xs space-y-2">
                                <div className={`font-medium ${validationReport.ok ? "text-green-600" : "text-orange-600"}`}>
                                  {validationReport.ok ? "All checks passed. Ready to request signature (sending disabled)." : "Issues found. Please resolve before signing."}
                                </div>
                                {validationReport.warnings.length > 0 && (
                                  <div>
                                    <div className="opacity-70 mb-1">Warnings</div>
                                    <ul className="list-disc pl-5 space-y-1">
                                      {validationReport.warnings.map((w, i) => (
                                        <li key={i}>{w}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {validationReport.errors.length > 0 && (
                                  <div>
                                    <div className="opacity-70 mb-1">Errors</div>
                                    <ul className="list-disc pl-5 space-y-1 text-red-600">
                                      {validationReport.errors.map((er, i) => (
                                        <li key={i}>{er}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )}
                        </>
                      )}

                      {/* Moved: Provenance */}
                      {(Array.isArray(planResult?.references) && planResult!.references.length > 0) ||
                       (Array.isArray(planResult?.steps) && planResult!.steps.some((s: any) => Array.isArray(s.references) && s.references.length > 0)) ||
                       (Array.isArray(toolResult?.references) && toolResult!.references.length > 0) ? (
                        <Card className="mt-3 border-border/40 bg-background">
                          <CardHeader className="pb-2 bg-muted/20">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Info className="h-4 w-4" /> Provenance
                              {(planResult?.runId || toolResult?.runId) && (
                                <span className="ml-auto text-[10px] opacity-70 font-mono">Run: {planResult?.runId || toolResult?.runId}</span>
                              )}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-3 p-4">
                            <div className="text-xs opacity-90 flex flex-wrap gap-2">
                              {/* Plan-level references */}
                              {Array.isArray(planResult?.references) && planResult!.references.map((ref: any, idx: number) => (
                                <a key={`plan-${idx}`} href={ref.url} className="underline underline-offset-4 hover:text-foreground/80" target={ref.url?.startsWith("/") ? "_self" : "_blank"} rel="noreferrer">
                                  {ref.label || ref.url}
                                </a>
                              ))}
                              {/* Step-level references */}
                              {Array.isArray(planResult?.steps) && planResult!.steps.map((s: any, si: number) => (
                                Array.isArray(s.references) ? s.references.map((ref: any, ri: number) => (
                                  <a key={`step-${si}-${ri}`} href={ref.url} className="underline underline-offset-4 hover:text-foreground/80" target={ref.url?.startsWith("/") ? "_self" : "_blank"} rel="noreferrer">
                                    {ref.label || ref.url}
                                  </a>
                                )) : null
                              ))}
                              {/* Tool references */}
                              {Array.isArray(toolResult?.references) && toolResult!.references.map((ref: any, idx: number) => {
                                const label = typeof ref === "string" ? ref : ref.label || ref.url;
                                const url = typeof ref === "string" ? ref : ref.url;
                                return (
                                  <a key={`tool-${idx}`} href={url} className="underline underline-offset-4 hover:text-foreground/80" target={url?.startsWith("/") ? "_self" : "_blank"} rel="noreferrer">
                                    {label}
                                  </a>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      ) : null}

                      {/* Moved: Narrative Report */}
                      {planResult?.ok && Array.isArray(planResult.steps) && planResult.steps.length > 0 && (
                        (() => {
                          const steps: any[] = planResult.steps || [];
                          const runId = planResult?.runId || "local";
                          const intent = planResult?.intent || "plan";
                          const summaryLines = steps.map((s, i) => `- [${s.ok ? "ok" : "warn"}] ${String(s.type || "step").toUpperCase()}${s.chain ? ` @ ${s.chain}` : ""}${s.summary ? ` — ${s.summary}` : ""}`);
                          const riskLine = result?.risks ? `Risk Score: ${result.risks.overallScore}/100 · Gas ~$${result.gasUsd} · Fee ${result.risks.slippageFee} · Delay ${result.risks.delay}` : undefined;
                          const yieldLine = Array.isArray(result?.yieldData) && result.yieldData.length > 0
                            ? `Projected value (12m): ~$${Number(result.yieldData[result.yieldData.length - 1]?.value || 0).toLocaleString()}`
                            : undefined;
                          const md = [
                            `# ChainFlow Oracle Report`,
                            `Run: ${runId}`,
                            "",
                            `## Intent`,
                            `- ${intent}`,
                            "",
                            `## Steps (${steps.length})`,
                            ...summaryLines,
                            "",
                            result ? `## Simulation Summary` : undefined,
                            result ? `- Amount: ${result.amount?.toLocaleString?.() || result.amount} ${result.token || ""}` : undefined,
                            result?.hasBridge ? `- Bridge: ETH → Base (${result.risks?.delay})` : undefined,
                            result?.hasStake ? `- Stake: ${result.topYield?.project} (${result.topYield?.apy}% APY)` : undefined,
                            riskLine,
                            yieldLine,
                            "",
                            (Array.isArray(planResult.references) && planResult.references.length > 0) || steps.some(s => Array.isArray(s.references) && s.references.length > 0)
                              ? `## References` : undefined,
                            ...(Array.isArray(planResult.references) ? planResult.references.map((r: any) => `- ${r.label || r.url} ${r.url ? `(${r.url})` : ""}`) : []),
                            ...steps.flatMap((s: any) => Array.isArray(s.references) ? s.references.map((r: any) => `- ${r.label || r.url} ${r.url ? `(${r.url})` : ""}`) : []),
                          ].filter(Boolean).join("\n");

                          return (
                            <Card className="mt-3 border-border/40 bg-background">
                              <CardHeader className="pb-2 bg-muted/20">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <Info className="h-4 w-4" /> Narrative Report
                                  {runId && (
                                    <span className="ml-auto text-[10px] opacity-70 font-mono">Run: {runId}</span>
                                  )}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-3 p-4 text-xs">
                                <div className="mb-2 flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={() => navigator.clipboard?.writeText(md)}
                                  >
                                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy Markdown
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={() => {
                                      const blob = new Blob([md], { type: "text/markdown" });
                                      const url = URL.createObjectURL(blob);
                                      const a = document.createElement("a");
                                      a.href = url;
                                      a.download = `oracle-report-${runId}.md`;
                                      document.body.appendChild(a);
                                      a.click();
                                      a.remove();
                                      URL.revokeObjectURL(url);
                                    }}
                                  >
                                    <Download className="h-3.5 w-3.5 mr-1" /> Download .md
                                  </Button>
                                </div>
                                <pre className="bg-muted/40 p-2 rounded-md overflow-x-auto whitespace-pre-wrap">{md}</pre>
                              </CardContent>
                            </Card>
                          );
                        })()
                      )}

                      {/* Moved: Global loading/error alerts */}
                      {loading && (
                        <Alert className="mt-4 border-border/50">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <AlertDescription className="text-sm font-medium">{globalLoadingMsg || ((/tvl/i.test(prompt) || (selectedTool as any)?.startsWith?.("defi_")) ? "Fetching TVL data…" : "Simulating flow... Fetching live gas, yields, and routes.")}</AlertDescription>
                        </Alert>
                      )}
                      {error && (
                        <Alert variant="destructive" className="mt-4 border-destructive/50">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="font-medium">{error}</AlertDescription>
                        </Alert>
                      )}

                      {/* Moved: Legacy result summary + charts */}
                      {result && (
                        <>
                          <Separator className="my-6 bg-border/50" />
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Summary Card */}
                            <Card className="border-border/30 rounded-lg overflow-hidden">
                              <CardHeader className="pb-3 bg-muted/30">
                                <CardTitle className="text-sm flex items-center gap-2 text-card-foreground">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  Flow Summary
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-3 text-xs space-y-3 p-4">
                                <div className="space-y-2">
                                  <div className="font-mono text-sm">Amount: {result.amount.toLocaleString()} {result.token}</div>
                                  {result.hasBridge && <div className="flex items-center gap-1 text-sm">Bridge: ETH → Base <span className="text-xs opacity-70">(ETA: {result.risks?.delay})</span></div>}
                                  {result.hasStake && <div className="flex items-center gap-1 text-sm">Stake: <span className="font-medium">{result.topYield.project}</span> ({result.topYield.apy}% APY)</div>}
                                </div>
                                <div className="pt-3 border-t border-border/30 space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="opacity-70">Total Gas:</span> <DollarSign className="h-3 w-3" /><span className="font-mono">${result.gasUsd}</span>
                                  </div>
                                  <div className="flex justify-between font-semibold">
                                    <span>Risk Score:</span> <span className="text-green-600">{result.risks.overallScore}/100</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Yield Projection Chart (render after mount to avoid SSR/CSR diff) */}
                            {mounted && (
                            <Card className="border-border/30 rounded-lg overflow-hidden">
                              <CardHeader className="pb-3 bg-muted/30">
                                <CardTitle className="text-sm flex items-center gap-2 text-card-foreground">
                                  <TrendingUp className="h-4 w-4 text-primary" />
                                  Yield Projection (1 Year)
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-2 p-3 sm:pt-3 sm:p-4 h-44 sm:h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={result.yieldData}>
                                    <defs>
                                      <linearGradient id="yieldColor" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                                      </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} fill="url(#yieldColor)" />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{fontSize: 11}} tickFormatter={m => `M${m}`} />
                                    <YAxis tickLine={false} axisLine={false} tick={{fontSize: 11}} tickFormatter={v => `$${Number(v).toLocaleString()}`} />
                                    <RechartsTooltip contentStyle={{ borderRadius: '8px', backgroundColor: 'var(--background)', border: '1px solid var(--border)' }} formatter={(value) => [`$${Number(value).toLocaleString()}`, "Value"]} />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </CardContent>
                            </Card>
                            )}

                            {/* Personal mode: vesting visuals removed */}
                            {/* Risks Table */}
                            <Card className="md:col-span-2 border-border/30 rounded-lg overflow-hidden">
                              <CardHeader className="pb-3 bg-muted/30">
                                <CardTitle className="text-sm flex items-center gap-2 text-card-foreground">
                                  <AlertCircle className="h-4 w-4 text-orange-500" />
                                  Risk Breakdown
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-2 p-3 sm:pt-3 sm:p-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                                  <div className="space-y-1 text-center p-2 bg-muted/20 rounded-md">
                                    <span className="opacity-70 text-xs block">Gas Cost</span>
                                    <div className="font-mono text-sm">${result.gasUsd}</div>
                                  </div>
                                  <div className="space-y-1 text-center p-2 bg-muted/20 rounded-md">
                                    <span className="opacity-70 text-xs block">Slippage/Fee</span>
                                    <div className="font-mono text-sm">{result.risks.slippageFee}</div>
                                  </div>
                                  <div className="space-y-1 text-center p-2 bg-muted/20 rounded-md">
                                    <span className="opacity-70 text-xs block">IL Risk</span>
                                    <div className="font-mono text-sm">{result.risks.ilRisk}</div>
                                  </div>
                                  <div className="space-y-1 text-center p-2 bg-muted/20 rounded-md">
                                    <span className="opacity-70 text-xs block">Delay</span>
                                    <div className="font-mono text-sm">{result.risks.delay}</div>
                                  </div>
                                </div>
                                {result.route && (
                                  <div className="mt-4 pt-4 border-t border-border/30">
                                    <div className="text-xs opacity-70 text-center">Route: <span className="font-medium">{result.route.provider || "Simulated"}</span> via <span className="font-medium">{result.route.bridge || "DEX"}</span></div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>

                          <div className="mt-8 flex justify-center">
                            <Button variant="outline" size="sm" className="border-border/50 px-6" asChild>
                              <a href={`mailto:hello@keystone.app?subject=ChainFlow%20Oracle%20Feedback&body=Prompt:%20${encodeURIComponent(prompt)}%0AResult%20impressions:%20`}>
                                Share Feedback <ArrowRight className="ml-2 h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Quick examples remain below the two-column area */}
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    {examples.map((ex, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={async () => {
                          setPrompt(ex);
                          setExamples([]); // hide suggestions after one is clicked
                          try {
                            const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
                            await fetchJsonWithRetry("/api/learn/click", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                              },
                              body: JSON.stringify({ text: ex }),
                            });
                          } catch {}
                        }}
                        className="px-3 py-1.5 rounded-full border border-border/50 bg-muted/60 hover:bg-accent text-xs transition-all duration-200 w-fit text-left"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>

                  {/* NEW: Recent Runs */}
                  {recentRuns.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="text-[11px] opacity-70">Recent Runs</div>
                      <div className="flex flex-wrap gap-1.5">
                        {recentRuns.map((r) => (
                          <div key={r.shortId} className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => loadRunById(r.shortId)}
                              className="px-2 py-1 rounded-md border bg-muted/40 text-[11px] hover:bg-accent"
                              title={r.prompt}
                            >
                              {r.runLabel || r.shortId}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteRunById(r.shortId)}
                              className="px-1.5 py-1 rounded-md border bg-muted/30 hover:bg-destructive/10 text-[11px]"
                              aria-label={`Delete ${r.shortId}`}
                              title="Delete"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      {recentRuns.length >= recentLimit && (
                        <div className="pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setRecentLimit((l) => l + 5)}
                            disabled={recentLoading}
                            className="h-7 px-2 text-[11px]"
                          >
                            {recentLoading ? "Loading…" : "Load more"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {recentError && (
                    <div className="text-[11px] text-red-600">{recentError}</div>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}