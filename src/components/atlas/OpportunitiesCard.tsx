"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink } from "lucide-react";
import { IconAirDropScout } from "@/components/ui/icons";

interface OpportunitiesCardProps {
  specLoading: boolean;
  specError: string | null;
  specItems: any[];
}

export function OpportunitiesCard({ specLoading, specError, specItems }: OpportunitiesCardProps) {
  return (
    <div className="h-full">
      <Card className="atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)]">
        <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
        <CardHeader className="pb-2 flex flex-col gap-2">
          <div className="flex h-8 items-center justify-between gap-2">
            <CardTitle className="text-sm leading-none whitespace-nowrap">
              <span className="flex items-center gap-2"><IconAirDropScout className="h-4 w-4" /><span>Opportunities</span></span>
            </CardTitle>
            <Badge variant="secondary" className="h-5 px-2 text-[10px] rounded-md leading-none">airdrops.io</Badge>
          </div>
          <div className="text-[11px] opacity-60">Curated speculative Solana quests. DYOR.</div>
        </CardHeader>
        <CardContent className="atlas-card-content pt-0">
          {specLoading && (
            <div className="space-y-1.5">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-md" />)}
            </div>
          )}
          {specError && <Alert variant="destructive"><AlertDescription>{specError}</AlertDescription></Alert>}
          {!specLoading && !specError && specItems.length === 0 && (
            <div className="text-xs opacity-60 text-center py-6">No speculative items found.</div>
          )}
          <div className="max-h-[320px] overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
            {specItems.map((it: any, i: number) => (
              <a
                key={`${it.url || it.title}-${i}`}
                href={it.url}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-md px-2.5 py-2 text-xs bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40 transition-colors hover:bg-accent/10 group"
                title={it.title || it.project || "Untitled"}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{it.title || it.project || "Untitled"}</div>
                  {it.summary && <div className="opacity-50 truncate text-[10px] mt-0.5">{it.summary}</div>}
                </div>
                <ExternalLink className="h-3 w-3 shrink-0 opacity-30 group-hover:opacity-70 transition-opacity" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
