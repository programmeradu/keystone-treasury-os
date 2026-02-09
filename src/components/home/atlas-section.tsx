"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Compass,
  ArrowRight,
  Search,
  Shield,
  Zap,
  BarChart3,
  Crosshair,
  Repeat,
  Clock,
  AlertTriangle,
} from "lucide-react";

const tools = [
  {
    icon: BarChart3,
    title: "Market Pulse",
    desc: "Live prices, trending tokens, and real-time Solana market data.",
  },
  {
    icon: Crosshair,
    title: "MEV Scanner",
    desc: "Detect sandwich attacks and front-running on your transactions.",
  },
  {
    icon: Search,
    title: "Airdrop Scout",
    desc: "Scan your wallet for eligible airdrops across Solana protocols.",
  },
  {
    icon: AlertTriangle,
    title: "Rug Pull Detector",
    desc: "Analyze token contracts for red flags before you invest.",
  },
  {
    icon: Repeat,
    title: "DCA Bots",
    desc: "Set up automated dollar-cost averaging strategies with Jupiter.",
  },
  {
    icon: Zap,
    title: "Strategy Lab",
    desc: "Simulate staking, swaps, and LP strategies with live APY projections.",
  },
  {
    icon: Shield,
    title: "Portfolio Rebalancer",
    desc: "Auto-rebalance your portfolio based on target allocations.",
  },
  {
    icon: Clock,
    title: "Transaction Time Machine",
    desc: "Replay and analyze historical transactions with full context.",
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
        const r = await fetch("/api/jupiter/price?ids=SOL,MSOL", {
          cache: "no-store",
        });
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
    return () => {
      abort = true;
      clearInterval(id);
    };
  }, []);

  return (
    <section
      id="atlas"
      className="relative border-t border-white/[0.04] scroll-mt-24"
      aria-labelledby="atlas-heading"
      ref={ref}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 text-cyan-400/80 text-sm font-medium mb-3">
              <Compass className="h-4 w-4" />
              Free Public Good
            </div>
            <h2
              id="atlas-heading"
              className="text-3xl md:text-4xl font-bold text-white tracking-tight"
            >
              Solana Atlas
            </h2>
            <p className="mt-3 text-white/50 text-base md:text-lg leading-relaxed">
              A free, comprehensive DeFi toolkit for the Solana ecosystem.
              Discover, analyze, and optimize -- all in one place. Your gateway into Keystone.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-4"
          >
            {/* Live prices */}
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
              <div className="text-xs text-white/40">SOL</div>
              <div className="text-sm font-semibold text-white">
                {solPrice ? `$${solPrice.toFixed(2)}` : "..."}
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="text-xs text-white/40">mSOL</div>
              <div className="text-sm font-semibold text-white">
                {msolPrice ? `$${msolPrice.toFixed(2)}` : "..."}
              </div>
            </div>
            <Button
              size="sm"
              asChild
              className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20"
            >
              <a href="/atlas" className="inline-flex items-center gap-1.5">
                Open Atlas <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </Button>
          </motion.div>
        </div>

        {/* Tools grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.05 }}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-cyan-500/15 hover:bg-cyan-500/[0.03] transition-all duration-300"
            >
              <div className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-cyan-500/10 mb-3">
                <tool.icon className="h-4 w-4 text-cyan-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">
                {tool.title}
              </h3>
              <p className="text-xs text-white/40 leading-relaxed">{tool.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
