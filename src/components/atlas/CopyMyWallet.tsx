"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Copy, CheckCircle2, AlertCircle, Wallet } from "lucide-react";
import { toast } from "sonner";
import { IconWalletCopy } from "@/components/ui/icons";

interface TokenHolding {
  token: string;
  symbol: string;
  amount: number;
  valueUSD: number;
  percentage: number;
}

interface PortfolioData {
  holdings: TokenHolding[];
  totalValue: number;
}

export function CopyMyWallet() {
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [copied, setCopied] = useState(false);

  // Simple Base58 validation (Solana addresses are 32-44 chars)
  const isValidSolanaAddress = (address: string): boolean => {
    if (!address || address.length < 32 || address.length > 44) {
      return false;
    }
    // Check if it's base58 (no 0, O, I, l characters)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    return base58Regex.test(address);
  };

  const handleAnalyze = async () => {
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
    setPortfolio(null);

    try {
      // Fetch wallet holdings from Helius DAS API
      let url = `/api/helius/das/wallet-holdings?address=${address}`;
      try {
        if (typeof window !== "undefined") {
          const pageMock = new URL(window.location.href).searchParams.get("mock");
          if (String(pageMock || "").toLowerCase() === "true") url += "&mock=true";
        }
      } catch {}
      const response = await fetch(url);

      const raw = await response.text();
      let data: any = null;
      if (raw && raw.length > 0) {
        try {
          data = JSON.parse(raw);
        } catch (parseErr) {
          console.error("CopyMyWallet: failed to parse response", raw, parseErr);
          throw new Error("Invalid JSON from wallet holdings API");
        }
      }

      if (!response.ok) {
        const bodyMsg = data?.error || raw || response.statusText;
        console.error("CopyMyWallet API error:", response.status, bodyMsg);
        throw new Error(bodyMsg || "Failed to fetch wallet holdings");
      }

      // Parse the response - try several shapes for robustness
      const holdings: TokenHolding[] = [];
      let totalValue = 0;
      const tokens = data?.holdings || data?.result || data?.items || data?.tokens || [];

      if (!Array.isArray(tokens) || tokens.length === 0) {
        console.error("CopyMyWallet: no tokens found", { url, data, raw });
        setError("No tokens found in this wallet");
        setLoading(false);
        return;
      }

      // Extract token mints for price fetching
      const mints = tokens.map((t: any) => t.mint || t.address).filter(Boolean).join(",");
      
      let priceData: any = {};
      if (mints) {
        const priceResponse = await fetch(`/api/jupiter/price?mints=${encodeURIComponent(mints)}`);
        if (priceResponse.ok) {
          const prices = await priceResponse.json();
          priceData = prices?.data || {};
        }
      }

      // Process holdings
      for (const token of tokens) {
        const mint = token.mint || token.address;
        const symbol = token.symbol || token.name || "UNKNOWN";
        const amount = parseFloat(token.amount || token.balance || 0);
        const decimals = token.decimals || 9;
        const adjustedAmount = amount / Math.pow(10, decimals);
        
        const price = priceData[mint]?.price || 0;
        const valueUSD = adjustedAmount * price;
        
        holdings.push({
          token: mint,
          symbol: symbol,
          amount: adjustedAmount,
          valueUSD: valueUSD,
          percentage: 0, // Will be calculated after totalValue
        });

        totalValue += valueUSD;
      }

      // Calculate percentages
      holdings.forEach(h => {
        h.percentage = totalValue > 0 ? (h.valueUSD / totalValue) * 100 : 0;
      });

      // Sort by value (descending)
      holdings.sort((a, b) => b.valueUSD - a.valueUSD);

      setPortfolio({
        holdings: holdings.slice(0, 10), // Top 10 holdings
        totalValue,
      });

      toast.success("Portfolio analyzed", {
        description: `Found ${holdings.length} tokens worth ${formatCurrency(totalValue)}`,
      });
    } catch (e: any) {
      setError(e?.message || "Failed to analyze wallet");
      toast.error("Analysis failed", {
        description: e?.message || "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateTransactionPlan = (): string => {
    if (!portfolio || portfolio.holdings.length === 0) {
      return "";
    }

    let plan = `# Portfolio Clone Transaction Plan\n\n`;
    plan += `Total Portfolio Value: ${formatCurrency(portfolio.totalValue)}\n\n`;
    plan += `## Token Allocations:\n\n`;

    portfolio.holdings.forEach((holding, index) => {
      plan += `${index + 1}. ${holding.symbol}\n`;
      plan += `   - Allocation: ${holding.percentage.toFixed(2)}%\n`;
      plan += `   - Value: ${formatCurrency(holding.valueUSD)}\n`;
      plan += `   - Amount: ${holding.amount.toFixed(6)} tokens\n`;
      plan += `   - Token Address: ${holding.token}\n\n`;
    });

    plan += `## Transaction Steps:\n\n`;
    portfolio.holdings.forEach((holding, index) => {
      plan += `${index + 1}. Swap to ${holding.symbol}\n`;
      plan += `   - Target allocation: ${holding.percentage.toFixed(2)}%\n`;
      plan += `   - Token: ${holding.token}\n\n`;
    });

    plan += `\n---\n`;
    plan += `Note: Execute swaps on Jupiter or your preferred DEX.\n`;
    plan += `Always verify token addresses before trading.\n`;

    return plan;
  };

  const handleCopyPortfolio = () => {
    const plan = generateTransactionPlan();
    
    if (!plan) {
      toast.error("No portfolio to copy");
      return;
    }

    navigator.clipboard.writeText(plan).then(() => {
      setCopied(true);
      toast.success("Transaction plan copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error("Failed to copy to clipboard");
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="h-full">
      <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] min-h-[360px]">
        <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
        
        <CardHeader className="pb-2 flex flex-col gap-2">
          <div className="flex h-8 items-center justify-between gap-2">
            <CardTitle className="text-sm leading-none">
              <span className="flex items-center gap-2">
                <IconWalletCopy className="h-4 w-4" />
                <span>Wallet Copy</span>
              </span>
            </CardTitle>
            <Badge variant="secondary" className="h-6 px-2 text-[10px] rounded-md leading-none">
              Portfolio Clone
            </Badge>
          </div>
          <div className="text-xs opacity-70">
            Analyze any Solana wallet and generate a transaction plan to match their allocation
          </div>
        </CardHeader>

        <CardContent className="atlas-card-content pt-0 space-y-4">
          {/* Wallet Input */}
          <div className="space-y-2">
            <label className="text-xs opacity-70">Wallet Address</label>
            <div className="flex gap-2">
              <Input
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Enter Solana wallet address..."
                className="h-9 flex-1 font-mono text-xs"
              />
              <Button
                onClick={handleAnalyze}
                disabled={loading}
                size="sm"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Analyze"
                )}
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}

          {/* Portfolio Display */}
          {portfolio && !loading && (
            <div className="space-y-3">
              {/* Total Value */}
              <div className="rounded-md border p-3 bg-muted/30">
                <div className="text-xs opacity-70 mb-1">Total Portfolio Value</div>
                <div className="text-2xl font-bold font-mono">
                  {formatCurrency(portfolio.totalValue)}
                </div>
              </div>

              {/* Holdings List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium opacity-80">Top Holdings</div>
                  <Button
                    onClick={handleCopyPortfolio}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy Plan
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {portfolio.holdings.map((holding, index) => (
                    <div
                      key={holding.token}
                      className="relative overflow-hidden rounded-md p-2 text-xs bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40 transition-colors hover:shadow-[0_6px_18px_-12px_rgba(0,0,0,0.3)]"
                    >
                      <span className="pointer-events-none absolute -top-8 -right-8 h-16 w-16 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/25%,transparent_70%)]" />
                      
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{holding.symbol}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {holding.percentage.toFixed(2)}%
                          </Badge>
                        </div>
                        <div className="font-mono text-xs">
                          {formatCurrency(holding.valueUSD)}
                        </div>
                      </div>
                      
                      <div className="opacity-70 text-[10px] font-mono truncate">
                        {holding.amount.toFixed(6)} tokens
                      </div>
                      
                      {/* Allocation Bar */}
                      <div className="mt-1.5 h-1 bg-muted/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-blue-500"
                          style={{ width: `${Math.min(holding.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[10px] opacity-60 italic">
                Click "Copy Plan" to get a detailed transaction plan for replicating this portfolio
              </div>
            </div>
          )}

          {!portfolio && !loading && !error && (
            <div className="text-xs opacity-70 text-center py-8">
              Enter a Solana wallet address above to analyze its portfolio
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
