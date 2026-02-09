"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { AlertTriangle, ArrowRight, Layers } from "lucide-react";

const fragmentedTools = [
  "Squads",
  "Jupiter",
  "Birdeye",
  "Dune",
  "Kamino",
  "Discord",
  "Phantom",
  "Marinade",
];

const keystoneModules = [
  { label: "Command", color: "from-[#36e27b]/20 to-[#36e27b]/5" },
  { label: "Treasury", color: "from-blue-500/20 to-blue-500/5" },
  { label: "Studio", color: "from-purple-500/20 to-purple-500/5" },
  { label: "Foresight", color: "from-amber-500/20 to-amber-500/5" },
  { label: "Atlas", color: "from-cyan-500/20 to-cyan-500/5" },
  { label: "Agents", color: "from-rose-500/20 to-rose-500/5" },
];

export function ProblemSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative border-t border-white/[0.04] scroll-mt-24" ref={ref}>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 text-amber-400/80 text-sm font-medium mb-4">
            <AlertTriangle className="h-4 w-4" />
            The Problem
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Death by Fragmentation
          </h2>
          <p className="mt-4 text-white/50 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            Treasury teams juggle 8+ disconnected tools. Every tab switch is a context-switch risk.
            Blind signing hex strings. Opportunities lost to slow coordination.
          </p>
        </motion.div>

        {/* Before / After comparison */}
        <div className="mt-16 grid md:grid-cols-[1fr_auto_1fr] gap-8 md:gap-6 items-start">
          {/* Before */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-2xl border border-red-500/10 bg-red-500/[0.03] p-6"
          >
            <div className="text-sm font-semibold text-red-400/80 mb-4 uppercase tracking-wider">Before: 8+ Tabs</div>
            <div className="grid grid-cols-2 gap-2">
              {fragmentedTools.map((tool, i) => (
                <motion.div
                  key={tool}
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: 1 } : {}}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-white/50"
                >
                  <div className="h-2 w-2 rounded-full bg-red-400/40" />
                  {tool}
                </motion.div>
              ))}
            </div>
            <p className="mt-4 text-xs text-white/30">Context switching, blind signing, missed opportunities</p>
          </motion.div>

          {/* Arrow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="hidden md:flex items-center justify-center self-center"
          >
            <div className="rounded-full bg-[#36e27b]/10 p-3">
              <ArrowRight className="h-5 w-5 text-[#36e27b]" />
            </div>
          </motion.div>

          {/* After */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="rounded-2xl border border-[#36e27b]/10 bg-[#36e27b]/[0.03] p-6"
          >
            <div className="text-sm font-semibold text-[#36e27b]/80 mb-4 uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4" />
              After: One Keystone
            </div>
            <div className="grid grid-cols-2 gap-2">
              {keystoneModules.map((mod, i) => (
                <motion.div
                  key={mod.label}
                  initial={{ opacity: 0 }}
                  animate={inView ? { opacity: 1 } : {}}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className={`flex items-center gap-2 rounded-lg border border-[#36e27b]/10 bg-gradient-to-r ${mod.color} px-3 py-2 text-sm text-white/70 font-medium`}
                >
                  <div className="h-2 w-2 rounded-full bg-[#36e27b]/60" />
                  {mod.label}
                </motion.div>
              ))}
            </div>
            <p className="mt-4 text-xs text-[#36e27b]/40">One screen. One command. Full control.</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
