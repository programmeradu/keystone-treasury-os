import { useState, useEffect, useCallback } from "react";
import { getBridge } from "../bridge-context";
import { BridgeMethods } from "../bridge";
import type { FetchOptions, FetchResult } from "../types";

/**
 * Proxy-gated fetch. Routes through Keystone host — no direct fetch in sandbox.
 */
export function useFetch<T = unknown>(
  url: string,
  options: FetchOptions = {}
): FetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bridge = getBridge();
      const result = (await bridge.call(BridgeMethods.PROXY_REQUEST, {
        url,
        method: options.method ?? "GET",
        headers: options.headers ?? {},
        body: options.body,
        observability: options.observability,
      })) as T;
      setData(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [url, options.method, options.body]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, error, loading, refetch: fetchData };
}
