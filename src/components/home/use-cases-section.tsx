"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  RefreshCw,
  AlertTriangle,
  Users,
  Wallet,
  FileBarChart,
  TrendingUp,
} from "lucide-react";

const useCases = [
  {
    icon: RefreshCw,
    title: "Treasury Rebalancing",
    description:
      "Automatically rebalance treasury assets across protocols based on target allocations, risk limits, and live yield data.",
  },
  {
    icon: AlertTriangle,
    title: "Emergency Response",
    description:
      "Execute emergency liquidations, withdrawals, or multi-sig approvals with a single command when markets move fast.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Share operations context in real-time via War Room. Named playbooks with role-based access and quorum visualization.",
  },
  {
    icon: Wallet,
    title: "Recurring Payroll",
    description:
      "Schedule contributor payroll across tokens, auto-route stablecoins, and capture multisig approvals with one prompt.",
  },
  {
    icon: FileBarChart,
    title: "Investor Reporting",
    description:
      "Generate board-ready treasury reports with PnL, burn rates, and audit trails. Export to CSV/PDF in seconds.",
  },
  {
    icon: TrendingUp,
    title: "Scenario Planning",
    description:
      "Ask 'What if SOL drops 20%?' -- simulate impact, propose rebalances, and execute hedges with built-in risk limits.",
  },
];

export function UseCasesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id="use-cases"
      className="relative border-t border-white/[0.04] scroll-mt-24"
      aria-labelledby="use-cases-heading"
      ref={ref}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <h2
            id="use-cases-heading"
            className="text-3xl md:text-4xl font-bold text-white tracking-tight"
          >
            Built for Real Operations
          </h2>
          <p className="mt-4 text-white/50 text-base md:text-lg">
            From daily payroll to crisis response, Keystone handles the full spectrum of treasury operations.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((uc, i) => (
            <motion.div
              key={uc.title}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.07 }}
              className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-white/[0.1] hover:bg-white/[0.04] transition-all duration-300"
            >
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-[#36e27b]/[0.08] mb-4 group-hover:bg-[#36e27b]/[0.12] transition-colors">
                <uc.icon className="h-5 w-5 text-[#36e27b]/80" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">
                {uc.title}
              </h3>
              <p className="text-sm text-white/45 leading-relaxed">
                {uc.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
