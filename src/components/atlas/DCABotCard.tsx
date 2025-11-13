"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Bot, Play, Pause, TrendingUp, TrendingDown, Zap } from "lucide-react";
import { toast } from "sonner";
import { CreateDCABotModal } from "./CreateDCABotModal";

export function DCABotCard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bots, setBots] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const fetchBots = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/solana/dca-bot?action=list");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch DCA bots");
      }

      setBots(data.bots || []);
      setSummary(data.summary || null);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const toggleBot = async (botId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "paused" : "active";
      const res = await fetch("/api/solana/dca-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: newStatus === "active" ? "resume" : "pause",
          botId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`Bot ${newStatus === "active" ? "resumed" : "paused"}`);
      fetchBots(); // Refresh
    } catch (e: any) {
      toast.error(e.message || "Failed to toggle bot");
    }
  };

  const executeBot = async (botId: string) => {
    try {
      toast.info("Executing trade...");
      
      const res = await fetch("/api/solana/dca-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute",
          botId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Trade executed successfully!");
      fetchBots(); // Refresh
    } catch (e: any) {
      toast.error(e.message || "Failed to execute trade");
    }
  };

  useEffect(() => {
    fetchBots();
  }, []);

  return (
    <div className="h-full">
      <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] min-h-[360px]">
        <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
        <CardHeader className="pb-2 flex flex-col gap-2">
          <div className="flex h-8 items-center justify-between gap-2">
            <CardTitle className="text-sm leading-none">
              <span className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                <span>🤖 Auto-DCA Bots</span>
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {summary && (
                <Badge variant="secondary" className="h-6 px-2 text-[10px] rounded-md leading-none">
                  {summary.activeBots} Active
                </Badge>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={fetchBots}
                disabled={loading}
                className="h-6 px-2 text-[11px] rounded-md"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
              </Button>
            </div>
          </div>
          <div className="text-xs opacity-70">
            Set-and-forget Dollar-Cost Averaging. Smart buy schedules, no timing stress.
          </div>
        </CardHeader>
        <CardContent className="atlas-card-content pt-0 space-y-3">
          {loading && bots.length === 0 && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Summary Card */}
          {summary && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-md p-3 bg-muted/30">
                <div className="opacity-70">Total Invested</div>
                <div className="text-lg font-bold">${summary.totalInvested?.toLocaleString()}</div>
              </div>
              <div className="rounded-md p-3 bg-muted/30">
                <div className="opacity-70">Current Value</div>
                <div className="text-lg font-bold flex items-center gap-2">
                  ${summary.totalValue?.toLocaleString()}
                  {summary.overallPnl != null && (
                    <span
                      className={`text-xs flex items-center gap-1 ${
                        summary.overallPnl >= 0 ? "text-emerald-500" : "text-red-500"
                      }`}
                    >
                      {summary.overallPnl >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {summary.overallPnl >= 0 ? "+" : ""}
                      {summary.overallPnl.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bot List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {bots.map((bot) => (
              <div
                key={bot.id}
                className="relative overflow-hidden rounded-md p-3 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40 transition-colors hover:shadow-[0_6px_18px_-12px_rgba(0,0,0,0.3)]"
              >
                <span className="pointer-events-none absolute -top-8 -right-8 h-16 w-16 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/25%,transparent_70%)]" />
                
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs truncate">{bot.name}</div>
                    <div className="text-[11px] opacity-70">
                      {bot.fromToken} → {bot.toToken} · ${bot.amount} {bot.frequency}
                    </div>
                  </div>
                  <Badge variant={bot.status === "active" ? "default" : "secondary"} className="text-[10px]">
                    {bot.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                  <div>
                    <span className="opacity-70">Avg Price:</span>{" "}
                    <span className="font-mono">${bot.avgPrice?.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="opacity-70">Now:</span>{" "}
                    <span className="font-mono">${bot.currentPrice?.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="opacity-70">Invested:</span>{" "}
                    <span className="font-mono">${bot.totalInvested}</span>
                  </div>
                  <div>
                    <span className="opacity-70">P/L:</span>{" "}
                    <span
                      className={`font-mono ${
                        bot.pnlPercent >= 0 ? "text-emerald-500" : "text-red-500"
                      }`}
                    >
                      {bot.pnlPercent >= 0 ? "+" : ""}
                      {bot.pnlPercent?.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-[10px] opacity-70">
                    {bot.nextExecution ? (
                      <>Next: {new Date(bot.nextExecution).toLocaleDateString()}</>
                    ) : (
                      "Paused"
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2"
                      onClick={() => executeBot(bot.id)}
                      title="Execute now"
                    >
                      <Zap className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2"
                      onClick={() => toggleBot(bot.id, bot.status)}
                      title={bot.status === "active" ? "Pause" : "Resume"}
                    >
                      {bot.status === "active" ? (
                        <Pause className="h-3 w-3" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!loading && bots.length === 0 && !error && (
            <div className="text-xs opacity-70 text-center py-4">
              No DCA bots configured yet. Create your first automated buying strategy!
            </div>
          )}

          {/* Create Bot CTA */}
          <CreateDCABotModal onBotCreated={fetchBots} />
        </CardContent>
      </Card>
    </div>
  );
}
