/**
 * MCP (Model Context Protocol) Client.
 * Discover and use 5,800+ MCP servers (CRM, Slack, GitHub, etc.).
 */

import { useState, useCallback } from "react";
import { getBridge } from "../bridge-context";
import { BridgeMethods } from "../bridge";

export interface MCPToolCall {
  tool: string;
  params: Record<string, unknown>;
}

export interface UseMCPClientResult {
  call: (tool: string, params?: Record<string, unknown>) => Promise<unknown>;
  loading: boolean;
  error: string | null;
}

export function useMCPClient(serverUrl: string): UseMCPClientResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(
    async (tool: string, params: Record<string, unknown> = {}) => {
      setLoading(true);
      setError(null);
      try {
        const bridge = getBridge();
        return await bridge.call(BridgeMethods.MCP_CALL, {
          serverUrl,
          tool,
          params,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [serverUrl]
  );

  return { call, loading, error };
}
