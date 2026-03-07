"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Sparkles } from "@/components/icons";
import { Check, AlertTriangle, Loader2, Shield, Send, Bot, User, Pen, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { IntentRegistry } from "@/lib/agents/registry";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast-notifications";
import { useSimulationStore, type SimulationResult } from "@/lib/stores/simulation-store";
import { useVault } from "@/lib/contexts/VaultContext";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction, Transaction } from "@solana/web3.js";

// Token symbols for logo injection (longest first for regex)
const TOKEN_SYMBOLS_FOR_LOGOS = [
  "JITOSOL", "MSOL", "BSOL", "USDC", "USDT", "BONK", "PYTH", "TRUMP",
  "JUP", "RAY", "WIF", "JTO", "SOL",
];

function getTextContent(m: UIMessage): string {
  return m.parts
    ?.filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("") || "";
}

function getToolParts(m: UIMessage) {
  return m.parts?.flatMap((p) => {
    if (p.type === "dynamic-tool") return [p];
    if (typeof p.type === "string" && p.type.startsWith("tool-") && "toolCallId" in p) {
      return [{ ...p, type: "dynamic-tool" as const, toolName: p.type.slice(5) }];
    }
    return [];
  }) || [];
}

// ─── Operation Metadata for Tool Invocation UI ─────────────────────
const TOOL_META: Record<string, { label: string; color: string; icon: string }> = {
  swap: { label: "Swap", color: "text-blue-400", icon: "⚡" },
  transfer: { label: "Transfer", color: "text-purple-400", icon: "📤" },
  stake: { label: "Stake", color: "text-emerald-400", icon: "🔒" },
  bridge: { label: "Bridge", color: "text-cyan-400", icon: "🌉" },
  yield_deposit: { label: "Deposit", color: "text-green-400", icon: "📥" },
  yield_withdraw: { label: "Withdraw", color: "text-orange-400", icon: "📤" },
  rebalance: { label: "Rebalance", color: "text-indigo-400", icon: "⚖️" },
  mass_dispatch: { label: "Payroll", color: "text-pink-400", icon: "💸" },
  multisig_proposal: { label: "Proposal", color: "text-amber-400", icon: "🏛️" },
  execute_dca: { label: "DCA", color: "text-teal-400", icon: "📊" },
  foresight_simulation: { label: "Foresight", color: "text-violet-400", icon: "🔮" },
  risk_assessment: { label: "Risk Radar", color: "text-red-400", icon: "🎯" },
  browser_research: { label: "Research", color: "text-purple-400", icon: "🔍" },
  idl_extraction: { label: "IDL Extract", color: "text-yellow-400", icon: "📄" },
  sentiment_analysis: { label: "Sentiment", color: "text-sky-400", icon: "📡" },
  studio_init_miniapp: { label: "Init App", color: "text-emerald-400", icon: "🚀" },
  studio_analyze_code: { label: "Analyze", color: "text-blue-400", icon: "🔬" },
  security_firewall: { label: "Firewall", color: "text-red-400", icon: "🛡️" },
  marketplace_publish: { label: "Publish", color: "text-green-400", icon: "🏪" },
  sdk_hooks: { label: "SDK Hooks", color: "text-cyan-400", icon: "🪝" },
  navigate: { label: "Navigate", color: "text-muted-foreground", icon: "🧭" },
  set_monitor: { label: "Monitor", color: "text-amber-400", icon: "👁️" },
  execute_swap: { label: "Swap", color: "text-blue-400", icon: "⚡" },
};

/** Convert foresight_simulation tool variables (record) to /api/simulation SimulationVariable[] */
function foresightVariablesToSimulationVariables(
  variables: Record<string, unknown>,
): Array<{ id: string; label: string; type: "price_change" | "burn_rate" | "inflow" | "outflow" | "yield_apy" | "custom"; asset?: string; value: number; unit: "percent" | "usd" | "tokens" }> {
  const out: Array<{ id: string; label: string; type: "price_change" | "burn_rate" | "inflow" | "outflow" | "yield_apy" | "custom"; asset?: string; value: number; unit: "percent" | "usd" | "tokens" }> = [];
  if (typeof variables.solDrop === "number") {
    out.push({ id: "sol-drop", label: "SOL price change", type: "price_change", asset: "SOL", value: -variables.solDrop, unit: "percent" });
  }
  if (typeof variables.usdcDepeg === "number") {
    out.push({ id: "usdc-depeg", label: "USDC depeg", type: "price_change", asset: "USDC", value: -variables.usdcDepeg, unit: "percent" });
  }
  if (typeof variables.monthlyBurn === "number") {
    out.push({ id: "burn", label: "Monthly burn", type: "burn_rate", value: variables.monthlyBurn, unit: "usd" });
  }
  if (typeof variables.apy === "number") {
    out.push({ id: "apy", label: "Yield APY", type: "yield_apy", value: variables.apy, unit: "percent" });
  }
  if (typeof variables.principal === "number") {
    out.push({ id: "principal", label: "Principal", type: "custom", value: variables.principal, unit: "usd" });
  }
  if (typeof variables.newHires === "number") {
    out.push({ id: "new-hires", label: "New hires", type: "outflow", value: (variables.newHires * ((variables.costPerHire as number) || 8000)), unit: "usd" });
  }
  if (out.length === 0) {
    out.push({ id: "default", label: "Scenario", type: "custom", value: 0, unit: "percent" });
  }
  return out;
}

// Token logos for swap UI (symbol → logo URL)
const TOKEN_LOGOS: Record<string, string> = {
  SOL: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
  USDC: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
  USDT: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png",
  JUP: "https://static.jup.ag/jup/icon.png",
  BONK: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I",
  RAY: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png",
  MSOL: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png",
  JITOSOL: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn/logo.png",
  JTO: "https://metadata.jup.ag/token/jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL/logo",
  BSOL: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1/logo.png",
  PYTH: "https://pyth.network/token.svg",
  WIF: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm/logo.png",
  TRUMP: "https://dd.dexscreener.com/ds-data/tokens/solana/6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN.png",
};

/** Injects token logo + symbol into a string; returns React nodes for use inside markdown. */
function injectTokenLogosIntoString(text: string, logos: Record<string, string>): React.ReactNode[] {
  if (!text || typeof text !== "string") return [text];
  const re = new RegExp(`\\b(${TOKEN_SYMBOLS_FOR_LOGOS.join("|")})\\b`, "g");
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const symbol = match[1];
    const url = logos[symbol];
    parts.push(
      <span key={`${match.index}-${symbol}`} className="inline-flex items-center gap-1 align-middle">
        {url ? <img src={url} alt="" className="h-3.5 w-3.5 rounded-full object-cover inline-block" /> : null}
        <span className="font-mono text-inherit">{symbol}</span>
      </span>
    );
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : [text];
}

function processChildrenWithTokenLogos(children: React.ReactNode, logos: Record<string, string>): React.ReactNode {
  if (typeof children === "string") return <>{injectTokenLogosIntoString(children, logos)}</>;
  if (Array.isArray(children)) return <>{children.map((c, i) => <React.Fragment key={i}>{processChildrenWithTokenLogos(c, logos)}</React.Fragment>)}</>;
  return children as React.ReactNode;
}

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [signingToolId, setSigningToolId] = useState<string | null>(null);
  const [signingStatus, setSigningStatus] = useState<"idle" | "signing" | "sent" | "error">("idle");
  const [txSignatures, setTxSignatures] = useState<string[]>([]);
  const router = useRouter();
  const simStore = useSimulationStore();
  const { vaultTokens } = useVault();
  const { connection } = useConnection();
  const { publicKey, signAllTransactions, signTransaction, connected } = useWallet();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSignTransactions = useCallback(async (
    toolCallId: string,
    serialized: string[],
    operation: string,
  ) => {
    if (!connected || !publicKey || (!signAllTransactions && !signTransaction)) {
      toast.error("Wallet not connected", { description: "Please connect your wallet to sign transactions." });
      return;
    }

    setSigningToolId(toolCallId);
    setSigningStatus("signing");
    setTxSignatures([]);

    try {
      const deserialized = serialized.map((b64) => {
        const buf = Buffer.from(b64, "base64");
        try {
          return VersionedTransaction.deserialize(buf);
        } catch {
          return Transaction.from(buf);
        }
      });

      let signed: (VersionedTransaction | Transaction)[];
      if (signAllTransactions && deserialized.length > 1) {
        signed = await signAllTransactions(deserialized as VersionedTransaction[]);
      } else {
        signed = [];
        for (const tx of deserialized) {
          const s = await (signTransaction as (tx: VersionedTransaction | Transaction) => Promise<VersionedTransaction | Transaction>)(tx);
          signed.push(s);
        }
      }

      const sigs: string[] = [];
      for (const tx of signed) {
        const raw = tx instanceof VersionedTransaction
          ? tx.serialize()
          : tx.serialize();
        const sig = await connection.sendRawTransaction(raw, { skipPreflight: false, preflightCommitment: "confirmed" });
        sigs.push(sig);
      }

      setTxSignatures(sigs);
      setSigningStatus("sent");
      toast.success(`${operation} signed & sent`, {
        description: `${sigs.length} transaction(s) confirmed. Sig: ${sigs[0]?.slice(0, 12)}…`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[CommandBar] Signing error:", msg);
      setSigningStatus("error");
      if (msg.includes("User rejected") || msg.includes("cancelled")) {
        toast.error("Transaction rejected", { description: "You declined the signing request." });
      } else {
        toast.error("Signing failed", { description: msg });
      }
    }
  }, [connected, publicKey, signAllTransactions, signTransaction, connection]);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/command" }),
    [],
  );

  const {
    messages,
    sendMessage,
    setMessages,
    status,
    error: chatError,
  } = useChat({
    transport,
    onError: (e: Error) => {
      console.error("[CommandBar] Stream error:", e);
      toast.error("Agent Error", { description: e.message });
    },
    onFinish: ({ message }) => {
      for (const part of getToolParts(message)) {
        if (part.state !== "output-available") continue;
        const output = part.output as Record<string, unknown> | undefined;
        if (!output) continue;

        if (output.navigateTo) {
          router.push(output.navigateTo as string);
        }

        if (output.operation === "navigate" && output.path) {
          router.push(output.path as string);
        }

        if (output.operation === "foresight_simulation" && output.variables) {
          const scenario = output.scenario as string;
          const timeframeMonths = (output.timeframeMonths as number) || 12;
          const variablesRecord = output.variables as Record<string, unknown>;
          const simVariables = foresightVariablesToSimulationVariables(variablesRecord);

          simStore.startSimulation(scenario, simVariables, timeframeMonths);
          router.push("/app/analytics");
          toast.loading("Running foresight simulation...", {
            id: "foresight-sim",
            description: scenario,
          });

          const portfolio = (vaultTokens || []).map((t: Record<string, unknown>) => ({
            symbol: (t.symbol as string) || "SPL",
            amount: Number(t.amount) || 0,
            price: Number(t.price) || 0,
          }));

          fetch("/api/simulation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              portfolio: portfolio.length > 0 ? portfolio : [{ symbol: "SOL", amount: 0, price: 0 }],
              variables: simVariables,
              timeframeMonths,
              granularity: "monthly",
              priceSource: "vault",
            }),
          })
            .then((r) => (r.ok ? r.json() : r.json().then((err: { error?: string }) => Promise.reject(new Error(err.error || "Simulation failed")))))
            .then((simResult: SimulationResult) => {
              simStore.setResult(simResult);
              const pct = simResult.summary?.deltaPercent ?? 0;
              const delta = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
              toast.success("Foresight simulation ready", {
                id: "foresight-sim",
                description: `${scenario} • ${delta} projected`,
              });
            })
            .catch((err) => {
              const msg = err instanceof Error ? err.message : "Simulation failed";
              simStore.setError(msg);
              toast.error("Simulation failed", { id: "foresight-sim", description: msg });
            });
        }
      }
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // ─── Keyboard Shortcuts ────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setMessages([]);
  }, [setMessages]);

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isStreaming) return;
      const text = input.trim();
      setInput("");
      try {
        await sendMessage({ text }, {
          body: {
            walletAddress: publicKey?.toBase58() || "",
            walletState: { balances: vaultTokens || {} },
          },
        });
      } catch (err) {
        console.error("[CommandBar] Send error:", err);
      }
    },
    [input, isStreaming, sendMessage, vaultTokens, publicKey],
  );

  // ─── Render Tool Invocation Card ─────────────────────────────────
  const renderToolInvocation = (inv: ReturnType<typeof getToolParts>[number] & Record<string, any>) => {
    const toolName = inv.toolName || "unknown";
    const meta = TOOL_META[toolName] || { label: toolName, color: "text-muted-foreground", icon: "⚙️" };
    const isComplete = inv.state === "output-available";
    const result: Record<string, any> | null = isComplete ? (inv.output as Record<string, any>) : null;
    const success = result?.success !== false;

    return (
      <div key={inv.toolCallId} className="w-full max-w-md mt-2 bg-muted/30 border border-white/10 rounded-xl overflow-hidden">
        {/* Tool Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-sm">{meta.icon}</span>
            <span className={`text-xs font-bold uppercase ${meta.color}`}>{meta.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {!isComplete ? (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Loader2 size={12} className="animate-spin text-primary" />
                <span>Executing...</span>
              </div>
            ) : success ? (
              <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                <Check size={12} />
                <span>Complete</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-red-400">
                <AlertTriangle size={12} />
                <span>Failed</span>
              </div>
            )}
          </div>
        </div>

        {/* Tool Args */}
        <div className="px-3 py-2">
          {Boolean(inv.input && typeof inv.input === "object") && (
            <div className="text-[11px] text-foreground/70 font-mono space-y-0.5">
              {Object.entries(inv.input as Record<string, unknown>).map(([key, value]) => {
                if (typeof value === "object") return null; // skip complex args
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="text-foreground/90">{String(value)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tool Result */}
        {isComplete && result && (
          <div className={`px-3 py-2 border-t border-white/5 ${success ? "bg-emerald-500/5" : "bg-red-500/5"}`}>
            {result.message && (
              <p className="text-[11px] text-foreground/80 leading-relaxed">{result.message}</p>
            )}
            {result.error && (
              <p className="text-[11px] text-red-400 leading-relaxed">{result.error}</p>
            )}
            {/* Swap: token logos + route */}
            {(toolName === "swap" || toolName === "execute_swap") && success && (result.inputToken || result.outputToken) && (
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {result.inputToken && (
                  <span className="inline-flex items-center gap-1.5">
                    {TOKEN_LOGOS[result.inputToken.toUpperCase()] ? (
                      <img src={TOKEN_LOGOS[result.inputToken.toUpperCase()]} alt="" className="h-4 w-4 rounded-full object-cover" />
                    ) : null}
                    <span className="text-[11px] font-mono text-foreground/90">
                      {result.inputAmount != null ? Number(result.inputAmount) : "?"} {result.inputToken}
                    </span>
                  </span>
                )}
                <span className="text-white/40 text-[10px]">→</span>
                {result.outputToken && (
                  <span className="inline-flex items-center gap-1.5">
                    {result.outputAmountFormatted && (
                      <span className="text-[11px] font-mono text-foreground/90">~{result.outputAmountFormatted}</span>
                    )}
                    {TOKEN_LOGOS[result.outputToken.toUpperCase()] ? (
                      <img src={TOKEN_LOGOS[result.outputToken.toUpperCase()]} alt="" className="h-4 w-4 rounded-full object-cover" />
                    ) : null}
                  </span>
                )}
                <span className="ml-1 px-1.5 py-0.5 rounded bg-primary/15 text-[9px] font-bold text-primary uppercase">
                  {(result.route as string) || "Jupiter"}
                </span>
              </div>
            )}
            {/* Pipeline: Planning → Simulation → Firewall → Approval → Execution (for swap/execute_swap) */}
            {(toolName === "swap" || toolName === "execute_swap") && success && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[9px] uppercase tracking-wide">
                <span className="flex items-center gap-1 text-emerald-500/90">
                  <Check size={10} /> Planning
                </span>
                <span className="text-white/30">→</span>
                <span className="flex items-center gap-1 text-emerald-500/90">
                  <Check size={10} /> Simulation
                </span>
                <span className="text-white/30">→</span>
                <span className={`flex items-center gap-1 ${result.simulationPassed ? "text-emerald-500/90" : "text-red-400/90"}`}>
                  {result.simulationPassed ? <Check size={10} /> : <AlertTriangle size={10} />}
                  Firewall
                </span>
                <span className="text-white/30">→</span>
                <span className={`flex items-center gap-1 ${result.requiresApproval && !(signingToolId === inv.toolCallId && signingStatus === "sent") ? "text-amber-400" : signingToolId === inv.toolCallId && signingStatus === "sent" ? "text-emerald-500/90" : "text-muted-foreground"}`}>
                  {signingToolId === inv.toolCallId && signingStatus === "sent" ? <Check size={10} /> : result.requiresApproval ? "Approval" : "—"}
                </span>
                <span className="text-white/30">→</span>
                <span className={`flex items-center gap-1 ${signingToolId === inv.toolCallId && signingStatus === "sent" ? "text-emerald-500/90" : "text-muted-foreground"}`}>
                  {signingToolId === inv.toolCallId && signingStatus === "sent" ? <Check size={10} /> : "—"}
                  Execution
                </span>
              </div>
            )}
            {/* Expected output (human-readable) */}
            {(toolName === "swap" || toolName === "execute_swap") && success && result.outputAmountFormatted && (
              <p className="mt-1 text-[10px] text-muted-foreground font-mono">
                Expected output: ~{result.outputAmountFormatted}
              </p>
            )}
            {/* Rich Details for Swap */}
            {(toolName === "swap" || toolName === "execute_swap") && success && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {result.priceImpact && (
                  <div className="text-center">
                    <div className="text-[9px] text-muted-foreground uppercase">Impact</div>
                    <div className={`text-xs font-bold ${parseFloat(result.priceImpact) < 0.5 ? "text-emerald-400" : parseFloat(result.priceImpact) < 2 ? "text-yellow-400" : "text-red-400"}`}>
                      {parseFloat(result.priceImpact) < 0.01 ? "<0.01" : parseFloat(result.priceImpact).toFixed(2)}%
                    </div>
                  </div>
                )}
                {result.riskLevel && (
                  <div className="text-center">
                    <div className="text-[9px] text-muted-foreground uppercase">Risk</div>
                    <div className={`text-xs font-bold ${result.riskLevel === "low" ? "text-emerald-400" : result.riskLevel === "medium" ? "text-yellow-400" : "text-red-400"}`}>
                      {result.riskLevel}
                    </div>
                  </div>
                )}
                {result.simulationPassed !== undefined && (
                  <div className="text-center">
                    <div className="text-[9px] text-muted-foreground uppercase">Firewall</div>
                    <div className={`text-xs font-bold ${result.simulationPassed ? "text-emerald-400" : "text-red-400"}`}>
                      {result.simulationPassed ? "Pass" : "Fail"}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Signing Flow */}
            {result.requiresApproval && (() => {
              const txs: string[] = result.serializedTransactions || (result.serializedTransaction ? [result.serializedTransaction] : []);
              const isThisSigning = signingToolId === inv.toolCallId;
              const hasTxs = txs.length > 0;
              const alreadySent = isThisSigning && signingStatus === "sent";
              const isSigning = isThisSigning && signingStatus === "signing";

              if (alreadySent) {
                return (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2 py-1.5 px-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <Check size={12} className="text-emerald-400" />
                      <span className="text-[10px] font-bold text-emerald-400 uppercase">Signed & Sent</span>
                    </div>
                    {txSignatures.map((sig, i) => (
                      <a key={i} href={`https://solscan.io/tx/${sig}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] text-primary/80 hover:text-primary font-mono">
                        <ExternalLink size={10} /> {sig.slice(0, 20)}…
                      </a>
                    ))}
                  </div>
                );
              }

              return (
                <div className="mt-2">
                  {hasTxs && connected ? (
                    <button
                      onClick={() => handleSignTransactions(inv.toolCallId, txs, toolName)}
                      disabled={isSigning}
                      className="flex items-center gap-2 py-1.5 px-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isSigning ? (
                        <><Loader2 size={12} className="animate-spin text-primary" /><span className="text-[10px] font-bold text-primary uppercase">Signing...</span></>
                      ) : (
                        <><Pen size={12} className="text-primary" /><span className="text-[10px] font-bold text-primary uppercase">Approve & Sign ({txs.length} tx{txs.length > 1 ? "s" : ""})</span></>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 py-1.5 px-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <Shield size={12} className="text-amber-400" />
                      <span className="text-[10px] font-bold text-amber-400 uppercase">
                        {hasTxs ? "Connect wallet to sign" : "Requires Wallet Signature"}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence mode="wait">
      {!open ? (
        /* ─── Collapsed Floating Pill ─── */
        <motion.div
          key="trigger"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-3 pl-4 pr-3 py-3 rounded-full bg-background/80 backdrop-blur-xl border border-border shadow-2xl hover:border-primary/50 hover:shadow-[0_0_20px_var(--dashboard-accent-muted)] transition-all group"
          >
            <Sparkles size={16} className="text-primary" />
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors mr-2">
              Ask Keystone...
              {IntentRegistry.getActive().length > 0 && (
                <span className="inline-block w-1 h-1 rounded-full bg-primary animate-ping ml-1" title="Agents Active" />
              )}
            </span>
            <div className="flex items-center gap-1 opacity-50 text-[10px] font-mono text-foreground/50 border-l border-border pl-3">
              <span>⌘</span> K
            </div>
          </button>
        </motion.div>
      ) : (
        /* ─── Expanded Modal ─── */
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="absolute inset-0" onClick={handleClose} />

          <motion.div
            layoutId="command-bar"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Neon Glow */}
            <div className="absolute inset-0 z-0 pointer-events-none rounded-2xl ring-1 ring-primary/20" />
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-[#25a85c] rounded-2xl blur opacity-20" />

            <div className="relative z-10 flex flex-col max-h-[80vh]">
              {/* ─── Chat Messages ─── */}
              {messages.length > 0 && (
                <div
                  ref={chatContainerRef}
                  className="flex-1 flex flex-col gap-4 p-5 min-h-[200px] max-h-[60vh] overflow-y-auto overflow-x-hidden scrollbar-transparent"
                >
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col gap-1 ${m.role === "user" ? "items-end" : "items-start"}`}
                    >
                      {/* Role Label */}
                      <div className={`flex items-center gap-1.5 mb-0.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                        {m.role === "user" ? (
                          <User size={12} className="text-primary" />
                        ) : (
                          <Bot size={12} className="text-emerald-400" />
                        )}
                        <span className="text-[10px] text-muted-foreground font-mono uppercase">
                          {m.role === "user" ? "You" : "Keystone"}
                        </span>
                      </div>

                      {/* Message Content */}
                      {getTextContent(m) && (
                        <div
                          className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
                            m.role === "user"
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-muted/50 border border-white/5 text-foreground rounded-tl-sm"
                          }`}
                        >
                          <div className="prose prose-sm dark:prose-invert prose-p:leading-snug prose-p:mb-1 space-y-1.5 max-w-none">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <p>{processChildrenWithTokenLogos(children, TOKEN_LOGOS)}</p>,
                                li: ({ children }) => <li>{processChildrenWithTokenLogos(children, TOKEN_LOGOS)}</li>,
                                strong: ({ children }) => <strong>{processChildrenWithTokenLogos(children, TOKEN_LOGOS)}</strong>,
                                td: ({ children }) => <td>{processChildrenWithTokenLogos(children, TOKEN_LOGOS)}</td>,
                                th: ({ children }) => <th>{processChildrenWithTokenLogos(children, TOKEN_LOGOS)}</th>,
                              }}
                            >
                              {getTextContent(m)}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {/* Tool Invocations */}
                      {getToolParts(m).map((inv) => renderToolInvocation(inv))}
                    </div>
                  ))}

                  {/* Streaming Indicator */}
                  {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Bot size={12} className="text-emerald-400" />
                      <div className="flex items-center gap-1.5 text-xs">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
                        <span className="font-mono text-[10px] uppercase">Processing...</span>
                      </div>
                    </div>
                  )}

                  <div className="h-2" />
                </div>
              )}

              {/* ─── Input Bar ─── */}
              <form
                onSubmit={handleFormSubmit}
                className={`flex items-center px-5 py-4 border-t border-border bg-card ${messages.length === 0 ? "border-t-0" : ""}`}
              >
                <Sparkles
                  size={18}
                  className={`text-primary mr-3 shrink-0 ${isStreaming ? "animate-spin" : ""}`}
                />
                <input
                  ref={inputRef}
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isStreaming}
                  placeholder={
                    messages.length === 0
                      ? 'Describe your intent (e.g., "Swap 500 SOL to USDC")...'
                      : "Follow up or issue a new command..."
                  }
                  className="flex-1 bg-transparent text-base font-medium text-foreground placeholder:text-muted-foreground/50 outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isStreaming || !input.trim()}
                  className="ml-3 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                </button>
              </form>

              {/* ─── Status Footer ─── */}
              <div className="px-5 py-2.5 bg-muted/30 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      isStreaming
                        ? "bg-primary animate-ping"
                        : chatError
                        ? "bg-red-400"
                        : "bg-emerald-400 animate-pulse"
                    }`}
                  />
                  <span className="font-mono">
                    {isStreaming
                      ? "AGENT WORKING..."
                      : chatError
                      ? "ERROR"
                      : messages.length > 0
                      ? "READY"
                      : "AI AGENT LISTENING"}
                  </span>
                  {messages.length > 0 && (
                    <span className="text-foreground/30">
                      • {messages.filter((m) => m.role === "assistant").length} response{messages.filter((m) => m.role === "assistant").length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {messages.length > 0 && (
                    <button
                      onClick={() => setMessages([])}
                      className="hover:text-foreground transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  <span>
                    <strong className="text-foreground">Esc</strong> to close
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
