"use client";

// Feature: commandbar-god-mode
// SigningCard — shown inside a ToolCard when a transaction payload requires wallet approval.
// Covers Requirements 4.5, 4.6, 18.4, 18.6

export interface SigningCardProps {
  toolCallId: string;
  operation: string;
  serializedTransactions: string[];
  signingStatus: "idle" | "signing" | "sent" | "error";
  txSignatures: string[];
  onConfirm: () => void;
}

export function SigningCard({
  operation,
  serializedTransactions,
  signingStatus,
  txSignatures,
  onConfirm,
}: SigningCardProps) {
  const txCount = serializedTransactions.length;
  const txLabel = txCount === 1 ? "1 transaction" : `${txCount} transactions`;

  return (
    <div className="mt-2 rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-2.5">
      {/* Operation info */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-300">{operation}</span>
        <span className="text-xs text-zinc-500">{txLabel}</span>
      </div>

      {/* Idle — show confirm button */}
      {signingStatus === "idle" && (
        <button
          onClick={onConfirm}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
        >
          Confirm &amp; Sign
        </button>
      )}

      {/* Signing — show spinner */}
      {signingStatus === "signing" && (
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-200" />
          <span className="text-xs text-zinc-400">Signing…</span>
        </div>
      )}

      {/* Sent — show success with signatures */}
      {signingStatus === "sent" && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-emerald-400">
            ✓ Transactions sent
          </p>
          {txSignatures.map((sig, i) => (
            <p key={i} className="text-xs text-zinc-400 font-mono">
              {sig.slice(0, 12)}…
            </p>
          ))}
        </div>
      )}

      {/* Error state */}
      {signingStatus === "error" && (
        <p className="text-xs text-red-400">
          ⚠ Signing failed. Please try again.
        </p>
      )}
    </div>
  );
}
