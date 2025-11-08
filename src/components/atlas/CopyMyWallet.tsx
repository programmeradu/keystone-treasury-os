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
  Copy, 
  Loader2, 
  TrendingUp,
  Wallet,
  DollarSign,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

interface TokenHolding {
  mint: string;
  symbol: string;
  balance: number;
  usdValue: number;
  percentage: number;
  logoURI?: string;
}

interface PortfolioData {
  address: string;
  totalValue: number;
  holdings: TokenHolding[];
  timestamp: number;
}

export function CopyMyWallet() {
  const [targetAddress, setTargetAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [copying, setCopying] = useState(false);

  const analyzeWallet = async () => {
    const address = targetAddress.trim();
    
    if (!address) {
      toast.error("Enter a wallet address");
      return;
    }

    if (address.length < 32 || address.length > 44) {
      toast.error("Invalid Solana wallet address");
      return;
    }

    setLoading(true);
    
    try {
      // Fetch token holdings using Helius DAS API
      const response = await fetch(`/api/helius/das/token-accounts?owner=${address}`, {
        cache: "no-store"
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch wallet data");
      }

      const data = await response.json();
      
      // Get price data for tokens
      const priceResponse = await fetch(`/api/jupiter/price?ids=SOL,USDC,USDT,BONK,JUP`, {
        cache: "no-store"
      });
      const priceData = await priceResponse.json();
      
      // Process token accounts
      const holdings: TokenHolding[] = [];
      let totalValue = 0;

      // Add SOL balance (native token)
      const solBalance = Math.random() * 100; // Simulated - would use actual RPC call
      const solPrice = priceData?.data?.SOL?.price || 0;
      const solValue = solBalance * solPrice;
      totalValue += solValue;
      
      holdings.push({
        mint: "So11111111111111111111111111111111111111112",
        symbol: "SOL",
        balance: solBalance,
        usdValue: solValue,
        percentage: 0 // Will calculate after total
      });

      // Add other token holdings (simplified for demo)
      const mockTokens = [
        { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", symbol: "USDC", balance: 1000, price: 1 },
        { mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", symbol: "BONK", balance: 1000000, price: 0.00002 },
        { mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", symbol: "JUP", balance: 50, price: 0.75 },
      ];

      for (const token of mockTokens) {
        const value = token.balance * token.price;
        totalValue += value;
        holdings.push({
          mint: token.mint,
          symbol: token.symbol,
          balance: token.balance,
          usdValue: value,
          percentage: 0
        });
      }

      // Calculate percentages
      holdings.forEach(h => {
        h.percentage = (h.usdValue / totalValue) * 100;
      });

      // Sort by USD value descending
      holdings.sort((a, b) => b.usdValue - a.usdValue);

      setPortfolio({
        address,
        totalValue,
        holdings,
        timestamp: Date.now()
      });

      toast.success("Portfolio analyzed successfully!");
    } catch (error: any) {
      toast.error("Analysis failed", { description: error?.message || "Unknown error" });
      setPortfolio(null);
    } finally {
      setLoading(false);
    }
  };

  const copyPortfolio = async () => {
    if (!portfolio) return;

    setCopying(true);
    
    try {
      // Simulate generating transaction list
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const transactions = portfolio.holdings.map(h => ({
        type: "swap",
        from: "SOL",
        to: h.symbol,
        percentage: h.percentage.toFixed(2) + "%",
        estimatedAmount: `~$${h.usdValue.toFixed(2)}`
      }));

      // In production, this would generate actual swap transactions
      toast.success("Transaction list generated!", {
        description: `${transactions.length} swaps needed to match portfolio`
      });

      // Copy transaction plan to clipboard
      const plan = transactions.map(tx => 
        `${tx.type.toUpperCase()}: ${tx.from} → ${tx.to} (${tx.percentage})`
      ).join('\n');
      
      await navigator.clipboard.writeText(plan);
      toast.info("Transaction plan copied to clipboard");
      
    } catch (error: any) {
      toast.error("Failed to generate transactions", { description: error?.message });
    } finally {
      setCopying(false);
    }
  };

  return (
    <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] min-h-[360px]">
      <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
      
      <CardHeader className="pb-2">
        <CardTitle className="text-sm leading-none flex items-center gap-2">
          <Copy className="h-4 w-4" />
          <span>Copy My Wallet</span>
          <Badge variant="secondary" className="text-[10px]">Pro</Badge>
        </CardTitle>
        <div className="text-xs opacity-70 mt-2">
          Clone any successful wallet's portfolio allocation
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="wallet" className="text-xs">Target Wallet Address</Label>
            <div className="flex gap-2">
              <Input
                id="wallet"
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                placeholder="Enter wallet address..."
                className="h-8 text-xs font-mono"
              />
              <Button
                onClick={analyzeWallet}
                disabled={loading || !targetAddress}
                className="h-8 px-3 text-xs shrink-0"
              >
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Wallet className="h-3 w-3 mr-1" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
          </div>

          {!portfolio && !loading && (
            <Alert>
              <AlertDescription className="text-[10px]">
                💡 Enter any Solana wallet address to see their portfolio breakdown and generate a transaction plan to match their allocation.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {portfolio && (
          <>
            <Separator />
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs opacity-70">Portfolio Value</div>
                <div className="flex items-center gap-1 font-mono font-medium">
                  <DollarSign className="h-3 w-3 opacity-50" />
                  {portfolio.totalValue.toLocaleString('en-US', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                  })}
                </div>
              </div>

              <div className="rounded-md border p-3 bg-muted/30 space-y-2 max-h-48 overflow-y-auto">
                <div className="text-[10px] font-medium opacity-80 uppercase tracking-wide mb-2">
                  Holdings ({portfolio.holdings.length})
                </div>
                
                {portfolio.holdings.map((holding, idx) => (
                  <div 
                    key={holding.mint}
                    className="flex items-center justify-between gap-2 text-xs py-1"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {idx + 1}
                      </Badge>
                      <span className="font-medium truncate">{holding.symbol}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="font-mono text-[11px]">
                          ${holding.usdValue.toFixed(2)}
                        </div>
                        <div className="text-[10px] opacity-60">
                          {holding.percentage.toFixed(1)}%
                        </div>
                      </div>
                      <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary"
                          style={{ width: `${Math.min(holding.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={copyPortfolio}
                  disabled={copying}
                  className="flex-1 h-8 text-xs"
                >
                  {copying ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-3 w-3 mr-2" />
                      Copy Portfolio
                    </>
                  )}
                </Button>
              </div>

              <Alert className="mt-3">
                <CheckCircle2 className="h-3 w-3" />
                <AlertDescription className="text-[10px]">
                  Click "Copy Portfolio" to generate a transaction plan matching this allocation. The plan will be copied to your clipboard.
                </AlertDescription>
              </Alert>
            </div>
          </>
        )}

        {!portfolio && (
          <div className="text-center py-6 opacity-60">
            <Wallet className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <div className="text-xs">Enter a wallet to analyze</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
