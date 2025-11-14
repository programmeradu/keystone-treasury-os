"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Info, Zap } from "lucide-react";
import type { StrategyPlan } from "@/lib/llm/strategy-planner";

interface LLMApprovalDialogProps {
  plan: StrategyPlan;
  isOpen: boolean;
  isLoading?: boolean;
  onApprove: () => void;
  onReject: () => void;
}

/**
 * Displays LLM-generated strategy plan with reasoning, warnings, and approval prompt
 * Bridges LLM planning layer with agent execution layer
 */
export function LLMApprovalDialog({
  plan,
  isOpen,
  isLoading = false,
  onApprove,
  onReject,
}: LLMApprovalDialogProps) {
  if (!isOpen) return null;

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case "high":
        return "border-red-500 bg-red-950";
      case "medium":
        return "border-yellow-500 bg-yellow-950";
      default:
        return "border-blue-500 bg-blue-950";
    }
  };

  const getConfidenceBadge = (confidence?: string) => {
    switch (confidence) {
      case "high":
        return (
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-900 text-emerald-200 text-xs font-semibold">
            <CheckCircle className="w-3 h-3" />
            High Confidence
          </div>
        );
      case "medium":
        return (
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-900 text-yellow-200 text-xs font-semibold">
            <Info className="w-3 h-3" />
            Medium Confidence
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-900 text-blue-200 text-xs font-semibold">
            <Zap className="w-3 h-3" />
            Uncertain
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl border-slate-700 bg-slate-900">
        {/* Header */}
        <CardHeader className="border-b border-slate-700">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <CardTitle className="text-white">Strategy Plan Review</CardTitle>
              <CardDescription className="text-slate-400">
                AI-generated plan ready for approval. Review details before execution.
              </CardDescription>
            </div>
            {getConfidenceBadge(plan.confidence)}
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="space-y-6 pt-6">
          {/* Operation */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-200">Operation</h3>
            <div className="px-4 py-3 rounded bg-slate-800 border border-slate-700">
              <p className="text-white font-medium capitalize">{plan.operation}</p>
            </div>
          </div>

          {/* Reasoning */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-200">AI Reasoning</h3>
            <div className="px-4 py-3 rounded bg-slate-800 border border-slate-700">
              <p className="text-slate-300 text-sm leading-relaxed">{plan.reasoning}</p>
            </div>
          </div>

          {/* Warnings */}
          {plan.warnings && plan.warnings.length > 0 && (
            <div className={`space-y-2 px-4 py-3 rounded border ${getSeverityColor()}`}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <h3 className="text-sm font-semibold">Warnings & Considerations</h3>
              </div>
              <ul className="space-y-1 ml-6 text-sm">
                {plan.warnings.map((warning, idx) => (
                  <li key={idx} className="list-disc text-slate-200">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Estimated Outcome */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-200">Estimated Outcome</h3>
            <div className="px-4 py-3 rounded bg-slate-800 border border-slate-700">
              <p className="text-slate-300 text-sm leading-relaxed">{plan.estimatedOutcome}</p>
            </div>
          </div>

          {/* Parameters Summary (if complex) */}
          {Object.keys(plan.parameters).length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-200">Execution Parameters</h3>
              <div className="px-4 py-3 rounded bg-slate-800 border border-slate-700">
                <dl className="space-y-2 text-sm">
                  {Object.entries(plan.parameters)
                    .slice(0, 5) // Show first 5 parameters
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <dt className="text-slate-400 capitalize">
                          {key.replace(/_/g, " ")}:
                        </dt>
                        <dd className="text-slate-200 font-mono">
                          {typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value)}
                        </dd>
                      </div>
                    ))}
                </dl>
              </div>
            </div>
          )}

          {/* Note about execution */}
          <div className="px-4 py-3 rounded bg-blue-900/30 border border-blue-700/50 text-blue-200 text-xs">
            <p>
              <strong>Next:</strong> Upon approval, deterministic agents will validate and execute this plan.
              All actions will be simulated first to ensure safety.
            </p>
          </div>
        </CardContent>

        {/* Footer with Actions */}
        <div className="border-t border-slate-700 p-6 flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onReject}
            disabled={isLoading}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Reject Plan
          </Button>
          <Button
            onClick={onApprove}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isLoading ? (
              <>
                <div className="animate-spin mr-2 w-4 h-4 border-2 border-emerald-200 border-t-transparent rounded-full" />
                Executing...
              </>
            ) : (
              "Approve & Execute"
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
