"use client";

import React, { useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import Image from "next/image";

const tabs = [
  {
    id: "treasury",
    label: "Treasury Hub",
    color: "bg-purple-500",
    colorText: "text-purple-400",
    features: [
      { title: "Operations Nexus", description: "Bulk distributions via CSV/JSON. Preview recipients, amounts, then execute through Squads." },
      { title: "Governance Oracle", description: "Active proposals, approval progress, threshold status (3/5 signatures)." },
      { title: "Streaming Velocity", description: "Real-time transaction monitoring with 7D/30D charts linked to Solana Explorer." },
      { title: "Data Nexus", description: "Full ledger with search, filter, export to CSV/PDF. Board-ready audit trails." },
    ],
  },
  {
    id: "studio",
    label: "Studio & Marketplace",
    color: "bg-pink-500",
    colorText: "text-pink-400",
    features: [
      { title: "AI Architect", description: "Describe in plain English. Architect generates React/TypeScript with self-correction." },
      { title: "Live Preview", description: "Real-time iframe sandbox with Babel compilation and SDK hooks." },
      { title: "Monaco Editor", description: "Full IDE with TypeScript, CSS, Rust (Anchor), JSON and multi-file tabs." },
      { title: "Marketplace", description: "Browse, install, sell mini-apps. USDC pricing with 80/20 revenue split." },
    ],
  },
  {
    id: "foresight",
    label: "Foresight & Analytics",
    color: "bg-amber-500",
    colorText: "text-amber-400",
    features: [
      { title: "What-If Engine", description: "Ask 'What if SOL drops 50%?' — instant ephemeral dashboards with projections." },
      { title: "Predictive Runway", description: "Exact depletion dates based on burn rates. Real vs simulated overlays." },
      { title: "Risk Scorecard", description: "Risk score (0-10) with color coding, simulation overlays, sentiment analysis." },
      { title: "Growth Charts", description: "Performance over 1D/1W/1M/1Y/ALL timeframes with projection overlays." },
    ],
  },
];

/* ── Mock UI Panels (CSS-rendered, no images) ── */

function TreasuryMockUI() {
  return (
    <div className="rounded-xl border border-violet-200/40 overflow-hidden">
      <Image
        src="/images/treasury.png"
        alt="dreyv Treasury Dashboard"
        width={800}
        height={600}
        className="w-full h-auto"
      />
    </div>
  );
}

function StudioMockUI() {
  const codeLines = [
    { num: 1, content: "import { useVault } from '@keystone/sdk'", color: "text-pink-400/50" },
    { num: 2, content: "", color: "" },
    { num: 3, content: "export default function RebalanceBot() {", color: "text-slate-500" },
    { num: 4, content: "  const { tokens, execute } = useVault()", color: "text-slate-500" },
    { num: 5, content: "  const overweight = tokens.filter(", color: "text-slate-500" },
    { num: 6, content: "    t => t.pctOfTotal > t.target + 5", color: "text-amber-400/40" },
    { num: 7, content: "  )", color: "text-slate-500" },
    { num: 8, content: "", color: "" },
    { num: 9, content: "  return overweight.map(t => (", color: "text-slate-500" },
    { num: 10, content: "    execute('swap', { from: t, pct: 5 })", color: "text-violet-600/55" },
    { num: 11, content: "  ))", color: "text-slate-500" },
    { num: 12, content: "}", color: "text-slate-500" },
  ];

  return (
    <div className="rounded-xl border border-violet-200/40 bg-white/70 overflow-hidden">
      {/* Editor tabs */}
      <div className="flex items-center gap-0 border-b border-violet-200/35">
        <div className="px-4 py-2.5 text-[11px] font-mono text-slate-500 border-b border-pink-500/50 bg-white/70">
          rebalance-bot.tsx
        </div>
        <div className="px-4 py-2.5 text-[11px] font-mono text-slate-400">
          config.json
        </div>
        <div className="ml-auto px-4 py-2.5 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500/50" />
          <span className="text-[9px] font-mono text-slate-400">Live</span>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_0.8fr]">
        {/* Code panel */}
        <div className="p-4 border-r border-violet-200/30 font-mono text-[11px] leading-[1.7]">
          {codeLines.map((line) => (
            <div key={line.num} className="flex">
              <span className="w-6 text-right text-slate-300 mr-4 select-none">{line.num}</span>
              <span className={line.color || "text-transparent"}>{line.content || "\u00A0"}</span>
            </div>
          ))}
        </div>

        {/* Preview panel */}
        <div className="p-4">
          <div className="text-[9px] font-mono uppercase tracking-wider text-slate-300 mb-3">Preview</div>
          <div className="rounded-lg border border-violet-200/35 bg-violet-50/40 p-4">
            <div className="text-xs font-semibold text-slate-500 mb-3">Rebalance Bot</div>
            <div className="space-y-2">
              {[
                { token: "SOL", action: "Sell 5%", color: "#ef4444", logo: "/logos/token-sol.png" },
                { token: "BONK", action: "Sell 5%", color: "#ef4444", logo: "/logos/token-bonk.png" },
              ].map((item) => (
                <div key={item.token} className="flex items-center justify-between rounded-md bg-white/70 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <img src={item.logo} alt="" className="h-3.5 w-3.5 rounded-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <span className="text-[11px] text-slate-500 font-mono">{item.token}</span>
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: item.color, opacity: 0.5 }}>{item.action}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-center">
              <div className="inline-block text-[10px] font-mono px-3 py-1.5 rounded bg-pink-500/10 text-pink-400/50 border border-pink-500/10">
                Execute via Squads
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ForesightMockUI() {
  // Smooth bezier curves for realistic look
  const realCurve = "M 0,72 C 15,70 30,66 50,64 C 70,62 90,58 110,55 C 130,52 150,50 170,52 C 190,54 210,48 230,46 C 250,44 270,42 290,40";
  const bearCurve = "M 290,40 C 310,48 330,58 350,66 C 370,74 390,82 410,88 C 430,92 445,96 460,98";
  const bullCurve = "M 290,40 C 310,38 330,34 350,30 C 370,26 390,20 410,16 C 430,12 445,10 460,8";
  const baseCurve = "M 290,40 C 310,42 330,44 350,48 C 370,52 390,56 410,58 C 430,60 445,62 460,64";

  return (
    <div className="rounded-xl border border-violet-200/40 bg-white/70 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-violet-200/35">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-amber-500/60" />
          <span className="text-[11px] font-mono text-slate-500">Foresight · What-If Scenario</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-slate-400">Treasury NAV</span>
          <span className="text-[10px] font-mono text-amber-400/40 bg-amber-400/[0.06] px-2 py-0.5 rounded">
            SOL −40%
          </span>
        </div>
      </div>

      <div className="p-5">
        {/* Chart area */}
        <div className="relative mb-5">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[8px] font-mono text-slate-300 pr-2 py-1 pointer-events-none" style={{ width: 36 }}>
            <span>$2.4M</span><span>$2.0M</span><span>$1.6M</span><span>$1.2M</span>
          </div>
          <div className="ml-9">
            <svg viewBox="0 0 460 110" className="w-full" style={{ height: 140 }} preserveAspectRatio="none">
              <defs>
                {/* Gradient for real data area */}
                <linearGradient id="foresight-real-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                </linearGradient>
                {/* Gradient for confidence band */}
                <linearGradient id="foresight-band-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.01" />
                </linearGradient>
                {/* Glow filter for the main line */}
                <filter id="foresight-glow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* Grid lines */}
              {[10, 35, 60, 85].map((y) => (
                <line key={y} x1="0" y1={y} x2="460" y2={y} stroke="rgba(139,92,246,0.08)" />
              ))}

              {/* Scenario divider */}
              <line x1="290" y1="0" x2="290" y2="110" stroke="rgba(139,92,246,0.15)" strokeDasharray="3 3" />
              <rect x="290" y="0" width="170" height="110" fill="rgba(251,191,36,0.01)" />

              {/* Real data area fill */}
              <path d={`${realCurve} L 290,110 L 0,110 Z`} fill="url(#foresight-real-grad)" />

              {/* Confidence band between bull and bear */}
              <path d={`${bullCurve} L 460,98 ${bearCurve.replace("M 290,40", "").split("C").reverse().map((s, i) => i === 0 ? `L 460,98` : `C ${s.trim().split(" ").reverse().join(" ")}`).join(" ")} Z`} fill="url(#foresight-band-grad)" />

              {/* Bear scenario (red dashed) */}
              <path d={bearCurve} fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.35" strokeDasharray="4 3" />

              {/* Base scenario (white dashed) */}
              <path d={baseCurve} fill="none" stroke="rgba(100,116,139,0.35)" strokeWidth="0.8" strokeDasharray="2 3" />

              {/* Bull scenario (violet dashed) */}
              <path d={bullCurve} fill="none" stroke="#7c3aed" strokeWidth="1" opacity="0.4" strokeDasharray="4 3" />

              {/* Real data line (main, with glow) */}
              <path d={realCurve} fill="none" stroke="#fbbf24" strokeWidth="2" opacity="0.5" filter="url(#foresight-glow)" />
              <path d={realCurve} fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.7" />

              {/* Scenario start dot */}
              <circle cx="290" cy="40" r="3" fill="#fbbf24" opacity="0.5" />
              <circle cx="290" cy="40" r="6" fill="#fbbf24" opacity="0.08" />

              {/* Scenario labels */}
              <text x="296" y="8" fill="rgba(100,116,139,0.45)" fontSize="7" fontFamily="monospace">PROJECTION</text>
              <text x="444" y="10" fill="rgba(124,58,237,0.45)" fontSize="6" fontFamily="monospace">Bull</text>
              <text x="444" y="67" fill="rgba(100,116,139,0.4)" fontSize="6" fontFamily="monospace">Base</text>
              <text x="444" y="100" fill="rgba(239,68,68,0.25)" fontSize="6" fontFamily="monospace">Bear</text>

              {/* Animated scan line */}
              <line x1="290" y1="0" x2="290" y2="110" stroke="#fbbf24" strokeWidth="0.5" opacity="0.15">
                <animate attributeName="x1" values="290;460;290" dur="4s" repeatCount="indefinite" />
                <animate attributeName="x2" values="290;460;290" dur="4s" repeatCount="indefinite" />
              </line>
            </svg>

            {/* X-axis labels */}
            <div className="flex justify-between text-[8px] font-mono text-slate-300 mt-1 px-1">
              <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span>
              <span className="text-amber-400/20">Sep</span><span className="text-amber-400/20">Nov</span><span className="text-amber-400/20">Jan</span>
            </div>
          </div>
        </div>

        {/* Scenario results grid — richer */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Runway", value: "8.2 mo", sub: "was 14 mo", accent: "text-red-400/50", trend: "↓" },
            { label: "Risk Score", value: "7.4", sub: "/ 10 High", accent: "text-amber-400/50", trend: "↑" },
            { label: "Drawdown", value: "−$906K", sub: "−40% NAV", accent: "text-red-400/50", trend: "↓" },
            { label: "Burn Rate", value: "$82K", sub: "/ month", accent: "text-slate-500", trend: "→" },
          ].map((metric) => (
            <div key={metric.label} className="rounded-lg bg-white/70 border border-white/[0.03] p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[8px] font-mono uppercase tracking-wider text-slate-300">{metric.label}</span>
                <span className={`text-[9px] ${metric.accent}`}>{metric.trend}</span>
              </div>
              <div className={`text-sm font-bold ${metric.accent} tracking-tight`}>{metric.value}</div>
              <div className="text-[9px] text-slate-300 font-mono">{metric.sub}</div>
            </div>
          ))}
        </div>

        {/* Suggested actions — pill style */}
        <div className="mt-4 flex items-center gap-3 border-t border-violet-200/35 pt-4">
          <span className="text-[8px] font-mono uppercase tracking-wider text-slate-300 shrink-0">Actions</span>
          <div className="flex gap-2 overflow-x-auto">
            {[
              { label: "Hedge 20% → USDC", urgency: "high" },
              { label: "Reduce burn 15%", urgency: "med" },
              { label: "Pause DCA bots", urgency: "low" },
            ].map((a) => (
              <span
                key={a.label}
                className={`text-[10px] font-mono whitespace-nowrap px-2.5 py-1 rounded border ${
                  a.urgency === "high"
                    ? "text-red-400/40 bg-red-400/[0.04] border-red-400/10"
                    : a.urgency === "med"
                    ? "text-amber-400/30 bg-amber-400/[0.04] border-amber-400/10"
                    : "text-slate-400 bg-white/70 border-white/[0.04]"
                }`}
              >
                {a.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const mockPanels: Record<string, () => React.JSX.Element> = {
  treasury: TreasuryMockUI,
  studio: StudioMockUI,
  foresight: ForesightMockUI,
};

export function DeepDiveSection() {
  const [activeTab, setActiveTab] = useState("treasury");
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const activeData = tabs.find((t) => t.id === activeTab)!;
  const MockPanel = mockPanels[activeTab];

  return (
    <section
      id="deep-dive"
      className="relative border-t border-violet-200/35 scroll-mt-24"
      aria-labelledby="deep-dive-heading"
      ref={ref}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mb-14"
        >
          <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-slate-400 mb-5">
            Deep Dive
          </p>
          <h2
            id="deep-dive-heading"
            className="text-3xl md:text-5xl font-bold text-slate-900 tracking-[-0.02em]"
          >
            Three modules. Total control.
          </h2>
        </motion.div>

        {/* Tab selector */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center gap-1 mb-10 border-b border-white/[0.04] pb-px"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-5 py-3 text-sm font-medium transition-colors duration-200 ${
                activeTab === tab.id
                  ? "text-slate-900"
                  : "text-slate-500 hover:text-slate-500"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="deep-dive-tab"
                  className={`absolute bottom-0 left-0 right-0 h-px ${tab.color}`}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
          >
            {/* Mock UI panel */}
            <div className="mb-10">
              <MockPanel />
            </div>

            {/* Feature cards — compact row */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0">
              {activeData.features.map((feature, i) => (
                <div
                  key={feature.title}
                  className="border-t lg:border-t-0 lg:border-l border-white/[0.04] first:border-t-0 lg:first:border-l-0 p-6"
                >
                  <span className={`text-[10px] font-mono ${activeData.colorText} opacity-40 mb-2 block`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1.5 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-[12px] text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
