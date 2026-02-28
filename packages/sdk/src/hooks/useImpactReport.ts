/**
 * Impact Report — Human-readable Before/After treasury snapshots.
 * Extends Simulation Firewall with verifiable state diff.
 */

import { useState, useCallback } from "react";
import { getBridge } from "../bridge-context";
import { BridgeMethods } from "../bridge";
import type { ImpactReport } from "../types";

export interface UseImpactReportResult {
  report: ImpactReport | null;
  loading: boolean;
  error: string | null;
  simulate: (transaction: unknown) => Promise<ImpactReport>;
}

export function useImpactReport(): UseImpactReportResult {
  const [report, setReport] = useState<ImpactReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulate = useCallback(async (transaction: unknown) => {
    setLoading(true);
    setError(null);
    try {
      const bridge = getBridge();
      const result = (await bridge.call(BridgeMethods.IMPACT_REPORT, {
        transaction,
      })) as ImpactReport;
      setReport(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { report, loading, error, simulate };
}
