"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const features = [
  {
    title: "Non-Custodial by Default",
    description:
      "We never touch your keys. dreyv is a coordination layer that sits on top of your existing multisig (Squads).",
  },
  {
    title: "Simulation-first proposals",
    description:
      "Proposed transactions are exercised on a mainnet fork where possible so approvers see expected balances, routes, and impact — not blind hex.",
  },
  {
    title: "Humans stay in control",
    description:
      "AI proposes plans and automation; your multisig and policies decide what actually executes. No surprise custody, no black-box signing.",
  },
];

export function TrustSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="trust"
      className="relative border-t border-violet-200/35 scroll-mt-24 overflow-hidden"
      ref={ref}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mb-16"
        >
          <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-violet-600 mb-5">
            Security
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-[-0.02em]">
            Institutional security.{" "}
            <span className="text-slate-400">Consumer simplicity.</span>
          </h2>
        </motion.div>

        {/* Features — accent lines, no icons */}
        <div className="grid md:grid-cols-3 gap-0">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
              className="border-t md:border-t-0 md:border-l border-white/[0.04] first:border-t-0 md:first:border-l-0 p-8 md:p-10"
            >
              <div className="h-px w-8 bg-dreyv-green opacity-30 mb-5" />
              <h3 className="text-lg font-semibold text-slate-900 mb-3 tracking-tight">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Firewall pipeline — enlarged with scan details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-20 rounded-2xl border border-white/[0.04] bg-white/[0.01] overflow-hidden"
        >
          {/* Pipeline header */}
          <div className="flex items-center justify-between px-6 md:px-10 py-4 border-b border-white/[0.03]">
            <div className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Simulation Firewall</span>
            </div>
            <span className="text-[10px] font-mono text-slate-300">real-time</span>
          </div>

          <div className="p-6 md:p-10">
            <div className="flex flex-col md:flex-row items-stretch gap-4 md:gap-0">
              {/* Proposed TXN */}
              <div className="md:flex-1 rounded-xl border border-white/[0.04] bg-white/[0.015] p-5">
                <div className="text-[9px] font-mono uppercase tracking-widest text-slate-400 mb-3">Proposed</div>
                <div className="space-y-2 font-mono text-[11px]">
                  <div className="flex justify-between"><span className="text-slate-400">Type</span><span className="text-slate-500">Swap</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-400">Amount</span><span className="inline-flex items-center gap-1.5 text-slate-500"><img src="/logos/token-sol.png" alt="" className="h-3 w-3 rounded-full" />500 SOL</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-400">Route</span><span className="inline-flex items-center gap-1.5 text-slate-500"><img src="/logos/jup.png" alt="" className="h-3 w-3 rounded-sm" />Jupiter v6</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Slippage</span><span className="text-slate-500">0.5%</span></div>
                </div>
              </div>

              {/* Arrow / connector */}
              <div className="hidden md:flex items-center px-3">
                <div className="h-px w-8 bg-gradient-to-r from-white/[0.06] to-white/15" />
              </div>

              {/* Firewall — center, largest */}
              <div className="md:flex-[1.5] relative">
                <div className="absolute -inset-4 bg-violet-500/[0.08] blur-3xl rounded-full pointer-events-none" />
                <div className="relative rounded-xl border border-violet-300/50 bg-violet-500/[0.06] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-violet-600">Scanning</span>
                    <span className="text-[10px] font-mono text-violet-600/90">50+ vectors</span>
                  </div>

                  {/* Scan lines */}
                  <div className="space-y-1.5">
                    {[
                      { check: "Sandwich attack", result: "Clear", ok: true },
                      { check: "Slippage tolerance", result: "0.5% OK", ok: true },
                      { check: "Route validation", result: "Optimal", ok: true },
                      { check: "Liquidity depth", result: "$4.2M", ok: true },
                      { check: "Policy compliance", result: "Passed", ok: true },
                    ].map((scan, i) => (
                      <motion.div
                        key={scan.check}
                        initial={{ opacity: 0, x: -8 }}
                        animate={inView ? { opacity: 1, x: 0 } : {}}
                        transition={{ delay: 0.8 + i * 0.1 }}
                        className="flex items-center justify-between font-mono text-[10px]"
                      >
                        <span className="text-slate-400">{scan.check}</span>
                        <span className={scan.ok ? "text-violet-600" : "text-red-400/40"}>{scan.result}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4 h-0.5 rounded-full bg-white/75 overflow-hidden">
                    <motion.div
                      className="h-full bg-dreyv-green/30 rounded-full"
                      initial={{ width: "0%" }}
                      animate={inView ? { width: "100%" } : {}}
                      transition={{ duration: 2, delay: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>

              {/* Arrow / connector */}
              <div className="hidden md:flex items-center px-3">
                <div className="h-px w-8 bg-gradient-to-r from-white/15 to-white/[0.06]" />
              </div>

              {/* Executed */}
              <div className="md:flex-1 rounded-xl border border-violet-200/45 bg-violet-500/[0.06] p-5">
                <div className="text-[9px] font-mono uppercase tracking-widest text-violet-600/85 mb-3">Executed</div>
                <div className="text-center py-3">
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={inView ? { scale: 1, opacity: 1 } : {}}
                    transition={{ delay: 1.8, type: "spring", stiffness: 200 }}
                    className="text-3xl font-bold text-violet-600 font-mono"
                  >

                  </motion.div>
                  <div className="text-[10px] font-mono text-violet-600/80 mt-2">All clear</div>
                </div>
                <div className="text-[10px] font-mono text-slate-300 text-center">
                  Queued for 2/3 approval
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
