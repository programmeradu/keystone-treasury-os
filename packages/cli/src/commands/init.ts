import * as fs from "node:fs";
import * as path from "node:path";

// ─── Sovereign OS 2026 Starter Template ─────────────────────────────
// Showcases: useVault, useJupiterSwap, useImpactReport, useTurnkey

const STARTER_APP = `import React, { useState } from 'react';
import {
  useVault,
  useJupiterSwap,
  useImpactReport,
  useTurnkey,
} from '@keystone-os/sdk';

export default function App() {
  const { tokens, activeVault } = useVault();
  const { getQuote, swap, loading: swapLoading, error: swapError } = useJupiterSwap();
  const { simulate, report } = useImpactReport();
  const { signTransaction } = useTurnkey();
  const [quote, setQuote] = useState(null);
  const [amount, setAmount] = useState('1000000');

  const handleGetQuote = async () => {
    const q = await getQuote({
      inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      amount,
      slippageBps: 50,
    });
    setQuote(q);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      {/* ─── Header ──────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Sovereign OS Mini-App
        </h1>
        <p className="text-zinc-500 mt-1 text-sm">
          Vault: <span className="text-emerald-400">{activeVault}</span>
        </p>
      </div>

      {/* ─── Token Balances ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {tokens.map((t) => (
          <div
            key={t.symbol}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-lg font-semibold">{t.symbol}</p>
              <p className="text-xs text-zinc-500">{t.name}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-mono">{t.balance.toLocaleString()}</p>
              <p className="text-xs text-emerald-400">
                \${(t.balance * t.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Jupiter Swap ────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-bold text-cyan-400 mb-4">⚡ Jupiter Swap</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-zinc-500 block mb-1">Amount (lamports)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-zinc-800 rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:border-emerald-500 outline-none"
            />
          </div>
          <button
            onClick={handleGetQuote}
            disabled={swapLoading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
          >
            {swapLoading ? 'Loading...' : 'Get Quote'}
          </button>
        </div>

        {quote && (
          <div className="mt-4 bg-zinc-800/50 rounded-lg p-4 text-sm font-mono">
            <p>Input: {quote.inAmount} → Output: {quote.outAmount}</p>
            <p className="text-zinc-500">Price Impact: {quote.priceImpactPct}%</p>
          </div>
        )}

        {swapError && (
          <p className="mt-3 text-red-400 text-sm">{swapError}</p>
        )}
      </div>

      {/* ─── Impact Report ───────────────────────────────── */}
      {report && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-bold text-amber-400 mb-3">📊 Impact Report</h2>
          <div className="space-y-2 text-sm">
            {report.diff.map((d) => (
              <div key={d.symbol} className="flex justify-between">
                <span>{d.symbol}</span>
                <span className={d.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {d.delta >= 0 ? '+' : ''}{d.delta.toFixed(4)} ({d.percentChange.toFixed(2)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
`;

const LOCKFILE = {
  version: "1.0.0",
  packages: {
    react: {
      url: "https://esm.sh/react@19.0.0",
      types: "https://esm.sh/v135/@types/react@19.0.0/index.d.ts",
      external: true,
    },
    "react-dom": {
      url: "https://esm.sh/react-dom@19.0.0",
      types: "https://esm.sh/v135/@types/react-dom@19.0.0/index.d.ts",
      external: true,
    },
    "@keystone-os/sdk": {
      url: "https://esm.sh/@keystone-os/sdk",
      types: "https://esm.sh/@keystone-os/sdk",
      external: false,
    },
  },
};

export function runInit(dir: string): void {
  const targetDir = path.resolve(process.cwd(), dir || ".");
  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    throw new Error(`Directory ${targetDir} is not empty.`);
  }

  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, "App.tsx"), STARTER_APP);
  fs.writeFileSync(
    path.join(targetDir, "keystone.lock.json"),
    JSON.stringify(LOCKFILE, null, 2)
  );
  fs.writeFileSync(
    path.join(targetDir, "README.md"),
    `# Keystone Sovereign OS Mini-App

Built with \`@keystone-os/sdk\` — the Sovereign OS 2026 framework.

## Features Used
- **useVault** — Live token balances with real prices
- **useJupiterSwap** — Deep-routed token swaps via Jupiter
- **useImpactReport** — Pre-flight transaction simulation
- **useTurnkey** — Institutional-grade signing

## Getting Started
\`\`\`bash
# Validate your app
keystone validate

# Start local dev server
keystone dev

# Publish to Keystone Marketplace
keystone publish -n "My App" -d "Description" -w <your-wallet>
\`\`\`

Open in **Keystone Studio** for the full IDE experience with AI Architect.
`
  );

  console.log(`\n🏗️  Created Sovereign OS Mini-App in ${targetDir}\n`);
  console.log("  📄 App.tsx          — Starter app with Vault + Jupiter Swap + Impact Report");
  console.log("  🔒 keystone.lock.json — Pinned dependency map");
  console.log("  📖 README.md        — Getting started guide");
  console.log("\nNext steps:");
  console.log("  cd " + (dir || "."));
  console.log("  keystone dev        — Start local dev server");
  console.log("  keystone validate   — Check safety standards\n");
}
