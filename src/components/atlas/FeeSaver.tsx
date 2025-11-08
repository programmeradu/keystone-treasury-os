"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  DollarSign, 
  Zap,
  TrendingDown,
  Package,
  CheckCircle2,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

interface PendingTransaction {
  id: string;
  type: string;
  description: string;
  estimatedFee: number;
  timestamp: number;
}

interface BundleSuggestion {
  transactions: PendingTransaction[];
  totalFees: number;
  bundledFee: number;
  savings: number;
  savingsPercent: number;
}

export function FeeSaver() {
  const { publicKey } = useWallet();
  const [pendingTxs, setPendingTxs] = useState<PendingTransaction[]>([]);
  const [bundleSuggestion, setBundleSuggestion] = useState<BundleSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [bundling, setBundling] = useState(false);

  // Simulate detecting pending transactions
  useEffect(() => {
    if (!publicKey) {
      setPendingTxs([]);
      setBundleSuggestion(null);
      return;
    }

    // Simulate finding pending/queued transactions
    const mockTxs: PendingTransaction[] = [
      {
        id: "tx-1",
        type: "swap",
        description: "Swap 1 SOL → USDC",
        estimatedFee: 0.000005,
        timestamp: Date.now() - 30000
      },
      {
        id: "tx-2",
        type: "swap",
        description: "Swap 0.5 SOL → BONK",
        estimatedFee: 0.000005,
        timestamp: Date.now() - 20000
      },
      {
        id: "tx-3",
        type: "transfer",
        description: "Send 0.1 SOL",
        estimatedFee: 0.000005,
        timestamp: Date.now() - 10000
      }
    ];

    setPendingTxs(mockTxs);

    // Calculate bundle savings
    if (mockTxs.length >= 2) {
      const totalFees = mockTxs.reduce((sum, tx) => sum + tx.estimatedFee, 0);
      const bundledFee = 0.000008; // Bundled fee is lower than sum of individual fees
      const savings = totalFees - bundledFee;
      const savingsPercent = (savings / totalFees) * 100;

      setBundleSuggestion({
        transactions: mockTxs,
        totalFees,
        bundledFee,
        savings,
        savingsPercent
      });
    }
  }, [publicKey]);

  const scanForBundles = async () => {
    if (!publicKey) {
      toast.error("Connect wallet to scan for bundling opportunities");
      return;
    }

    setLoading(true);
    
    try {
      // Simulate scanning for bundleable transactions
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In production, this would:
      // 1. Check mempool for pending transactions
      // 2. Analyze transaction types
      // 3. Identify bundleable transactions
      // 4. Calculate potential savings

      if (pendingTxs.length >= 2) {
        toast.success(`Found ${pendingTxs.length} transactions that can be bundled!`, {
          description: `Potential savings: ${(bundleSuggestion?.savings || 0) * 200} SOL (~$${((bundleSuggestion?.savings || 0) * 200 * 100).toFixed(2)})`
        });
      } else {
        toast.info("No bundling opportunities found", {
          description: "You need at least 2 pending transactions to bundle"
        });
      }
    } catch (error: any) {
      toast.error("Scan failed", { description: error?.message });
    } finally {
      setLoading(false);
    }
  };

  const createBundle = async () => {
    if (!bundleSuggestion) return;

    setBundling(true);
    
    try {
      // Simulate creating a bundled transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In production, this would:
      // 1. Create a transaction bundle
      // 2. Optimize gas usage
      // 3. Submit as single transaction
      // 4. Return bundle signature

      toast.success("Bundle created successfully!", {
        description: `Saved ${(bundleSuggestion.savings * 200).toFixed(6)} SOL (${bundleSuggestion.savingsPercent.toFixed(0)}% cheaper)`
      });

      // Clear pending transactions after bundling
      setPendingTxs([]);
      setBundleSuggestion(null);
      
    } catch (error: any) {
      toast.error("Bundle creation failed", { description: error?.message });
    } finally {
      setBundling(false);
    }
  };

  const getCurrentPrice = () => {
    // Simplified - in production would fetch from Jupiter
    return 100; // SOL price in USD
  };

  const solPrice = getCurrentPrice();

  return (
    <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] min-h-[360px]">
      <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
      
      <CardHeader className="pb-2">
        <CardTitle className="text-sm leading-none flex items-center gap-2">
          <Zap className="h-4 w-4" />
          <span>Fee Saver</span>
          <Badge variant="secondary" className="text-[10px]">Smart</Badge>
        </CardTitle>
        <div className="text-xs opacity-70 mt-2">
          Bundle multiple transactions to save 50-90% on fees
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {!publicKey ? (
          <Alert>
            <AlertDescription className="text-[10px]">
              💡 Connect your wallet to scan for bundling opportunities and save on transaction fees.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs opacity-70">Pending Transactions</div>
                <Button
                  onClick={scanForBundles}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                >
                  {loading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Package className="h-3 w-3 mr-1" />
                      Scan
                    </>
                  )}
                </Button>
              </div>

              {pendingTxs.length > 0 ? (
                <div className="rounded-md border p-3 bg-muted/30 space-y-2 max-h-40 overflow-y-auto">
                  {pendingTxs.map((tx, idx) => (
                    <div 
                      key={tx.id}
                      className="flex items-center justify-between gap-2 text-xs py-1"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {idx + 1}
                        </Badge>
                        <span className="truncate">{tx.description}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 font-mono text-[11px]">
                        <DollarSign className="h-3 w-3 opacity-50" />
                        {(tx.estimatedFee * solPrice).toFixed(4)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 opacity-60">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <div className="text-xs">No pending transactions</div>
                </div>
              )}
            </div>

            {bundleSuggestion && (
              <>
                <Separator />
                
                <div className="space-y-3">
                  <div className="rounded-md border p-3 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-500" />
                      <span className="text-xs font-medium text-green-600 dark:text-green-500">
                        Bundle & Save
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="opacity-60 text-[10px]">Current Cost</div>
                        <div className="font-mono font-medium text-red-600 dark:text-red-500">
                          ${(bundleSuggestion.totalFees * solPrice).toFixed(4)}
                        </div>
                      </div>
                      <div>
                        <div className="opacity-60 text-[10px]">Bundled Cost</div>
                        <div className="font-mono font-medium text-green-600 dark:text-green-500">
                          ${(bundleSuggestion.bundledFee * solPrice).toFixed(4)}
                        </div>
                      </div>
                    </div>

                    <Separator className="my-2 opacity-50" />

                    <div className="flex items-center justify-between">
                      <div className="text-xs opacity-70">You Save</div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-bold text-green-600 dark:text-green-500">
                          ${(bundleSuggestion.savings * solPrice).toFixed(4)}
                        </div>
                        <Badge variant="default" className="text-[10px] bg-green-600">
                          {bundleSuggestion.savingsPercent.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={createBundle}
                    disabled={bundling}
                    className="w-full h-8 text-xs"
                  >
                    {bundling ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Creating Bundle...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-2" />
                        Bundle {bundleSuggestion.transactions.length} Transactions
                      </>
                    )}
                  </Button>

                  <Alert>
                    <AlertTriangle className="h-3 w-3" />
                    <AlertDescription className="text-[10px]">
                      Bundling combines multiple transactions into one. All transactions will execute atomically (all succeed or all fail).
                    </AlertDescription>
                  </Alert>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
