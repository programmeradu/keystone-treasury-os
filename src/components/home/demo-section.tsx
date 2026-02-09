"use client";

import { useState, useRef, useMemo } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Terminal,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Shield,
  Zap,
  Route,
} from "lucide-react";

const exampleCommands = [
  "Swap 500 SOL to USDC via Jupiter with 0.5% slippage",
  "Distribute 10,000 USDC equally to 5 team wallets",
  "Stake 100 SOL on Marinade and auto-compound rewards",
  "What if SOL drops 40%? Show runway impact",
];

function inferSteps(text: string): { step: string; icon: typeof Shield }[] {
  const t = text.toLowerCase();
  const steps: { step: string; icon: typeof Shield }[] = [];
  if (!t.trim()) return steps;

  if (t.includes("swap")) {
    steps.push({ step: "Detect token pair and optimal route via Jupiter", icon: Route });
    steps.push({ step: "Simulate swap and enforce slippage protection", icon: Shield });
    steps.push({ step: "Execute with confirmation and log to ledger", icon: Zap });
  } else if (t.includes("distribute") || t.includes("send")) {
    steps.push({ step: "Resolve recipient addresses and validate amounts", icon: Route });
    steps.push({ step: "Prepare bulk distribution transaction", icon: Shield });
    steps.push({ step: "Queue for multisig approval and execute", icon: Zap });
  } else if (t.includes("stake")) {
    steps.push({ step: "Connect to staking protocol (Marinade/Jito)", icon: Route });
    steps.push({ step: "Validate amount and simulate deposit", icon: Shield });
    steps.push({ step: "Execute stake and configure auto-compound", icon: Zap });
  } else if (t.includes("what if") || t.includes("runway")) {
    steps.push({ step: "Parse scenario parameters from prompt", icon: Route });
    steps.push({ step: "Run server-side simulation against vault state", icon: Shield });
    steps.push({ step: "Generate ephemeral Foresight dashboard", icon: Zap });
  } else {
    steps.push({ step: "Parse intent and identify required operations", icon: Route });
    steps.push({ step: "Validate against policies and simulate execution", icon: Shield });
    steps.push({ step: "Request approval and execute on-chain", icon: Zap });
  }
  return steps;
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
      className="relative border-t border-white/[0.04] scroll-mt-24"
      aria-labelledby="demo-heading"
      ref={ref}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <h2
            id="demo-heading"
            className="text-3xl md:text-4xl font-bold text-white tracking-tight"
          >
            Command the Treasury
          </h2>
          <p className="mt-4 text-white/50 text-base md:text-lg">
            Type what you want. Keystone plans, validates, and executes with transparent steps.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          {/* Command terminal */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0f1115] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
              </div>
              <span className="text-xs text-white/30 ml-2 font-mono">keystone command layer</span>
            </div>

            {/* Input area */}
            <form onSubmit={handleSubmit} className="p-4">
              <div className="flex items-center gap-3">
                <Terminal className="h-4 w-4 text-[#36e27b] shrink-0" />
                <input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="Type a treasury command..."
                  className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 outline-none"
                  aria-label="Command input"
                  autoComplete="off"
                  spellCheck={false}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!command.trim() || loading}
                  className="bg-[#36e27b] text-[#0B0C10] hover:bg-[#36e27b]/90 font-semibold shrink-0 disabled:opacity-30"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>Execute</>
                  )}
                </Button>
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
                        ? "border-[#36e27b]/30 bg-[#36e27b]/10 text-[#36e27b]"
                        : "border-white/[0.06] text-white/40 hover:text-white/60 hover:border-white/10 hover:bg-white/[0.03]"
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
                  className="border-t border-white/[0.06]"
                >
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="text-[10px] uppercase tracking-wider text-white/30 font-mono">
                        Execution Plan
                      </div>
                      {loading && (
                        <Loader2 className="h-3 w-3 animate-spin text-[#36e27b]/60" />
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
                            <CheckCircle2 className="h-4 w-4 text-[#36e27b] shrink-0 mt-0.5" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border border-white/10 shrink-0 mt-0.5" />
                          )}
                          <span className="text-sm text-white/70">{s.step}</span>
                        </motion.div>
                      ))}
                    </div>

                    {showSteps && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-4 flex items-center gap-2 rounded-lg border border-[#36e27b]/20 bg-[#36e27b]/[0.05] px-3 py-2"
                      >
                        <CheckCircle2 className="h-4 w-4 text-[#36e27b]" />
                        <span className="text-xs text-[#36e27b]/80 font-medium">
                          All validations passed. Ready for approval.
                        </span>
                        <ArrowRight className="h-3 w-3 text-[#36e27b]/60 ml-auto" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Helper text */}
          <p className="mt-4 text-center text-xs text-white/30">
            Simulation only. In the app, commands execute on real Solana infrastructure with multisig approval.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
