/**
 * MCP (Model Context Protocol) Server.
 * Expose Mini-App tools to external MCP clients.
 */

import { useCallback } from "react";
import { getBridge } from "../bridge-context";
import { BridgeMethods } from "../bridge";

export interface MCPTool {
  name: string;
  description: string;
  params?: Record<string, { type: string; description?: string }>;
}

export interface UseMCPServerResult {
  registerTools: (tools: MCPTool[]) => void;
  handleCall: (tool: string, params: Record<string, unknown>) => Promise<unknown>;
}

export function useMCPServer(
  tools: MCPTool[],
  handlers: Record<string, (params: Record<string, unknown>) => Promise<unknown>>
): UseMCPServerResult {
  const registerTools = useCallback(() => {
    getBridge().notify(BridgeMethods.MCP_SERVE, { tools });
  }, [tools]);

  const handleCall = useCallback(
    async (tool: string, params: Record<string, unknown>) => {
      const handler = handlers[tool];
      if (!handler) throw new Error(`Unknown MCP tool: ${tool}`);
      return handler(params);
    },
    [handlers]
  );

  return { registerTools, handleCall };
}
