"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const fragmentedTools = [
  { name: "Squads", status: "pending", detail: "3/5 sigs", logo: "/logos/squads.png" },
  { name: "Jupiter", status: "loading", detail: "Route...", logo: "/logos/jup.png" },
  { name: "Birdeye", status: "ok", detail: "$81.29", logo: "/logos/birdeye.png" },
  { name: "Dune", status: "stale", detail: "2h ago", logo: "/logos/dune.png" },
  { name: "Kamino", status: "ok", detail: "4.2% APY", logo: "/logos/kamino.png" },
  { name: "Discord", status: "unread", detail: "14 msgs", logo: "/logos/discord.png" },
  { name: "Phantom", status: "waiting", detail: "Sign?", logo: "/logos/phantom.png" },
  { name: "Marinade", status: "ok", detail: "Staked", logo: "/logos/marinade.png" },
];

const dreyvModules = [
  { label: "Command", accent: "#7c3aed", sub: "Natural language control" },
  { label: "Treasury", accent: "#60a5fa", sub: "Balances & distributions" },
  { label: "Studio", accent: "#a78bfa", sub: "Build & deploy apps" },
  { label: "Foresight", accent: "#fbbf24", sub: "Scenario modeling" },
  { label: "Atlas", accent: "#22d3ee", sub: "DeFi toolkit" },
  { label: "Agents", accent: "#f43f5e", sub: "Policy-aware automation" },
];

const statusColors: Record<string, string> = {
  pending: "bg-amber-400",
  loading: "bg-blue-400 animate-pulse",
  ok: "bg-violet-500",
  stale: "bg-red-400",
  unread: "bg-red-400",
  waiting: "bg-amber-400 animate-pulse",
};

export function ProblemSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative border-t border-violet-200/35 scroll-mt-24" ref={ref}>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-amber-400/50 mb-5">
            The Problem
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-[-0.02em]">
            Death by Fragmentation
          </h2>
          <p className="mt-5 text-slate-500 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            Treasury teams juggle 8+ disconnected tools. Every tab switch is a context-switch risk; every blind sign is
            reputational and financial exposure. Opportunities die in Slack threads while approvers hunt for context.
          </p>
        </motion.div>

        <div className="mt-20 grid md:grid-cols-2 gap-px bg-white/80 rounded-2xl overflow-hidden">
          {/* ── BEFORE: Chaotic tool windows ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/92 p-6 md:p-8 rounded-2xl border border-violet-200/30 marketing-shadow-float"
          >
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-red-400/40 mb-5">
              Before — 8+ tabs open
            </p>

            {/* Fake browser tab bar */}
            <div className="rounded-lg border border-violet-200/40 overflow-hidden mb-4">
              <div className="flex items-center gap-0 bg-violet-50/50 border-b border-violet-200/35 px-1 py-1">
                {fragmentedTools.slice(0, 5).map((t, i) => (
                  <div
                    key={t.name}
                    className={`text-[8px] font-mono px-2 py-1 rounded-t truncate max-w-[70px] ${
                      i === 0 ? "bg-white/75 text-slate-500" : "text-slate-300"
                    }`}
                  >
                    {t.name}
                  </div>
                ))}
                <div className="text-[8px] text-slate-300 px-1">+3</div>
              </div>

              {/* Scattered mini-windows grid */}
              <div className="grid grid-cols-2 gap-px bg-violet-100/40 p-px">
                {fragmentedTools.map((tool, i) => (
                  <motion.div
                    key={tool.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="bg-violet-50/70 p-3 relative rounded-lg border border-violet-200/35"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <img
                          src={tool.logo}
                          alt=""
                          loading="lazy"
                          className="h-3.5 w-3.5 rounded-sm opacity-50"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <span className="text-[10px] font-mono text-slate-400">{tool.name}</span>
                      </div>
                      <div className={`h-1 w-1 rounded-full ${statusColors[tool.status]} opacity-60`} />
                    </div>
                    <div className="text-[9px] font-mono text-slate-300">{tool.detail}</div>
                    {tool.status === "waiting" && (
                      <div className="mt-1.5 text-[8px] font-mono text-amber-400/30 bg-amber-400/[0.05] px-1.5 py-0.5 rounded inline-block">
                        Action needed
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Context switching · Blind signing · Missed opportunities · No audit trail
            </p>
          </motion.div>

          {/* ── AFTER: Unified dreyv dashboard ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="bg-white/92 p-6 md:p-8 rounded-2xl border border-violet-200/30 marketing-shadow-float"
          >
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-violet-600 mb-5">
              After — One dreyv
            </p>

            {/* Unified dashboard mock */}
            <div className="rounded-lg border border-violet-200/45 overflow-hidden">
              {/* App chrome */}
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.04] bg-white/[0.01]">
                <div className="h-1.5 w-1.5 rounded-full bg-dreyv-green/40" />
                <span className="text-[9px] font-mono text-slate-400 tracking-wider">dreyv://treasury</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-violet-500/60" />
                  <span className="text-[8px] font-mono text-slate-400">Connected</span>
                </div>
              </div>

              {/* Module sidebar + main area */}
              <div className="grid grid-cols-[120px_1fr]">
                {/* Sidebar */}
                <div className="border-r border-violet-200/30 p-3 space-y-1 bg-violet-50/25">
                  {dreyvModules.map((mod, i) => (
                    <motion.div
                      key={mod.label}
                      initial={{ opacity: 0, x: -8 }}
                      animate={inView ? { opacity: 1, x: 0 } : {}}
                      transition={{ delay: 0.5 + i * 0.06 }}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded ${
                        i === 0 ? "bg-white/75" : ""
                      }`}
                    >
                      <div
                        className="h-1 w-1 rounded-full shrink-0"
                        style={{ backgroundColor: mod.accent, opacity: i === 0 ? 0.7 : 0.3 }}
                      />
                      <span className={`text-[10px] font-medium ${i === 0 ? "text-slate-500" : "text-slate-400"}`}>
                        {mod.label}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Main content area — mini dashboard */}
                <div className="p-3 space-y-2">
                  {/* Command bar */}
                  <div className="flex items-center gap-2 rounded bg-white/85 border border-violet-200/35 px-3 py-2">
                    <span className="text-violet-600 text-[10px] font-mono">$</span>
                    <span className="text-[10px] font-mono text-slate-400">Swap 500 SOL → USDC</span>
                    <span className="ml-auto text-[8px] font-mono text-violet-600/85 bg-violet-500/[0.10] px-1.5 py-0.5 rounded">
                      Passed
                    </span>
                  </div>

                  {/* Mini stats row */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: "Balance", value: "$2.2M" },
                      { label: "Runway", value: "14 mo" },
                      { label: "Risk", value: "3.2/10" },
                    ].map((s) => (
                      <div key={s.label} className="rounded bg-violet-50/50 border border-violet-200/30 px-2 py-1.5 text-center">
                        <div className="text-[7px] font-mono text-slate-300 uppercase">{s.label}</div>
                        <div className="text-[11px] font-bold text-slate-600">{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Mini chart */}
                  <div className="rounded bg-violet-50/50 border border-violet-200/30 p-2">
                    <svg viewBox="0 0 200 30" className="w-full h-auto">
                      <path d="M 0 25 L 25 22 L 50 20 L 75 18 L 100 19 L 125 15 L 150 12 L 175 10 L 200 8" fill="none" stroke="#7c3aed" strokeWidth="1" opacity="0.35" />
                      <path d="M 0 25 L 25 22 L 50 20 L 75 18 L 100 19 L 125 15 L 150 12 L 175 10 L 200 8 L 200 30 L 0 30 Z" fill="#7c3aed" opacity="0.06" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-4 text-[11px] text-violet-600/80 leading-relaxed">
              One screen · One command · Full control
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
