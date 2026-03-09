import React, { useState } from 'react';
import { useVault } from '@keystone-os/sdk';

export default function App() {
  const { tokens, activeVault } = useVault();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const totalValue = tokens.reduce((sum, t) => sum + t.balance * t.price, 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Vault Dashboard
        </h1>
        <p className="text-zinc-500 mt-1 text-sm">
          Vault: <span className="text-emerald-400">{activeVault}</span>
        </p>
      </div>

      {/* Portfolio Summary */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Total Portfolio Value</p>
        <p className="text-4xl font-black text-emerald-400">
          ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-zinc-600 mt-2">{tokens.length} assets tracked</p>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setViewMode('grid')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
            viewMode === 'grid'
              ? 'bg-emerald-600 text-black'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Grid
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
            viewMode === 'list'
              ? 'bg-emerald-600 text-black'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          List
        </button>
      </div>

      {/* Token Balances */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tokens.map((t) => {
            const value = t.balance * t.price;
            const pct = totalValue > 0 ? (value / totalValue) * 100 : 0;
            return (
              <div
                key={t.symbol}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-emerald-500/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-lg font-bold">{t.symbol}</p>
                    <p className="text-xs text-zinc-500">{t.name}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs font-bold">
                    {pct.toFixed(0)}%
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-xl font-mono">{t.balance.toLocaleString()}</p>
                  <p className="text-sm text-emerald-400 font-semibold">
                    ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
                {/* Allocation bar */}
                <div className="mt-3 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="grid grid-cols-4 gap-4 px-5 py-3 border-b border-zinc-800 text-xs uppercase tracking-widest text-zinc-500">
            <span>Asset</span>
            <span className="text-right">Balance</span>
            <span className="text-right">Price</span>
            <span className="text-right">Value</span>
          </div>
          {tokens.map((t) => (
            <div
              key={t.symbol}
              className="grid grid-cols-4 gap-4 px-5 py-4 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
            >
              <div>
                <p className="font-semibold">{t.symbol}</p>
                <p className="text-xs text-zinc-500">{t.name}</p>
              </div>
              <p className="text-right font-mono self-center">{t.balance.toLocaleString()}</p>
              <p className="text-right text-zinc-400 self-center">${t.price.toFixed(2)}</p>
              <p className="text-right text-emerald-400 font-semibold self-center">
                ${(t.balance * t.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
