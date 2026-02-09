"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Vault,
  Code2,
  Eye,
  FileText,
  Vote,
  Activity,
  Sparkles,
  MonitorPlay,
  Store,
  TrendingUp,
  Shield,
  BarChart3,
} from "lucide-react";

const tabs = [
  {
    id: "treasury",
    label: "Treasury Hub",
    icon: Vault,
    color: "#a78bfa",
    features: [
      {
        icon: FileText,
        title: "Operations Nexus",
        description:
          "Bulk distributions via CSV/JSON upload. Preview recipients, amounts, fees, then execute through Squads multisig.",
      },
      {
        icon: Vote,
        title: "Governance Oracle",
        description:
          "View active Squads proposals, approval progress, and vote directly. See threshold status (e.g., 3/5 signatures).",
      },
      {
        icon: Activity,
        title: "Streaming Velocity",
        description:
          "Real-time transaction monitoring with 7D/30D activity charts. Every transaction linked to Solana Explorer.",
      },
      {
        icon: BarChart3,
        title: "Data Nexus",
        description:
          "Full transaction ledger with search, filter, and export to CSV/PDF. Board-ready audit trails in seconds.",
      },
    ],
  },
  {
    id: "studio",
    label: "Studio & Marketplace",
    icon: Code2,
    color: "#f472b6",
    features: [
      {
        icon: Sparkles,
        title: "AI Architect Engine",
        description:
          "Describe what you want in plain English. The Architect generates React/TypeScript code with self-correction (3 retry loops).",
      },
      {
        icon: MonitorPlay,
        title: "Live Preview",
        description:
          "Real-time iframe sandbox with Babel compilation, console capture, and SDK hooks (useVault, useTurnkey, useFetch).",
      },
      {
        icon: Code2,
        title: "Monaco Code Editor",
        description:
          "Full IDE experience with TypeScript, CSS, Rust (Anchor), and JSON support. Multi-file project management with file tabs.",
      },
      {
        icon: Store,
        title: "Protocol Marketplace",
        description:
          "Browse, install, and sell community-built mini-apps. USDC pricing with 80/20 revenue split. Publish from Library.",
      },
    ],
  },
  {
    id: "foresight",
    label: "Foresight & Analytics",
    icon: Eye,
    color: "#fbbf24",
    features: [
      {
        icon: Eye,
        title: "What-If Engine",
        description:
          "Ask 'What if SOL drops 50%?' and get instant ephemeral dashboards with scenario projections and risk flags.",
      },
      {
        icon: TrendingUp,
        title: "Predictive Runway",
        description:
          "Calculate exact depletion dates based on burn rates. See real vs simulated allocation overlays.",
      },
      {
        icon: Shield,
        title: "Risk Scorecard",
        description:
          "Risk score (0-10) with color coding, simulation overlays, and market sentiment analysis.",
      },
      {
        icon: BarChart3,
        title: "Growth Stream Charts",
        description:
          "Treasury performance over 1D/1W/1M/1Y/ALL timeframes. Real vault data with simulated projection overlays.",
      },
    ],
  },
];

export function DeepDiveSection() {
  const [activeTab, setActiveTab] = useState("treasury");
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const activeData = tabs.find((t) => t.id === activeTab)!;

  return (
    <section
      id="deep-dive"
      className="relative border-t border-white/[0.04] scroll-mt-24"
      aria-labelledby="deep-dive-heading"
      ref={ref}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <h2
            id="deep-dive-heading"
            className="text-3xl md:text-4xl font-bold text-white tracking-tight"
          >
            Deep Dive Into the Modules
          </h2>
          <p className="mt-4 text-white/50 text-base md:text-lg">
            Three powerhouse modules that set Keystone apart from every other treasury tool.
          </p>
        </motion.div>

        {/* Tab selector */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2 mb-10"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-white/[0.08] border border-white/[0.12] text-white shadow-lg"
                  : "border border-transparent text-white/50 hover:text-white/70 hover:bg-white/[0.03]"
              }`}
            >
              <tab.icon className="h-4 w-4" style={activeTab === tab.id ? { color: tab.color } : {}} />
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Features grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {activeData.features.map((feature, i) => (
            <motion.div
              key={`${activeTab}-${feature.title}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-white/[0.1] hover:bg-white/[0.04] transition-all duration-300"
            >
              <div
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg mb-3"
                style={{ backgroundColor: `${activeData.color}15` }}
              >
                <feature.icon className="h-4 w-4" style={{ color: activeData.color }} />
              </div>
              <h3 className="text-base font-semibold text-white mb-1.5">
                {feature.title}
              </h3>
              <p className="text-sm text-white/45 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
