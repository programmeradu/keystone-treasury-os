"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { LandingCommandBar } from "./landing-command-bar";

const atlasData = [
  { name: "Mon", value: 28 },
  { name: "Tue", value: 42 },
  { name: "Wed", value: 36 },
  { name: "Thu", value: 52 },
  { name: "Fri", value: 48 },
  { name: "Sat", value: 61 },
  { name: "Sun", value: 55 },
];

const supportPillars = [
  {
    title: "Agent System",
    description: "Five agents parse intent, negotiate routes, and enforce policy before any signature is requested.",
    accent: "bg-blue-500",
    accentText: "text-blue-400",
    visual: "dots" as const,
  },
  {
    title: "Treasury Hub",
    description: "Operations Nexus, Governance Oracle, and Data Nexus in one control plane for every treasury flow.",
    accent: "bg-purple-500",
    accentText: "text-purple-400",
    visual: "bars" as const,
  },
  {
    title: "Generative Foresight",
    description: "Spin up scenario dashboards instantly: runway, risk scorecards, and market sentiment overlays.",
    accent: "bg-amber-500",
    accentText: "text-amber-400",
    visual: "wave" as const,
  },
  {
    title: "Marketplace",
    description: "Publish extensions, earn revenue split, and deploy workflows directly into treasury operations.",
    accent: "bg-dreyv-green",
    accentText: "text-dreyv-green",
    visual: "grid" as const,
  },
];

export function PillarsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="pillars"
      className="relative border-t border-white/[0.04] scroll-mt-24"
      aria-labelledby="pillars-heading"
      ref={ref}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mb-16"
        >
          <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-white/20 mb-5">
            Architecture
          </p>
          <h2
            id="pillars-heading"
            className="text-3xl md:text-5xl font-bold text-white tracking-[-0.02em]"
          >
            Six Pillars. One Operating System.
          </h2>
        </motion.div>

        {/* Custom grid — no BentoGrid library */}
        <div className="grid md:grid-cols-3 gap-px bg-white/[0.04] rounded-2xl overflow-hidden">
          {/* Command Layer — hero card, spans 2 cols */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="md:col-span-2 md:row-span-2 bg-dreyv-void p-8 md:p-10 flex flex-col"
          >
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-dreyv-green/40 mb-6">
              Command Layer
            </p>
            <div className="relative rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 font-mono overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-dreyv-green/[0.04] rounded-full blur-[60px] pointer-events-none" />
              <div className="text-[10px] uppercase tracking-widest text-white/15 mb-3">
                dreyv://command
              </div>
              <div className="text-sm text-white/70">
                <span className="text-dreyv-green/80">$</span>{" "}
                Swap 500 SOL → USDC via Jupiter with 0.5% slippage.
                <span className="inline-block h-4 w-[2px] bg-dreyv-green/50 ml-1 align-middle animate-terminal-blink" />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-4 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-white/15">Route</span>
                  <span className="inline-flex items-center gap-1 text-dreyv-green/60">
                    <img src="/logos/jup.png" alt="" className="h-3 w-3 rounded-sm" />
                    Jupiter v6
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/15">Simulation</span>
                  <span className="text-dreyv-green/60">Passed</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/15">Approval</span>
                  <span className="text-white/40">2/3 signers</span>
                </div>
              </div>
            </div>
            <h3 className="mt-6 text-lg font-semibold text-white tracking-tight">Command Layer</h3>
            <p className="mt-2 text-sm text-white/30 leading-relaxed max-w-lg">
              Natural language interface that turns intent into multi-step treasury execution.
            </p>
            <div className="mt-auto pt-6 flex justify-center">
              <LandingCommandBar />
            </div>
          </motion.div>

          {/* Atlas card with chart */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-dreyv-void p-8"
          >
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-cyan-400/40 mb-5">
              Solana Atlas
            </p>
            <div className="relative h-20 w-full rounded-lg border border-cyan-500/10 bg-cyan-500/[0.04] p-2.5 mb-4 overflow-hidden">
              <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-cyan-400/[0.08] rounded-full blur-[30px] pointer-events-none" />
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={atlasData}>
                  <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <h3 className="text-sm font-semibold text-white">Solana Atlas</h3>
            <p className="mt-1.5 text-xs text-white/25 leading-relaxed">
              MEV scans, airdrop scouting, and rebalancer automation.
            </p>
          </motion.div>

          {/* Studio card with code */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-dreyv-void p-8"
          >
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-pink-400/40 mb-5">
              dreyv Studio
            </p>
            <div className="relative rounded-lg border border-white/[0.06] bg-white/[0.015] p-4 mb-4 overflow-hidden">
              <div className="absolute -top-6 -left-6 w-20 h-20 bg-pink-500/[0.06] rounded-full blur-[30px] pointer-events-none" />
              <pre className="text-[11px] leading-relaxed text-white/50 font-mono">{`export async function execute(cmd) {
  const plan = await dreyv.plan(cmd)
  return dreyv.simulate(plan)
}`}</pre>
            </div>
            <h3 className="text-sm font-semibold text-white">dreyv Studio</h3>
            <p className="mt-1.5 text-xs text-white/25 leading-relaxed">
              Build and monetize mini-apps with AI architect + Monaco IDE.
            </p>
          </motion.div>
        </div>

        {/* Support pillars — accent lines, no icons */}
        <div className="mt-px grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.04] rounded-b-2xl overflow-hidden">
          {supportPillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.35 + i * 0.06 }}
              className="group bg-dreyv-void p-6 hover:bg-white/[0.01] transition-colors duration-300"
            >
              {/* Mini visual per card */}
              <div className="mb-4 h-8 flex items-end gap-[2px]">
                {pillar.visual === "bars"
                  ? [3, 5, 4, 7, 6, 8, 5].map((h, j) => (
                      <div key={j} className={`w-1.5 rounded-t ${pillar.accent} opacity-20`} style={{ height: `${h * 3}px` }} />
                    ))
                  : pillar.visual === "dots"
                  ? Array.from({ length: 12 }).map((_, j) => (
                      <div key={j} className={`w-1.5 h-1.5 rounded-full ${pillar.accent} opacity-15 ${j < 5 ? "animate-pulse" : ""}`} style={{ marginRight: "2px" }} />
                    ))
                  : pillar.visual === "wave"
                  ? (
                      <svg viewBox="0 0 80 20" className="w-20 h-5">
                        <path d="M 0 15 Q 10 5, 20 12 T 40 10 T 60 12 T 80 8" fill="none" stroke="currentColor" strokeWidth="1" className={`${pillar.accentText} opacity-20`} />
                      </svg>
                    )
                  : (
                      <div className="grid grid-cols-4 gap-[2px]">
                        {Array.from({ length: 8 }).map((_, j) => (
                          <div key={j} className={`w-1.5 h-1.5 rounded-[1px] ${pillar.accent} ${j < 3 ? "opacity-25" : "opacity-10"}`} />
                        ))}
                      </div>
                    )}
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">{pillar.title}</h3>
              <p className="text-xs text-white/25 leading-relaxed">{pillar.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
