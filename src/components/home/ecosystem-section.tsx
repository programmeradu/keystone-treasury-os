"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Marquee } from "@/components/ui/marquee";

const partners = [
  { name: "Solana", category: "Blockchain", logo: "/logos/solana.png" },
  { name: "Squads", category: "Multisig", logo: "/logos/squads.png" },
  { name: "Jupiter", category: "DEX Aggregator", logo: "/logos/jup.png" },
  { name: "Helius", category: "RPC & Data", logo: "/logos/helius.png" },
  { name: "Marinade", category: "Liquid Staking", logo: "/logos/marinade.png" },
  { name: "Jito", category: "MEV & Staking", logo: "/logos/jito.png" },
  { name: "Liveblocks", category: "Collaboration", logo: "/logos/liveblocks.png" },
  { name: "Turnkey", category: "Key Management", logo: "/logos/turnkey.png" },
];

const proofs = [
  { title: "Simulation Passed", detail: "Route: Jupiter v6", status: "Verified" },
  { title: "Multisig Approved", detail: "Quorum: 3/5", status: "Signed" },
  { title: "Ledger Synced", detail: "Proof hash: 0x9d2b", status: "Recorded" },
  { title: "Risk Guard", detail: "Policy Pack v2", status: "Cleared" },
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
          <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-white/15 mb-4">
            Ecosystem
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-[-0.02em]">
            Trusted by the Solana core stack
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-5"
        >
          <Marquee className="[--duration:28s]">
            {partners.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-3 px-5 py-2 text-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.logo}
                  alt=""
                  loading="lazy"
                  className="h-5 w-5 rounded-sm opacity-60"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <span className="font-semibold text-white/60">{item.name}</span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/20">
                  {item.category}
                </span>
              </div>
            ))}
          </Marquee>

          <Marquee className="[--duration:32s]" reverse>
            {proofs.map((proof) => (
              <div
                key={proof.title}
                className="flex items-center gap-4 border-l border-white/[0.06] px-5 py-2"
              >
                <div>
                  <div className="text-sm font-medium text-white/50">{proof.title}</div>
                  <div className="text-[11px] text-white/20 font-mono">{proof.detail}</div>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-keystone-green/50">
                  {proof.status}
                </span>
              </div>
            ))}
          </Marquee>
        </motion.div>
      </div>
    </section>
  );
}
