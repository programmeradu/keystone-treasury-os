// src/hooks/useVault.ts
import { useMemo } from "react";
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
  return useMemo(() => ({ ...DEFAULT_VAULT }), []);
}

// src/hooks/useTurnkey.ts
import { useMemo as useMemo2 } from "react";

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
  return useMemo2(
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
import { useState, useEffect, useCallback } from "react";
function useFetch(url, options = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchData = useCallback(async () => {
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
  useEffect(() => {
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
import { useState as useState2, useCallback as useCallback2 } from "react";
function useEncryptedSecret() {
  const [loading, setLoading] = useState2(false);
  const [error, setError] = useState2(null);
  const encrypt = useCallback2(async (plaintext, keyId) => {
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
  const decrypt = useCallback2(async (ciphertext, keyId) => {
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
import { useState as useState3, useEffect as useEffect2, useCallback as useCallback3 } from "react";
function useACEReport(options) {
  const [report, setReport] = useState3([]);
  const [loading, setLoading] = useState3(true);
  const [error, setError] = useState3(null);
  const fetchReport = useCallback3(async () => {
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
  useEffect2(() => {
    fetchReport();
  }, [fetchReport]);
  return { report, loading, error, refetch: fetchReport };
}

// src/hooks/useAgentHandoff.ts
import { useCallback as useCallback4 } from "react";
function useAgentHandoff(fromAgent) {
  const handoffTo = useCallback4(
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
import { useState as useState4, useCallback as useCallback5 } from "react";
function useMCPClient(serverUrl) {
  const [loading, setLoading] = useState4(false);
  const [error, setError] = useState4(null);
  const call = useCallback5(
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
import { useCallback as useCallback6 } from "react";
function useMCPServer(tools, handlers) {
  const registerTools = useCallback6(() => {
    getBridge().notify(BridgeMethods.MCP_SERVE, { tools });
  }, [tools]);
  const handleCall = useCallback6(
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
import { useState as useState5, useCallback as useCallback7 } from "react";
function useSIWS() {
  const [session, setSession] = useState5(null);
  const signIn = useCallback7(async () => {
    const bridge = getBridge();
    const result = await bridge.call(BridgeMethods.SIWS_SIGN, {});
    if (result?.address) {
      setSession({ address: result.address, chainId: result.chainId });
    }
    return { message: result?.message ?? "", signature: result?.signature ?? "" };
  }, []);
  const verify = useCallback7(async (message, signature) => {
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
import { useState as useState6, useCallback as useCallback8 } from "react";
function useJupiterSwap() {
  const [loading, setLoading] = useState6(false);
  const [error, setError] = useState6(null);
  const getQuote = useCallback8(async (params) => {
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
  const swap = useCallback8(async (params) => {
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
import { useState as useState7, useCallback as useCallback9 } from "react";
function useImpactReport() {
  const [report, setReport] = useState7(null);
  const [loading, setLoading] = useState7(false);
  const [error, setError] = useState7(null);
  const simulate = useCallback9(async (transaction) => {
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
import { useState as useState8, useEffect as useEffect3, useCallback as useCallback10 } from "react";
function useTaxForensics(options) {
  const [result, setResult] = useState8(null);
  const [loading, setLoading] = useState8(true);
  const [error, setError] = useState8(null);
  const fetchResult = useCallback10(async () => {
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
  useEffect3(() => {
    fetchResult();
  }, [fetchResult]);
  return { result, loading, error, refetch: fetchResult };
}

// src/hooks/useYieldOptimizer.ts
import { useState as useState9, useEffect as useEffect4, useCallback as useCallback11 } from "react";
function useYieldOptimizer(asset) {
  const [paths, setPaths] = useState9([]);
  const [loading, setLoading] = useState9(true);
  const [error, setError] = useState9(null);
  const fetchPaths = useCallback11(async () => {
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
  useEffect4(() => {
    fetchPaths();
  }, [fetchPaths]);
  return { paths, loading, error, refetch: fetchPaths };
}

// src/hooks/useGaslessTx.ts
import { useState as useState10, useCallback as useCallback12 } from "react";
function useGaslessTx() {
  const [loading, setLoading] = useState10(false);
  const [error, setError] = useState10(null);
  const submit = useCallback12(async (transaction, description) => {
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

// src/hooks/usePortfolio.ts
import { useMemo as useMemo3 } from "react";

// src/hooks/useTheme.ts
import { useState as useState11, useCallback as useCallback13 } from "react";

// src/hooks/useTokenPrice.ts
import { useState as useState12, useEffect as useEffect5, useCallback as useCallback14 } from "react";

// src/hooks/useNotification.ts
import { useState as useState13, useCallback as useCallback15 } from "react";

// src/hooks/useStorage.ts
import { useState as useState14, useCallback as useCallback16 } from "react";

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
export {
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
};
