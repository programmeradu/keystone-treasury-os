"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Shield, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { IconTokenAuditor } from "@/components/ui/icons";

export function RugPullDetector() {
  const [mintInput, setMintInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  const checkToken = async () => {
    if (!mintInput.trim()) {
      toast.error("Please enter a token mint address");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/solana/rug-check?mint=${encodeURIComponent(mintInput.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to check token");
      }

      setResult(data);
      
      // Show toast based on risk
      if (data.riskScore >= 70) {
        toast.error(`High Risk! Score: ${data.riskScore}/100`);
      } else if (data.riskScore >= 40) {
        toast.warning(`Medium Risk. Score: ${data.riskScore}/100`);
      } else {
        toast.success(`Low Risk! Score: ${data.riskScore}/100`);
      }
    } catch (e: any) {
      setError(e.message || String(e));
      toast.error("Rug check failed");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return "text-red-500 border-red-500/30 bg-red-500/10";
    if (score >= 40) return "text-amber-500 border-amber-500/30 bg-amber-500/10";
    return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
  };

  const getStatusIcon = (status: string) => {
    if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (status === "fail") return <XCircle className="h-4 w-4 text-red-500" />;
    if (status === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  };

  return (
    <div className="h-full">
      <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] min-h-[360px]">
        <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
        <CardHeader className="pb-2 flex flex-col gap-2">
          <div className="flex h-8 items-center justify-between gap-2">
            <CardTitle className="text-sm leading-none whitespace-nowrap">
              <span className="flex items-center gap-2">
                <IconTokenAuditor className="h-4 w-4" />
                <span>Token Auditor</span>
              </span>
            </CardTitle>
            <Badge variant="secondary" className="h-6 px-2 text-[10px] rounded-md leading-none">
              Security
            </Badge>
          </div>
          <div className="text-xs opacity-70">
            Scan any Solana token for rug risk red flags before you buy.
          </div>
        </CardHeader>
        <CardContent className="atlas-card-content pt-0 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={mintInput}
              onChange={(e) => setMintInput(e.target.value)}
              placeholder="Token mint address (e.g., EPjF...)"
              className="h-9 font-mono text-xs"
              title={mintInput}
              onKeyDown={(e) => e.key === "Enter" && checkToken()}
            />
            <Button size="sm" onClick={checkToken} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Scan"}
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

          {result && (
            <div className="space-y-3 text-xs">
              {/* Risk Score */}
              <div className={`rounded-lg border-2 p-4 ${getRiskColor(result.riskScore)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">Risk Score</span>
                  <span className="text-2xl font-bold">{result.riskScore}/100</span>
                </div>
                <div className="font-medium">{result.verdict}</div>
                {result.ageInDays != null && (
                  <div className="mt-1 opacity-80">Token age: {result.ageInDays} days</div>
                )}
              </div>

              {/* Security Checks */}
              {result.checks && (
                <div className="space-y-2">
                  <div className="font-medium">Security Checks</div>
                  {Object.entries(result.checks).map(([key, check]: [string, any]) => (
                    <div
                      key={key}
                      className="flex items-start gap-2 rounded-md p-2 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40"
                    >
                      {getStatusIcon(check.status)}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </div>
                        <div className="opacity-70 text-[11px]">{check.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Red Flags */}
              {result.flags && result.flags.length > 0 && (
                <div className="space-y-2">
                  <div className="font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Red Flags ({result.flags.length})
                  </div>
                  {result.flags.map((flag: any, i: number) => (
                    <div
                      key={i}
                      className={`rounded-md p-2 border ${
                        flag.severity === "high"
                          ? "border-red-500/30 bg-red-500/10"
                          : "border-amber-500/30 bg-amber-500/10"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={flag.severity === "high" ? "destructive" : "secondary"}
                          className="text-[10px]"
                        >
                          {flag.severity}
                        </Badge>
                        <span className="opacity-90">{flag.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Community Score */}
              {result.socialScore != null && (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Community Trust Score</div>
                    <div className="text-[11px] opacity-70">
                      {result.communityReports} report(s)
                    </div>
                  </div>
                  <div className="text-xl font-bold">{result.socialScore}/100</div>
                </div>
              )}

              {/* Token Launch Preparedness */}
              {result.launchPreparedness && (
                <div className="space-y-2 border-t pt-3">
                  <div className="font-medium text-xs flex items-center gap-2">
                    <span>🚀 Launch Preparedness</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-md p-2 bg-card/60">
                      <div className="opacity-70">Upgradeable</div>
                      <div className="font-mono font-medium">
                        {result.launchPreparedness.isUpgradeable ? "⚠️ Yes" : "✓ No"}
                      </div>
                    </div>
                    <div className="rounded-md p-2 bg-card/60">
                      <div className="opacity-70">Admin Functions</div>
                      <div className="font-mono font-medium">
                        {result.launchPreparedness.hasAdminFunctions ? "⚠️ Yes" : "✓ No"}
                      </div>
                    </div>
                    <div className="rounded-md p-2 bg-card/60">
                      <div className="opacity-70">Top Holder</div>
                      <div className="font-mono font-medium">{result.launchPreparedness.topHolderPercent}%</div>
                    </div>
                    <div className="rounded-md p-2 bg-card/60">
                      <div className="opacity-70">Whale Risk</div>
                      <div className="font-mono font-medium capitalize">
                        {result.launchPreparedness.whaleThreshold === "high" && "🔴 High"}
                        {result.launchPreparedness.whaleThreshold === "medium" && "🟡 Medium"}
                        {result.launchPreparedness.whaleThreshold === "low" && "🟢 Low"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && !result && !error && (
            <div className="text-xs opacity-70 text-center py-4">
              Enter a token mint address to scan for rug pull risks.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
