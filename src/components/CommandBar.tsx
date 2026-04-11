"use client";

// Feature: commandbar-god-mode
// Root CommandBar component — God Mode execution layer.
// Merges and supersedes CommandBar.tsx + CommandBar.stream.tsx.
// Requirements: 1.1–1.8, 2.6, 3.1, 3.6, 3.7, 13.1, 13.4, 16.1–16.4, 17.1–17.3

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Sparkles } from "@/components/icons";
import { Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { IntentRegistry } from "@/lib/agents/registry";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast-notifications";
import { useSimulationStore, type SimulationResult } from "@/lib/stores/simulation-store";
import { useVault } from "@/lib/contexts/VaultContext";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction, Transaction } from "@solana/web3.js";
import { useCommandBarSigningStore } from "@/lib/stores/commandbar-signing-store";
import { ChatMessage } from "@/components/commandbar/ChatMessage";
import { EmptyState } from "@/components/commandbar/EmptyState";
import { TOKEN_LOGOS } from "@/components/commandbar/ChatMessage";

// ─── Types ────────────────────────────────────────────────────────────────────

type PromptMode = "auto" | "build" | "execute";

/** Requirement 12.2–12.4: only these routes may be pushed from tool results. */
const ALLOWED_COMMAND_BAR_ROUTES = new Set([
  "/app",
  "/app/treasury",
  "/app/analytics",
  "/app/studio",
  "/app/marketplace",
  "/app/library",
  "/app/team",
  "/app/settings",
  "/app/atlas",
]);

function normalizeNavPath(path: string): string {
  const u = path.trim();
  const noQuery = u.split("?")[0]?.split("#")[0] ?? u;
  return noQuery.length > 1 && noQuery.endsWith("/") ? noQuery.slice(0, -1) : noQuery;
}

function isAllowedCommandBarRoute(path: string): boolean {
  return ALLOWED_COMMAND_BAR_ROUTES.has(normalizeNavPath(path));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getToolParts(m: UIMessage) {
  return (
    m.parts?.flatMap((p) => {
      if (p.type === "dynamic-tool") return [p];
      if (
        typeof p.type === "string" &&
        p.type.startsWith("tool-") &&
        "toolCallId" in p
      ) {
        return [{ ...p, type: "dynamic-tool" as const, toolName: p.type.slice(5) }];
      }
      return [];
    }) || []
  );
}

/** Parse prompt mode prefix from user input (client-side, for footer display only). Matches /api/command `parsePromptMode`. */
function parsePromptModeFromInput(text: string): PromptMode {
  const t = text.trim().toLowerCase();
  if (/^(mode\s*:\s*build|\/build\b|#build\b|\[build\]|build mode\b)/.test(t)) return "build";
  if (/^(mode\s*:\s*execute|\/execute\b|#execute\b|\[execute\]|execute mode\b)/.test(t)) return "execute";
  return "auto";
}

/** Convert foresight_simulation tool variables to /api/simulation SimulationVariable[] */
function foresightVariablesToSimulationVariables(
  variables: Record<string, unknown>,
): Array<{
  id: string;
  label: string;
  type: "price_change" | "burn_rate" | "inflow" | "outflow" | "yield_apy" | "custom";
  asset?: string;
  value: number;
  unit: "percent" | "usd" | "tokens";
}> {
  const out: Array<{
    id: string;
    label: string;
    type: "price_change" | "burn_rate" | "inflow" | "outflow" | "yield_apy" | "custom";
    asset?: string;
    value: number;
    unit: "percent" | "usd" | "tokens";
  }> = [];
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
    out.push({
      id: "new-hires",
      label: "New hires",
      type: "outflow",
      value: variables.newHires * ((variables.costPerHire as number) || 8000),
      unit: "usd",
    });
  }
  if (out.length === 0) {
    out.push({ id: "default", label: "Scenario", type: "custom", value: 0, unit: "percent" });
  }
  return out;
}

// ─── CommandBar ───────────────────────────────────────────────────────────────

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [promptMode, setPromptMode] = useState<PromptMode>("auto");
  const [submitPulse, setSubmitPulse] = useState(false);

  const { setSigningToolId, setSigningStatus, setTxSignatures } =
    useCommandBarSigningStore();

  const router = useRouter();
  const simStore = useSimulationStore();
  const { vaultTokens } = useVault();
  const { connection } = useConnection();
  const { publicKey, signAllTransactions, signTransaction, connected } = useWallet();

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalPanelRef = useRef<HTMLDivElement>(null);

  // ─── Signing ───────────────────────────────────────────────────────────────

  const handleSignTransactions = useCallback(
    async (toolCallId: string, serialized: string[], operation: string) => {
      if (!connected || !publicKey || (!signAllTransactions && !signTransaction)) {
        toast.error("Wallet not connected", {
          description: "Please connect your wallet to sign transactions.",
        });
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
            const s = await (
              signTransaction as (
                tx: VersionedTransaction | Transaction,
              ) => Promise<VersionedTransaction | Transaction>
            )(tx);
            signed.push(s);
          }
        }

        const sigs: string[] = [];
        for (const tx of signed) {
          const raw = tx.serialize();
          const sig = await connection.sendRawTransaction(raw, {
            skipPreflight: false,
            preflightCommitment: "confirmed",
          });
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
          toast.error("Transaction rejected", {
            description: "You declined the signing request.",
          });
        } else {
          toast.error("Signing failed", { description: msg });
        }
      }
    },
    [connected, publicKey, signAllTransactions, signTransaction, connection, setSigningToolId, setSigningStatus, setTxSignatures],
  );

  // ─── Chat ──────────────────────────────────────────────────────────────────

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/command" }),
    [],
  );

  const { messages, sendMessage, setMessages, status, error: chatError } = useChat({
    transport,
    onError: (e: Error) => {
      const msg = e.message || "";
      if (
        /rate.?limit|429|retry|provider|groq|cloudflare|tool call validation failed|was not in request\.tools|invalid_request_error/i.test(
          msg,
        )
      ) {
        console.warn(
          "[CommandBar] Transient stream issue (auto-fallback/retry expected):",
          msg.slice(0, 220),
        );
        return;
      }
      console.error("[CommandBar] Stream error:", e);
      toast.error("Agent Error", { description: msg });
    },
    onFinish: ({ message }) => {
      for (const part of getToolParts(message)) {
        if (part.state !== "output-available") continue;
        const output = part.output as Record<string, unknown> | undefined;
        if (!output) continue;

        const pushIfAllowed = (path: string) => {
          const raw = path.trim();
          if (!isAllowedCommandBarRoute(raw)) {
            console.warn("[CommandBar] Blocked navigation to disallowed path:", path);
            return;
          }
          setOpen(false);
          // Preserve ?appId= and other query params (normalizeNavPath strips them)
          router.push(raw);
        };

        if (output.success !== false && typeof output.navigateTo === "string" && output.navigateTo.trim()) {
          pushIfAllowed(output.navigateTo);
        }

        if (
          output.operation === "navigate" &&
          output.success !== false &&
          output.validated === true &&
          typeof output.path === "string" &&
          output.path.trim()
        ) {
          pushIfAllowed(output.path);
        }

        if (
          output.operation === "foresight_simulation" &&
          output.variables &&
          output.success !== false
        ) {
          const scenario = output.scenario as string;
          const timeframeMonths = (output.timeframeMonths as number) || 12;
          const variablesRecord = output.variables as Record<string, unknown>;
          const simVariables = foresightVariablesToSimulationVariables(variablesRecord);

          simStore.startSimulation(scenario, simVariables, timeframeMonths);
          setTimeout(() => {
            setOpen(false);
            router.push("/app/analytics");
          }, 4500);
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
              portfolio:
                portfolio.length > 0
                  ? portfolio
                  : [{ symbol: "SOL", amount: 0, price: 0 }],
              variables: simVariables,
              timeframeMonths,
              granularity: "monthly",
              priceSource: "vault",
            }),
          })
            .then((r) =>
              r.ok
                ? r.json()
                : r
                    .json()
                    .then((err: { error?: string }) =>
                      Promise.reject(new Error(err.error || "Simulation failed")),
                    ),
            )
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
  const agentBusy = isStreaming || submitPulse;

  useEffect(() => {
    if (!isStreaming) setSubmitPulse(false);
  }, [isStreaming]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    setOpen(false);
    setMessages([]);
    setPromptMode("auto");
    setSubmitPulse(false);
  }, [setMessages]);

  const handleModalKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const root = modalPanelRef.current;
    if (!root) return;
    const sel =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const items = [...root.querySelectorAll<HTMLElement>(sel)].filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey) {
      if (active === first || (active && !root.contains(active))) {
        e.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  // ─── Effects ───────────────────────────────────────────────────────────────

  // Auto-scroll to latest message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-focus input within 150ms of opening (Requirement 1.7)
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Keyboard shortcuts: Cmd+K toggle, Escape close (Requirements 1.2, 1.3, 16.1)
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
  }, [open, handleClose]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    setPromptMode(parsePromptModeFromInput(val));
  }, []);

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || agentBusy) return;
      const text = input.trim();
      setInput("");
      setPromptMode("auto");
      setSubmitPulse(true);
      try {
        await sendMessage(
          { text },
          {
            body: {
              walletAddress: publicKey?.toBase58() || "",
              vaultState: { tokens: vaultTokens || [] },
              walletState: { balances: vaultTokens || [] },
            },
          },
        );
      } catch (err) {
        console.error("[CommandBar] Send error:", err);
      }
    },
    [input, agentBusy, sendMessage, vaultTokens, publicKey],
  );

  const handleChipClick = useCallback((text: string) => {
    setInput(text);
    setPromptMode(parsePromptModeFromInput(text));
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // ─── Wallet display ────────────────────────────────────────────────────────

  const walletDisplay = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`
    : "Not connected";

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence mode="wait">
      {!open ? (
        /* ── Collapsed Floating Pill (Requirement 1.5) ── */
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
            aria-label="Open command bar (⌘K)"
            className="flex items-center gap-3 pl-4 pr-3 py-3 rounded-full bg-background/80 backdrop-blur-xl border border-border shadow-2xl hover:border-primary/50 hover:shadow-[0_0_20px_var(--dashboard-accent-muted)] transition-all group"
          >
            <Sparkles size={16} className="text-primary" />
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors mr-2">
              Ask Keystone...
              {IntentRegistry.getActive().length > 0 && (
                <span
                  className="inline-block w-1 h-1 rounded-full bg-primary animate-ping ml-1"
                  title="Agents Active"
                />
              )}
            </span>
            <div className="flex items-center gap-1 opacity-50 text-[10px] font-mono text-foreground/50 border-l border-border pl-3">
              <span>⌘</span> K
            </div>
          </button>
        </motion.div>
      ) : (
        /* ── Expanded Modal (Requirement 1.6) ── */
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Keystone command bar"
        >
          {/* Outside click closes (Requirement 1.8) */}
          <div className="absolute inset-0" onClick={handleClose} />

          <motion.div
            layoutId="command-bar"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="relative w-full max-w-[720px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Neon glow */}
            <div className="absolute inset-0 z-0 pointer-events-none rounded-2xl ring-1 ring-primary/20" />
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-[#25a85c] rounded-2xl blur opacity-20" />

            <div className="relative z-10 flex flex-col max-h-[85vh]">
              {/* ── Chat thread or empty state ── */}
              {messages.length === 0 ? (
                <EmptyState onChipClick={handleChipClick} />
              ) : (
                <div
                  ref={chatContainerRef}
                  className="flex-1 flex flex-col gap-2 py-4 min-h-[200px] max-h-[calc(85vh-130px)] overflow-y-auto overflow-x-hidden scrollbar-transparent"
                >
                  {messages.map((m) => (
                    <ChatMessage
                      key={m.id}
                      message={m}
                      tokenLogos={TOKEN_LOGOS}
                      onSign={handleSignTransactions}
                    />
                  ))}

                  {/* Streaming indicator (Requirement 3.1) */}
                  {agentBusy &&
                    messages[messages.length - 1]?.role !== "assistant" && (
                      <div className="flex items-center gap-2 px-2 text-muted-foreground">
                        <div className="flex items-center gap-1.5 text-xs">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
                          <span className="font-mono text-[10px] uppercase">
                            Processing…
                          </span>
                        </div>
                      </div>
                    )}

                  <div className="h-2" />
                </div>
              )}

              {/* ── Input bar ── */}
              <form
                onSubmit={handleFormSubmit}
                className={`flex items-center px-5 py-4 border-t border-border bg-card ${
                  messages.length === 0 ? "border-t-0" : ""
                }`}
              >
                <Sparkles
                  size={18}
                  className={`text-primary mr-3 shrink-0 ${agentBusy ? "animate-spin" : ""}`}
                />
                <input
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  disabled={agentBusy}
                  placeholder={
                    messages.length === 0
                      ? 'Describe your intent (e.g., "Swap 500 SOL to USDC")…'
                      : "Follow up or issue a new command…"
                  }
                  aria-label="Command input"
                  className="flex-1 bg-transparent text-base font-medium text-foreground placeholder:text-muted-foreground/50 outline-none disabled:opacity-50"
                />
                {/* Submit button — disabled + pulsing while streaming (Requirement 3.7) */}
                <button
                  type="submit"
                  disabled={agentBusy || !input.trim()}
                  aria-label="Send command"
                  className="ml-3 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed relative"
                >
                  {agentBusy ? (
                    <span className="absolute inset-0 rounded-lg bg-primary/20 animate-pulse" />
                  ) : null}
                  <Send size={16} />
                </button>
              </form>

              {/* ── Status footer ── */}
              <div className="px-5 py-2.5 bg-muted/30 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      agentBusy
                        ? "bg-primary animate-ping"
                        : chatError
                          ? "bg-red-400"
                          : "bg-emerald-400 animate-pulse"
                    }`}
                  />
                  <span className="font-mono">
                    {agentBusy
                      ? "AGENT WORKING…"
                      : chatError
                        ? "ERROR"
                        : messages.length > 0
                          ? "READY"
                          : "AI AGENT LISTENING"}
                  </span>

                  {/* PromptMode badge (Requirement 2.6) */}
                  {promptMode !== "auto" && (
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${
                        promptMode === "build"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-blue-500/15 text-blue-400"
                      }`}
                    >
                      {promptMode}
                    </span>
                  )}

                  {/* Wallet address (Requirement 13.4) */}
                  <span className="text-foreground/30 font-mono">{walletDisplay}</span>
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
                    <kbd className="font-semibold text-foreground">Enter</kbd> to send
                    {" · "}
                    <kbd className="font-semibold text-foreground">Esc</kbd> to close
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
