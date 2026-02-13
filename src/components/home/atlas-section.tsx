"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";

const tools = [
  {
    title: "Market Pulse", desc: "Live prices, trending tokens, and real-time Solana market data.",
    visual: (
      <svg viewBox="0 0 60 20" className="w-14 h-5">
        <path d="M 0 16 L 8 12 L 16 14 L 24 8 L 32 10 L 40 5 L 48 7 L 60 3" fill="none" stroke="#22d3ee" strokeWidth="1.2" opacity="0.4" />
        <circle cx="60" cy="3" r="1.5" fill="#22d3ee" opacity="0.5" />
      </svg>
    ),
  },
  {
    title: "MEV Scanner", desc: "Detect sandwich attacks and front-running on your transactions.",
    visual: (
      <svg viewBox="0 0 60 20" className="w-14 h-5">
        {[0, 12, 24, 36, 48].map((x, i) => (
          <rect key={i} x={x} y={i === 2 ? 2 : 8} width="8" height={i === 2 ? 18 : 12} rx="1" fill={i === 2 ? "#ef4444" : "#22d3ee"} opacity={i === 2 ? 0.3 : 0.1} />
        ))}
      </svg>
    ),
  },
  {
    title: "Airdrop Scout", desc: "Scan your wallet for eligible airdrops across Solana protocols.",
    visual: (
      <svg viewBox="0 0 60 20" className="w-14 h-5">
        {[{x:8,y:4},{x:20,y:12},{x:32,y:6},{x:44,y:14},{x:52,y:8}].map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i < 3 ? 2.5 : 1.5} fill="#22d3ee" opacity={i < 3 ? 0.35 : 0.15} />
        ))}
      </svg>
    ),
  },
  {
    title: "Rug Pull Detector", desc: "Analyze token contracts for red flags before you invest.",
    visual: (
      <svg viewBox="0 0 60 20" className="w-14 h-5">
        <path d="M 5 17 L 15 12 L 25 14 L 35 4 L 45 6 L 55 2" fill="none" stroke="#ef4444" strokeWidth="1" opacity="0.25" strokeDasharray="3 2" />
        <circle cx="35" cy="4" r="2" fill="#ef4444" opacity="0.3" />
      </svg>
    ),
  },
  {
    title: "DCA Bots", desc: "Set up automated dollar-cost averaging strategies with Jupiter.",
    visual: (
      <svg viewBox="0 0 60 20" className="w-14 h-5">
        {[0, 10, 20, 30, 40, 50].map((x, i) => (
          <rect key={i} x={x} y={16 - i * 2.5} width="6" height={2} rx="0.5" fill="#22d3ee" opacity={0.15 + i * 0.05} />
        ))}
      </svg>
    ),
  },
  {
    title: "Strategy Lab", desc: "Simulate staking, swaps, and LP strategies with live APY projections.",
    visual: (
      <svg viewBox="0 0 60 20" className="w-14 h-5">
        <path d="M 0 18 L 15 14 L 30 10 L 45 6 L 60 2" fill="none" stroke="#22d3ee" strokeWidth="1" opacity="0.3" />
        <path d="M 0 18 L 15 16 L 30 12 L 45 10 L 60 8" fill="none" stroke="#a78bfa" strokeWidth="1" opacity="0.2" strokeDasharray="3 2" />
      </svg>
    ),
  },
  {
    title: "Portfolio Rebalancer", desc: "Auto-rebalance your portfolio based on target allocations.",
    visual: (
      <svg viewBox="0 0 60 20" className="w-14 h-5">
        {[{w:18,c:"#a78bfa"},{w:12,c:"#60a5fa"},{w:8,c:"#22d3ee"},{w:22,c:"#36e27b"}].reduce<{el:React.JSX.Element[],x:number}>((acc, seg, i) => {
          acc.el.push(<rect key={i} x={acc.x} y="6" width={seg.w} height="8" rx="1" fill={seg.c} opacity="0.2" />);
          return { el: acc.el, x: acc.x + seg.w };
        }, { el: [], x: 0 }).el}
      </svg>
    ),
  },
  {
    title: "Time Machine", desc: "Replay and analyze historical transactions with full context.",
    visual: (
      <svg viewBox="0 0 60 20" className="w-14 h-5">
        <line x1="0" y1="10" x2="60" y2="10" stroke="#22d3ee" strokeWidth="0.5" opacity="0.15" />
        {[8, 20, 32, 44, 56].map((x, i) => (
          <circle key={i} cx={x} cy="10" r={i === 4 ? 2.5 : 1.5} fill="#22d3ee" opacity={0.1 + i * 0.08} />
        ))}
      </svg>
    ),
  },
];

export function AtlasSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [msolPrice, setMsolPrice] = useState<number | null>(null);

  useEffect(() => {
    let abort = false;
    async function fetchPrices() {
      try {
        const r = await fetch("/api/jupiter/price?ids=SOL,MSOL", { cache: "no-store" });
        const j = await r.json();
        if (!abort && j?.data) {
          if (typeof j.data.SOL?.price === "number") setSolPrice(j.data.SOL.price);
          if (typeof j.data.MSOL?.price === "number") setMsolPrice(j.data.MSOL.price);
        }
      } catch {
        /* silent */
      }
    }
    fetchPrices();
    const id = setInterval(fetchPrices, 30000);
    return () => { abort = true; clearInterval(id); };
  }, []);

  return (
    <section
      id="atlas"
      className="relative border-t border-white/[0.04] scroll-mt-24"
      aria-labelledby="atlas-heading"
      ref={ref}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-cyan-400/40 mb-5">
              Free Public Good
            </p>
            <h2
              id="atlas-heading"
              className="text-3xl md:text-5xl font-bold text-white tracking-[-0.02em]"
            >
              Solana Atlas
            </h2>
            <p className="mt-4 text-white/30 text-base md:text-lg leading-relaxed">
              A free DeFi toolkit for the Solana ecosystem. Discover, analyze, optimize.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-6"
          >
            <div className="flex items-center gap-4 text-xs font-mono text-white/25">
              <span className="inline-flex items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/token-sol.png" alt="" className="h-3.5 w-3.5 rounded-full" />
                SOL <span className="text-white/60">{solPrice ? `$${solPrice.toFixed(2)}` : "..."}</span>
              </span>
              <span className="h-3 w-px bg-white/[0.06]" />
              <span className="inline-flex items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/token-msol.png" alt="" className="h-3.5 w-3.5 rounded-full" />
                mSOL <span className="text-white/60">{msolPrice ? `$${msolPrice.toFixed(2)}` : "..."}</span>
              </span>
            </div>
            <a
              href="/atlas"
              className="group inline-flex items-center gap-2 text-sm font-medium text-cyan-400/70 hover:text-cyan-400 transition-colors"
            >
              Open Atlas
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </a>
          </motion.div>
        </div>

        {/* Tools — clean grid, no icon boxes */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.04 }}
              className="group border-t lg:odd:border-r border-white/[0.04] p-6 hover:bg-cyan-500/[0.02] transition-colors duration-300"
            >
              <div className="mb-3 h-5">{tool.visual}</div>
              <h3 className="text-sm font-semibold text-white mb-1.5 group-hover:text-cyan-300 transition-colors duration-300">
                {tool.title}
              </h3>
              <p className="text-xs text-white/25 leading-relaxed">{tool.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
