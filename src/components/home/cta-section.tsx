"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { marketingPrimaryCta, marketingGhostLink } from "./marketing-styles";

export function CTASection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="contact"
      className="relative border-t border-violet-200/35 scroll-mt-24 overflow-hidden"
      ref={ref}
    >
      {/* Ambient glow — no RetroGrid library */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-violet-500/[0.09] rounded-full blur-[150px]" />
        <div className="absolute inset-0 grid-pattern-marketing opacity-40" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-28 md:py-40">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative text-center max-w-3xl mx-auto"
        >
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-slate-900 tracking-[-0.03em] leading-[0.95]">
            Ready to run treasury{" "}
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-500/80 bg-clip-text text-transparent">
              with clarity?
            </span>
          </h2>

          <p className="mt-8 text-slate-500 text-lg md:text-xl max-w-xl mx-auto leading-relaxed font-light">
            Bring your multisig and your playbook. Compose intent once, see simulated outcomes in plain language, then
            approve as a team — non-custodial by design.
          </p>

          <div className="mt-10 flex flex-wrap justify-center items-center gap-6 font-inter-label">
            <a href="/auth?redirect=/app" className={marketingPrimaryCta}>
              <span className="relative font-semibold tracking-wide">Get started — free</span>
              <ArrowRight className="relative h-4 w-4 text-white/90 transition-transform duration-300 group-hover:translate-x-0.5" />
            </a>
            <a href="/atlas" className={marketingGhostLink}>
              Explore Atlas &rarr;
            </a>
          </div>

          <p className="mt-12 text-[10px] font-mono uppercase tracking-[0.3em] text-slate-300">
            Non-custodial · Simulation-first · Multisig-native
          </p>
        </motion.div>
      </div>
    </section>
  );
}
