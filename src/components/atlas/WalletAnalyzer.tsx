"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Wallet, TrendingUp, TrendingDown, PieChart, Target } from "lucide-react";
import { toast } from "sonner";

interface PortfolioData {
  address: string;
  totalValue: number;
  pnl: number;
  pnlPercent: number;
  holdings: Array<{
    token: string;
    symbol: string;
    balance: number;
    value: number;
    pnl: number;
    pnlPercent: number;
    avgBuyPrice: number;
    currentPrice: number;
  }>;
  topPerformer?: {
    symbol: string;
    pnlPercent: number;
  };
  worstPerformer?: {
    symbol: string;
    pnlPercent: number;
  };
  diversificationScore: number;
  riskScore: number;
  tradingPatterns: {
    avgHoldTime: number;
    winRate: number;
    totalTrades: number;
    activeTrader: boolean;
  };
}

export function WalletAnalyzer() {
  const [walletInput, setWalletInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);

  const analyzeWallet = async () => {
    if (!walletInput.trim()) {
      toast.error("Please enter a wallet address");
      return;
    }

    setLoading(true);
    setError("");
    setPortfolio(null);

    try {
      const res = await fetch(`/api/solana/wallet-analysis?address=${encodeURIComponent(walletInput.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze wallet");
      }

      setPortfolio(data);
      toast.success("Portfolio analyzed successfully!");
    } catch (e: any) {
      setError(e.message || String(e));
      toast.error("Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const getPnLColor = (pnl: number) => {
    if (pnl >= 0) return "text-emerald-500";
    return "text-red-500";
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 60) return "text-blue-500 border-blue-500/30 bg-blue-500/10";
    if (score >= 40) return "text-amber-500 border-amber-500/30 bg-amber-500/10";
    return "text-red-500 border-red-500/30 bg-red-500/10";
  };

  return (
    <div className="h-full">
      <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] min-h-[360px]">
        <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
        <CardHeader className="pb-2 flex flex-col gap-2">
          <div className="flex h-8 items-center justify-between gap-2">
            <CardTitle className="text-sm leading-none">
              <span className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                <span>📊 Wallet Portfolio Analyzer</span>
              </span>
            </CardTitle>
            <Badge variant="secondary" className="h-6 px-2 text-[10px] rounded-md leading-none">
              Analytics
            </Badge>
          </div>
          <div className="text-xs opacity-70">
            Analyze any wallet's holdings, PnL, and trading patterns to learn from successful traders.
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
              placeholder="Wallet address (e.g., 7xKXtg...)"
              className="h-9"
              onKeyDown={(e) => e.key === "Enter" && analyzeWallet()}
            />
            <Button size="sm" onClick={analyzeWallet} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
            </Button>
          </div>

          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {portfolio && (
            <div className="space-y-3 text-xs">
              {/* Portfolio Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md p-3 bg-muted/30">
                  <div className="text-[10px] opacity-70 mb-1">Total Value</div>
                  <div className="font-mono text-lg font-bold">
                    ${portfolio.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className={`rounded-md p-3 border ${portfolio.pnl >= 0 ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10"}`}>
                  <div className="text-[10px] opacity-70 mb-1">Total PnL</div>
                  <div className={`font-mono text-lg font-bold ${getPnLColor(portfolio.pnl)}`}>
                    {portfolio.pnl >= 0 ? "+" : ""}${portfolio.pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                  <div className={`text-[10px] ${getPnLColor(portfolio.pnl)}`}>
                    {portfolio.pnlPercent >= 0 ? "+" : ""}{portfolio.pnlPercent.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Best/Worst Performers */}
              {(portfolio.topPerformer || portfolio.worstPerformer) && (
                <div className="grid grid-cols-2 gap-2">
                  {portfolio.topPerformer && (
                    <div className="rounded-md p-2 bg-emerald-500/10 border border-emerald-500/30">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                        <span className="text-[10px] opacity-70">Top Performer</span>
                      </div>
                      <div className="font-medium">{portfolio.topPerformer.symbol}</div>
                      <div className="font-mono text-emerald-500">
                        +{portfolio.topPerformer.pnlPercent.toFixed(2)}%
                      </div>
                    </div>
                  )}
                  {portfolio.worstPerformer && (
                    <div className="rounded-md p-2 bg-red-500/10 border border-red-500/30">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingDown className="h-3 w-3 text-red-500" />
                        <span className="text-[10px] opacity-70">Worst Performer</span>
                      </div>
                      <div className="font-medium">{portfolio.worstPerformer.symbol}</div>
                      <div className="font-mono text-red-500">
                        {portfolio.worstPerformer.pnlPercent.toFixed(2)}%
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Scores */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-md p-2 border ${getScoreColor(portfolio.diversificationScore)}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <PieChart className="h-3 w-3" />
                    <span className="text-[10px] opacity-70">Diversification</span>
                  </div>
                  <div className="text-xl font-bold">{portfolio.diversificationScore}/100</div>
                </div>
                <div className={`rounded-md p-2 border ${getScoreColor(100 - portfolio.riskScore)}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target className="h-3 w-3" />
                    <span className="text-[10px] opacity-70">Risk Level</span>
                  </div>
                  <div className="text-xl font-bold">{portfolio.riskScore}/100</div>
                </div>
              </div>

              {/* Trading Patterns */}
              <div className="rounded-md p-3 bg-muted/30">
                <div className="font-medium mb-2 flex items-center gap-2">
                  Trading Patterns
                  {portfolio.tradingPatterns.activeTrader && (
                    <Badge variant="default" className="text-[10px]">Active Trader</Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <div className="opacity-70">Avg Hold</div>
                    <div className="font-medium">{portfolio.tradingPatterns.avgHoldTime}d</div>
                  </div>
                  <div>
                    <div className="opacity-70">Win Rate</div>
                    <div className="font-medium">{portfolio.tradingPatterns.winRate.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="opacity-70">Trades</div>
                    <div className="font-medium">{portfolio.tradingPatterns.totalTrades}</div>
                  </div>
                </div>
              </div>

              {/* Top Holdings */}
              <div className="space-y-2">
                <div className="font-medium">Top Holdings</div>
                <div className="max-h-48 overflow-y-auto pr-1 space-y-1">
                  {portfolio.holdings.slice(0, 8).map((holding, i) => (
                    <div
                      key={i}
                      className="relative overflow-hidden rounded-md p-2 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40 transition-colors hover:shadow-[0_6px_18px_-12px_rgba(0,0,0,0.3)]"
                    >
                      <span className="pointer-events-none absolute -top-8 -right-8 h-16 w-16 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/25%,transparent_70%)]" />
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{holding.symbol}</span>
                          <Badge variant="secondary" className="text-[9px]">
                            {((holding.value / portfolio.totalValue) * 100).toFixed(1)}%
                          </Badge>
                        </div>
                        <div className={`font-mono text-sm ${getPnLColor(holding.pnl)}`}>
                          {holding.pnl >= 0 ? "+" : ""}{holding.pnlPercent.toFixed(2)}%
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] opacity-70">
                        <span>Value: ${holding.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        <span>{holding.balance.toLocaleString()} tokens</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] opacity-70 mt-0.5">
                        <span>Avg Buy: ${holding.avgBuyPrice.toFixed(4)}</span>
                        <span>Current: ${holding.currentPrice.toFixed(4)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wallet Address */}
              <div className="rounded-md p-2 bg-muted/30 text-[10px] opacity-70">
                <div className="mb-1">Analyzed Wallet:</div>
                <div className="font-mono break-all">{portfolio.address}</div>
              </div>
            </div>
          )}

          {!loading && !portfolio && !error && (
            <div className="text-xs opacity-70 text-center py-4">
              Enter a wallet address to analyze its portfolio and trading patterns.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
