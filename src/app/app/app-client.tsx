"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Play, RotateCcw } from "lucide-react";

type RunStep = {
  index: number;
  title: string;
  status: "success" | "confirmed" | "pending" | string;
};

type RunResponse = {
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
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [run, setRun] = React.useState<RunResponse["run"] | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data: RunResponse = await res.json();
      if (!data.ok) {
        throw new Error(data.error || "Execution failed");
      }
      setRun(data.run || null);
    } catch (err: any) {
      setError(err?.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPrompt("");
    setRun(null);
    setError(null);
  };

  const statusVariant = (s: string) => {
    switch (s) {
      case "success":
        return "bg-green-600 text-white";
      case "confirmed":
        return "bg-blue-600 text-white";
      case "pending":
        return "bg-amber-500 text-black";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-[calc(100dvh-0px)] w-full bg-gradient-to-b from-background to-muted/40">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <header className="mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">KeyStone Command Layer</h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground">
            Describe a treasury operation in natural language. We’ll infer a deterministic plan and execute step-by-step.
          </p>
        </header>

        <Card className="atlas-card">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">New Command</CardTitle>
            <CardDescription>Enter what you want to do. Examples: "Swap 250k USDC to SOL and stake 50%" or "Bridge 100 ETH to Arbitrum".</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Distribute 10k USDC across 5 wallets on Solana, then stake the remainder"
                className="min-h-28"
                autoFocus
              />
              {error ? (
                <div className="text-sm text-destructive">{error}</div>
              ) : null}
            </CardContent>
            <CardFooter className="flex items-center gap-2 justify-end">
              {run ? (
                <Button type="button" variant="secondary" onClick={reset} disabled={loading}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset
                </Button>
              ) : null}
              <Button type="submit" disabled={loading || !prompt.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" /> Run
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {run ? (
          <section className="mt-8">
            <Card className="atlas-card">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Run #{run.id}</CardTitle>
                <CardDescription>{run.summary}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {run.steps.map((s) => (
                    <li key={s.index} className="atlas-tile flex items-start justify-between gap-3 p-3">
                      <div className="text-sm sm:text-base font-medium">{s.title}</div>
                      <Badge className={`${statusVariant(s.status)} whitespace-nowrap`}>
                        {s.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
                <Separator className="my-4" />
                <div className="text-xs text-muted-foreground">
                  Created {new Date(run.createdAt).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </section>
        ) : null}
      </div>
    </div>
  );
};