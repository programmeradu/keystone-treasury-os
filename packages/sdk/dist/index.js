"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AppEventBus: () => AppEventBus,
  BridgeMethods: () => BridgeMethods,
  setBridge: () => setBridge,
  toBlink: () => toBlink,
  useACEReport: () => useACEReport,
  useAgentHandoff: () => useAgentHandoff,
  useEncryptedSecret: () => useEncryptedSecret,
  useFetch: () => useFetch,
  useGaslessTx: () => useGaslessTx,
  useImpactReport: () => useImpactReport,
  useJupiterSwap: () => useJupiterSwap,
  useMCPClient: () => useMCPClient,
  useMCPServer: () => useMCPServer,
  useSIWS: () => useSIWS,
  useTaxForensics: () => useTaxForensics,
  useTurnkey: () => useTurnkey,
  useVault: () => useVault,
  useYieldOptimizer: () => useYieldOptimizer,
  verifyZKSP: () => verifyZKSP
});
module.exports = __toCommonJS(index_exports);

// src/hooks/useVault.ts
var import_react = require("react");
var DEFAULT_VAULT = {
  activeVault: "Main Portfolio",
  balances: { SOL: 124.5, USDC: 5400.2 },
  tokens: [
    { symbol: "SOL", name: "Solana", balance: 124.5, price: 23.4 },
    { symbol: "USDC", name: "USD Coin", balance: 5400.2, price: 1 },
    { symbol: "BONK", name: "Bonk", balance: 15e6, price: 24e-6 },
    { symbol: "JUP", name: "Jupiter", balance: 850, price: 1.12 }
  ]
};
function useVault() {
  return (0, import_react.useMemo)(() => ({ ...DEFAULT_VAULT }), []);
}

// src/hooks/useTurnkey.ts
var import_react2 = require("react");

// src/bridge-context.ts
var bridgeInstance = null;
function setBridge(bridge) {
  bridgeInstance = bridge;
}
function getBridge() {
  if (bridgeInstance) return bridgeInstance;
  const global = typeof globalThis !== "undefined" ? globalThis : window;
  const b = global.keystoneBridge;
  if (!b) {
    throw new Error(
      "[@keystone-os/sdk] No bridge. Call setBridge() or ensure host injects keystoneBridge."
    );
  }
  return b;
}

// src/bridge.ts
var BridgeMethods = {
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
  TAX_FORENSICS: "tax.forensics"
};

// src/hooks/useTurnkey.ts
function useTurnkey() {
  return (0, import_react2.useMemo)(
    () => ({
      getPublicKey: async () => {
        const bridge = getBridge();
        return await bridge.call(BridgeMethods.TURNKEY_GET_PK);
      },
      signTransaction: async (transaction, description) => {
        const bridge = getBridge();
        const result = await bridge.call(BridgeMethods.TURNKEY_SIGN, {
          transaction,
          description: description ?? "Sign transaction"
        });
        return result;
      }
    }),
    []
  );
}

// src/hooks/useFetch.ts
var import_react3 = require("react");
function useFetch(url, options = {}) {
  const [data, setData] = (0, import_react3.useState)(null);
  const [error, setError] = (0, import_react3.useState)(null);
  const [loading, setLoading] = (0, import_react3.useState)(true);
  const fetchData = (0, import_react3.useCallback)(async () => {
    setLoading(true);
    setError(null);
    try {
      const bridge = getBridge();
      const result = await bridge.call(BridgeMethods.PROXY_REQUEST, {
        url,
        method: options.method ?? "GET",
        headers: options.headers ?? {},
        body: options.body,
        observability: options.observability
      });
      setData(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [url, options.method, options.body]);
  (0, import_react3.useEffect)(() => {
    fetchData();
  }, [fetchData]);
  return { data, error, loading, refetch: fetchData };
}

// src/hooks/AppEventBus.ts
var AppEventBus = {
  emit: (type, payload) => {
    getBridge().notify(BridgeMethods.EVENT_EMIT, { type, payload });
  }
};

// src/hooks/useEncryptedSecret.ts
var import_react4 = require("react");
function useEncryptedSecret() {
  const [loading, setLoading] = (0, import_react4.useState)(false);
  const [error, setError] = (0, import_react4.useState)(null);
  const encrypt = (0, import_react4.useCallback)(async (plaintext, keyId) => {
    setLoading(true);
    setError(null);
    try {
      const bridge = getBridge();
      const result = await bridge.call(BridgeMethods.LIT_ENCRYPT, {
        plaintext,
        keyId: keyId ?? "default"
      });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  const decrypt = (0, import_react4.useCallback)(async (ciphertext, keyId) => {
    setLoading(true);
    setError(null);
    try {
      const bridge = getBridge();
      const result = await bridge.call(BridgeMethods.LIT_DECRYPT, {
        ciphertext,
        keyId: keyId ?? "default"
      });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  return { encrypt, decrypt, loading, error };
}

// src/hooks/useACEReport.ts
var import_react5 = require("react");
function useACEReport(options) {
  const [report, setReport] = (0, import_react5.useState)([]);
  const [loading, setLoading] = (0, import_react5.useState)(true);
  const [error, setError] = (0, import_react5.useState)(null);
  const fetchReport = (0, import_react5.useCallback)(async () => {
    setLoading(true);
    setError(null);
    try {
      const bridge = getBridge();
      const result = await bridge.call(BridgeMethods.ACE_REPORT, {
        since: options?.since?.toISOString()
      });
      setReport(result ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setReport([]);
    } finally {
      setLoading(false);
    }
  }, [options?.since?.toISOString()]);
  (0, import_react5.useEffect)(() => {
    fetchReport();
  }, [fetchReport]);
  return { report, loading, error, refetch: fetchReport };
}

// src/hooks/useAgentHandoff.ts
var import_react6 = require("react");
function useAgentHandoff(fromAgent) {
  const handoffTo = (0, import_react6.useCallback)(
    async (toAgent, context) => {
      const bridge = getBridge();
      const payload = {
        fromAgent,
        toAgent,
        context
      };
      return bridge.call(BridgeMethods.AGENT_HANDOFF, payload);
    },
    [fromAgent]
  );
  return { handoffTo };
}

// src/hooks/useMCPClient.ts
var import_react7 = require("react");
function useMCPClient(serverUrl) {
  const [loading, setLoading] = (0, import_react7.useState)(false);
  const [error, setError] = (0, import_react7.useState)(null);
  const call = (0, import_react7.useCallback)(
    async (tool, params = {}) => {
      setLoading(true);
      setError(null);
      try {
        const bridge = getBridge();
        return await bridge.call(BridgeMethods.MCP_CALL, {
          serverUrl,
          tool,
          params
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

// src/hooks/useMCPServer.ts
var import_react8 = require("react");
function useMCPServer(tools, handlers) {
  const registerTools = (0, import_react8.useCallback)(() => {
    getBridge().notify(BridgeMethods.MCP_SERVE, { tools });
  }, [tools]);
  const handleCall = (0, import_react8.useCallback)(
    async (tool, params) => {
      const handler = handlers[tool];
      if (!handler) throw new Error(`Unknown MCP tool: ${tool}`);
      return handler(params);
    },
    [handlers]
  );
  return { registerTools, handleCall };
}

// src/hooks/useSIWS.ts
var import_react9 = require("react");
function useSIWS() {
  const [session, setSession] = (0, import_react9.useState)(null);
  const signIn = (0, import_react9.useCallback)(async () => {
    const bridge = getBridge();
    const result = await bridge.call(BridgeMethods.SIWS_SIGN, {});
    if (result?.address) {
      setSession({ address: result.address, chainId: result.chainId });
    }
    return { message: result?.message ?? "", signature: result?.signature ?? "" };
  }, []);
  const verify = (0, import_react9.useCallback)(async (message, signature) => {
    const bridge = getBridge();
    const result = await bridge.call(BridgeMethods.SIWS_VERIFY, {
      message,
      signature
    });
    return result ?? false;
  }, []);
  return { signIn, verify, session };
}

// src/hooks/useJupiterSwap.ts
var import_react10 = require("react");
function useJupiterSwap() {
  const [loading, setLoading] = (0, import_react10.useState)(false);
  const [error, setError] = (0, import_react10.useState)(null);
  const getQuote = (0, import_react10.useCallback)(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const bridge = getBridge();
      const result = await bridge.call(BridgeMethods.JUPITER_QUOTE, params);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  const swap = (0, import_react10.useCallback)(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const bridge = getBridge();
      const result = await bridge.call(BridgeMethods.JUPITER_SWAP, params);
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

// src/hooks/useImpactReport.ts
var import_react11 = require("react");
function useImpactReport() {
  const [report, setReport] = (0, import_react11.useState)(null);
  const [loading, setLoading] = (0, import_react11.useState)(false);
  const [error, setError] = (0, import_react11.useState)(null);
  const simulate = (0, import_react11.useCallback)(async (transaction) => {
    setLoading(true);
    setError(null);
    try {
      const bridge = getBridge();
      const result = await bridge.call(BridgeMethods.IMPACT_REPORT, {
        transaction
      });
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

// src/hooks/useTaxForensics.ts
var import_react12 = require("react");
function useTaxForensics(options) {
  const [result, setResult] = (0, import_react12.useState)(null);
  const [loading, setLoading] = (0, import_react12.useState)(true);
  const [error, setError] = (0, import_react12.useState)(null);
  const fetchResult = (0, import_react12.useCallback)(async () => {
    setLoading(true);
    setError(null);
    try {
      const bridge = getBridge();
      const data = await bridge.call(BridgeMethods.TAX_FORENSICS, {
        since: options?.since?.toISOString()
      });
      setResult(data ?? null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [options?.since?.toISOString()]);
  (0, import_react12.useEffect)(() => {
    fetchResult();
  }, [fetchResult]);
  return { result, loading, error, refetch: fetchResult };
}

// src/hooks/useYieldOptimizer.ts
var import_react13 = require("react");
function useYieldOptimizer(asset) {
  const [paths, setPaths] = (0, import_react13.useState)([]);
  const [loading, setLoading] = (0, import_react13.useState)(true);
  const [error, setError] = (0, import_react13.useState)(null);
  const fetchPaths = (0, import_react13.useCallback)(async () => {
    setLoading(true);
    setError(null);
    try {
      const bridge = getBridge();
      const result = await bridge.call(BridgeMethods.YIELD_OPTIMIZE, {
        asset
      });
      setPaths(result ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setPaths([]);
    } finally {
      setLoading(false);
    }
  }, [asset]);
  (0, import_react13.useEffect)(() => {
    fetchPaths();
  }, [fetchPaths]);
  return { paths, loading, error, refetch: fetchPaths };
}

// src/hooks/useGaslessTx.ts
var import_react14 = require("react");
function useGaslessTx() {
  const [loading, setLoading] = (0, import_react14.useState)(false);
  const [error, setError] = (0, import_react14.useState)(null);
  const submit = (0, import_react14.useCallback)(async (transaction, description) => {
    setLoading(true);
    setError(null);
    try {
      const bridge = getBridge();
      const result = await bridge.call(BridgeMethods.GASLESS_SUBMIT, {
        transaction,
        description: description ?? "Gasless transaction"
      });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  return { submit, loading, error };
}

// src/utils/toBlink.ts
async function toBlink(action) {
  const bridge = getBridge();
  const result = await bridge.call(BridgeMethods.BLINK_EXPORT, {
    label: action.label,
    payload: action.payload,
    type: action.type ?? "custom"
  });
  return result;
}

// src/utils/zksp.ts
async function verifyZKSP(params) {
  try {
    const bridge = getBridge();
    const result = await bridge.call(BridgeMethods.ZKSP_VERIFY, params);
    return result ?? { verified: false };
  } catch {
    return { verified: false };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AppEventBus,
  BridgeMethods,
  setBridge,
  toBlink,
  useACEReport,
  useAgentHandoff,
  useEncryptedSecret,
  useFetch,
  useGaslessTx,
  useImpactReport,
  useJupiterSwap,
  useMCPClient,
  useMCPServer,
  useSIWS,
  useTaxForensics,
  useTurnkey,
  useVault,
  useYieldOptimizer,
  verifyZKSP
});
