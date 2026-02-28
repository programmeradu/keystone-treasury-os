/**
 * Institutional Earn Stack — Jito MEV + Kamino yield optimization.
 * Risk-scored deployment paths.
 */

import { useState, useEffect, useCallback } from "react";
import { getBridge } from "../bridge-context";
import { BridgeMethods } from "../bridge";
import type { YieldPath } from "../types";

export interface UseYieldOptimizerResult {
  paths: YieldPath[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useYieldOptimizer(asset: string): UseYieldOptimizerResult {
  const [paths, setPaths] = useState<YieldPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPaths = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bridge = getBridge();
      const result = (await bridge.call(BridgeMethods.YIELD_OPTIMIZE, {
        asset,
      })) as YieldPath[];
      setPaths(result ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setPaths([]);
    } finally {
      setLoading(false);
    }
  }, [asset]);

  useEffect(() => {
    fetchPaths();
  }, [fetchPaths]);

  return { paths, loading, error, refetch: fetchPaths };
}
