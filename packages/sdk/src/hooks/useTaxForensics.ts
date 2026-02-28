/**
 * Tax Forensics — Real-time tax basis and gain/loss for Solana assets.
 */

import { useState, useEffect, useCallback } from "react";
import { getBridge } from "../bridge-context";
import { BridgeMethods } from "../bridge";

export interface TaxLot {
  mint: string;
  amount: number;
  costBasis: number;
  acquiredAt: string;
}

export interface TaxForensicsResult {
  lots: TaxLot[];
  totalCostBasis: number;
  unrealizedGainLoss: number;
  realizedGainLoss: number;
}

export interface UseTaxForensicsResult {
  result: TaxForensicsResult | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTaxForensics(options?: { since?: Date }): UseTaxForensicsResult {
  const [result, setResult] = useState<TaxForensicsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResult = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bridge = getBridge();
      const data = (await bridge.call(BridgeMethods.TAX_FORENSICS, {
        since: options?.since?.toISOString(),
      })) as TaxForensicsResult;
      setResult(data ?? null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [options?.since?.toISOString()]);

  useEffect(() => {
    fetchResult();
  }, [fetchResult]);

  return { result, loading, error, refetch: fetchResult };
}
