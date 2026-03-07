"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Search, Sparkles } from "@/components/icons";
import { ArrowDown, Check, AlertTriangle, X, ExternalLink, Loader2, Zap, Shield, Send, Bot, User, Wrench } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { IntentRegistry } from "@/lib/agents/registry";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast-notifications";
import { useSimulationStore } from "@/lib/stores/simulation-store";
import { useVault } from "@/lib/contexts/VaultContext";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";

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
};

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const simStore = useSimulationStore();
  const { vaultTokens } = useVault();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── AI SDK v6 useChat — points at the streaming /api/command ──
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setMessages,
    status,
    error: chatError,
  } = useChat({
    api: "/api/command",
    body: {
      walletAddress: typeof window !== "undefined" ? (window as any).__keystoneWallet || "" : "",
      walletState: { balances: vaultTokens || {} },
    },
    onError: (e: Error) => {
      console.error("[CommandBar] Stream error:", e);
      toast.error("Agent Error", { description: e.message });
    },
    onFinish: (message) => {
      // Handle navigation and simulation triggers from tool results
      if (message.toolInvocations) {
        for (const inv of message.toolInvocations) {
          if (inv.state !== "result" || !inv.result) continue;
          const result = inv.result as any;

          // Auto-navigate
          if (result.navigateTo) {
            router.push(result.navigateTo);
          }

          // Trigger foresight simulation
          if (result.operation === "foresight_simulation" && result.variables) {
            simStore.startSimulation(result.scenario, result.variables, result.timeframeMonths || 12);
            router.push("/app/analytics");
            toast.loading("Running foresight simulation...", { id: "foresight-sim", description: result.scenario });

            // Fire simulation API
            fetch("/api/simulation", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                portfolio: (vaultTokens || []).map((t: any) => ({ symbol: t.symbol || "SPL", amount: t.amount || 0, price: t.price || 0 })),
                variables: result.variables,
                timeframeMonths: result.timeframeMonths || 12,
                granularity: "monthly",
                priceSource: "vault",
              }),
            })
              .then((r) => r.json())
              .then((simResult) => {
                simStore.setResult(simResult);
                const delta = `${simResult.summary.deltaPercent >= 0 ? "+" : ""}${simResult.summary.deltaPercent.toFixed(1)}%`;
                toast.success("Foresight simulation ready", { id: "foresight-sim", description: `${result.scenario} • ${delta} projected` });
              })
              .catch((err) => {
                simStore.setError(err.message || "Simulation failed");
                toast.error("Simulation failed", { id: "foresight-sim", description: err.message });
              });
          }
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

  // ─── Render Tool Invocation Card ─────────────────────────────────
  const renderToolInvocation = (inv: any) => {
    const toolName = inv.toolName || "unknown";
    const meta = TOOL_META[toolName] || { label: toolName, color: "text-muted-foreground", icon: "⚙️" };
    const isComplete = inv.state === "result";
    const result = isComplete ? (inv.result as any) : null;
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
          {inv.args && (
            <div className="text-[11px] text-foreground/70 font-mono space-y-0.5">
              {Object.entries(inv.args).map(([key, value]) => {
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
            {/* Rich Details for Swap */}
            {toolName === "swap" && success && (
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
            {/* Approval Required Badge */}
            {result.requiresApproval && (
              <div className="mt-2 flex items-center gap-2 py-1.5 px-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <Shield size={12} className="text-amber-400" />
                <span className="text-[10px] font-bold text-amber-400 uppercase">Requires Wallet Signature</span>
              </div>
            )}
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
                  className="flex-1 flex flex-col gap-4 p-5 overflow-y-auto min-h-[200px] max-h-[60vh]"
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
                      {m.content && (
                        <div
                          className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
                            m.role === "user"
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-muted/50 border border-white/5 text-foreground rounded-tl-sm"
                          }`}
                        >
                          <div className="prose prose-sm dark:prose-invert prose-p:leading-snug prose-p:mb-1 space-y-1.5 max-w-none">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {/* Tool Invocations */}
                      {m.toolInvocations?.map((inv: any) => renderToolInvocation(inv))}
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
                onSubmit={handleSubmit}
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
                  onChange={handleInputChange}
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
