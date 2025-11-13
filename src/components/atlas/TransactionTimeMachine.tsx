"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { IconTxExplorer } from "@/components/ui/icons";

type StrategyType = "stake" | "swap" | "lp";

interface CalculationResult {
  strategy: StrategyType;
  amountSol: number;
  daysAgo: number;
  historicalPrice: number;
  currentPrice: number;
  returns: number;
  hodlReturns: number;
  performanceVsHodl: number;
  strategyReturn: number;
}

export function TransactionTimeMachine() {
  const [strategy, setStrategy] = useState<StrategyType>("stake");
  const [amountSol, setAmountSol] = useState<string>("10");
  const [daysAgo, setDaysAgo] = useState<string>("30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CalculationResult | null>(null);

  const handleCalculate = async () => {
    const amount = parseFloat(amountSol);
    const days = parseInt(daysAgo);

    // Validation
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid SOL amount");
      return;
    }
    if (isNaN(days) || days < 1 || days > 365) {
      setError("Days must be between 1 and 365");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Fetch current SOL price
      const priceResponse = await fetch("/api/jupiter/price?ids=SOL");
      const priceData = await priceResponse.json();
      
      if (!priceResponse.ok || !priceData?.data?.SOL?.price) {
        throw new Error("Failed to fetch current SOL price");
      }

      const currentPrice = priceData.data.SOL.price;

      // Fetch REAL historical price
      const historicalResponse = await fetch(
        `/api/jupiter/historical-price?symbol=SOL&mint=So11111111111111111111111111111111111111112&daysAgo=${days}`
      );
      const historicalData = await historicalResponse.json();
      
      if (!historicalResponse.ok || !historicalData?.historicalPrice) {
        throw new Error(historicalData?.error || "Failed to fetch historical price");
      }

      const historicalPrice = historicalData.historicalPrice;
      const priceSource = historicalData.source || "unknown";

      // Calculate HODL returns
      const hodlReturns = amount * currentPrice - amount * historicalPrice;
      const hodlReturnPct = ((currentPrice - historicalPrice) / historicalPrice) * 100;

      // Calculate strategy returns
      let strategyReturn = 0;
      let totalValue = 0;

      switch (strategy) {
        case "stake":
          // 7% APY staking
          const stakingAPY = 0.07;
          const yearFraction = days / 365;
          strategyReturn = amount * stakingAPY * yearFraction;
          totalValue = amount * currentPrice + strategyReturn * currentPrice;
          break;

        case "swap":
          // Direct price comparison (swapped at historical price to USDC, back to SOL)
          const usdcValue = amount * historicalPrice;
          const solBought = usdcValue / currentPrice;
          strategyReturn = (solBought - amount) * currentPrice;
          totalValue = solBought * currentPrice;
          break;

        case "lp":
          // 20% APR for LP
          const lpAPR = 0.20;
          const lpYearFraction = days / 365;
          strategyReturn = amount * lpAPR * lpYearFraction;
          // Account for impermanent loss (simplified: ~5% loss on price movement)
          const ilLoss = Math.abs(currentPrice - historicalPrice) / historicalPrice * 0.05;
          strategyReturn = strategyReturn * (1 - ilLoss);
          totalValue = amount * currentPrice + strategyReturn * currentPrice;
          break;
      }

      const performanceVsHodl = strategyReturn - hodlReturns;

      setResult({
        strategy,
        amountSol: amount,
        daysAgo: days,
        historicalPrice,
        currentPrice,
        returns: strategyReturn,
        hodlReturns,
        performanceVsHodl,
        strategyReturn,
      });

      const sourceMsg = priceSource === "approximation" 
        ? "Using approximated historical data" 
        : `Real historical data from ${priceSource}`;
      
      toast.success("Calculation complete", {
        description: sourceMsg,
      });
    } catch (e: any) {
      setError(e?.message || "Failed to calculate returns");
      toast.error("Calculation failed", {
        description: e?.message || "An error occurred",
      });
    } finally {
      setLoading(false);
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

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  return (
    <div className="h-full">
      <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] min-h-[360px]">
        <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
        
        <CardHeader className="pb-2 flex flex-col gap-2">
          <div className="flex h-8 items-center justify-between gap-2">
            <CardTitle className="text-sm leading-none">
              <span className="flex items-center gap-2">
                <IconTxExplorer className="h-4 w-4" />
                <span>Tx Explorer</span>
              </span>
            </CardTitle>
            <Badge variant="secondary" className="h-6 px-2 text-[10px] rounded-md leading-none">
              What-If Analysis
            </Badge>
          </div>
          <div className="text-xs opacity-70">
            See what returns you would have earned if you executed a strategy in the past
          </div>
        </CardHeader>

        <CardContent className="atlas-card-content pt-0 space-y-4">
          {/* Strategy Selection */}
          <div className="space-y-2">
            <div className="text-xs font-medium opacity-80">Strategy</div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={strategy === "stake" ? "default" : "secondary"}
                onClick={() => setStrategy("stake")}
                className="text-xs"
              >
                Stake (7% APY)
              </Button>
              <Button
                size="sm"
                variant={strategy === "swap" ? "default" : "secondary"}
                onClick={() => setStrategy("swap")}
                className="text-xs"
              >
                Swap
              </Button>
              <Button
                size="sm"
                variant={strategy === "lp" ? "default" : "secondary"}
                onClick={() => setStrategy("lp")}
                className="text-xs"
              >
                LP (20% APR)
              </Button>
            </div>
          </div>

          {/* Input Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs opacity-70">Amount (SOL)</label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={amountSol}
                onChange={(e) => setAmountSol(e.target.value)}
                placeholder="10"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs opacity-70">Days Ago (1-365)</label>
              <Input
                type="number"
                min="1"
                max="365"
                value={daysAgo}
                onChange={(e) => setDaysAgo(e.target.value)}
                placeholder="30"
                className="h-9"
              />
            </div>
          </div>

          {/* Calculate Button */}
          <Button
            onClick={handleCalculate}
            disabled={loading}
            className="w-full"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Calculating...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Calculate Returns
              </>
            )}
          </Button>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Results Display */}
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}

          {result && !loading && (
            <div className="space-y-3 text-xs">
              <div className="rounded-md border p-3 bg-muted/30 space-y-2">
                <div className="font-medium text-sm mb-2">Price Data</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="opacity-70">Historical Price ({result.daysAgo}d ago)</div>
                    <div className="font-mono text-sm">{formatCurrency(result.historicalPrice)}</div>
                  </div>
                  <div>
                    <div className="opacity-70">Current Price</div>
                    <div className="font-mono text-sm">{formatCurrency(result.currentPrice)}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-md border p-3 bg-muted/30 space-y-2">
                <div className="font-medium text-sm mb-2">Returns Analysis</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="opacity-70">Strategy Returns</span>
                    <span className={`font-mono font-medium ${result.returns >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {formatCurrency(result.returns)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="opacity-70">HODL Returns</span>
                    <span className={`font-mono font-medium ${result.hodlReturns >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {formatCurrency(result.hodlReturns)}
                    </span>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Performance vs HODL</span>
                    <span className={`font-mono font-bold text-sm ${result.performanceVsHodl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {formatCurrency(result.performanceVsHodl)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] opacity-60 italic">
                {result && (
                  <>
                    Historical prices from CoinGecko/Birdeye.
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
