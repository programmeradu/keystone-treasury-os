"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";

const useCases = [
  {
    title: "Treasury Rebalancing",
    description:
      "Automatically rebalance treasury assets across protocols based on target allocations, risk limits, and live yield data.",
    visual: (
      <svg viewBox="0 0 48 16" className="w-12 h-4">
        {[{w:14,c:"#a78bfa"},{w:10,c:"#60a5fa"},{w:8,c:"#36e27b"},{w:16,c:"#fbbf24"}].reduce<{el:React.ReactNode[],x:number}>((a,s,i) => {
          a.el.push(<rect key={i} x={a.x} y="3" width={s.w} height="10" rx="1" fill={s.c} opacity="0.25" />);
          return { el: a.el, x: a.x + s.w };
        }, { el: [], x: 0 }).el}
      </svg>
    ),
  },
  {
    title: "Emergency Response",
    description:
      "Execute emergency liquidations, withdrawals, or multi-sig approvals with a single command when markets move fast.",
    visual: (
      <svg viewBox="0 0 48 16" className="w-12 h-4">
        <circle cx="8" cy="8" r="4" fill="#ef4444" opacity="0.15" />
        <circle cx="8" cy="8" r="2" fill="#ef4444" opacity="0.3" />
        <line x1="16" y1="8" x2="44" y2="8" stroke="#ef4444" strokeWidth="0.8" opacity="0.15" />
        <circle cx="44" cy="8" r="1.5" fill="#ef4444" opacity="0.2" />
      </svg>
    ),
  },
  {
    title: "Team Collaboration",
    description:
      "Share operations context in real-time via War Room. Named playbooks with role-based access and quorum visualization.",
    visual: (
      <svg viewBox="0 0 48 16" className="w-12 h-4">
        {[{x:6,c:"#36e27b"},{x:18,c:"#60a5fa"},{x:30,c:"#a78bfa"}].map((d,i) => (
          <g key={i}><circle cx={d.x} cy="8" r="3" fill={d.c} opacity="0.2" /><circle cx={d.x} cy="8" r="1" fill={d.c} opacity="0.4" /></g>
        ))}
        <line x1="9" y1="8" x2="15" y2="8" stroke="white" strokeWidth="0.5" opacity="0.08" />
        <line x1="21" y1="8" x2="27" y2="8" stroke="white" strokeWidth="0.5" opacity="0.08" />
      </svg>
    ),
  },
  {
    title: "Recurring Payroll",
    description:
      "Schedule contributor payroll across tokens, auto-route stablecoins, and capture multisig approvals with one prompt.",
    visual: (
      <svg viewBox="0 0 48 16" className="w-12 h-4">
        {[0, 10, 20, 30, 40].map((x, i) => (
          <rect key={i} x={x} y="5" width="6" height="6" rx="1" fill="#36e27b" opacity={0.1 + i * 0.06} />
        ))}
      </svg>
    ),
  },
  {
    title: "Investor Reporting",
    description:
      "Generate board-ready treasury reports with PnL, burn rates, and audit trails. Export to CSV/PDF in seconds.",
    visual: (
      <svg viewBox="0 0 48 16" className="w-12 h-4">
        {[4, 8, 6, 10, 7, 12, 9].map((h, i) => (
          <rect key={i} x={i * 7} y={16 - h} width="4" height={h} rx="0.5" fill="#60a5fa" opacity={0.15 + i * 0.03} />
        ))}
      </svg>
    ),
  },
  {
    title: "Scenario Planning",
    description:
      "Ask 'What if SOL drops 20%?' — simulate impact, propose rebalances, and execute hedges with built-in risk limits.",
    visual: (
      <svg viewBox="0 0 48 16" className="w-12 h-4">
        <path d="M 0 12 L 12 10 L 24 8" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.3" />
        <path d="M 24 8 L 36 4 L 48 2" fill="none" stroke="#36e27b" strokeWidth="0.8" opacity="0.2" strokeDasharray="2 2" />
        <path d="M 24 8 L 36 12 L 48 14" fill="none" stroke="#ef4444" strokeWidth="0.8" opacity="0.2" strokeDasharray="2 2" />
        <circle cx="24" cy="8" r="1.5" fill="#fbbf24" opacity="0.4" />
      </svg>
    ),
  },
];

export function UseCasesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="use-cases"
      className="relative border-t border-white/[0.04] scroll-mt-24"
      aria-labelledby="use-cases-heading"
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
            Use Cases
          </p>
          <h2
            id="use-cases-heading"
            className="text-3xl md:text-5xl font-bold text-white tracking-[-0.02em]"
          >
            Built for Real Operations
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-0">
          {useCases.map((uc, i) => (
            <motion.div
              key={uc.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.06 }}
              className="group border-t lg:[&:nth-child(-n+3)]:border-t sm:[&:nth-child(-n+2)]:border-t border-white/[0.04] p-8 hover:bg-white/[0.015] transition-colors duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-keystone-green/30">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {uc.visual}
              </div>
              <h3 className="text-base font-semibold text-white mb-2 tracking-tight">
                {uc.title}
              </h3>
              <p className="text-sm text-white/30 leading-relaxed">
                {uc.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
