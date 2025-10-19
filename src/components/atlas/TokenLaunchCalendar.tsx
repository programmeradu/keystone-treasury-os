"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Calendar, TrendingUp, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface TokenLaunch {
  id: string;
  name: string;
  symbol: string;
  launchDate: string;
  platform: string;
  initialPrice?: number;
  totalSupply?: number;
  vettingScore: number;
  status: "upcoming" | "live" | "completed";
  tags: string[];
  isVerified: boolean;
  teamDoxxed: boolean;
  auditStatus: "audited" | "pending" | "none";
  redFlags: string[];
  website?: string;
  description?: string;
}

export function TokenLaunchCalendar() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [launches, setLaunches] = useState<TokenLaunch[]>([]);
  const [selectedLaunch, setSelectedLaunch] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "upcoming" | "live">("upcoming");

  const fetchLaunches = async () => {
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch(`/api/solana/token-launches?status=${filterStatus}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch token launches");
      }
      
      setLaunches(data.launches || []);
      if (data.launches?.length > 0 && !selectedLaunch) {
        setSelectedLaunch(data.launches[0].id);
      }
    } catch (e: any) {
      setError(e.message || String(e));
      toast.error("Failed to load launch calendar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLaunches();
  }, [filterStatus]);

  const getVettingColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 60) return "text-blue-500 border-blue-500/30 bg-blue-500/10";
    if (score >= 40) return "text-amber-500 border-amber-500/30 bg-amber-500/10";
    return "text-red-500 border-red-500/30 bg-red-500/10";
  };

  const getVettingLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Caution";
    return "High Risk";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return "Live Now";
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    return `In ${days} days`;
  };

  const selectedLaunchData = launches.find(l => l.id === selectedLaunch);

  return (
    <div className="h-full">
      <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] min-h-[360px]">
        <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
        <CardHeader className="pb-2 flex flex-col gap-2">
          <div className="flex h-8 items-center justify-between gap-2">
            <CardTitle className="text-sm leading-none">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>🚀 Token Launch Calendar</span>
              </span>
            </CardTitle>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className="h-6 px-2 text-[10px] rounded-md leading-none">
                IDOs
              </Badge>
              <Button size="sm" variant="outline" onClick={fetchLaunches} disabled={loading} className="h-6 px-2 text-[11px] rounded-md">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>
          </div>
          <div className="text-xs opacity-70">
            Upcoming token launches with automated vetting scores to avoid scams.
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {/* Filter Buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={filterStatus === "all" ? "default" : "secondary"}
              onClick={() => setFilterStatus("all")}
              className="h-7 px-3 text-[11px]"
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filterStatus === "upcoming" ? "default" : "secondary"}
              onClick={() => setFilterStatus("upcoming")}
              className="h-7 px-3 text-[11px]"
            >
              Upcoming
            </Button>
            <Button
              size="sm"
              variant={filterStatus === "live" ? "default" : "secondary"}
              onClick={() => setFilterStatus("live")}
              className="h-7 px-3 text-[11px]"
            >
              Live Now
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

          {!loading && !error && launches.length === 0 && (
            <div className="text-xs opacity-70 text-center py-4">
              No token launches found for the selected filter.
            </div>
          )}

          {!loading && !error && launches.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Launches List */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {launches.map((launch) => (
                  <button
                    key={launch.id}
                    onClick={() => setSelectedLaunch(launch.id)}
                    className={`relative overflow-hidden w-full text-left rounded-md p-2 text-xs bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40 transition-colors hover:shadow-[0_6px_18px_-12px_rgba(0,0,0,0.3)] ${
                      selectedLaunch === launch.id ? "bg-muted/50 border border-border" : ""
                    }`}
                  >
                    <span className="pointer-events-none absolute -top-8 -right-8 h-16 w-16 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/25%,transparent_70%)]" />
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{launch.name}</span>
                        {launch.isVerified && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                      </div>
                      <Badge className={`text-[10px] ${getVettingColor(launch.vettingScore)}`}>
                        {launch.vettingScore}/100
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] opacity-70 mb-1">
                      <span className="font-mono">{launch.symbol}</span>
                      <span>•</span>
                      <span>{launch.platform}</span>
                      <span>•</span>
                      <span>{formatDate(launch.launchDate)}</span>
                    </div>
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {launch.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[9px] h-4">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              {/* Launch Details */}
              <div className="space-y-2 text-xs">
                {selectedLaunchData ? (
                  <>
                    {/* Header */}
                    <div className="rounded-md p-3 bg-muted/30">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium text-sm flex items-center gap-1.5">
                            {selectedLaunchData.name}
                            {selectedLaunchData.isVerified && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                          </div>
                          <div className="font-mono text-[11px] opacity-70">{selectedLaunchData.symbol}</div>
                        </div>
                        <Badge className={`text-[10px] ${getVettingColor(selectedLaunchData.vettingScore)}`}>
                          {getVettingLabel(selectedLaunchData.vettingScore)}
                        </Badge>
                      </div>
                      {selectedLaunchData.description && (
                        <div className="text-[11px] opacity-80 line-clamp-2">{selectedLaunchData.description}</div>
                      )}
                    </div>

                    {/* Vetting Score */}
                    <div className={`rounded-lg border-2 p-3 ${getVettingColor(selectedLaunchData.vettingScore)}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">Vetting Score</span>
                        <span className="text-xl font-bold">{selectedLaunchData.vettingScore}/100</span>
                      </div>
                      <div className="font-medium">{getVettingLabel(selectedLaunchData.vettingScore)}</div>
                    </div>

                    {/* Security Badges */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`rounded-md p-2 border ${selectedLaunchData.teamDoxxed ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
                        <div className="text-[10px] opacity-70">Team</div>
                        <div className="font-medium text-sm flex items-center gap-1">
                          {selectedLaunchData.teamDoxxed ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              Doxxed
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                              Anonymous
                            </>
                          )}
                        </div>
                      </div>
                      <div className={`rounded-md p-2 border ${selectedLaunchData.auditStatus === "audited" ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/30 bg-amber-500/10"}`}>
                        <div className="text-[10px] opacity-70">Audit</div>
                        <div className="font-medium text-sm capitalize">{selectedLaunchData.auditStatus}</div>
                      </div>
                    </div>

                    {/* Launch Info */}
                    <div className="rounded-md p-2 bg-muted/30">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-[10px] opacity-70">Platform</div>
                          <div className="font-medium">{selectedLaunchData.platform}</div>
                        </div>
                        <div>
                          <div className="text-[10px] opacity-70">Launch</div>
                          <div className="font-medium">{formatDate(selectedLaunchData.launchDate)}</div>
                        </div>
                        {selectedLaunchData.initialPrice && (
                          <div>
                            <div className="text-[10px] opacity-70">Initial Price</div>
                            <div className="font-mono">${selectedLaunchData.initialPrice}</div>
                          </div>
                        )}
                        {selectedLaunchData.totalSupply && (
                          <div>
                            <div className="text-[10px] opacity-70">Supply</div>
                            <div className="font-mono">{(selectedLaunchData.totalSupply / 1e6).toFixed(2)}M</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Red Flags */}
                    {selectedLaunchData.redFlags.length > 0 && (
                      <div className="space-y-1">
                        <div className="font-medium flex items-center gap-2 text-red-500">
                          <AlertTriangle className="h-4 w-4" />
                          Red Flags ({selectedLaunchData.redFlags.length})
                        </div>
                        {selectedLaunchData.redFlags.map((flag, i) => (
                          <div key={i} className="rounded-md p-2 bg-red-500/10 border border-red-500/30 text-[11px]">
                            {flag}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {selectedLaunchData.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Action Button */}
                    {selectedLaunchData.website && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          window.open(selectedLaunchData.website, "_blank", "noopener,noreferrer");
                        }}
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Visit Project
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="text-xs opacity-70 text-center py-8">
                    Select a launch to view details
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
