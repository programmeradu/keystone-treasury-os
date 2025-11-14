"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

interface ApprovalDetails {
  message: string;
  details?: Record<string, any>;
  estimatedFee?: number;
  riskLevel?: "low" | "medium" | "high";
}

interface ApprovalDialogProps {
  isOpen: boolean;
  approval?: {
    id: string;
    message: string;
    details?: Record<string, any>;
    estimatedFee?: number;
    riskLevel?: "low" | "medium" | "high";
  };
  onApprove: (signature: string) => Promise<void>;
  onReject: () => Promise<void>;
  loading?: boolean;
}

const riskLevelColors = {
  low: "bg-green-500/10 border-green-500/30 text-green-300",
  medium: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300",
  high: "bg-red-500/10 border-red-500/30 text-red-300"
};

const riskLevelLabels = {
  low: "Low Risk",
  medium: "Medium Risk",
  high: "High Risk"
};

/**
 * Approval dialog for signature requests
 */
export function ApprovalDialog({
  isOpen,
  approval,
  onApprove,
  onReject,
  loading = false
}: ApprovalDialogProps) {
  const { signMessage } = useWallet();
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !approval) {
    return null;
  }

  const handleApprove = async () => {
    if (!signMessage) {
      setError("Wallet not connected");
      return;
    }

    setApproving(true);
    setError(null);

    try {
      // Create message to sign
      const message = new TextEncoder().encode(approval.message);
      const signature = await signMessage(message);

      // Convert signature to base64
      const signatureBase64 = Buffer.from(signature).toString("base64");

      await onApprove(signatureBase64);
    } catch (err: any) {
      setError(err.message || "Failed to sign transaction");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    setApproving(true);
    try {
      await onReject();
    } catch (err: any) {
      setError(err.message || "Failed to reject");
    } finally {
      setApproving(false);
    }
  };

  const riskColor =
    riskLevelColors[approval.riskLevel || "medium"] ||
    riskLevelColors.medium;
  const riskLabel =
    riskLevelLabels[approval.riskLevel || "medium"] ||
    riskLevelLabels.medium;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-md w-full mx-4 shadow-xl">
        {/* Header */}
        <div className="border-b border-slate-700 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Approve Transaction</h2>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6 max-h-96 overflow-auto">
          {/* Message */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">
              Action
            </h3>
            <div className="bg-slate-800 border border-slate-700 rounded p-4">
              <p className="text-slate-200 text-sm">{approval.message}</p>
            </div>
          </div>

          {/* Risk Level */}
          {approval.riskLevel && (
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">
                Risk Assessment
              </h3>
              <div className={`border rounded p-3 ${riskColor}`}>
                <p className="font-medium">{riskLabel}</p>
              </div>
            </div>
          )}

          {/* Fee Estimate */}
          {approval.estimatedFee !== undefined && (
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">
                Estimated Fee
              </h3>
              <div className="bg-slate-800 border border-slate-700 rounded p-4">
                <p className="text-slate-200 text-sm font-mono">
                  ◎ {approval.estimatedFee.toFixed(6)} SOL
                </p>
              </div>
            </div>
          )}

          {/* Details */}
          {approval.details && Object.keys(approval.details).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">
                Details
              </h3>
              <div className="bg-slate-800 border border-slate-700 rounded p-4 space-y-2 text-sm">
                {Object.entries(approval.details).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-slate-400 capitalize">
                      {key.replace(/_/g, " ")}:
                    </span>
                    <span className="text-slate-200 font-mono">
                      {typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning */}
          {approval.riskLevel === "high" && (
            <div className="bg-red-500/10 border border-red-500/30 rounded p-4">
              <p className="text-red-300 text-sm">
                ⚠️ This transaction carries high risk. Please review carefully
                before approving.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded p-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 px-6 py-4 flex gap-3">
          <button
            onClick={handleReject}
            disabled={approving || loading}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded font-medium transition-colors"
          >
            Reject
          </button>
          <button
            onClick={handleApprove}
            disabled={approving || loading}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded font-medium transition-colors"
          >
            {approving ? "Signing..." : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Approval request item for sidebar/list
 */
export function ApprovalRequestItem({
  approval,
  onApprove,
  onReject,
  loading = false
}: {
  approval: {
    id: string;
    message: string;
    estimatedFee?: number;
    riskLevel?: "low" | "medium" | "high";
  };
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  loading?: boolean;
}) {
  const [approving, setApproving] = useState(false);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await onApprove(approval.id);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    setApproving(true);
    try {
      await onReject(approval.id);
    } finally {
      setApproving(false);
    }
  };

  const riskColor =
    riskLevelColors[approval.riskLevel || "medium"] ||
    riskLevelColors.medium;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
      <div>
        <p className="font-semibold text-white text-sm">{approval.message}</p>
        {approval.estimatedFee !== undefined && (
          <p className="text-xs text-slate-400 mt-1">
            Fee: ◎ {approval.estimatedFee.toFixed(6)} SOL
          </p>
        )}
      </div>

      {approval.riskLevel && (
        <div className={`text-xs py-1 px-2 rounded border ${riskColor} w-fit`}>
          {riskLevelLabels[approval.riskLevel]}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleReject}
          disabled={approving || loading}
          className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm rounded font-medium transition-colors"
        >
          Reject
        </button>
        <button
          onClick={handleApprove}
          disabled={approving || loading}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded font-medium transition-colors"
        >
          {approving ? "..." : "Approve"}
        </button>
      </div>
    </div>
  );
}

export default ApprovalDialog;
