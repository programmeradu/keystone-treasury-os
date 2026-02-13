"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="contact"
      className="relative border-t border-white/[0.04] scroll-mt-24 overflow-hidden"
      ref={ref}
    >
      {/* Ambient glow — no RetroGrid library */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-keystone-green/[0.05] rounded-full blur-[150px]" />
        <div className="absolute inset-0 grid-pattern opacity-20" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-28 md:py-40">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative text-center max-w-3xl mx-auto"
        >
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white tracking-[-0.03em] leading-[0.95]">
            Ready to command{" "}
            <span className="bg-gradient-to-r from-keystone-green via-emerald-400 to-keystone-green/50 bg-clip-text text-transparent">
              your treasury?
            </span>
          </h2>

          <p className="mt-8 text-white/30 text-lg md:text-xl max-w-lg mx-auto leading-relaxed font-light">
            Join treasury teams building on Keystone.
          </p>

          <div className="mt-10 flex flex-wrap justify-center items-center gap-6">
            <a
              href="/app"
              className="group relative inline-flex items-center gap-2.5 font-semibold text-xs px-5 py-2.5 rounded-lg overflow-hidden transition-all duration-300"
            >
              {/* Metallic keystone-green gradient background */}
              <span className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/5 to-transparent" />
              <span className="absolute inset-0 bg-gradient-to-br from-[#5aff9d] via-[#36e27b] to-[#1a9c4e]" />
              {/* Shine highlight */}
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              {/* Inner shadow for depth */}
              <span className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),inset_0_-1px_1px_rgba(0,0,0,0.3)]" />
              {/* Border */}
              <span className="absolute inset-0 rounded-lg border border-white/20" />
              {/* Content */}
              <span className="relative text-black font-semibold tracking-wide">Open App</span>
              <ArrowRight className="relative h-3.5 w-3.5 text-black/70 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-black" />
            </a>
            <a
              href="/atlas"
              className="text-sm text-white/30 hover:text-white/60 transition-colors duration-300 font-medium"
            >
              Explore Atlas &rarr;
            </a>
          </div>

          <p className="mt-12 text-[10px] font-mono uppercase tracking-[0.3em] text-white/10">
            Non-custodial · Simulation-first · Multisig-native
          </p>
        </motion.div>
      </div>
    </section>
  );
}
