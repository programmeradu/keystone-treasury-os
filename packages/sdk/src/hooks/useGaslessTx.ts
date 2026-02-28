/**
 * Gasless Transaction Hub — Treasury centralizes fee management.
 * Sub-wallets/DAO members don't need SOL for approved tasks.
 */

import { useState, useCallback } from "react";
import { getBridge } from "../bridge-context";
import { BridgeMethods } from "../bridge";

export interface UseGaslessTxResult {
  submit: (transaction: unknown, description?: string) => Promise<{ signature: string }>;
  loading: boolean;
  error: string | null;
}

export function useGaslessTx(): UseGaslessTxResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (transaction: unknown, description?: string) => {
    setLoading(true);
    setError(null);
    try {
      const bridge = getBridge();
      const result = (await bridge.call(BridgeMethods.GASLESS_SUBMIT, {
        transaction,
        description: description ?? "Gasless transaction",
      })) as { signature: string };
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { submit, loading, error };
}
