"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const integrations = [
  { name: "Solana", category: "Blockchain" },
  { name: "Squads", category: "Multisig" },
  { name: "Jupiter", category: "DEX Aggregator" },
  { name: "Helius", category: "RPC & Data" },
  { name: "Marinade", category: "Liquid Staking" },
  { name: "Jito", category: "MEV & Staking" },
  { name: "Liveblocks", category: "Collaboration" },
  { name: "Turnkey", category: "Key Management" },
];

export function EcosystemSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="relative border-t border-white/[0.04]" ref={ref}>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <p className="text-sm text-white/30 font-medium uppercase tracking-wider">
            Built with the best in Solana
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {integrations.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
              className="flex flex-col items-center justify-center rounded-xl border border-white/[0.05] bg-white/[0.015] py-4 px-3 hover:border-white/[0.1] hover:bg-white/[0.03] transition-all duration-200"
            >
              <span className="text-sm font-semibold text-white/70">{item.name}</span>
              <span className="text-[10px] text-white/30 mt-1">{item.category}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
