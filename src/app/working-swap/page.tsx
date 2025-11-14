'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { 
  Connection, 
  PublicKey, 
  VersionedTransaction, 
  Keypair 
} from '@solana/web3.js';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const JUPITER_API = 'https://quote-api.jup.ag/v6';

const TOKENS = {
  USDC: 'EPjFWdd5Au57P8uS53eFqXn59Q7mY3aqn1Mn2KwVsEJA',
  SOL: 'So11111111111111111111111111111111111111112',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BcJmbL',
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

export default function WorkingSwap() {
  const { connected, publicKey, sendTransaction, signTransaction } = useWallet();
  const [inputAmount, setInputAmount] = useState('100');
  const [inputMint, setInputMint] = useState(TOKENS.USDC);
  const [outputMint, setOutputMint] = useState(TOKENS.SOL);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successHash, setSuccessHash] = useState('');
  const [progress, setProgress] = useState(0);

  const fetchQuote = useCallback(async () => {
    if (!connected || !publicKey) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setError('');
      setProgress(10);
      const amount = Math.floor(parseFloat(inputAmount) * 1_000_000); // Assume 6 decimals

      const response = await fetch(
        `${JUPITER_API}/quote?` +
        `inputMint=${inputMint}&` +
        `outputMint=${outputMint}&` +
        `amount=${amount}&` +
        `slippageBps=50`
      );

      if (!response.ok) throw new Error('Failed to fetch quote');
      const data = await response.json();
      setQuote(data);
      setProgress(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get quote');
      setProgress(0);
    }
  }, [connected, publicKey, inputAmount, inputMint, outputMint]);

  const executeSwap = useCallback(async () => {
    if (!connected || !publicKey || !quote || !signTransaction) {
      setError('Please connect wallet and get a quote');
      return;
    }

    try {
      setError('');
      setSuccessHash('');
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

      // Deserialize transaction
      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      setProgress(60);

      // Sign transaction
      const signedTx = await signTransaction(transaction);
      setProgress(70);

      // Send transaction
      const connection = new Connection(RPC_URL, 'confirmed');
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        maxRetries: 2,
      });
      setProgress(85);

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
      setQuote(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Swap failed');
      setProgress(0);
    }
  }, [connected, publicKey, quote, signTransaction]);

  const outputAmount = quote
    ? (parseInt(quote.outAmount) / 1_000_000).toFixed(6)
    : '0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-md mx-auto mt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Real Swap</h1>
          <p className="text-slate-400">Direct Solana blockchain execution</p>
        </div>

        {/* Wallet Connection */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-4 mb-6">
          <WalletMultiButton />
        </div>

        {!connected ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-amber-200 text-center">
            Connect your wallet to execute swaps
          </div>
        ) : (
          <>
            {/* Swap Form */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6 space-y-4 mb-6">
              {/* Input */}
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  You Pay
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="number"
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                    placeholder="Amount"
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <select
                    value={inputMint}
                    onChange={(e) => setInputMint(e.target.value)}
                    className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    {Object.entries(TOKENS).map(([name, mint]) => (
                      <option key={mint} value={mint}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Output */}
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">
                  You Receive
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={outputAmount}
                    readOnly
                    placeholder="Amount"
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-500 focus:outline-none"
                  />
                  <select
                    value={outputMint}
                    onChange={(e) => setOutputMint(e.target.value)}
                    className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    {Object.entries(TOKENS).map(([name, mint]) => (
                      <option key={mint} value={mint}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quote Info */}
              {quote && (
                <div className="bg-slate-700/50 rounded p-3 text-sm text-slate-300">
                  <div className="flex justify-between">
                    <span>Price Impact:</span>
                    <span className={parseFloat(quote.priceImpactPct) > 5 ? 'text-amber-400' : 'text-green-400'}>
                      {parseFloat(quote.priceImpactPct).toFixed(3)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              {progress > 0 && progress < 100 && (
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-red-200 text-sm">
                  {error}
                </div>
              )}

              {/* Success */}
              {successHash && (
                <div className="bg-green-500/10 border border-green-500/30 rounded p-3 text-green-200 text-sm break-all">
                  ✓ Swap successful!
                  <br />
                  <a
                    href={`https://solscan.io/tx/${successHash}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-green-100"
                  >
                    View on Solscan
                  </a>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={fetchQuote}
                  disabled={loading || !connected}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-medium py-2 px-4 rounded transition"
                >
                  {loading ? 'Getting Quote...' : 'Get Quote'}
                </button>
                <button
                  onClick={executeSwap}
                  disabled={!quote || loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white font-medium py-2 px-4 rounded transition"
                >
                  {loading ? 'Executing...' : 'Execute Real Swap'}
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="text-center text-sm text-slate-400">
              <p>This uses:</p>
              <ul className="list-disc list-inside">
                <li>Real Jupiter API quotes</li>
                <li>Real wallet signing</li>
                <li>Real Solana RPC submission</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
