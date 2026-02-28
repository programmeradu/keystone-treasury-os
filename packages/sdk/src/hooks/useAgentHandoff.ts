/**
 * Federated Handoff Protocol — Multi-Agent Handoff.
 * Triage → Lookup → Builder without losing state or new user handshake.
 */

import { useCallback } from "react";
import { getBridge } from "../bridge-context";
import { BridgeMethods } from "../bridge";
import type { AgentHandoffPayload } from "../types";

export interface UseAgentHandoffResult {
  handoffTo: (toAgent: string, context: Record<string, unknown>) => Promise<unknown>;
}

export function useAgentHandoff(fromAgent: string): UseAgentHandoffResult {
  const handoffTo = useCallback(
    async (toAgent: string, context: Record<string, unknown>) => {
      const bridge = getBridge();
      const payload: AgentHandoffPayload = {
        fromAgent,
        toAgent,
        context,
      };
      return bridge.call(BridgeMethods.AGENT_HANDOFF, payload);
    },
    [fromAgent]
  );

  return { handoffTo };
}
