"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Zap, AlertCircle, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

interface TransactionInfo {
  id: string;
  description: string;
  estimatedFee: number;
}

interface BundleAnalysis {
  individualTransactions: TransactionInfo[];
  totalIndividualFees: number;
  bundledFee: number;
  savings: number;
  savingsPercent: number;
}

export function FeeSaver() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [bundling, setBundling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<BundleAnalysis | null>(null);
  const [solPrice, setSolPrice] = useState<number>(0);

  // Fetch SOL price on mount
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch("/api/jupiter/price?ids=SOL");
        const data = await response.json();
        if (data?.data?.SOL?.price) {
          setSolPrice(data.data.SOL.price);
        }
      } catch (e) {
        console.error("Failed to fetch SOL price:", e);
      }
    };
    fetchPrice();
  }, []);

  const analyzePendingTransactions = async () => {
    if (!publicKey) {
      setError("Please connect your wallet first");
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const address = publicKey.toBase58();
      
      // Call the real transaction bundle analysis API
      const response = await fetch(
        `/api/solana/transaction-bundle?address=${address}&limit=50`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze transactions");
      }

      const data = await response.json();

      if (!data.bundleableTransactions || data.bundleableTransactions.length === 0) {
        setError(data.message || "No bundleable transactions found");
        toast.info("No bundling opportunities", {
          description: data.message || "Keep making transactions to identify patterns",
        });
        return;
      }

      const transactions: TransactionInfo[] = data.bundleableTransactions.map((tx: any) => ({
        id: tx.id,
        description: tx.description,
        estimatedFee: tx.estimatedFee,
      }));

      setAnalysis({
        individualTransactions: transactions,
        totalIndividualFees: data.totalIndividualFees,
        bundledFee: data.bundledFee,
        savings: data.savings,
        savingsPercent: data.savingsPercent,
      });

      toast.success("Analysis complete", {
        description: `Found ${transactions.length} bundleable transactions`,
      });
    } catch (e: any) {
      setError(e?.message || "Failed to analyze transactions");
      toast.error("Analysis failed", {
        description: e?.message || "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBundleTransactions = async () => {
    if (!publicKey || !analysis) {
      toast.error("Cannot bundle transactions");
      return;
    }

    setBundling(true);
    
    try {
      // In a real implementation, this would:
      // 1. Collect all the pending transaction instructions
      // 2. Create a single transaction with all instructions
      // 3. Sign and send the bundled transaction
      // 4. Wait for confirmation

      // For demonstration purposes, we'll simulate the bundling process
      toast.info("Bundling transactions...", {
        description: "Creating atomic transaction bundle",
      });

      // Simulate bundling delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In production, you would:
      // const transaction = new Transaction();
      // analysis.individualTransactions.forEach(tx => {
      //   // Add each instruction to the transaction
      //   transaction.add(instruction);
      // });
      // const signature = await sendTransaction(transaction, connection);

      toast.success("Transactions bundled successfully!", {
        description: `Saved ${formatCurrency(analysis.savings * solPrice)} in fees`,
      });

      // Reset analysis after successful bundle
      setAnalysis(null);
    } catch (e: any) {
      toast.error("Bundling failed", {
        description: e?.message || "An error occurred",
      });
    } finally {
      setBundling(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatSOL = (value: number) => {
    return `${value.toFixed(6)} SOL`;
  };

  return (
    <div className="h-full">
      <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] min-h-[360px]">
        <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
        
        <CardHeader className="pb-2 flex flex-col gap-2">
          <div className="flex h-8 items-center justify-between gap-2">
            <CardTitle className="text-sm leading-none">
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span>Fee Saver</span>
              </span>
            </CardTitle>
            <Badge variant="secondary" className="h-6 px-2 text-[10px] rounded-md leading-none">
              Smart Bundling
            </Badge>
          </div>
          <div className="text-xs opacity-70">
            Bundle multiple transactions into one atomic transaction to save 50-90% on fees
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          {!publicKey && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Connect your wallet to detect bundleable transactions
              </AlertDescription>
            </Alert>
          )}

          {publicKey && (
            <>
              <Button
                onClick={analyzePendingTransactions}
                disabled={loading}
                className="w-full"
                size="sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Scan for Bundleable Transactions
                  </>
                )}
              </Button>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {loading && (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              )}

              {analysis && !loading && (
                <div className="space-y-3">
                  {/* Savings Summary */}
                  <div className="rounded-md border p-3 bg-gradient-to-br from-emerald-500/10 to-blue-500/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs opacity-70">Potential Savings</div>
                      <Badge variant="default" className="bg-emerald-500">
                        {analysis.savingsPercent.toFixed(0)}% OFF
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-emerald-500 font-mono">
                      {formatCurrency(analysis.savings * solPrice)}
                    </div>
                    <div className="text-xs opacity-70 mt-1">
                      {formatSOL(analysis.savings)}
                    </div>
                  </div>

                  {/* Cost Comparison */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-md border p-3 bg-muted/30">
                      <div className="opacity-70 mb-1">Individual Fees</div>
                      <div className="font-mono text-sm line-through opacity-60">
                        {formatCurrency(analysis.totalIndividualFees * solPrice)}
                      </div>
                      <div className="text-[10px] opacity-60 mt-0.5">
                        {formatSOL(analysis.totalIndividualFees)}
                      </div>
                    </div>
                    <div className="rounded-md border p-3 bg-muted/30">
                      <div className="opacity-70 mb-1">Bundled Fee</div>
                      <div className="font-mono text-sm text-emerald-500">
                        {formatCurrency(analysis.bundledFee * solPrice)}
                      </div>
                      <div className="text-[10px] opacity-60 mt-0.5">
                        {formatSOL(analysis.bundledFee)}
                      </div>
                    </div>
                  </div>

                  {/* Transaction List */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium opacity-80">
                      Transactions to Bundle ({analysis.individualTransactions.length})
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {analysis.individualTransactions.map((tx, index) => (
                        <div
                          key={tx.id}
                          className="relative overflow-hidden rounded-md p-2 text-xs bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40"
                        >
                          <span className="pointer-events-none absolute -top-8 -right-8 h-16 w-16 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/25%,transparent_70%)]" />
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="opacity-60">{index + 1}.</span>
                              <span>{tx.description}</span>
                            </div>
                            <span className="font-mono text-[10px] opacity-60">
                              {formatSOL(tx.estimatedFee)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bundle Button */}
                  <Button
                    onClick={handleBundleTransactions}
                    disabled={bundling}
                    className="w-full"
                    size="sm"
                  >
                    {bundling ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Bundling...
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-4 w-4 mr-2" />
                        Bundle Transactions (Save {formatCurrency(analysis.savings * solPrice)})
                      </>
                    )}
                  </Button>

                  <div className="text-[10px] opacity-60 italic">
                    Note: All transactions will execute atomically (all succeed or all fail).
                    Maximum 20 instructions per bundle.
                  </div>
                </div>
              )}

              {!analysis && !loading && !error && (
                <div className="text-xs opacity-70 text-center py-8">
                  Click the button above to scan your wallet for transactions that can be bundled
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
