"use client";

import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Custom schematic icons
const PlayIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path d="M8 5.13l10 6.87-10 6.87V5.13z" />
    <path d="M18 12H6" opacity="0.5" />
  </svg>
);

const LoaderIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2 a10 10 0 0 1 0 20 a10 10 0 0 1 0 -20" opacity="0.2" />
    <path d="M12 2 a10 10 0 0 1 0 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"
      strokeDasharray="20 100"
      transform="rotate(0)"
    >
      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
    </path>
  </svg>
);

const ResetIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path d="M20 8c-1.424-2.85-4.3-5-7.9-5C6.2 3 3 6.2 3 10.1c0 1.9.8 3.7 2 5" />
    <path d="M4 12h3V9" />
    <path d="M4 16c1.424 2.85 4.3 5 7.9 5 5.8 0 9-3.2 9-7.1 0-1.9-.8-3.7-2-5" opacity="0.6"/>
    <path d="M20 12h-3v3" opacity="0.6"/>
  </svg>
);


type PlanStep = {
  type: string;
  summary: string;
  [key: string]: any;
};

type RunStep = {
  index: number;
  title: string;
  status: "success" | "confirmed" | "pending" | string;
  duration?: number;
  cost?: string;
  txHash?: string;
};

type PlannerResponse = {
  ok: boolean;
  steps?: PlanStep[];
  error?: string;
};

type ExecuteResponse = {
  ok: boolean;
  run?: {
    id: string;
    status: string;
    createdAt: number;
    summary: string;
    steps: RunStep[];
  };
  error?: string;
};

export const KeystoneApp: React.FC = () => {
  const [prompt, setPrompt] = React.useState("");
  const [isPlanning, setIsPlanning] = React.useState(false);
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [plan, setPlan] = React.useState<PlannerResponse["steps"] | null>(null);
  const [run, setRun] = React.useState<ExecuteResponse["run"] | null>(null);

  const handlePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setError(null);
    setPlan(null);
    setRun(null);
    setIsPlanning(true);

    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data: PlannerResponse = await res.json();
      if (!data.ok) {
        throw new Error(data.error || "Planning failed");
      }
      setPlan(data.steps || []);
    } catch (err: any) {
      setError(err?.message || "Unexpected error");
    } finally {
      setIsPlanning(false);
    }
  };

  const handleExecute = async () => {
    if (!plan) return;

    setError(null);
    setIsExecuting(true);

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, steps: plan }),
      });
      const data: ExecuteResponse = await res.json();
      if (!data.ok) {
        throw new Error(data.error || "Execution failed");
      }
      setRun(data.run || null);
    } catch (err: any) {
      setError(err?.message || "Unexpected error");
    } finally {
      setIsExecuting(false);
    }
  };

  const reset = () => {
    setPrompt("");
    setPlan(null);
    setRun(null);
    setError(null);
  };

  const loading = isPlanning || isExecuting;

  const statusVariant = (s: string) => {
    switch (s) {
      case "success": return "bg-green-400/20 text-green-300 border-green-400/30";
      case "confirmed": return "bg-blue-400/20 text-blue-300 border-blue-400/30";
      case "pending": return "bg-amber-400/20 text-amber-300 border-amber-400/30";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const Panel = ({ title, children, className }: { title: string, children: React.ReactNode, className?: string }) => (
    <div className={`bg-background/60 border border-border/80 rounded-lg backdrop-blur-sm ${className}`}>
      <div className="px-4 py-2 border-b border-border/80">
        <h3 className="text-sm font-semibold tracking-wide">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );

  return (
    <div className="min-h-[calc(100dvh-0px)] w-full bg-gradient-to-br from-background via-background to-muted/30 text-sm">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <header className="mb-8 sm:mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">KeyStone Command Layer</h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
            Describe a treasury operation in natural language. We’ll infer a deterministic plan for review, then execute it step-by-step.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8">
          {/* Left Panel: Command Input */}
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-left-4 duration-500">
            <Panel title="1. Command">
              <form onSubmit={handlePlan} className="space-y-4">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Swap 250k USDC to SOL, stake 50% with Marinade, and bridge 10k of the remaining to Arbitrum."
                  className="min-h-32 bg-background/80 border-border/80 focus:ring-ring transition-colors"
                  autoFocus
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground h-4">
                    {error ? <span className="text-destructive">{error}</span> : "Enter your command and generate a plan."}
                  </p>
                  <div className="flex items-center gap-2">
                    {(plan || run) && (
                      <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={loading} className="transition-opacity hover:opacity-80">
                        <ResetIcon className="mr-1.5 h-4 w-4" /> Reset
                      </Button>
                    )}
                    <Button type="submit" disabled={loading || !prompt.trim()} className="transition-opacity hover:opacity-90">
                      {isPlanning ? (
                        <>
                          <LoaderIcon className="mr-1.5 h-4 w-4" /> Planning...
                        </>
                      ) : (
                        <>
                          <PlayIcon className="mr-1.5 h-4 w-4" /> Plan
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Panel>
          </div>

          {/* Right Panel: Plan & Execution */}
          <div className="flex flex-col gap-6 mt-8 lg:mt-0">
            <Panel title="2. Plan">
              <div className="min-h-24 transition-all">
                {isPlanning && <div className="text-muted-foreground text-xs flex items-center animate-in fade-in"><LoaderIcon className="h-4 w-4 mr-2" />Analyzing prompt and generating execution plan...</div>}
                {!isPlanning && !plan && <div className="text-muted-foreground text-xs animate-in fade-in">Awaiting command...</div>}
                {plan && (
                  <div className="space-y-3 animate-in fade-in">
                    <ul className="space-y-2 text-xs">
                      {plan.map((s, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 p-2 rounded-md bg-background/70 border border-border/70 animate-in fade-in slide-in-from-bottom-2"
                          style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'backwards' }}
                        >
                          <div className="font-mono opacity-60 pt-0.5">{String(i + 1).padStart(2, '0')}</div>
                          <div>
                            <div className="font-medium text-foreground">{s.type}</div>
                            <div className="text-muted-foreground">{s.summary}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button variant="default" onClick={handleExecute} disabled={loading || run !== null} className="transition-opacity hover:opacity-90">
                        {isExecuting ? (
                          <>
                            <LoaderIcon className="mr-1.5 h-4 w-4" /> Executing...
                          </>
                        ) : (
                          <>
                            <PlayIcon className="mr-1.5 h-4 w-4" /> Execute Plan
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Panel>

            <Panel title="3. Execution">
              <div className="min-h-24 transition-all">
                {isExecuting && <div className="text-muted-foreground text-xs flex items-center animate-in fade-in"><LoaderIcon className="h-4 w-4 mr-2" />Broadcasting transactions and awaiting confirmation...</div>}
                {!isExecuting && !run && <div className="text-muted-foreground text-xs animate-in fade-in">Awaiting execution...</div>}
                {run && (
                  <div className="space-y-3 animate-in fade-in">
                      <div className="text-xs">
                        <div className="font-medium">{run.summary}</div>
                        <div className="text-muted-foreground">Run ID: <span className="font-mono">{run.id}</span></div>
                      </div>
                      <Separator />
                      <ul className="space-y-2">
                        {run.steps.map((s, i) => (
                          <li
                            key={s.index}
                            className="p-2 rounded-md bg-background/70 border border-border/70 text-xs animate-in fade-in slide-in-from-bottom-2"
                            style={{ animationDelay: `${i * 120}ms`, animationFillMode: 'backwards' }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="font-mono opacity-60">{String(s.index + 1).padStart(2, '0')}</div>
                                <div className="font-medium">{s.title}</div>
                              </div>
                              <Badge variant="outline" className={`text-xs ${statusVariant(s.status)} transition-colors`}>
                                {s.status}
                              </Badge>
                            </div>
                            {s.status !== "pending" && (
                              <div className="mt-2 pl-7 flex items-center gap-4 text-muted-foreground animate-in fade-in">
                                {s.duration != null && <div>Duration: {s.duration}ms</div>}
                                {s.cost != null && <div>Cost: ${s.cost}</div>}
                                {s.txHash && <a href={`https://etherscan.io/tx/${s.txHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-blue-400 hover:underline">{s.txHash.slice(0,12)}...</a>}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                      <Separator />
                      <div className="text-xs text-muted-foreground text-right">
                        Completed at {new Date(run.createdAt).toLocaleString()}
                      </div>
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
};