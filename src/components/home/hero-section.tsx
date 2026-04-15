"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowDown } from "lucide-react";
import Image from "next/image";

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
      className="relative h-dvh max-h-dvh flex flex-col overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Gradient mesh removed - now in shared parent */}

      <div className="relative flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 pt-20 pb-6">
        {/* ── Centered Eyebrow at top ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center text-[11px] font-mono uppercase tracking-[0.3em] text-dreyv-green/60 mb-8"
        >
          For DAOs, protocols &amp; treasury teams · Non-custodial · Solana-native
          {solPrice && (
            <span className="ml-4 text-white/25">SOL ${solPrice.toFixed(2)}</span>
          )}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.05 }}
          className="text-center text-[10px] font-mono tracking-[0.18em] text-white/20 -mt-5 mb-8"
        >
          Opinionated like Linear — plan, simulate, then sign
        </motion.p>

        {/* ── Two column content ── */}
        <div className="w-full grid lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16">
          {/* Left column: Heading + Subtitle */}
          <div>
            <motion.h1
              id="hero-heading"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-[clamp(2.75rem,5vw,5rem)] font-bold tracking-[-0.03em] leading-[1.1] text-white flex flex-col items-start"
            >
              <span>Treasury work,</span>
              <span>explained before you sign.</span>
              <span className="mt-3 text-[clamp(1.65rem,3.2vw,3rem)] font-bold tracking-[-0.02em] leading-[1.15] text-white/85">
                From{" "}
                <span className="text-white/40">tab-hopping</span>{" "}
                <span className="text-dreyv-green">to</span>{" "}
                <span className="bg-gradient-to-r from-dreyv-green via-emerald-400 to-dreyv-green/50 bg-clip-text text-transparent">
                  intent-driven control.
                </span>
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-8 text-lg lg:text-xl text-white/35 max-w-xl leading-relaxed font-light"
            >
              Stop blind-signing across eight tabs.{" "}
              <span className="text-white/55">dreyv</span> is the layer where your team turns plain-language intent into an
              execution plan — fork simulation, readable impact, policy context — then approves with the multisig you
              already use (e.g. Squads).{" "}
              <span className="text-white/45">We never custody assets; you keep the keys.</span>
            </motion.p>
          </div>

          {/* ── Right column: Image showcase ── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            className="relative hidden lg:flex items-center justify-center"
          >
            {/* Glow behind the image */}
            <div className="absolute -inset-8 bg-dreyv-green/[0.03] blur-[80px] rounded-full pointer-events-none" />

            <div className="relative w-full max-w-lg">
              <Image
                src="/images/hero-command.png"
                alt="AI Command Interface - Swap 500 SOL to USDC via Jupiter"
                width={600}
                height={400}
                className="w-full h-auto rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/[0.06]"
                priority
              />
            </div>
          </motion.div>
        </div>

        {/* ── Centered CTA below content ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
        >
          <a
            href="/auth?redirect=/app"
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
            <span className="relative text-black font-semibold tracking-wide">Get started — free</span>
            <ArrowRight className="relative h-3.5 w-3.5 text-black/70 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-black" />
          </a>
          <a
            href="/app"
            className="text-sm text-white/30 hover:text-white/60 transition-colors duration-300 font-medium"
          >
            Already have an account? Open workspace
          </a>
          <span className="text-white/10 hidden sm:inline" aria-hidden>
            ·
          </span>
          <a
            href="#demo"
            className="text-sm text-white/30 hover:text-white/60 transition-colors duration-300 font-medium"
          >
            or try a command below &darr;
          </a>
        </motion.div>

        {/* ── Centered Stats below CTA ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.75 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-mono tracking-wide text-white/20"
        >
          <span>Simulation-first</span>
          <span className="hidden sm:block h-3 w-px bg-white/[0.06]" aria-hidden />
          <span>You hold the keys</span>
          <span className="hidden sm:block h-3 w-px bg-white/[0.06]" aria-hidden />
          <span>Multisig-ready</span>
        </motion.div>
      </div>

      {/* Bottom edge */}
      <div className="shrink-0 h-px" />
    </section>
  );
}
