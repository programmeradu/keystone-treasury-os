"use client";

// Feature: commandbar-god-mode
// ToolCard — renders a single tool invocation part in the CommandBar chat thread.
// Covers Requirements 3.3, 3.4, 3.5, 18.6

import React from "react";
import { TOOL_META } from "@/lib/commandbar/tool-meta";
import { useCommandBarSigningStore } from "@/lib/stores/commandbar-signing-store";
import { SigningCard } from "@/components/commandbar/SigningCard";
import { ForesightChart, type ForesightChartProps } from "@/components/commandbar/ForesightChart";

export interface ToolCardProps {
  toolName: string;
  toolCallId: string;
  input: Record<string, unknown>;
  state: "partial-call" | "call" | "output-available";
  output?: Record<string, unknown>;
  onSign: (toolCallId: string, serialized: string[], operation: string) => void;
}

export function ToolCard({
  toolName,
  toolCallId,
  state,
  output,
  onSign,
}: ToolCardProps) {
  const meta = TOOL_META[toolName] ?? {
    label: toolName,
    color: "text-zinc-400",
    icon: "🔧",
  };

  const { signingToolId, signingStatus, txSignatures } =
    useCommandBarSigningStore();

  const isLoading = state === "partial-call" || state === "call";
  const isDone = state === "output-available";
  const success = isDone ? (output?.success as boolean | undefined) : undefined;

  // Result summary text
  const resultSummary =
    isDone && success
      ? ((output?.message ?? output?.operation ?? "") as string)
      : undefined;

  const errorMessage =
    isDone && success === false
      ? ((output?.error ?? output?.message ?? "An error occurred.") as string)
      : undefined;

  // Signing fields
  const requiresApproval = isDone && output?.requiresApproval === true;
  const serializedTransactions: string[] = (() => {
    if (!requiresApproval) return [];
    if (Array.isArray(output?.serializedTransactions))
      return output.serializedTransactions as string[];
    if (typeof output?.serializedTransaction === "string")
      return [output.serializedTransaction as string];
    return [];
  })();

  // Foresight visualization
  const triggerVisualization = isDone && output?.triggerVisualization === true;
  const chartType = (output?.chartType as ForesightChartProps["chartType"]) ?? "depletion_node";
  const monthlyProjection = Array.isArray(output?.monthlyProjection)
    ? (output.monthlyProjection as Array<Record<string, number>>)
    : [];

  const operation = (output?.operation ?? toolName) as string;

  return (
    <div className="my-1.5 rounded-xl border border-zinc-700/60 bg-zinc-900/70 px-3 py-2.5 text-sm">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-base leading-none">{meta.icon}</span>
        <span className={`text-xs font-semibold ${meta.color}`}>
          {meta.label}
        </span>
        <span className="text-xs text-zinc-400 truncate">{toolName}</span>

        {/* Status indicator — right side */}
        <div className="ml-auto flex items-center gap-1.5">
          {isLoading && (
            <>
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
              <span className="text-xs text-zinc-500">Executing…</span>
            </>
          )}
          {isDone && success === true && (
            <span className="text-emerald-400 text-sm">✓</span>
          )}
          {isDone && success === false && (
            <span className="text-red-400 text-sm">⚠</span>
          )}
        </div>
      </div>

      {/* Result body */}
      {isDone && success === true && resultSummary && (
        <p className="mt-1.5 text-xs text-zinc-300 leading-relaxed">
          {resultSummary}
        </p>
      )}

      {isDone && success === false && errorMessage && (
        <p className="mt-1.5 text-xs text-red-400 leading-relaxed">
          {errorMessage}
        </p>
      )}

      {/* Signing card */}
      {requiresApproval && serializedTransactions.length > 0 && (
        <SigningCard
          toolCallId={toolCallId}
          operation={operation}
          serializedTransactions={serializedTransactions}
          signingStatus={signingToolId === toolCallId ? signingStatus : "idle"}
          txSignatures={signingToolId === toolCallId ? txSignatures : []}
          onConfirm={() => onSign(toolCallId, serializedTransactions, operation)}
        />
      )}

      {/* Foresight chart */}
      {triggerVisualization && (
        <ForesightChart
          chartType={chartType}
          monthlyProjection={monthlyProjection}
          result={output ?? {}}
        />
      )}
    </div>
  );
}


