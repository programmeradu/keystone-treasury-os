"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, X, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

interface WatchlistToken {
  mint: string;
  symbol: string;
  addedAt: number;
  price?: number;
  change24h?: number;
}

export function Watchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistToken[]>(() => {
    if (typeof window === 'undefined') return [];
    
    const saved = localStorage.getItem('atlas-watchlist');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  const [newToken, setNewToken] = useState("");
  const [adding, setAdding] = useState(false);

  // Persist watchlist to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('atlas-watchlist', JSON.stringify(watchlist));
    }
  }, [watchlist]);

  const addToken = async () => {
    const input = newToken.trim();
    if (!input) {
      toast.error("Enter a token mint address or symbol");
      return;
    }

    // Check if already in watchlist
    if (watchlist.some(t => t.mint === input || t.symbol.toUpperCase() === input.toUpperCase())) {
      toast.info("Token already in watchlist");
      return;
    }

    setAdding(true);
    try {
      // For demo, accept common symbols
      const knownTokens: Record<string, string> = {
        'SOL': 'So11111111111111111111111111111111111111112',
        'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        'JUP': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
      };

      const inputUpper = input.toUpperCase();
      let mint = input;
      let symbol = input;

      if (knownTokens[inputUpper]) {
        mint = knownTokens[inputUpper];
        symbol = inputUpper;
      } else if (input.length > 30) {
        // Assume it's a mint address
        mint = input;
        symbol = input.slice(0, 6) + '...';
      }

      const newTokenItem: WatchlistToken = {
        mint,
        symbol,
        addedAt: Date.now(),
      };

      setWatchlist(prev => [...prev, newTokenItem]);
      setNewToken("");
      toast.success(`${symbol} added to watchlist`);
    } catch (e: any) {
      toast.error("Failed to add token", { description: e?.message });
    } finally {
      setAdding(false);
    }
  };

  const removeToken = (mint: string) => {
    setWatchlist(prev => prev.filter(t => t.mint !== mint));
    toast.success("Token removed from watchlist");
  };

  return (
    <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
      
      <CardHeader className="pb-2">
        <CardTitle className="text-sm leading-none flex items-center gap-2">
          <Star className="h-4 w-4" />
          <span>Watchlist</span>
          <Badge variant="secondary" className="text-[10px]">{watchlist.length}</Badge>
        </CardTitle>
        <div className="text-xs opacity-70 mt-2">
          Track your favorite tokens
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        <div className="flex gap-2">
          <Input
            value={newToken}
            onChange={(e) => setNewToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addToken()}
            placeholder="Mint address or symbol (e.g., SOL)"
            className="text-xs h-8"
          />
          <Button
            size="sm"
            onClick={addToken}
            disabled={adding || !newToken.trim()}
            className="h-8 px-3"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {watchlist.length === 0 ? (
            <div className="text-xs opacity-70 text-center py-4">
              No tokens in watchlist. Add some to track!
            </div>
          ) : (
            watchlist.map((token) => (
              <div
                key={token.mint}
                className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs">{token.symbol}</span>
                    {token.change24h !== undefined && (
                      <div className={`flex items-center gap-1 text-[10px] ${token.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {token.change24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        <span>{token.change24h.toFixed(2)}%</span>
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] opacity-60 truncate" title={token.mint}>
                    {token.mint}
                  </div>
                  {token.price !== undefined && (
                    <div className="text-xs font-mono mt-1">
                      ${token.price.toFixed(4)}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeToken(token.mint)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="text-[10px] opacity-70 pt-2 border-t border-border/50">
          💡 Watchlist is saved locally. Price updates coming soon.
        </div>
      </CardContent>
    </Card>
  );
}
