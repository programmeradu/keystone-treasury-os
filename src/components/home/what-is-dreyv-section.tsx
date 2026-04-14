"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export function WhatIsDreyvSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="what-is-dreyv"
      className="relative border-t border-white/[0.04] scroll-mt-24"
      aria-labelledby="what-is-dreyv-heading"
      ref={ref}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="max-w-3xl"
        >
          <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-dreyv-green/50 mb-4">
            What is dreyv?
          </p>
          <h2
            id="what-is-dreyv-heading"
            className="text-2xl md:text-3xl font-bold text-white tracking-[-0.02em]"
          >
            Command-ops for treasuries, without custody.
          </h2>
          <p className="mt-4 text-base md:text-lg text-white/35 leading-relaxed">
            <span className="text-white/80 font-medium">dreyv</span> is the operating layer that turns intent
            into routed, simulated, and auditable treasury actions on Solana. It connects to your multisig and
            the protocols you already use — so approvers see outcomes, not opaque calldata.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
