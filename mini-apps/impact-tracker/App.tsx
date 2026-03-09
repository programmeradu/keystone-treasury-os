import React, { useState } from 'react';
import { useImpactReport, useVault } from '@keystone-os/sdk';

export default function App() {
  const { simulate, report } = useImpactReport();
  const { tokens, activeVault } = useVault();
  const [simulating, setSimulating] = useState(false);

  const totalValue = tokens.reduce((sum, t) => sum + t.balance * t.price, 0);

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      await simulate({ vault: activeVault, tokens });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
          Impact Tracker
        </h1>
        <p className="text-zinc-500 mt-1 text-sm">
          Environmental &amp; social impact of your treasury
        </p>
      </div>

      {/* Vault Context */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Active Vault</p>
            <p className="text-lg font-bold text-emerald-400">{activeVault}</p>
            <p className="text-sm text-zinc-500 mt-1">
              {tokens.length} assets &middot; ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} total
            </p>
          </div>
          <button
            onClick={handleSimulate}
            disabled={simulating}
            className="px-5 py-2.5 bg-green-600 hover:bg-green-500 rounded-xl text-sm font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {simulating ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
      </div>

      {/* Report */}
      {report ? (
        <div className="space-y-4">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="Carbon Footprint"
              value={`${report.carbonKg?.toFixed(1) ?? '0'} kg`}
              subtitle="CO₂ equivalent"
              color="text-amber-400"
              bgColor="bg-amber-500/10"
            />
            <MetricCard
              label="Green Score"
              value={`${report.greenScore ?? 0}/100`}
              subtitle="Protocol sustainability"
              color="text-emerald-400"
              bgColor="bg-emerald-500/10"
            />
            <MetricCard
              label="Social Impact"
              value={report.socialScore ? `${report.socialScore}/100` : 'N/A'}
              subtitle="Community benefit index"
              color="text-cyan-400"
              bgColor="bg-cyan-500/10"
            />
          </div>

          {/* Breakdown */}
          {report.breakdown && report.breakdown.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">
                Asset Breakdown
              </h2>
              <div className="space-y-3">
                {report.breakdown.map((item: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-emerald-400">
                        {item.symbol?.slice(0, 3)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{item.symbol}</p>
                        <p className="text-xs text-zinc-500">{item.protocol || 'Direct hold'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono">{item.carbonKg?.toFixed(2)} kg CO₂</p>
                      <p className="text-xs text-zinc-500">
                        Score: <span className="text-emerald-400">{item.score}/100</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations && report.recommendations.length > 0 && (
            <div className="bg-zinc-900 border border-green-500/20 rounded-2xl p-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-green-400 mb-4">
                Recommendations
              </h2>
              <ul className="space-y-2">
                {report.recommendations.map((rec: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="text-green-400 mt-0.5">→</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 mb-4">
            <span className="text-2xl">🌱</span>
          </div>
          <h3 className="text-lg font-bold mb-2">No Report Yet</h3>
          <p className="text-zinc-500 text-sm">
            Click &ldquo;Run Analysis&rdquo; to calculate your vault&rsquo;s environmental impact.
          </p>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  color,
  bgColor,
}: {
  label: string;
  value: string;
  subtitle: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={`${bgColor} border border-zinc-800 rounded-xl p-5`}>
      <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>
    </div>
  );
}
