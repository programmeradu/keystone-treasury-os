"use client";

import { useState, useRef, useMemo } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

const exampleCommands = [
  "Swap 500 SOL to USDC via Jupiter with 0.5% slippage",
  "Distribute 10,000 USDC equally to 5 team wallets",
  "Stake 100 SOL on Marinade and auto-compound rewards",
  "What if SOL drops 40%? Show runway impact",
];

function inferSteps(text: string): string[] {
  const t = text.toLowerCase();
  if (!t.trim()) return [];

  if (t.includes("swap")) {
    return [
      "Detect token pair and optimal route via Jupiter",
      "Simulate swap and enforce slippage protection",
      "Execute with confirmation and log to ledger",
    ];
  } else if (t.includes("distribute") || t.includes("send")) {
    return [
      "Resolve recipient addresses and validate amounts",
      "Prepare bulk distribution transaction",
      "Queue for multisig approval and execute",
    ];
  } else if (t.includes("stake")) {
    return [
      "Connect to staking protocol (Marinade/Jito)",
      "Validate amount and simulate deposit",
      "Execute stake and configure auto-compound",
    ];
  } else if (t.includes("what if") || t.includes("runway")) {
    return [
      "Parse scenario parameters from prompt",
      "Run server-side simulation against vault state",
      "Generate ephemeral Foresight dashboard",
    ];
  }
  return [
    "Parse intent and identify required operations",
    "Validate against policies and simulate execution",
    "Request approval and execute on-chain",
  ];
}

export function DemoSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [command, setCommand] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const steps = useMemo(
    () => inferSteps(submitted || command),
    [command, submitted]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = command.trim();
    if (!trimmed) return;

    setSubmitted(trimmed);
    setLoading(true);
    setShowSteps(false);

    // Simulate planning delay
    setTimeout(() => {
      setLoading(false);
      setShowSteps(true);
    }, 1200);
  }

  function handleExampleClick(cmd: string) {
    setCommand(cmd);
    setSubmitted(cmd);
    setLoading(true);
    setShowSteps(false);

    setTimeout(() => {
      setLoading(false);
      setShowSteps(true);
    }, 1200);
  }

  return (
    <section
      id="demo"
      className="relative border-t border-violet-200/35 scroll-mt-24"
      aria-labelledby="demo-heading"
      ref={ref}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto mb-12"
        >
          <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-slate-400 mb-5">
            Interactive Demo
          </p>
          <h2
            id="demo-heading"
            className="text-3xl md:text-5xl font-bold text-slate-900 tracking-[-0.02em]"
          >
            Command the treasury
          </h2>
          <p className="mt-4 text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Type intent below to see how dreyv breaks it into a signer-ready plan — same flow as the product, without
            connecting a wallet.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          {/* Command terminal */}
          <div className="rounded-2xl border border-violet-200/45 bg-white/92 backdrop-blur-xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(124,58,237,0.18)]">
            {/* Terminal chrome */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-violet-200/35 bg-violet-50/35">
              <div className="flex gap-1.5">
                <div className="h-2 w-2 rounded-full bg-rose-300/90" />
                <div className="h-2 w-2 rounded-full bg-amber-300/90" />
                <div className="h-2 w-2 rounded-full bg-violet-400/80" />
              </div>
              <span className="ml-3 text-[10px] font-mono text-slate-400 tracking-widest">dreyv://command</span>
            </div>

            {/* Input area */}
            <form onSubmit={handleSubmit} className="p-4">
              <div className="flex items-center gap-3">
                <span className="text-violet-700 font-mono text-sm shrink-0">$</span>
                <input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="Type a treasury command..."
                  className="flex-1 bg-transparent text-slate-900 text-sm placeholder:text-slate-400 outline-none font-mono"
                  aria-label="Command input"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  disabled={!command.trim() || loading}
                  className="bg-violet-600 text-white font-semibold text-xs px-4 py-2 rounded-lg shrink-0 disabled:opacity-30 hover:bg-violet-700 transition-colors"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    "Preview plan"
                  )}
                </button>
              </div>

              {/* Example commands */}
              <div className="mt-3 flex flex-wrap gap-2">
                {exampleCommands.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => handleExampleClick(ex)}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                      command === ex
                        ? "border-violet-400/45 bg-violet-100 text-violet-600"
                        : "border-violet-200/45 text-slate-500 hover:text-slate-700 hover:border-violet-300/60 hover:bg-violet-50/80"
                    }`}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </form>

            {/* Plan output */}
            <AnimatePresence mode="wait">
              {(loading || showSteps) && submitted && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-violet-200/35"
                >
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                        Execution Plan
                      </div>
                      {loading && (
                        <Loader2 className="h-3 w-3 animate-spin text-violet-700" />
                      )}
                    </div>

                    <div className="space-y-2">
                      {steps.map((s, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={
                            showSteps
                              ? { opacity: 1, x: 0 }
                              : { opacity: 0.3, x: 0 }
                          }
                          transition={{ delay: showSteps ? i * 0.15 : 0 }}
                          className="flex items-start gap-3 py-1.5"
                        >
                          {showSteps ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0 mt-1.5" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full border border-violet-200/50 shrink-0 mt-1.5" />
                          )}
                          <span className="text-sm text-slate-500">{s}</span>
                        </motion.div>
                      ))}
                    </div>

                    {showSteps && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/[0.08] border border-violet-200/45"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                        <span className="text-xs text-violet-700 font-medium">
                          All validations passed. Ready for approval.
                        </span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="mt-4 text-center text-[11px] font-mono text-slate-400">
            Simulation only · In-app commands execute on real Solana infrastructure
          </p>
        </motion.div>
      </div>
    </section>
  );
}
