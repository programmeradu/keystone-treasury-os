/**
 * Bridge interface — host injects implementation (postMessage in Studio, mock in tests)
 */

export interface KeystoneBridge {
  call(
    method: string,
    params?: object,
    timeoutMs?: number
  ): Promise<unknown>;
  notify(method: string, params?: object): void;
}

export const BridgeMethods = {
  // Core
  TURNKEY_GET_PK: "turnkey.getPublicKey",
  TURNKEY_SIGN: "turnkey.signTransaction",
  PROXY_REQUEST: "proxy.fetch",
  EVENT_EMIT: "event.emit",
  // Sovereign OS 2026
  LIT_ENCRYPT: "lit.encryptSecret",
  LIT_DECRYPT: "lit.decryptSecret",
  ACE_REPORT: "ace.report",
  ZKSP_VERIFY: "zksp.verify",
  AGENT_HANDOFF: "agent.handoff",
  MCP_CALL: "mcp.call",
  MCP_SERVE: "mcp.serve",
  IMPACT_REPORT: "simulation.impactReport",
  SIWS_SIGN: "siws.sign",
  SIWS_VERIFY: "siws.verify",
  JUPITER_SWAP: "jupiter.swap",
  JUPITER_QUOTE: "jupiter.quote",
  YIELD_OPTIMIZE: "yield.optimize",
  GASLESS_SUBMIT: "gasless.submit",
  BLINK_EXPORT: "blink.export",
  TAX_FORENSICS: "tax.forensics",
} as const;
