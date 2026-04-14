"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Describe Your Intent",
    description:
      "Type what you want in plain English. 'Swap 500 SOL to USDC' or 'Show me runway if we hire 3 devs.' No syntax to learn.",
    accent: "text-dreyv-green/20",
    line: "bg-dreyv-green",
  },
  {
    number: "02",
    title: "Agents Plan & Validate",
    description:
      "Five AI agents collaborate to parse intent, find optimal routes, simulate execution, and enforce policies. Simulation-first safety.",
    accent: "text-blue-500/20",
    line: "bg-blue-500",
  },
  {
    number: "03",
    title: "Approve & Execute",
    description:
      "Review the transparent plan, approve through Squads multisig, and execute on-chain. Full audit trail captured automatically.",
    accent: "text-purple-500/20",
    line: "bg-purple-500",
  },
];

export function HowItWorksSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="how-it-works"
      className="relative border-t border-white/[0.04] scroll-mt-24"
      aria-labelledby="how-it-works-heading"
      ref={ref}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mb-16"
        >
          <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-white/20 mb-5">
            How It Works
          </p>
          <h2
            id="how-it-works-heading"
            className="text-3xl md:text-5xl font-bold text-white tracking-[-0.02em]"
          >
            Three steps. Zero friction.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-0 md:gap-0">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.12 }}
              className="relative border-t md:border-t-0 md:border-l border-white/[0.04] first:border-t-0 md:first:border-l-0 p-8 md:p-10"
            >
              {/* Accent line at top */}
              <div className={`absolute top-0 left-8 md:left-0 md:top-8 h-px md:h-12 w-8 md:w-px ${step.line} opacity-30`} />

              {/* Giant step number */}
              <span className={`block text-7xl md:text-8xl font-bold ${step.accent} leading-none select-none mb-6`}>
                {step.number}
              </span>

              <h3 className="text-lg font-semibold text-white mb-3 tracking-tight">
                {step.title}
              </h3>
              <p className="text-sm text-white/30 leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
