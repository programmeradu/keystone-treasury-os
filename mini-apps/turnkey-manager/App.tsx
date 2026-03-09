import React, { useState } from 'react';
import { useTurnkey, useVault } from '@keystone-os/sdk';

export default function App() {
  const { signTransaction, wallets, activeWallet, createWallet } = useTurnkey();
  const { tokens } = useVault();
  const [signStatus, setSignStatus] = useState<'idle' | 'signing' | 'success' | 'error'>('idle');
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const [creatingWallet, setCreatingWallet] = useState(false);

  const handleTestSign = async () => {
    setSignStatus('signing');
    try {
      const result = await signTransaction({
        type: 'memo',
        data: 'Keystone wallet test — ' + new Date().toISOString(),
      });
      if (result?.signature) {
        setLastSignature(result.signature);
        setSignStatus('success');
      } else {
        setSignStatus('error');
      }
    } catch {
      setSignStatus('error');
    }
  };

  const handleCreateWallet = async () => {
    setCreatingWallet(true);
    try {
      await createWallet({ name: 'Keystone Vault ' + (wallets.length + 1) });
    } finally {
      setCreatingWallet(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
          Turnkey Wallet Manager
        </h1>
        <p className="text-zinc-500 mt-1 text-sm">Secure key management via Turnkey</p>
      </div>

      {/* Active Wallet */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Active Wallet</p>
            <p className="text-lg font-mono text-violet-400 break-all">
              {activeWallet || 'No wallet connected'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
            <span className="text-violet-400 text-xl">🔐</span>
          </div>
        </div>

        {/* Token Summary */}
        <div className="flex gap-4 flex-wrap">
          {tokens.slice(0, 4).map((t) => (
            <div key={t.symbol} className="bg-zinc-800/50 rounded-lg px-3 py-2 text-sm">
              <span className="text-zinc-400">{t.symbol}</span>{' '}
              <span className="font-mono">{t.balance.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Wallets List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
            Managed Wallets ({wallets.length})
          </h2>
          <button
            onClick={handleCreateWallet}
            disabled={creatingWallet}
            className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {creatingWallet ? 'Creating...' : '+ New Wallet'}
          </button>
        </div>

        {wallets.length > 0 ? (
          <div className="space-y-2">
            {wallets.map((w: any, i: number) => (
              <div
                key={i}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                  w.address === activeWallet
                    ? 'bg-violet-500/10 border-violet-500/30'
                    : 'bg-zinc-800/30 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold">{w.name || `Wallet ${i + 1}`}</p>
                  <p className="text-xs text-zinc-500 font-mono">
                    {w.address?.slice(0, 8)}...{w.address?.slice(-6)}
                  </p>
                </div>
                {w.address === activeWallet && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 bg-violet-500/10 px-2 py-1 rounded-md">
                    Active
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-sm text-center py-4">No wallets created yet.</p>
        )}
      </div>

      {/* Sign Transaction */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">
          Transaction Signing
        </h2>
        <p className="text-sm text-zinc-500 mb-4">
          Test transaction signing with your Turnkey-managed wallet.
        </p>

        <button
          onClick={handleTestSign}
          disabled={signStatus === 'signing' || !activeWallet}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {signStatus === 'signing' ? 'Signing...' : 'Sign Test Transaction'}
        </button>

        {signStatus === 'success' && lastSignature && (
          <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <p className="text-emerald-400 text-sm font-bold mb-1">Signed Successfully</p>
            <p className="text-xs text-zinc-500 font-mono break-all">{lastSignature}</p>
          </div>
        )}

        {signStatus === 'error' && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400 text-sm font-bold">Signing Failed</p>
            <p className="text-xs text-zinc-500 mt-1">Check wallet connection and try again.</p>
          </div>
        )}
      </div>
    </div>
  );
}
