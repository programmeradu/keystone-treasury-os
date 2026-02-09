"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { MessageSquare, Cpu, CheckCircle2 } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: MessageSquare,
    title: "Describe Your Intent",
    description:
      "Type what you want in plain English. 'Swap 500 SOL to USDC' or 'Show me runway if we hire 3 devs.' No syntax to learn.",
    color: "#36e27b",
  },
  {
    number: "02",
    icon: Cpu,
    title: "Agents Plan & Validate",
    description:
      "Five AI agents collaborate to parse intent, find optimal routes, simulate execution, and enforce policies. Simulation-first safety.",
    color: "#60a5fa",
  },
  {
    number: "03",
    icon: CheckCircle2,
    title: "Approve & Execute",
    description:
      "Review the transparent plan, approve through Squads multisig, and execute on-chain. Full audit trail captured automatically.",
    color: "#a78bfa",
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
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2
            id="how-it-works-heading"
            className="text-3xl md:text-4xl font-bold text-white tracking-tight"
          >
            How It Works
          </h2>
          <p className="mt-4 text-white/50 text-base md:text-lg">
            Three steps from intent to execution. No dashboards, no manual coordination.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
              className="relative"
            >
              {/* Connector line (between cards on desktop) */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 -right-3 w-6 border-t border-dashed border-white/10" />
              )}

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 h-full">
                {/* Step number */}
                <div className="text-xs font-mono text-white/20 mb-4">{step.number}</div>

                {/* Icon */}
                <div
                  className="inline-flex items-center justify-center h-12 w-12 rounded-2xl mb-5"
                  style={{ backgroundColor: `${step.color}12` }}
                >
                  <step.icon className="h-6 w-6" style={{ color: step.color }} />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-white/45 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
