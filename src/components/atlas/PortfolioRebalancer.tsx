"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, TrendingUp, ArrowDown, DollarSign, Zap, AlertTriangle, Percent } from "lucide-react";
import { toast } from "sonner";
import { IconPortfolioBalancer } from "@/components/ui/icons";

interface TokenHolding {
  mint: string;
  symbol: string;
  amount: number;
  valueUSD: number;
  decimals: number;
  costBasis?: number;
  purchaseDate?: number;
  transactions?: any[];
}

interface AllocationTarget {
  symbol: string;
  targetPercent: number;
  mint?: string;
}

interface RebalanceCalculation {
  trades: Array<{
    fromSymbol: string;
    toSymbol: string;
    fromAmount: number;
    estimatedToAmount: number;
    slippagePercent: number;
    gasCost: number;
  }>;
  totalGasSavings: number;
  totalRebalanceGasCost: number;
  currentDrift: number;
  projectedDrift: number;
}

interface TaxAnalysis {
  capitalGains: {
    shortTerm: number;
    longTerm: number;
    total: number;
  };
  washSaleRisks: Array<{
    symbol: string;
    riskLevel: string;
    message: string;
  }>;
  taxLossHarvestingOpportunities: Array<{
    symbol: string;
    loss: number;
    recommendation: string;
  }>;
  rebalanceTaxImpact: {
    estimatedTaxLiability: number;
    taxableEvents: number;
    taxOptimizedStrategy?: string;
  };
}

export function PortfolioRebalancer() {
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentHoldings, setCurrentHoldings] = useState<TokenHolding[]>([]);
  const [allocations, setAllocations] = useState<AllocationTarget[]>([]);
  const [rebalanceResult, setRebalanceResult] = useState<RebalanceCalculation | null>(null);
  const [taxAnalysis, setTaxAnalysis] = useState<TaxAnalysis | null>(null);
  const [showTaxDetails, setShowTaxDetails] = useState(false);

  const isValidSolanaAddress = (address: string): boolean => {
    if (!address || address.length < 32 || address.length > 44) return false;
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    return base58Regex.test(address);
  };

  const loadPortfolio = async () => {
    const address = walletAddress.trim();
    if (!address) {
      setError("Please enter a wallet address");
      return;
    }
    if (!isValidSolanaAddress(address)) {
      setError("Invalid Solana wallet address");
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentHoldings([]);
    setAllocations([]);
    setRebalanceResult(null);

    try {
      let url = `/api/helius/das/wallet-holdings?address=${address}`;
      if (typeof window !== "undefined") {
        const pageMock = new URL(window.location.href).searchParams.get("mock");
        if (String(pageMock || "").toLowerCase() === "true") url += "&mock=true";
      }

      const response = await fetch(url);
      const raw = await response.text();
      let data: any = null;
      if (raw && raw.length > 0) {
        try {
          data = JSON.parse(raw);
        } catch {
          throw new Error("Invalid response format");
        }
      }

      if (!response.ok) {
        throw new Error(data?.error || "Failed to fetch wallet");
      }

      const tokens = data?.holdings || data?.result || [];
      if (!Array.isArray(tokens) || tokens.length === 0) {
        setError("No tokens found in this wallet");
        setLoading(false);
        return;
      }

      // First, try to fetch prices for all tokens
      const mints = tokens.map((t: any) => t.mint || t.address).filter(Boolean);
      let priceMap: Record<string, number> = {};
      
      if (mints.length > 0) {
        try {
          // Use CoinGecko API to get prices by token addresses (Solana blockchain)
          const coingeckoIds = mints.map((mint: string) => {
            // Map known Solana token mints to CoinGecko IDs
            const knownTokens: Record<string, string> = {
              "So11111111111111111111111111111111111111112": "solana",
              "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "usd-coin",
              "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So": "marinade-staked-sol",
              "orcaEKTdK7LKz57chssaukiYmUTRziToVqKHKn3J4e": "orca",
              "SRMuApVgqbCGJuG5yvVGdgwVSRwhhHsnWhvzomqs3GA": "serum",
            };
            return knownTokens[mint] || null;
          }).filter(Boolean);
          
          if (coingeckoIds.length > 0) {
            const priceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds.join(",")}&vs_currencies=usd`;
            const priceRes = await fetch(priceUrl, { cache: "no-store" });
            if (priceRes.ok) {
              const priceDataFromCG = await priceRes.json();
              // Map back from CoinGecko IDs to mints
              const cgIdToMint: Record<string, string> = {};
              const knownTokensReverse: Record<string, string> = {
                "solana": "So11111111111111111111111111111111111111112",
                "usd-coin": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
                "marinade-staked-sol": "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
                "orca": "orcaEKTdK7LKz57chssaukiYmUTRziToVqKHKn3J4e",
                "serum": "SRMuApVgqbCGJuG5yvVGdgwVSRwhhHsnWhvzomqs3GA",
              };
              for (const [cgId, mint] of Object.entries(knownTokensReverse)) {
                if (priceDataFromCG[cgId]?.usd) {
                  priceMap[mint] = priceDataFromCG[cgId].usd;
                }
              }
            }
          }
        } catch (priceErr) {
          console.warn("Price fetch failed:", priceErr);
        }
      }

      const holdings: TokenHolding[] = tokens.map((t: any) => {
        const mint = t.mint || t.address;
        const price = priceMap[mint] || 0;
        const decimals = t.decimals || 9;
        const amount = (Number(t.amount || t.balance || 0) / Math.pow(10, decimals));
        const valueUSD = amount * price;
        return {
          mint,
          symbol: t.symbol || "UNKNOWN",
          amount,
          valueUSD,
          decimals,
        };
      });

      setCurrentHoldings(holdings);
      // Pre-populate allocations with current holdings proportionally
      setAllocations(
        holdings.map((h) => ({
          symbol: h.symbol,
          targetPercent: 0,
          mint: h.mint,
        }))
      );

      toast.success(`Loaded ${holdings.length} tokens from wallet`);
    } catch (e: any) {
      const msg = e.message || String(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const updateAllocationTarget = (index: number, percent: number) => {
    const updated = [...allocations];
    updated[index].targetPercent = Math.max(0, Math.min(100, percent));
    setAllocations(updated);
  };

  const calculateRebalance = async () => {
    const totalTarget = allocations.reduce((sum, a) => sum + (a.targetPercent || 0), 0);
    if (totalTarget === 0) {
      setError("Please set target allocations");
      return;
    }
    if (Math.abs(totalTarget - 100) > 0.1) {
      setError(`Target allocations must sum to 100% (current: ${totalTarget.toFixed(1)}%)`);
      return;
    }

    setCalculating(true);
    setError(null);

    try {
      // Calculate rebalance
      const response = await fetch("/api/solana/rebalance-calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentHoldings,
          targetAllocations: allocations,
          totalPortfolioValue: currentHoldings.reduce((sum, h) => sum + h.valueUSD, 0),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Rebalance calculation failed");
      }

      setRebalanceResult(data);

      // Calculate tax impact
      const taxResponse = await fetch("/api/solana/tax-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdings: currentHoldings,
          rebalanceTrades: data.trades,
        }),
      });

      const taxData = await taxResponse.json();
      if (taxResponse.ok) {
        setTaxAnalysis(taxData);
      }

      toast.success(`Rebalance plan ready: ${data.trades.length} trades, save ${data.totalGasSavings.toFixed(2)} SOL`);
    } catch (e: any) {
      const msg = e.message || String(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setCalculating(false);
    }
  };

  const executeRebalance = async () => {
    if (!rebalanceResult) return;
    setCalculating(true);

    try {
      const response = await fetch("/api/solana/execute-rebalance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trades: rebalanceResult.trades,
          walletAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Execution failed");
      }

      toast.success(`Rebalance executed! Tx: ${data.signature}`);
      setRebalanceResult(null);
    } catch (e: any) {
      toast.error(e.message || "Execution failed");
    } finally {
      setCalculating(false);
    }
  };

  const totalPortfolioValue = currentHoldings.reduce((sum, h) => sum + h.valueUSD, 0);

  return (
    <div className="h-full">
      <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] min-h-[360px]">
        <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />

        <CardHeader className="pb-2 flex flex-col gap-2">
          <div className="flex h-8 items-center justify-between gap-2">
            <CardTitle className="text-sm leading-none">
              <span className="flex items-center gap-2">
                <IconPortfolioBalancer className="h-4 w-4" />
                <span>Portfolio Balancer</span>
              </span>
            </CardTitle>
            <Badge variant="secondary" className="h-6 px-2 text-[10px] rounded-md leading-none">
              Optimization
            </Badge>
          </div>
          <div className="text-xs opacity-70">
            Rebalance your portfolio to target allocations with minimal fees.
          </div>
        </CardHeader>

        <CardContent className="atlas-card-content pt-0 space-y-3">
          {/* Wallet Input */}
          <div className="flex items-center gap-2">
            <Input
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Paste wallet address..."
              className="h-9 text-xs"
              onKeyDown={(e) => e.key === "Enter" && loadPortfolio()}
              disabled={loading}
            />
            <Button size="sm" onClick={loadPortfolio} disabled={loading} className="shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load"}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="text-xs">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Current Holdings */}
          {currentHoldings.length > 0 && (
            <div className="space-y-2">
              <div className="font-medium text-xs">Current Holdings</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {currentHoldings.map((holding) => {
                  const currentPercent = (holding.valueUSD / totalPortfolioValue) * 100;
                  return (
                    <div
                      key={holding.mint}
                      className="text-[11px] rounded-md p-2 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40 flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium">{holding.symbol}</div>
                        <div className="opacity-70">${holding.valueUSD.toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono">{currentPercent.toFixed(1)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Target Allocations */}
          {currentHoldings.length > 0 && (
            <div className="space-y-2 border-t pt-2">
              <div className="font-medium text-xs">Target Allocations (%)</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {allocations.map((alloc, idx) => (
                  <div
                    key={alloc.symbol}
                    className="text-[11px] rounded-md p-2 bg-card/60 flex items-center gap-2"
                  >
                    <span className="font-medium min-w-12">{alloc.symbol}</span>
                    <Input
                      type="number"
                      value={alloc.targetPercent}
                      onChange={(e) => updateAllocationTarget(idx, parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="1"
                      className="h-7 text-[11px] flex-1"
                      placeholder="0"
                    />
                    <span className="text-[10px] opacity-70 min-w-4">%</span>
                  </div>
                ))}
              </div>
              <div className="text-[10px] opacity-70 text-right">
                Total: {allocations.reduce((sum, a) => sum + (a.targetPercent || 0), 0).toFixed(1)}%
              </div>
            </div>
          )}

          {/* Calculate Button */}
          {currentHoldings.length > 0 && !rebalanceResult && (
            <Button
              onClick={calculateRebalance}
              disabled={calculating}
              className="w-full h-8 text-xs"
            >
              {calculating ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-2" />
                  Calculating...
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3 mr-2" />
                  Calculate Rebalance
                </>
              )}
            </Button>
          )}

          {/* Rebalance Results */}
          {rebalanceResult && (
            <div className="space-y-2 border-t pt-2">
              <div className="font-medium text-xs">Rebalance Plan</div>

              {/* Gas Savings */}
              <div className="rounded-md p-2 bg-emerald-500/10 border border-emerald-500/30">
                <div className="text-[10px] opacity-80">Potential Savings</div>
                <div className="text-sm font-bold text-emerald-500">
                  {rebalanceResult.totalGasSavings.toFixed(3)} SOL / year
                </div>
              </div>

              {/* Trades */}
              <div className="space-y-1">
                <div className="text-[10px] font-medium">Trades ({rebalanceResult.trades.length})</div>
                {rebalanceResult.trades.map((trade, idx) => (
                  <div
                    key={idx}
                    className="text-[10px] rounded-md p-2 bg-blue-500/10 border border-blue-500/20 space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{trade.fromSymbol}</span>
                      <ArrowDown className="h-3 w-3 opacity-50" />
                      <span className="font-mono font-medium">{trade.toSymbol}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 opacity-80">
                      <div>Sell: {trade.fromAmount.toFixed(2)}</div>
                      <div>Buy: {trade.estimatedToAmount.toFixed(2)}</div>
                      <div>Slippage: {trade.slippagePercent.toFixed(2)}%</div>
                      <div>Gas: {trade.gasCost.toFixed(4)} SOL</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="text-[10px] rounded-md p-2 bg-muted/30 space-y-1">
                <div className="flex justify-between">
                  <span>Total Gas Cost:</span>
                  <span className="font-mono">{rebalanceResult.totalRebalanceGasCost.toFixed(4)} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Drift:</span>
                  <span className="font-mono">{rebalanceResult.currentDrift.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>After Rebalance:</span>
                  <span className="font-mono">{rebalanceResult.projectedDrift.toFixed(2)}%</span>
                </div>
              </div>

              {/* Tax Analysis */}
              {taxAnalysis && (
                <div className="border-t pt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-xs flex items-center gap-2">
                      <Percent className="h-3 w-3" />
                      Tax Analysis
                    </div>
                    <button
                      onClick={() => setShowTaxDetails(!showTaxDetails)}
                      className="text-[10px] opacity-70 hover:opacity-100"
                    >
                      {showTaxDetails ? "Hide" : "Show"}
                    </button>
                  </div>

                  {/* Tax Summary Cards */}
                  <div className="grid grid-cols-2 gap-1">
                    {/* Capital Gains */}
                    <div className="rounded-md p-2 bg-blue-500/10 border border-blue-500/20">
                      <div className="text-[10px] opacity-70">Est. Tax Liability</div>
                      <div className="text-sm font-bold text-blue-400">
                        ${taxAnalysis.rebalanceTaxImpact.estimatedTaxLiability.toFixed(2)}
                      </div>
                    </div>

                    {/* Taxable Events */}
                    <div className="rounded-md p-2 bg-amber-500/10 border border-amber-500/20">
                      <div className="text-[10px] opacity-70">Taxable Events</div>
                      <div className="text-sm font-bold text-amber-400">
                        {taxAnalysis.rebalanceTaxImpact.taxableEvents}
                      </div>
                    </div>

                    {/* Short-term Gains */}
                    <div className="rounded-md p-2 bg-red-500/10 border border-red-500/20">
                      <div className="text-[10px] opacity-70">Short-term Gains</div>
                      <div className="text-sm font-bold text-red-400">
                        ${taxAnalysis.capitalGains.shortTerm.toFixed(2)}
                      </div>
                    </div>

                    {/* Long-term Gains */}
                    <div className="rounded-md p-2 bg-emerald-500/10 border border-emerald-500/20">
                      <div className="text-[10px] opacity-70">Long-term Gains</div>
                      <div className="text-sm font-bold text-emerald-400">
                        ${taxAnalysis.capitalGains.longTerm.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Tax Strategy Recommendation */}
                  {taxAnalysis.rebalanceTaxImpact.taxOptimizedStrategy && (
                    <div className="rounded-md p-2 bg-purple-500/10 border border-purple-500/20">
                      <div className="text-[10px] font-medium text-purple-300 mb-1">💡 Tax Optimization</div>
                      <div className="text-[10px] text-purple-200">
                        {taxAnalysis.rebalanceTaxImpact.taxOptimizedStrategy}
                      </div>
                    </div>
                  )}

                  {showTaxDetails && (
                    <div className="space-y-2">
                      {/* Wash Sale Warnings */}
                      {taxAnalysis.washSaleRisks.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-medium">⚠️ Wash Sale Risks</div>
                          {taxAnalysis.washSaleRisks.map((risk, idx) => (
                            <div
                              key={idx}
                              className={`text-[10px] rounded-md p-2 border ${
                                risk.riskLevel === "high"
                                  ? "bg-red-500/10 border-red-500/20"
                                  : "bg-amber-500/10 border-amber-500/20"
                              }`}
                            >
                              <div className="font-medium">{risk.symbol}</div>
                              <div className="opacity-80">{risk.message}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Tax Loss Harvesting Opportunities */}
                      {taxAnalysis.taxLossHarvestingOpportunities.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-medium">🌱 Tax Loss Harvesting</div>
                          {taxAnalysis.taxLossHarvestingOpportunities.map((opp, idx) => (
                            <div
                              key={idx}
                              className="text-[10px] rounded-md p-2 bg-emerald-500/10 border border-emerald-500/20"
                            >
                              <div className="flex justify-between items-center mb-1">
                                <div className="font-medium">{opp.symbol}</div>
                                <div className="font-mono text-emerald-400">
                                  Loss: ${opp.loss.toFixed(2)}
                                </div>
                              </div>
                              <div className="opacity-80">{opp.recommendation}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={calculateRebalance}
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                >
                  Recalculate
                </Button>
                <Button
                  onClick={executeRebalance}
                  disabled={calculating}
                  size="sm"
                  className="flex-1 h-7 text-xs"
                >
                  {calculating ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3 mr-1" />
                      Execute
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {!currentHoldings.length && !loading && !rebalanceResult && (
            <div className="text-xs opacity-70 text-center py-4">
              Enter a wallet address to begin rebalancing.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
