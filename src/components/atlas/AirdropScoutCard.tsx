"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { IconAirDropScout } from "@/components/ui/icons";
import type { PublicKey } from "@solana/web3.js";

interface AirdropScoutCardProps {
  publicKey: PublicKey | null;
  compassLoading: boolean;
  compassError: string | null;
  compassData: any;
  scanAirdrops: () => void;
  selectedAirdropId: string | null;
  setSelectedAirdropId: (id: string | null) => void;
  handleSimulateTask: (task: any) => void;
  handleExecuteTask: (task: any) => void;
}

export function AirdropScoutCard({
  publicKey,
  compassLoading,
  compassError,
  compassData,
  scanAirdrops,
  selectedAirdropId,
  setSelectedAirdropId,
  handleSimulateTask,
  handleExecuteTask,
}: AirdropScoutCardProps) {
  return (
    <div className="h-full" id="airdrop-compass">
      <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] min-h-[360px]">
        <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
        <CardHeader className="pb-2 flex flex-col gap-2">
          <div className="flex h-8 items-center justify-between gap-2">
            <CardTitle className="text-sm leading-none whitespace-nowrap">
              <span className="flex items-center gap-2"><IconAirDropScout className="h-4 w-4" /><span>Airdrop Scout</span></span>
            </CardTitle>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                id="quick-scan"
                size="sm"
                variant="secondary"
                className="h-6 px-2 text-[11px] rounded-md leading-none"
                onClick={scanAirdrops}
                disabled={!publicKey || compassLoading}>
                {compassLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Scan Wallet"}
              </Button>
            </div>
          </div>
          {!publicKey &&
            <div className="text-xs opacity-70">Connect your wallet to scan for eligible and potential airdrops.</div>
          }
        </CardHeader>
        <CardContent className="atlas-card-content pt-0 space-y-4">
          {compassLoading &&
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          }

          {compassError &&
            <Alert variant="destructive"><AlertDescription>{compassError}</AlertDescription></Alert>
          }

          {compassData &&
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 h-full">
              {/* Airdrop list */}
              <div className="lg:col-span-1 space-y-2 min-w-0 max-h-96 overflow-y-auto pr-2 pb-2">
                <div className="text-xs font-medium opacity-80">Detected Airdrops</div>
                {(compassData.eligibleNow || []).map((a: any) =>
                  <button
                    key={a.id}
                    onClick={() => setSelectedAirdropId(a.id)}
                    className={`relative overflow-hidden w-full text-left rounded-md p-2 text-xs bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40 transition-all hover:shadow-[0_6px_18px_-12px_rgba(0,0,0,0.3)] ${selectedAirdropId === a.id ? "bg-muted/60 ring-1 ring-accent" : "hover:bg-card/80"}`}>
                    <span className="pointer-events-none absolute -top-8 -right-8 h-16 w-16 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/25%,transparent_70%)]" />
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="font-medium truncate flex-1 min-w-0">{a.name}</span>
                      <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                        {a.source &&
                          <Badge variant="secondary" className="text-[10px] whitespace-nowrap">{a.source}</Badge>
                        }
                        <Badge variant={a.status === "eligible" ? "default" : "secondary"} className="text-[10px] whitespace-nowrap">
                          {a.status === "eligible" ? "✓ Eligible" : a.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-1 text-[11px] opacity-70 truncate">{a.estReward}</div>
                  </button>
                )}
              </div>

              {/* Airdrop details */}
              <div className="lg:col-span-2 min-w-0 overflow-y-auto pr-2 pb-2">
                {(() => {
                  const all = [...(compassData.eligibleNow || [])];
                  const sel = all.find((x: any) => x.id === selectedAirdropId) || all[0];
                  if (!sel) return <div className="text-xs opacity-70 p-3">No eligible airdrops detected for this wallet.</div>;
                  return (
                    <div className="space-y-2 text-xs bg-card/40 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="font-medium flex-1 min-w-0 break-words pr-2">{sel.name}</div>
                        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                          {sel.source && <Badge variant="secondary" className="text-[10px] whitespace-nowrap">{sel.source}</Badge>}
                          <Badge variant={sel.status === "eligible" ? "default" : "secondary"} className="text-[10px] whitespace-nowrap">{sel.status === "eligible" ? "✓ Eligible" : sel.status}</Badge>
                          {sel.endsAt &&
                            <span className="text-[10px] opacity-70 whitespace-nowrap">Ends {new Date(sel.endsAt).toLocaleDateString()}</span>
                          }
                        </div>
                      </div>
                      <div className="opacity-80 break-words text-[11px] leading-relaxed">{sel.details}</div>
                      <Separator />
                      <div className="font-medium mt-2">Tasks</div>
                      <ul className="space-y-1.5">
                        {sel.tasks?.map((t: any) =>
                          <li key={t.id} className="relative overflow-hidden flex flex-wrap items-center justify-between gap-1.5 rounded-md p-1.5 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40 transition-colors hover:shadow-[0_6px_18px_-12px_rgba(0,0,0,0.3)] min-w-0">
                            <span className="pointer-events-none absolute -top-8 -right-8 h-16 w-16 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/25%,transparent_70%)]" />
                            <div className="flex flex-col min-w-0 text-[10px]">
                              <span className="break-words leading-tight">{t.label}</span>
                              {t.venue && <span className="text-[9px] opacity-60">@ {t.venue}</span>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button size="sm" variant="secondary" onClick={() => handleSimulateTask(t)} title="Simulate task" className="h-5 px-1.5 text-[9px]">
                                Sim
                              </Button>
                              <Button size="sm" onClick={() => handleExecuteTask(t)} title="Execute task" className="h-5 px-1.5 text-[9px]">
                                Run
                              </Button>
                            </div>
                          </li>
                        )}
                      </ul>
                    </div>);
                })()}
              </div>
            </div>
          }

          {!compassLoading && !compassData && !compassError &&
            <div className="space-y-3">
              <div className="text-xs opacity-70">No scan yet. Connect your wallet and click "Scan Wallet" to fetch real, verifiable airdrops.</div>
            </div>
          }
        </CardContent>
      </Card>
    </div>
  );
}
