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
            The workspace between intent and signature.
          </h2>
          <p className="mt-4 text-base md:text-lg text-white/35 leading-relaxed">
            <span className="text-white/80 font-medium">dreyv</span> is where{" "}
            <span className="text-white/55">treasury-by-intent</span> lives: plain-language intent → execution plan → fork
            simulation → human-readable impact report → sign with your wallet. Non-custodial by design; built to sit on
            Squads, Jupiter, and the Solana stack you already use.
          </p>
          <p className="mt-4 text-sm md:text-base text-white/25 leading-relaxed">
            Vaults guard assets; accounting closes the books — dreyv is where the team <span className="text-white/40">coordinates what happens next</span>{" "}
            before anyone signs.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
