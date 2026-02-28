"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, AlertTriangle, CheckCircle2, XCircle, Rocket, Search } from "lucide-react";
import { toast } from "@/lib/toast-notifications";
import { IconTokenAuditor, IconHolderAnalytics } from "@/components/ui/icons";

/* ------------------------------------------------------------------ */
/*  Props coming from atlas-client for holder analytics               */
/* ------------------------------------------------------------------ */
interface TokenIntelCardProps {
  mintInput: string;
  setMintInput: (v: string) => void;
  holderLoading: boolean;
  holderError: string | null;
  moralisStats: any;
  dasCount: number | null;
  dasData: any[] | null;
  fetchHolderInsights: () => void;
}

type TabId = "audit" | "holders";

export function TokenIntelCard({
  mintInput,
  setMintInput,
  holderLoading,
  holderError,
  moralisStats,
  dasCount,
  dasData,
  fetchHolderInsights,
}: TokenIntelCardProps) {
  const [tab, setTab] = useState<TabId>("audit");

  // ── Rug-check local state ──
  const [rugLoading, setRugLoading] = useState(false);
  const [rugError, setRugError] = useState("");
  const [rugResult, setRugResult] = useState<any>(null);

  const checkToken = async () => {
    if (!mintInput.trim()) {
      toast.error("Please enter a token mint address");
      return;
    }
    setRugLoading(true);
    setRugError("");
    setRugResult(null);
    try {
      const res = await fetch(`/api/solana/rug-check?mint=${encodeURIComponent(mintInput.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to check token");
      setRugResult(data);
      if (data.riskScore >= 70) toast.error(`High Risk! Score: ${data.riskScore}/100`);
      else if (data.riskScore >= 40) toast.warning(`Medium Risk. Score: ${data.riskScore}/100`);
      else toast.success(`Low Risk! Score: ${data.riskScore}/100`);
    } catch (e: any) {
      setRugError(e.message || String(e));
      toast.error("Rug check failed");
    } finally {
      setRugLoading(false);
    }
  };

  const runBoth = () => {
    checkToken();
    fetchHolderInsights();
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return "text-red-500 border-red-500/30 bg-red-500/10";
    if (score >= 40) return "text-amber-500 border-amber-500/30 bg-amber-500/10";
    return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
  };

  const getStatusIcon = (status: string) => {
    if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (status === "fail") return <XCircle className="h-4 w-4 text-red-500" />;
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  };

  const isLoading = tab === "audit" ? rugLoading : holderLoading;

  return (
    <div className="h-full" id="token-intel-card">
      <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] min-h-[360px]">
        <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
        <CardHeader className="pb-2 flex flex-col gap-2">
          <div className="flex h-8 items-center justify-between gap-2">
            <CardTitle className="text-sm leading-none whitespace-nowrap">
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                <span>Token Intel</span>
              </span>
            </CardTitle>
            <Badge variant="secondary" className="h-6 px-2 text-[10px] rounded-md leading-none">
              Security + Analytics
            </Badge>
          </div>
          <div className="text-xs opacity-70">
            Paste a token mint to scan for rug risks and view holder distribution.
          </div>
        </CardHeader>

        <CardContent className="atlas-card-content pt-0 space-y-3">
          {/* Shared mint input — single input drives both tabs */}
          <div className="flex items-center gap-2">
            <Input
              value={mintInput}
              onChange={(e) => setMintInput(e.target.value)}
              placeholder="Token mint address (e.g., EPjF...USDC)"
              className="h-9 font-mono text-xs"
              title={mintInput}
              onKeyDown={(e) => e.key === "Enter" && runBoth()}
            />
            <Button size="sm" onClick={runBoth} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Scan"}
            </Button>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-0.5">
            <button
              onClick={() => setTab("audit")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${tab === "audit" ? "bg-background shadow-sm" : "opacity-60 hover:opacity-80"}`}
            >
              <IconTokenAuditor className="h-3.5 w-3.5" />
              Security Audit
            </button>
            <button
              onClick={() => setTab("holders")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${tab === "holders" ? "bg-background shadow-sm" : "opacity-60 hover:opacity-80"}`}
            >
              <IconHolderAnalytics className="h-3.5 w-3.5" />
              Holders
            </button>
          </div>

          {/* ── Tab: Security Audit ── */}
          {tab === "audit" && (
            <div className="space-y-3">
              {rugLoading && (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              )}
              {rugError && <Alert variant="destructive"><AlertDescription>{rugError}</AlertDescription></Alert>}

              {rugResult && (
                <div className="space-y-3 text-xs">
                  {/* Risk Score */}
                  <div className={`rounded-lg border-2 p-4 ${getRiskColor(rugResult.riskScore)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">Risk Score</span>
                      <span className="text-2xl font-bold">{rugResult.riskScore}/100</span>
                    </div>
                    <div className="font-medium">{rugResult.verdict}</div>
                    {rugResult.ageInDays != null && (
                      <div className="mt-1 opacity-80">Token age: {rugResult.ageInDays} days</div>
                    )}
                  </div>

                  {/* Security Checks */}
                  {rugResult.checks && (
                    <div className="space-y-2">
                      <div className="font-medium">Security Checks</div>
                      {Object.entries(rugResult.checks).map(([key, check]: [string, any]) => (
                        <div key={key} className="flex items-start gap-2 rounded-md p-2 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40">
                          {getStatusIcon(check.status)}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</div>
                            <div className="opacity-70 text-[11px]">{check.message}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Red Flags */}
                  {rugResult.flags && rugResult.flags.length > 0 && (
                    <div className="space-y-2">
                      <div className="font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Red Flags ({rugResult.flags.length})
                      </div>
                      {rugResult.flags.map((flag: any, i: number) => (
                        <div key={i} className={`rounded-md p-2 border ${flag.severity === "high" ? "border-red-500/30 bg-red-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
                          <div className="flex items-center gap-2">
                            <Badge variant={flag.severity === "high" ? "destructive" : "secondary"} className="text-[10px]">{flag.severity}</Badge>
                            <span className="opacity-90">{flag.message}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Community Score */}
                  {rugResult.socialScore != null && (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Community Trust Score</div>
                        <div className="text-[11px] opacity-70">{rugResult.communityReports} report(s)</div>
                      </div>
                      <div className="text-xl font-bold">{rugResult.socialScore}/100</div>
                    </div>
                  )}

                  {/* Launch Preparedness */}
                  {rugResult.launchPreparedness && (
                    <div className="space-y-2 border-t pt-3">
                      <div className="font-medium text-xs flex items-center gap-2">
                        <Rocket className="h-3.5 w-3.5" />
                        <span>Launch Preparedness</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="rounded-md p-2 bg-card/60">
                          <div className="opacity-70">Upgradeable</div>
                          <div className="font-mono font-medium">
                            {rugResult.launchPreparedness.isUpgradeable ? <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-500" />Yes</span> : <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" />No</span>}
                          </div>
                        </div>
                        <div className="rounded-md p-2 bg-card/60">
                          <div className="opacity-70">Admin Functions</div>
                          <div className="font-mono font-medium">
                            {rugResult.launchPreparedness.hasAdminFunctions ? <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-500" />Yes</span> : <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" />No</span>}
                          </div>
                        </div>
                        <div className="rounded-md p-2 bg-card/60">
                          <div className="opacity-70">Top Holder</div>
                          <div className="font-mono font-medium">{rugResult.launchPreparedness.topHolderPercent}%</div>
                        </div>
                        <div className="rounded-md p-2 bg-card/60">
                          <div className="opacity-70">Whale Risk</div>
                          <div className="font-mono font-medium capitalize">
                            {rugResult.launchPreparedness.whaleThreshold === "high" && <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" />High</span>}
                            {rugResult.launchPreparedness.whaleThreshold === "medium" && <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-500" />Medium</span>}
                            {rugResult.launchPreparedness.whaleThreshold === "low" && <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" />Low</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!rugLoading && !rugResult && !rugError && (
                <div className="text-xs opacity-70 text-center py-4">
                  Enter a token mint address above and click Scan.
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Holder Analytics ── */}
          {tab === "holders" && (
            <div className="space-y-3">
              {holderError && <Alert variant="destructive"><AlertDescription>{holderError}</AlertDescription></Alert>}

              {holderLoading && (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              )}

              {(moralisStats || dasCount != null) && (
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
                          <div className="font-mono font-bold text-sm text-emerald-400">{dasCount > 1000 ? " Healthy" : dasCount > 100 ? " Fair" : " Risky"}</div>
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
              )}

              {!holderLoading && !moralisStats && dasCount == null && !holderError && (
                <div className="text-xs opacity-70 text-center py-4">
                  Enter a token mint address above and click Scan.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
