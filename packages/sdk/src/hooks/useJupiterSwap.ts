/**
 * Jupiter Swap — Deep routing with dynamic fee estimation.
 */

import { useState, useCallback } from "react";
import { getBridge } from "../bridge-context";
import { BridgeMethods } from "../bridge";
import type { JupiterSwapParams, JupiterSwapResult } from "../types";

export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: number;
  routePlan: unknown[];
}

export interface UseJupiterSwapResult {
  swap: (params: JupiterSwapParams) => Promise<JupiterSwapResult>;
  getQuote: (params: JupiterSwapParams) => Promise<JupiterQuote | null>;
  loading: boolean;
  error: string | null;
}

export function useJupiterSwap(): UseJupiterSwapResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getQuote = useCallback(async (params: JupiterSwapParams) => {
    setLoading(true);
    setError(null);
    try {
      const bridge = getBridge();
      const result = (await bridge.call(BridgeMethods.JUPITER_QUOTE, params)) as JupiterQuote | null;
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const swap = useCallback(async (params: JupiterSwapParams) => {
    setLoading(true);
    setError(null);
    try {
      const bridge = getBridge();
      const result = (await bridge.call(BridgeMethods.JUPITER_SWAP, params)) as JupiterSwapResult;
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { swap, getQuote, loading, error };
}
