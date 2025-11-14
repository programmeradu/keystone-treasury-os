'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  Connection, 
  VersionedTransaction, 
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { Wallet2, ArrowRightLeft, Settings2, TrendingUp, Zap } from 'lucide-react';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const JUPITER_API = 'https://quote-api.jup.ag/v6';

const TOKENS = {
  SOL: { mint: 'So11111111111111111111111111111111111111112', name: 'SOL', icon: '◎', decimals: 9 },
  USDC: { mint: 'EPjFWdd5Au57P8uS53eFqXn59Q7mY3aqn1Mn2KwVsEJA', name: 'USDC', icon: 'U', decimals: 6 },
  USDT: { mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BcJmbL', name: 'USDT', icon: 'T', decimals: 6 },
};

interface QuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: null;
  priceImpactPct: string;
  routePlan: unknown[];
}

interface SwapInstructionsResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
  prioritizationFeeLamports: number;
}

type TokenKey = keyof typeof TOKENS;

export default function WorkingSwap() {
  const wallet = useWallet();
  const { connected, publicKey, signTransaction } = wallet;
  const [mounted, setMounted] = useState(false);
  const [inputAmount, setInputAmount] = useState('10');
  const [inputToken, setInputToken] = useState<TokenKey>('SOL');
  const [outputToken, setOutputToken] = useState<TokenKey>('USDC');
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successHash, setSuccessHash] = useState('');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [slippage, setSlippage] = useState(0.5);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchQuote = useCallback(async () => {
    if (!connected || !publicKey) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setError('');
      setStatusMessage('Fetching quote from Jupiter...');
      setProgress(15);
      
      const inputTokenInfo = TOKENS[inputToken];
      const outputTokenInfo = TOKENS[outputToken];
      const amount = Math.floor(parseFloat(inputAmount) * Math.pow(10, inputTokenInfo.decimals));

      const response = await fetch(
        `${JUPITER_API}/quote?` +
        `inputMint=${inputTokenInfo.mint}&` +
        `outputMint=${outputTokenInfo.mint}&` +
        `amount=${amount}&` +
        `slippageBps=${Math.floor(slippage * 100)}`
      );

      if (!response.ok) throw new Error('Failed to fetch quote');
      const data: QuoteResponse = await response.json();
      setQuote(data);
      setStatusMessage('Quote received ✓');
      setProgress(30);
      setTimeout(() => setStatusMessage(''), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get quote';
      setError(message);
      setProgress(0);
      setStatusMessage('');
    }
  }, [connected, publicKey, inputAmount, inputToken, outputToken, slippage]);

  const executeSwap = useCallback(async () => {
    if (!connected || !publicKey || !quote || !signTransaction) {
      setError('Please connect wallet and get a quote');
      return;
    }

    try {
      setError('');
      setSuccessHash('');
      setStatusMessage('Preparing swap instructions...');
      setProgress(40);

      // Get swap instructions
      const swapResponse = await fetch(`${JUPITER_API}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: publicKey.toString(),
          wrapAndUnwrapSol: true,
        }),
      });

      if (!swapResponse.ok) throw new Error('Failed to get swap instructions');
      const swapData: SwapInstructionsResponse = await swapResponse.json();
      setProgress(50);
      setStatusMessage('Deserializing transaction...');

      // Deserialize transaction
      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      setProgress(60);
      setStatusMessage('Waiting for wallet signature...');

      // Sign transaction
      const signedTx = await signTransaction(transaction);
      setProgress(70);
      setStatusMessage('Submitting to Solana network...');

      // Send transaction
      const connection = new Connection(RPC_URL, 'confirmed');
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        maxRetries: 2,
      });
      setProgress(85);
      setStatusMessage('Waiting for confirmation...');

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(
        signature,
        'confirmed'
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      setSuccessHash(signature);
      setProgress(100);
      setStatusMessage('Swap completed successfully! ✓');
      setQuote(null);
      setInputAmount('');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Swap failed';
      setError(message);
      setProgress(0);
      setStatusMessage('');
    }
  }, [connected, publicKey, quote, signTransaction]);

  const swapTokens = () => {
    setInputToken(outputToken);
    setOutputToken(inputToken);
    setQuote(null);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  const inputTokenInfo = TOKENS[inputToken];
  const outputTokenInfo = TOKENS[outputToken];
  const outputAmount = quote
    ? (parseInt(quote.outAmount) / Math.pow(10, outputTokenInfo.decimals)).toFixed(6)
    : '0';
  const priceImpact = quote ? parseFloat(quote.priceImpactPct) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 p-4">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12 pt-8">
          <div className="inline-flex items-center gap-3 mb-4 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-300 font-medium">LIVE TRADING</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent mb-3">
            Real Swap
          </h1>
          <p className="text-lg text-slate-400">Execute trades directly on Solana blockchain</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Swap Card */}
          <div className="flex-1">
            <div className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 backdrop-blur border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
              {/* Wallet Connection Button */}
              {!connected && (
                <button
                  onClick={() => {
                    const btn = document.querySelector('[data-wallet]') as HTMLButtonElement;
                    btn?.click();
                  }}
                  className="w-full mb-6 flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/30"
                >
                  <Wallet2 className="w-5 h-5" />
                  Connect Wallet
                </button>
              )}

              {/* Connected Status */}
              {connected && (
                <div className="mb-6 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-between">
                  <span className="text-green-300 text-sm font-medium">✓ Wallet Connected</span>
                  <span className="text-xs text-green-400">{publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}</span>
                </div>
              )}

              {/* Input Token */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">From</label>
                <div className="flex gap-2 items-center bg-slate-900/50 border border-slate-700 rounded-xl p-4 focus-within:border-blue-500 transition">
                  <input
                    type="number"
                    value={inputAmount}
                    onChange={(e) => {
                      setInputAmount(e.target.value);
                      setQuote(null);
                    }}
                    placeholder="0.0"
                    disabled={!connected}
                    className="flex-1 bg-transparent text-2xl font-bold text-white placeholder-slate-600 focus:outline-none"
                  />
                  <select
                    value={inputToken}
                    onChange={(e) => {
                      setInputToken(e.target.value as TokenKey);
                      setQuote(null);
                    }}
                    className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white font-medium hover:border-slate-500 focus:outline-none focus:border-blue-500 transition"
                  >
                    {Object.entries(TOKENS).map(([key, token]) => (
                      <option key={key} value={key}>
                        {token.icon} {token.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Swap Direction Button */}
              <div className="flex justify-center mb-4">
                <button
                  onClick={swapTokens}
                  className="p-2 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-blue-500 transition-all duration-300 hover:scale-110"
                  title="Swap tokens"
                >
                  <ArrowRightLeft className="w-5 h-5 text-blue-400" />
                </button>
              </div>

              {/* Output Token */}
              <div className="mb-6">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">To</label>
                <div className="flex gap-2 items-center bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-white">{outputAmount}</div>
                    <div className="text-xs text-slate-500 mt-1">≈ ${(parseFloat(outputAmount) * 1.2).toFixed(2)}</div>
                  </div>
                  <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white font-medium">
                    {outputTokenInfo.icon} {outputTokenInfo.name}
                  </div>
                </div>
              </div>

              {/* Quote Details */}
              {quote && (
                <div className="mb-6 p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Price Impact:</span>
                    <span className={`font-semibold ${priceImpact > 5 ? 'text-amber-400' : priceImpact > 1 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {priceImpact.toFixed(3)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Exchange Rate:</span>
                    <span className="text-slate-200 font-medium">1 {inputTokenInfo.name} = {(parseFloat(quote.outAmount) / parseFloat(quote.inAmount) * Math.pow(10, inputTokenInfo.decimals - outputTokenInfo.decimals)).toFixed(6)} {outputTokenInfo.name}</span>
                  </div>
                </div>
              )}

              {/* Slippage Settings */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Max Slippage</label>
                  <span className="text-sm font-bold text-blue-400">{slippage.toFixed(2)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={slippage}
                  onChange={(e) => setSlippage(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Progress Bar */}
              {progress > 0 && (
                <div className="mb-4">
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {statusMessage && (
                    <p className="text-xs text-slate-400 mt-2">{statusMessage}</p>
                  )}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
                  ⚠ {error}
                </div>
              )}

              {/* Success Message */}
              {successHash && (
                <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg space-y-2">
                  <div className="text-green-300 text-sm font-semibold">✓ Swap Successful!</div>
                  <a
                    href={`https://solscan.io/tx/${successHash}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-400 hover:text-green-300 break-all font-mono underline"
                  >
                    {successHash}
                  </a>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mb-4">
                <button
                  onClick={fetchQuote}
                  disabled={!connected || loading || !inputAmount}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600/80 hover:bg-blue-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30"
                >
                  <TrendingUp className="w-4 h-4" />
                  {loading ? 'Getting Quote...' : 'Get Quote'}
                </button>
                <button
                  onClick={executeSwap}
                  disabled={!quote || loading || !connected}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/30"
                >
                  <Zap className="w-4 h-4" />
                  {loading ? 'Executing...' : 'Execute Swap'}
                </button>
              </div>

              {/* Disclaimer */}
              <div className="text-xs text-slate-500 text-center pt-4 border-t border-slate-700/50">
                Direct blockchain execution • No intermediaries • Real Jupiter quotes
              </div>
            </div>
          </div>

          {/* Info Sidebar */}
          <div className="lg:w-80">
            <div className="bg-gradient-to-b from-slate-800/50 to-slate-900/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6 shadow-2xl sticky top-8 space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-blue-400" />
                How It Works
              </h3>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-400">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Connect Wallet</p>
                    <p className="text-xs text-slate-400 mt-1">Connect any Solana wallet (Phantom, Solflare, etc)</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-400">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Set Amount</p>
                    <p className="text-xs text-slate-400 mt-1">Enter the amount and select tokens to swap</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-400">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Get Quote</p>
                    <p className="text-xs text-slate-400 mt-1">Review the price and slippage before swapping</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-400">4</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Execute & Confirm</p>
                    <p className="text-xs text-slate-400 mt-1">Sign the transaction and confirm on blockchain</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700/50 space-y-2 text-xs text-slate-400">
                <p>✓ Real Jupiter API integration</p>
                <p>✓ Live Solana blockchain execution</p>
                <p>✓ Actual wallet signing</p>
                <p>✓ On-chain confirmation tracking</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Button (Hidden for Adapter) */}
      <div data-wallet className="hidden" />
    </div>
  );
}
