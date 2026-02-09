"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Terminal,
  Bot,
  Vault,
  Code2,
  Eye,
  Compass,
} from "lucide-react";

const pillars = [
  {
    icon: Terminal,
    title: "Command Layer",
    description:
      "Natural language interface that turns declarative prompts into multi-step treasury operations. No more clicking through 10 screens.",
    accent: "#36e27b",
  },
  {
    icon: Bot,
    title: "Agent System",
    description:
      "5 specialized AI agents (Lookup, Builder, Analysis, Transaction, Coordinator) orchestrate complex operations with simulation-first safety.",
    accent: "#60a5fa",
  },
  {
    icon: Vault,
    title: "Treasury Hub",
    description:
      "Operations Nexus for bulk distributions, Governance Oracle for Squads multisig voting, and Data Nexus for full transaction ledgers.",
    accent: "#a78bfa",
  },
  {
    icon: Code2,
    title: "Keystone Studio",
    description:
      "AI-powered IDE with Monaco editor, live preview, and self-correcting Architect AI. Build, publish, and monetize mini-apps on the marketplace.",
    accent: "#f472b6",
  },
  {
    icon: Eye,
    title: "Generative Foresight",
    description:
      "Ask 'What if SOL drops 50%?' and get instant, ephemeral dashboards with Predictive Runway, Risk Scorecard, and Market Sentiment.",
    accent: "#fbbf24",
  },
  {
    icon: Compass,
    title: "Solana Atlas",
    description:
      "Free DeFi toolkit: MEV Scanner, Airdrop Scout, Rug Pull Detector, Strategy Lab, DCA Bots, and Portfolio Rebalancer. All in one place.",
    accent: "#22d3ee",
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
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <h2
            id="pillars-heading"
            className="text-3xl md:text-4xl font-bold text-white tracking-tight"
          >
            Six Pillars. One Operating System.
          </h2>
          <p className="mt-4 text-white/50 text-base md:text-lg">
            Everything a treasury team needs, unified under a single command layer.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
              className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300"
            >
              {/* Accent glow on hover */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at top right, ${pillar.accent}08, transparent 70%)`,
                }}
              />

              <div className="relative">
                <div
                  className="inline-flex items-center justify-center h-10 w-10 rounded-xl mb-4"
                  style={{ backgroundColor: `${pillar.accent}15` }}
                >
                  <pillar.icon className="h-5 w-5" style={{ color: pillar.accent }} />
                </div>

                <h3 className="text-lg font-semibold text-white mb-2">
                  {pillar.title}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
