"use client";

// Feature: commandbar-god-mode
// EmptyState component shown when the chat thread is empty (messages.length === 0).
// Displays dreyv identity, capability description, and example command chips.

import React from "react";

interface EmptyStateProps {
  onChipClick: (text: string) => void;
}

const EXAMPLE_COMMANDS = [
  { text: "Swap 100 SOL to USDC", pillar: "treasury" },
  { text: "Run a runway projection at $15k/mo burn", pillar: "foresight" },
  { text: "Research Kamino Finance documentation", pillar: "research" },
  { text: "Initialize a DeFi dashboard mini-app", pillar: "studio" },
  { text: "Set a SOL price alert below $100", pillar: "monitoring" },
];

const PILLAR_COLORS: Record<string, string> = {
  treasury: "border-blue-500/40 text-blue-300 hover:bg-blue-500/10 hover:border-blue-400/60",
  foresight: "border-violet-500/40 text-violet-300 hover:bg-violet-500/10 hover:border-violet-400/60",
  research: "border-purple-500/40 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400/60",
  studio: "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-400/60",
  monitoring: "border-amber-500/40 text-amber-300 hover:bg-amber-500/10 hover:border-amber-400/60",
};

export function EmptyState({ onChipClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      {/* Identity heading */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-2xl font-semibold tracking-tight text-zinc-100">
          Hello, Sir. I am dreyv.
        </span>
        <p className="text-sm text-zinc-400 max-w-sm">
          Your platform-wide execution layer. Ask me anything.
        </p>
      </div>

      {/* Example command chips */}
      <div className="flex flex-wrap justify-center gap-2 max-w-lg">
        {EXAMPLE_COMMANDS.map((cmd) => (
          <button
            key={cmd.text}
            type="button"
            onClick={() => onChipClick(cmd.text)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer bg-transparent ${
              PILLAR_COLORS[cmd.pillar] ?? "border-zinc-600 text-zinc-400 hover:bg-zinc-700/40"
            }`}
          >
            {cmd.text}
          </button>
        ))}
      </div>
    </div>
  );
}

export { EXAMPLE_COMMANDS };
