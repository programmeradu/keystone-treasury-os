"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { IconHolderAnalytics } from "@/components/ui/icons";

interface HolderAnalyticsCardProps {
  mintInput: string;
  setMintInput: (v: string) => void;
  holderLoading: boolean;
  holderError: string | null;
  moralisStats: any;
  dasCount: number | null;
  dasData: any[] | null;
  fetchHolderInsights: () => void;
}

export function HolderAnalyticsCard({
  mintInput,
  setMintInput,
  holderLoading,
  holderError,
  moralisStats,
  dasCount,
  dasData,
  fetchHolderInsights,
}: HolderAnalyticsCardProps) {
  return (
    <div className="h-full" id="holder-insights-card">
      <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] min-h-[360px]">
        <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
        <CardHeader className="pb-2 flex flex-col gap-2">
          <CardTitle className="text-sm leading-none whitespace-nowrap">
            <span className="flex items-center gap-2"><IconHolderAnalytics className="h-4 w-4" /><span>Holder Analytics</span></span>
          </CardTitle>
          <div className="text-xs opacity-70">Paste a token mint to view holder distribution and stats from Moralis and Helius.</div>
        </CardHeader>
        <CardContent className="atlas-card-content pt-0 space-y-3">
          <div className="flex items-center gap-2">
            <Input value={mintInput} onChange={(e) => setMintInput(e.target.value)} placeholder="Token mint (e.g., EPjF...USDC)" className="h-9 font-mono text-xs" title={mintInput} />
            <Button size="sm" onClick={fetchHolderInsights} disabled={holderLoading}>
              {holderLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="flex items-center gap-1.5"><IconHolderAnalytics className="h-3.5 w-3.5" /><span>Fetch</span></span>}
            </Button>
          </div>
          {holderError && <Alert variant="destructive"><AlertDescription>{holderError}</AlertDescription></Alert>}
          {(moralisStats || dasCount != null) &&
            <div className="space-y-3">
              {/* Moralis Stats */}
              {moralisStats && (
                <div className="rounded-md space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-xs">Moralis Holders</div>
                    <Badge variant="secondary" className="text-[10px]">Source</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {moralisStats?.holders != null && (
                      <div className="rounded p-2 bg-card/40">
                        <div className="text-[11px] opacity-70">Total Holders</div>
                        <div className="font-mono font-bold text-sm">{(moralisStats.holders || 0).toLocaleString()}</div>
                      </div>
                    )}
                    {moralisStats?.topHoldersSample && Array.isArray(moralisStats.topHoldersSample) && moralisStats.topHoldersSample.length > 0 && (
                      <div className="rounded p-2 bg-card/40">
                        <div className="text-[11px] opacity-70">Top Holder %</div>
                        <div className="font-mono font-bold text-sm">{(moralisStats.topHoldersSample[0]?.percent || 0).toFixed(2)}%</div>
                      </div>
                    )}
                  </div>
                  {moralisStats?.topHoldersSample && Array.isArray(moralisStats.topHoldersSample) && moralisStats.topHoldersSample.length > 0 && (
                    <div className="rounded p-2 bg-card/40 space-y-1">
                      <div className="text-[10px] font-medium opacity-80">Top Holders</div>
                      {moralisStats.topHoldersSample.slice(0, 3).map((holder: any, idx: number) => (
                        <div key={idx} className="text-[10px] flex items-center justify-between opacity-70">
                          <span className="font-mono truncate">{holder.address?.slice(0, 8)}...{holder.address?.slice(-4)}</span>
                          <span className="text-amber-400 font-mono">{holder.percent?.toFixed(2)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Helius DAS Stats */}
              {dasCount != null && (
                <div className="rounded-md space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-xs">Helius Token Accounts</div>
                    <Badge variant="secondary" className="text-[10px]">DAS API</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded p-2 bg-card/40">
                      <div className="text-[11px] opacity-70">Token Accounts</div>
                      <div className="font-mono font-bold text-sm">{dasCount.toLocaleString()}</div>
                    </div>
                    <div className="rounded p-2 bg-card/40">
                      <div className="text-[11px] opacity-70">Distribution</div>
                      <div className="font-mono font-bold text-sm text-emerald-400">{dasCount > 1000 ? "✓ Healthy" : dasCount > 100 ? "⚠ Fair" : "✗ Risky"}</div>
                    </div>
                  </div>
                  {dasData && Array.isArray(dasData) && dasData.length > 0 && (
                    <div className="rounded p-2 bg-card/40 space-y-1">
                      <div className="text-[10px] font-medium opacity-80">Sample Holders</div>
                      {dasData.slice(0, 3).map((account: any, idx: number) => (
                        <div key={idx} className="text-[10px] flex items-center justify-between opacity-70">
                          <span className="font-mono truncate">{account.owner?.slice(0, 8)}...{account.owner?.slice(-4)}</span>
                          <span className="text-purple-400 font-mono">{((account.amount || 0) / Math.pow(10, account.decimals || 0)).toFixed(2)} tokens</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          }
        </CardContent>
      </Card>
    </div>
  );
}
