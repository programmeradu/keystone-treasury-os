import React, { useState } from 'react';
import { useJupiterSwap, useVault } from '@keystone-os/sdk';

const POPULAR_TOKENS = [
  { symbol: 'SOL', mint: 'So11111111111111111111111111111111111111112', decimals: 9 },
  { symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
  { symbol: 'USDT', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6 },
  { symbol: 'JUP', mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', decimals: 6 },
];

export default function App() {
  const { getQuote, swap, loading, error } = useJupiterSwap();
  const { tokens } = useVault();
  const [inputIdx, setInputIdx] = useState(0);
  const [outputIdx, setOutputIdx] = useState(1);
  const [amount, setAmount] = useState('1');
  const [quote, setQuote] = useState<any>(null);
  const [swapResult, setSwapResult] = useState<string | null>(null);

  const inputToken = POPULAR_TOKENS[inputIdx];
  const outputToken = POPULAR_TOKENS[outputIdx];

  const handleFlip = () => {
    setInputIdx(outputIdx);
    setOutputIdx(inputIdx);
    setQuote(null);
    setSwapResult(null);
  };

  const handleGetQuote = async () => {
    setSwapResult(null);
    const rawAmount = String(Math.floor(Number(amount) * 10 ** inputToken.decimals));
    const q = await getQuote({
      inputMint: inputToken.mint,
      outputMint: outputToken.mint,
      amount: rawAmount,
      slippageBps: 50,
    });
    setQuote(q);
  };

  const handleSwap = async () => {
    if (!quote) return;
    const result = await swap(quote);
    if (result?.txid) {
      setSwapResult(result.txid);
    }
  };

  const inputBalance = tokens.find(
    (t) => t.symbol.toUpperCase() === inputToken.symbol.toUpperCase()
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Quick Swap
        </h1>
        <p className="text-zinc-500 mt-1 text-sm">Powered by Jupiter Aggregator</p>
      </div>

      {/* Swap Card */}
      <div className="max-w-md mx-auto">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          {/* Input */}
          <div className="mb-2">
            <label className="text-xs text-zinc-500 block mb-2">You Pay</label>
            <div className="flex gap-3">
              <select
                value={inputIdx}
                onChange={(e) => { setInputIdx(Number(e.target.value)); setQuote(null); }}
                className="bg-zinc-800 rounded-xl px-3 py-3 text-sm font-bold border border-zinc-700 focus:border-cyan-500 outline-none appearance-none cursor-pointer"
              >
                {POPULAR_TOKENS.map((t, i) => (
                  <option key={t.mint} value={i}>{t.symbol}</option>
                ))}
              </select>
              <input
                type="number"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setQuote(null); }}
                placeholder="0.0"
                className="flex-1 bg-zinc-800 rounded-xl px-4 py-3 text-lg font-mono border border-zinc-700 focus:border-cyan-500 outline-none"
              />
            </div>
            {inputBalance && (
              <p className="text-xs text-zinc-600 mt-1">
                Balance: {inputBalance.balance.toLocaleString()} {inputToken.symbol}
              </p>
            )}
          </div>

          {/* Flip Button */}
          <div className="flex justify-center my-3">
            <button
              onClick={handleFlip}
              className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 hover:border-cyan-500 flex items-center justify-center text-lg transition-colors"
            >
              ↕
            </button>
          </div>

          {/* Output */}
          <div className="mb-6">
            <label className="text-xs text-zinc-500 block mb-2">You Receive</label>
            <div className="flex gap-3">
              <select
                value={outputIdx}
                onChange={(e) => { setOutputIdx(Number(e.target.value)); setQuote(null); }}
                className="bg-zinc-800 rounded-xl px-3 py-3 text-sm font-bold border border-zinc-700 focus:border-cyan-500 outline-none appearance-none cursor-pointer"
              >
                {POPULAR_TOKENS.map((t, i) => (
                  <option key={t.mint} value={i}>{t.symbol}</option>
                ))}
              </select>
              <div className="flex-1 bg-zinc-800/50 rounded-xl px-4 py-3 text-lg font-mono border border-zinc-700/50 text-zinc-400">
                {quote
                  ? (Number(quote.outAmount) / 10 ** outputToken.decimals).toLocaleString(undefined, { maximumFractionDigits: 6 })
                  : '—'}
              </div>
            </div>
          </div>

          {/* Quote Details */}
          {quote && (
            <div className="bg-zinc-800/50 rounded-xl p-4 mb-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Price Impact</span>
                <span className={Number(quote.priceImpactPct) > 1 ? 'text-red-400' : 'text-emerald-400'}>
                  {quote.priceImpactPct}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Slippage</span>
                <span className="text-zinc-300">0.5%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Route</span>
                <span className="text-zinc-300">{quote.routePlan?.length || 1} hop{(quote.routePlan?.length || 1) > 1 ? 's' : ''}</span>
              </div>
            </div>
          )}

          {/* Action Button */}
          {!quote ? (
            <button
              onClick={handleGetQuote}
              disabled={loading || !amount || Number(amount) <= 0}
              className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Fetching...' : 'Get Quote'}
            </button>
          ) : (
            <button
              onClick={handleSwap}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-sm uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Swapping...' : `Swap ${inputToken.symbol} → ${outputToken.symbol}`}
            </button>
          )}

          {/* Error */}
          {error && (
            <p className="mt-3 text-red-400 text-sm text-center">{error}</p>
          )}

          {/* Success */}
          {swapResult && (
            <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center">
              <p className="text-emerald-400 text-sm font-bold">Swap Successful!</p>
              <p className="text-xs text-zinc-500 mt-1 font-mono break-all">{swapResult}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
