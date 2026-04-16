"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { Fragment, useRef } from "react";
import {
  ChevronRight,
  FileText,
  FlaskConical,
  ListTree,
  MessageSquare,
  PenLine,
} from "lucide-react";

const PIPELINE = [
  {
    title: "Intent",
    caption: "Plain language",
    Icon: MessageSquare,
  },
  {
    title: "Plan",
    caption: "Execution steps",
    Icon: ListTree,
  },
  {
    title: "Simulate",
    caption: "Fork preview",
    Icon: FlaskConical,
  },
  {
    title: "Report",
    caption: "Human-readable impact",
    Icon: FileText,
  },
  {
    title: "Sign",
    caption: "Wallet + quorum",
    Icon: PenLine,
  },
] as const;

export function WhatIsDreyvSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="what-is-dreyv"
      className="relative border-t border-violet-200/35 scroll-mt-24"
      aria-labelledby="what-is-dreyv-heading"
      ref={ref}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-14 lg:items-start">
          {/* —— Copy + pipeline —— */}
          <div>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : reduceMotion ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: reduceMotion ? 0 : 0.45 }}
            >
              <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-violet-600/90 mb-4">
                What is dreyv?
              </p>
              <h2
                id="what-is-dreyv-heading"
                className="text-2xl md:text-3xl lg:text-[2rem] font-bold text-slate-900 tracking-[-0.02em] leading-tight"
              >
                The workspace between intent and signature.
              </h2>
              <p className="mt-4 text-base md:text-lg text-slate-600 leading-relaxed">
                <span className="text-slate-800 font-medium">dreyv</span> is{" "}
                <span className="text-slate-700">treasury-by-intent</span> — non-custodial by design, built for Squads,
                Jupiter, and the Solana stack you already use. The loop looks like this:
              </p>
            </motion.div>

            <nav
              className="mt-8 flex flex-col gap-0 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-x-1 sm:gap-y-3"
              aria-label="From intent to signature"
            >
              {PIPELINE.map((step, i) => {
                const Icon = step.Icon;
                return (
                  <Fragment key={step.title}>
                    <motion.div
                      className="flex flex-1 min-w-0 sm:max-w-[8.75rem] sm:flex-1"
                      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                      animate={inView ? { opacity: 1, y: 0 } : reduceMotion ? { opacity: 1, y: 0 } : {}}
                      transition={{
                        duration: reduceMotion ? 0 : 0.35,
                        delay: reduceMotion ? 0 : 0.08 + i * 0.06,
                      }}
                    >
                      <div className="flex w-full items-center gap-3 rounded-xl border border-violet-200/40 bg-white/80 px-3 py-3 sm:flex-col sm:items-start">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                          <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                        </div>
                        <div className="min-w-0 sm:pt-0.5">
                          <p className="text-xs font-semibold text-slate-900">{step.title}</p>
                          <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{step.caption}</p>
                        </div>
                      </div>
                    </motion.div>
                    {i < PIPELINE.length - 1 && (
                      <>
                        <div
                          className="hidden sm:flex shrink-0 items-center justify-center self-center px-0.5 text-violet-300"
                          aria-hidden
                        >
                          <ChevronRight className="h-4 w-4" strokeWidth={2} />
                        </div>
                        <div className="flex justify-center py-1 sm:hidden" aria-hidden>
                          <div className="h-6 w-px bg-gradient-to-b from-violet-200 via-violet-300 to-violet-200" />
                        </div>
                      </>
                    )}
                  </Fragment>
                );
              })}
            </nav>

            <motion.div
              className="mt-8 border-l-2 border-violet-200/80 pl-4 md:pl-5"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : reduceMotion ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : 0.35 }}
            >
              <p className="text-sm md:text-base text-slate-500 leading-relaxed">
                Vaults guard assets; accounting closes the books — dreyv is where the team{" "}
                <span className="text-slate-700 font-medium">coordinates what happens next</span> before anyone signs.
              </p>
            </motion.div>
          </div>

          {/* —— Preview artifact —— */}
          <motion.div
            className="relative lg:sticky lg:top-28"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : reduceMotion ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.12 }}
          >
            <div
              className="absolute -inset-px rounded-2xl bg-gradient-to-br from-violet-200/50 via-transparent to-fuchsia-200/30 blur-sm opacity-70 pointer-events-none"
              aria-hidden
            />
            <div className="relative rounded-2xl border border-violet-200/45 bg-white/92 p-5 md:p-6 marketing-shadow-float">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-violet-600/90 mb-4">Live preview</p>

              <div className="rounded-xl border border-violet-200/40 bg-violet-50/50 p-3 font-mono text-[11px] leading-relaxed text-slate-600">
                <span className="text-violet-600 font-semibold">$ </span>
                Rebalance overweight SOL and memecoin sleeves into USDC; cap slippage at 12 bps; route via Jupiter.
              </div>

              <div className="mt-4 rounded-xl border border-violet-200/35 bg-white/90 p-4">
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-3">Impact summary</p>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex gap-2">
                    <span className="text-violet-500 shrink-0">·</span>
                    <span>
                      Est. NAV drift <span className="font-mono text-slate-700">−0.4%</span> vs. holding; stress band
                      within policy.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-violet-500 shrink-0">·</span>
                    <span>
                      <span className="font-mono text-slate-700">3</span> hops, worst-case fee{" "}
                      <span className="font-mono text-slate-700">~$42</span>.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-violet-500 shrink-0">·</span>
                    <span>Quorum: 2-of-3 signers required before broadcast.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-lg border border-violet-200/40 bg-violet-50/40 px-3 py-2.5">
                <span className="text-[11px] font-medium text-slate-600">Awaiting signatures</span>
                <span className="flex gap-1" aria-hidden>
                  {[0, 1, 2].map((j) => (
                    <span
                      key={j}
                      className="h-1.5 w-1.5 rounded-full bg-violet-400/80"
                      style={{ opacity: 0.35 + j * 0.25 }}
                    />
                  ))}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
