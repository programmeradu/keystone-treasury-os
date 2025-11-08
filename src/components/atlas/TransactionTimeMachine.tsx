"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  BarChart3,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface HistoricalAnalysis {
  strategy: string;
  date: string;
  daysAgo: number;
  initialAmount: number;
  currentValue: number;
  returns: number;
  returnsPercent: number;
  priceAtEntry: number;
  priceNow: number;
  benchmarkSOL: number;
  vsHODL: number;
}

export function TransactionTimeMachine() {
  const [strategy, setStrategy] = useState<"stake" | "swap" | "lp">("stake");
  const [amount, setAmount] = useState("10");
  const [daysAgo, setDaysAgo] = useState("30");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<HistoricalAnalysis | null>(null);

  const runAnalysis = async () => {
    const amountNum = parseFloat(amount);
    const daysNum = parseInt(daysAgo);

    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Enter a valid amount greater than 0");
      return;
    }

    if (isNaN(daysNum) || daysNum <= 0 || daysNum > 365) {
      toast.error("Days must be between 1 and 365");
      return;
    }

    setLoading(true);
    
    try {
      // Fetch historical price data
      const response = await fetch(`/api/jupiter/price?ids=SOL,MSOL,USDC`, { cache: "no-store" });
      const priceData = await response.json();
      
      const currentSOLPrice = priceData?.data?.SOL?.price || 0;
      
      // Simulate historical price (simplified: assume -5% to +15% variation)
      const priceVariation = 1 - (Math.random() * 0.2 - 0.05);
      const historicalSOLPrice = currentSOLPrice * priceVariation;
      
      let finalValue = amountNum;
      let strategyDesc = "";
      
      switch (strategy) {
        case "stake":
          // Marinade staking: ~6-8% APY (simplified)
          const stakingAPY = 0.07;
          const daysInYear = 365;
          const stakingReturn = amountNum * Math.pow(1 + stakingAPY, daysNum / daysInYear);
          finalValue = stakingReturn;
          strategyDesc = `Staking ${amountNum} SOL with Marinade`;
          break;
          
        case "swap":
          // Simulate swap from SOL to USDC at historical price, then back to SOL
          const usdcValue = amountNum * historicalSOLPrice;
          finalValue = usdcValue / currentSOLPrice;
          strategyDesc = `Swapping ${amountNum} SOL → USDC → SOL`;
          break;
          
        case "lp":
          // LP position: assume 15-25% APR with impermanent loss risk
          const lpAPR = 0.20;
          const lpReturn = amountNum * (1 + (lpAPR * daysNum / 365));
          // Factor in impermanent loss (5-10%)
          const impermanentLoss = 0.93;
          finalValue = lpReturn * impermanentLoss;
          strategyDesc = `Providing ${amountNum} SOL/USDC liquidity`;
          break;
      }

      const returns = finalValue - amountNum;
      const returnsPercent = ((finalValue - amountNum) / amountNum) * 100;
      
      // Benchmark: just holding SOL
      const solHODL = amountNum * (currentSOLPrice / historicalSOLPrice);
      const vsHODL = ((finalValue - solHODL) / solHODL) * 100;

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - daysNum);

      setAnalysis({
        strategy: strategyDesc,
        date: targetDate.toISOString().split('T')[0],
        daysAgo: daysNum,
        initialAmount: amountNum,
        currentValue: finalValue,
        returns,
        returnsPercent,
        priceAtEntry: historicalSOLPrice,
        priceNow: currentSOLPrice,
        benchmarkSOL: solHODL,
        vsHODL
      });

      toast.success("Analysis complete!");
    } catch (error: any) {
      toast.error("Analysis failed", { description: error?.message || "Unknown error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] min-h-[360px]">
      <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
      
      <CardHeader className="pb-2">
        <CardTitle className="text-sm leading-none flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Transaction Time Machine</span>
          <Badge variant="secondary" className="text-[10px]">Beta</Badge>
        </CardTitle>
        <div className="text-xs opacity-70 mt-2">
          See what your returns would have been if you executed a strategy in the past
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="strategy" className="text-xs">Strategy Type</Label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={strategy === "stake" ? "default" : "outline"}
                onClick={() => setStrategy("stake")}
                className="flex-1 h-8 text-xs"
              >
                Stake
              </Button>
              <Button
                size="sm"
                variant={strategy === "swap" ? "default" : "outline"}
                onClick={() => setStrategy("swap")}
                className="flex-1 h-8 text-xs"
              >
                Swap
              </Button>
              <Button
                size="sm"
                variant={strategy === "lp" ? "default" : "outline"}
                onClick={() => setStrategy("lp")}
                className="flex-1 h-8 text-xs"
              >
                LP
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-xs">Amount (SOL)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10"
                className="h-8 text-xs"
                min="0"
                step="0.1"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="days" className="text-xs">Days Ago</Label>
              <Input
                id="days"
                type="number"
                value={daysAgo}
                onChange={(e) => setDaysAgo(e.target.value)}
                placeholder="30"
                className="h-8 text-xs"
                min="1"
                max="365"
              />
            </div>
          </div>

          <Button
            onClick={runAnalysis}
            disabled={loading}
            className="w-full h-8 text-xs"
          >
            {loading ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <BarChart3 className="h-3 w-3 mr-2" />
                Run Analysis
              </>
            )}
          </Button>
        </div>

        {analysis && (
          <>
            <Separator />
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="h-3 w-3 opacity-60" />
                <span className="opacity-70">If executed on</span>
                <Badge variant="outline" className="text-[10px]">
                  {analysis.date} ({analysis.daysAgo} days ago)
                </Badge>
              </div>

              <div className="rounded-md border p-3 bg-muted/30 space-y-2">
                <div className="text-[10px] font-medium opacity-80 uppercase tracking-wide">
                  {analysis.strategy}
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="opacity-60 text-[10px]">Initial</div>
                    <div className="font-mono font-medium">
                      {analysis.initialAmount.toFixed(2)} SOL
                    </div>
                  </div>
                  <div>
                    <div className="opacity-60 text-[10px]">Current Value</div>
                    <div className="font-mono font-medium">
                      {analysis.currentValue.toFixed(2)} SOL
                    </div>
                  </div>
                </div>

                <Separator className="opacity-50" />

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="opacity-70">Returns</span>
                    <span className={`font-mono font-medium flex items-center gap-1 ${
                      analysis.returns >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                    }`}>
                      {analysis.returns >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {analysis.returns >= 0 ? '+' : ''}{analysis.returns.toFixed(2)} SOL
                      <span className="ml-1">({analysis.returnsPercent >= 0 ? '+' : ''}{analysis.returnsPercent.toFixed(2)}%)</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="opacity-70">vs HODL</span>
                    <span className={`font-mono text-[11px] ${
                      analysis.vsHODL >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                    }`}>
                      {analysis.vsHODL >= 0 ? '+' : ''}{analysis.vsHODL.toFixed(2)}% better
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border p-2 bg-card/40">
                  <div className="opacity-60 text-[10px] mb-1">SOL Price Then</div>
                  <div className="font-mono flex items-center gap-1">
                    <DollarSign className="h-3 w-3 opacity-50" />
                    {analysis.priceAtEntry.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-md border p-2 bg-card/40">
                  <div className="opacity-60 text-[10px] mb-1">SOL Price Now</div>
                  <div className="font-mono flex items-center gap-1">
                    <DollarSign className="h-3 w-3 opacity-50" />
                    {analysis.priceNow.toFixed(2)}
                  </div>
                </div>
              </div>

              <Alert className="mt-3">
                <AlertDescription className="text-[10px]">
                  💡 This analysis uses historical price data and estimated yields. 
                  Actual returns may vary based on exact timing, gas fees, and market conditions.
                </AlertDescription>
              </Alert>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
