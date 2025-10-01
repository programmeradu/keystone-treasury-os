"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Zap, AlertTriangle, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export function MEVScanner() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [lastScan, setLastScan] = useState<number | null>(null);
  const [autoScan, setAutoScan] = useState(false);

  const scanForMEV = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/solana/mev-scan?minProfit=0.5");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to scan for MEV opportunities");
      }

      setOpportunities(data.opportunities || []);
      setLastScan(data.scannedAt || Date.now());
      
      if (data.opportunities.length > 0) {
        toast.success(`Found ${data.opportunities.length} opportunity(s)!`);
      }
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  // Auto-scan every 10 seconds when enabled
  useEffect(() => {
    if (!autoScan) return;
    
    const interval = setInterval(() => {
      scanForMEV();
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [autoScan]);

  // Initial scan
  useEffect(() => {
    scanForMEV();
  }, []);

  const getConfidenceColor = (confidence: string) => {
    if (confidence === "high") return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
    if (confidence === "medium") return "text-amber-500 border-amber-500/30 bg-amber-500/10";
    return "text-red-500 border-red-500/30 bg-red-500/10";
  };

  // Format price with crypto-style subscript notation for small numbers
  // Example: 0.00002058 → $0.0₅2058 (subscript 5 = five zeros)
  const formatPrice = (price: number) => {
    if (price === 0) return "$0.00";
    if (price >= 1) return `$${price.toFixed(4)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    
    // For very small numbers, use subscript notation
    const str = price.toFixed(20); // Get enough decimals
    const match = str.match(/^0\.(0+)([1-9]\d*)/);
    
    if (match) {
      const zeros = match[1].length; // Count leading zeros after decimal
      const digits = match[2].slice(0, 4); // Get first 4 significant digits
      
      // Unicode subscript numbers: ₀₁₂₃₄₅₆₇₈₉
      const subscriptMap: { [key: string]: string } = {
        '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
        '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'
      };
      
      const subscript = zeros.toString().split('').map(d => subscriptMap[d]).join('');
      return `$0.0${subscript}${digits}`;
    }
    
    return `$${price.toFixed(8)}`;
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
                <span>🎯 MEV Scanner</span>
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Last Scan Timestamp */}
              {lastScan && (
                <span className="text-[10px] opacity-60">
                  {new Date(lastScan).toLocaleTimeString()}
                </span>
              )}
              <Badge
                variant={opportunities.length > 0 ? "default" : "secondary"}
                className="h-6 px-2 text-[10px] rounded-md leading-none"
              >
                {opportunities.length} Opp{opportunities.length !== 1 ? "s" : ""}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={scanForMEV}
                disabled={loading}
                className="h-6 px-2 text-[11px] rounded-md"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Scan Now"}
              </Button>
            </div>
          </div>
          <div className="text-xs opacity-70">
            Real-time arbitrage & MEV opportunities across Solana DEXs.
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {loading && opportunities.length === 0 && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Opportunities List */}
          <div className="space-y-2 max-h-72 overflow-y-auto">{opportunities.map((opp) => (
              <div
                key={opp.id}
                className="relative overflow-hidden rounded-md p-3 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40 transition-colors hover:shadow-[0_6px_18px_-12px_rgba(0,0,0,0.3)]"
              >
                <span className="pointer-events-none absolute -top-8 -right-8 h-16 w-16 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/25%,transparent_70%)]" />
                
                {opp.type === "arbitrage" ? (
                  <>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs flex items-center gap-2">
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                          {opp.token}
                        </div>
                        <div className="text-[11px] opacity-70 mt-0.5">
                          Buy on {opp.buyDex} @ {formatPrice(opp.buyPrice)} · Sell on {opp.sellDex} @ {formatPrice(opp.sellPrice)}
                        </div>
                      </div>
                      <Badge
                        className={`text-[10px] ${getConfidenceColor(opp.confidence)}`}
                      >
                        {opp.confidence}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] mb-2">
                      <div>
                        <span className="opacity-70">Profit:</span>{" "}
                        <span className="font-mono text-emerald-500 font-semibold">
                          +{opp.profitPercent}%
                        </span>
                      </div>
                      <div>
                        <span className="opacity-70">Est:</span>{" "}
                        <span className="font-mono">${opp.profitUsd}</span>
                      </div>
                      <div>
                        <span className="opacity-70">Trade:</span>{" "}
                        <span className="font-mono">${opp.tradeSize}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-[10px] opacity-70">
                        Expires in ~{opp.expiresIn}s · Gas: {opp.gasEstimate} SOL
                      </div>
                      <Button
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => toast.info("Execute via Jupiter coming soon!")}
                      >
                        Execute
                      </Button>
                    </div>
                  </>
                ) : (
                  // Sandwich risk warning
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="font-medium text-xs">{opp.token}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        Risk Alert
                      </Badge>
                    </div>
                    <div className="text-[11px] opacity-80">{opp.warning}</div>
                    {opp.frontrunProfit && (
                      <div className="text-[10px] opacity-70 mt-1">
                        Potential profit: ${opp.frontrunProfit}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {!loading && opportunities.length === 0 && !error && (
            <div className="text-xs opacity-70 text-center py-4">
              No MEV opportunities found right now. Market is efficient!
            </div>
          )}

          {/* Info Alert */}
          <Alert>
            <AlertDescription className="text-[11px]">
              <strong>Note:</strong> MEV opportunities are time-sensitive. Actual execution may differ due to slippage and gas costs.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
