/**
 * Solana ACE (Access Control Engine) integration.
 * Automated regulatory reporting and audit logging.
 */

import { useState, useEffect, useCallback } from "react";
import { getBridge } from "../bridge-context";
import { BridgeMethods } from "../bridge";

export interface ACEReportEntry {
  timestamp: string;
  action: string;
  actor: string;
  resource: string;
  allowed: boolean;
  policyId?: string;
}

export interface UseACEReportResult {
  report: ACEReportEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useACEReport(options?: { since?: Date }): UseACEReportResult {
  const [report, setReport] = useState<ACEReportEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bridge = getBridge();
      const result = (await bridge.call(BridgeMethods.ACE_REPORT, {
        since: options?.since?.toISOString(),
      })) as ACEReportEntry[];
      setReport(result ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setReport([]);
    } finally {
      setLoading(false);
    }
  }, [options?.since?.toISOString()]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return { report, loading, error, refetch: fetchReport };
}
