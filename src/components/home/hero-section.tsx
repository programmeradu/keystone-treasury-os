"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Terminal } from "lucide-react";
import { LogoFilled } from "@/components/icons";

const stats = [
  { value: "Solana Native", label: "Built for Speed" },
  { value: "5 Agents", label: "Orchestrated AI" },
  { value: "<2s", label: "Avg Response" },
  { value: "0", label: "Security Incidents" },
];

export function HeroSection() {
  const [solPrice, setSolPrice] = useState<number | null>(null);

  useEffect(() => {
    let abort = false;
    async function fetchPrice() {
      try {
        const r = await fetch("/api/jupiter/price?ids=SOL", { cache: "no-store" });
        const j = await r.json();
        if (!abort && j?.data?.SOL?.price) {
          setSolPrice(j.data.SOL.price);
        }
      } catch {
        /* silent */
      }
    }
    fetchPrice();
    const id = setInterval(fetchPrice, 30000);
    return () => {
      abort = true;
      clearInterval(id);
    };
  }, []);

  return (
    <section
      id="content"
      className="relative scroll-mt-24 overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#36e27b]/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#36e27b]/[0.03] rounded-full blur-[100px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#36e27b]/20 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-24 md:pt-32 md:pb-32">
        <div className="max-w-4xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-[#36e27b]/20 bg-[#36e27b]/[0.06] px-3 py-1.5 text-xs font-medium text-[#36e27b] mb-6"
          >
            <LogoFilled size={14} />
            <span>The Sovereign OS for Digital Assets</span>
            {solPrice && (
              <span className="ml-1 text-white/50">
                SOL ${solPrice.toFixed(2)}
              </span>
            )}
          </motion.div>

          {/* Heading */}
          <motion.h1
            id="hero-heading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] text-white"
          >
            From Click-Ops{" "}
            <br className="hidden sm:block" />
            to{" "}
            <span className="bg-gradient-to-r from-[#36e27b] via-[#36e27b]/80 to-[#36e27b]/60 bg-clip-text text-transparent">
              Command-Ops.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed"
          >
            Stop juggling Squads, Jupiter, and Birdeye across 10 tabs.
            Keystone turns complex treasury operations into simple, declarative commands.
            Humans set intent, machines handle complexity.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <Button
              size="lg"
              asChild
              className="bg-[#36e27b] text-[#0B0C10] hover:bg-[#36e27b]/90 font-semibold shadow-[0_0_30px_rgba(54,226,123,0.3)] hover:shadow-[0_0_40px_rgba(54,226,123,0.4)] transition-all"
            >
              <a href="/app" className="inline-flex items-center gap-2">
                Open App <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06] hover:border-white/20"
            >
              <a href="#demo" className="inline-flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Try a Command
              </a>
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.08 }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 backdrop-blur-sm"
              >
                <div className="text-lg font-semibold text-white">{stat.value}</div>
                <div className="text-xs text-white/40 mt-0.5">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
