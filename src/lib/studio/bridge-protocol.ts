/**
 * Keystone Virtual Bridge Protocol
 * 
 * JSON-RPC 2.0 over window.postMessage for secure iframe ↔ host communication.
 * Implements crypto nonces for replay attack prevention and strict origin checking.
 * 
 * [GEMINI-3.0] — Virtual Bridge Protocol
 * [OPUS-4.6]   — Bridge Security Hardening
 */

// ─── JSON-RPC 2.0 Types ────────────────────────────────────────────

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params: Record<string, unknown>;
  id: string; // Crypto nonce (UUID v4)
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// ─── Bridge Methods ─────────────────────────────────────────────────

export const BridgeMethods = {
  // Turnkey wallet operations
  TURNKEY_GET_PK: "turnkey.getPublicKey",
  TURNKEY_SIGN: "turnkey.signTransaction",

  // Proxy fetch (KIMI connectivity)
  PROXY_REQUEST: "proxy.fetch",

  // Console forwarding
  CONSOLE_LOG: "console.log",
  CONSOLE_WARN: "console.warn",
  CONSOLE_ERROR: "console.error",

  // Runtime lifecycle
  RUNTIME_READY: "runtime.ready",
  RUNTIME_ERROR: "runtime.error",

  // Event bus
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

export type BridgeMethod = (typeof BridgeMethods)[keyof typeof BridgeMethods];

// ─── Error Codes ────────────────────────────────────────────────────

export const BridgeErrors = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // Custom
  NONCE_REPLAY: -32001,
  ORIGIN_REJECTED: -32002,
  WALLET_NOT_CONNECTED: -32003,
  SIMULATION_FAILED: -32004,
  DOMAIN_BLOCKED: -32005,
  RATE_LIMITED: -32006,
} as const;

// ─── Nonce Tracker ──────────────────────────────────────────────────

class NonceTracker {
  private usedNonces = new Set<string>();
  private maxSize = 10000;

  /**
   * Check if a nonce has been seen before.
   * Returns true if the nonce is fresh (first use).
   * Returns false if it's a replay (already used).
   */
  consume(nonce: string): boolean {
    if (this.usedNonces.has(nonce)) {
      return false; // Replay detected
    }

    this.usedNonces.add(nonce);

    // Evict oldest nonces if set grows too large
    if (this.usedNonces.size > this.maxSize) {
      const iterator = this.usedNonces.values();
      const oldest = iterator.next().value;
      if (oldest) this.usedNonces.delete(oldest);
    }

    return true;
  }

  reset(): void {
    this.usedNonces.clear();
  }
}

// ─── Bridge Handler Type ────────────────────────────────────────────

export type BridgeHandler = (
  params: Record<string, unknown>,
  requestId: string
) => Promise<unknown>;

// ─── Host-Side Bridge Controller ────────────────────────────────────

export class BridgeController {
  private iframeRef: React.RefObject<HTMLIFrameElement | null>;
  private handlers = new Map<string, BridgeHandler>();
  private nonceTracker = new NonceTracker();
  private listener: ((event: MessageEvent) => void) | null = null;

  constructor(iframeRef: React.RefObject<HTMLIFrameElement | null>) {
    this.iframeRef = iframeRef;
  }

  /**
   * Register a handler for a bridge method.
   */
  on(method: string, handler: BridgeHandler): void {
    this.handlers.set(method, handler);
  }

  /**
   * Start listening for bridge messages from the iframe.
   */
  start(): void {
    this.listener = (event: MessageEvent) => {
      this.handleMessage(event);
    };
    window.addEventListener("message", this.listener);
  }

  /**
   * Stop listening and clean up.
   */
  stop(): void {
    if (this.listener) {
      window.removeEventListener("message", this.listener);
      this.listener = null;
    }
    this.nonceTracker.reset();
  }

  /**
   * Send a JSON-RPC response back to the iframe.
   */
  private sendResponse(response: JsonRpcResponse): void {
    const iframe = this.iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(response, "*");
  }

  /**
   * Send an error response.
   */
  private sendError(id: string, code: number, message: string, data?: unknown): void {
    this.sendResponse({
      jsonrpc: "2.0",
      id,
      error: { code, message, data },
    });
  }

  /**
   * Process an incoming message event.
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    // ─── Origin Check ─────────────────────────────────────
    // Verify the message comes from our iframe, not another tab/window
    const iframe = this.iframeRef.current;
    if (!iframe || event.source !== iframe.contentWindow) {
      return; // Silently ignore messages from other sources
    }

    // ─── Parse JSON-RPC Request ───────────────────────────
    const data = event.data;
    if (!data || data.jsonrpc !== "2.0" || !data.method || !data.id) {
      return; // Not a valid JSON-RPC request, ignore
    }

    const request = data as JsonRpcRequest;

    // ─── Nonce Replay Prevention ──────────────────────────
    if (!this.nonceTracker.consume(request.id)) {
      this.sendError(
        request.id,
        BridgeErrors.NONCE_REPLAY,
        "Nonce already used. Possible replay attack."
      );
      return;
    }

    // ─── Dispatch to Handler ──────────────────────────────
    const handler = this.handlers.get(request.method);
    if (!handler) {
      this.sendError(
        request.id,
        BridgeErrors.METHOD_NOT_FOUND,
        `Unknown bridge method: ${request.method}`
      );
      return;
    }

    try {
      const result = await handler(request.params || {}, request.id);
      this.sendResponse({
        jsonrpc: "2.0",
        id: request.id,
        result,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.sendError(
        request.id,
        BridgeErrors.INTERNAL_ERROR,
        message
      );
    }
  }
}

// ─── Iframe-Side Bridge Client (serialized into iframe) ─────────────
// This is a string template that gets injected into the iframe runtime.
// It provides the `keystoneBridge` object that SDK hooks call internally.

export const IFRAME_BRIDGE_CLIENT = `
  const keystoneBridge = {
    _pending: new Map(),

    /**
     * Send a JSON-RPC 2.0 request to the host and await the response.
     */
    call(method, params = {}, timeoutMs = 30000) {
      return new Promise((resolve, reject) => {
        const id = crypto.randomUUID();

        const handler = (event) => {
          const data = event.data;
          if (!data || data.jsonrpc !== '2.0' || data.id !== id) return;
          window.removeEventListener('message', handler);
          clearTimeout(timer);
          this._pending.delete(id);

          if (data.error) {
            reject(new Error(data.error.message || 'Bridge error'));
          } else {
            resolve(data.result);
          }
        };

        window.addEventListener('message', handler);
        this._pending.set(id, handler);

        // Timeout
        const timer = setTimeout(() => {
          window.removeEventListener('message', handler);
          this._pending.delete(id);
          reject(new Error(\`Bridge call "\${method}" timed out (\${timeoutMs}ms)\`));
        }, timeoutMs);

        // Send JSON-RPC request to host
        window.parent.postMessage({
          jsonrpc: '2.0',
          method,
          params,
          id,
        }, '*');
      });
    },

    /**
     * Fire-and-forget notification (no response expected).
     * Still uses JSON-RPC format but caller doesn't wait.
     */
    notify(method, params = {}) {
      const id = crypto.randomUUID();
      window.parent.postMessage({
        jsonrpc: '2.0',
        method,
        params,
        id,
      }, '*');
    },
  };
`;

