import type { NextRequest } from "next/server";
import WebSocket from "ws";

export const runtime = "nodejs"; // Node runtime required for ws client

// Bitquery GraphQL WS endpoint
const BITQUERY_WS = "wss://streaming.bitquery.io/eap";

// Helper to build GraphQL WS frames (graphql-ws protocol)
const connInit = () => JSON.stringify({ type: "connection_init", payload: {} });
const subscribe = (id: string, query: string, variables?: Record<string, any>) =>
  JSON.stringify({ id, type: "subscribe", payload: { query, variables: variables || {} } });
const ping = () => JSON.stringify({ type: "ping" });

// Default subscription replaced with a valid Bitquery schema (Pump.fun create events via TokenSupplyUpdates)
const DEFAULT_SUB_QUERY = /* GraphQL */ `
subscription PumpfunCreates {
  Solana {
    TokenSupplyUpdates(
      where: {Instruction: {Program: {Address: {is: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"}, Method: {is: "create"}}}}
    ) {
      Block { Time }
      Transaction { Signer }
      TokenSupplyUpdate {
        Amount
        Currency {
          Symbol
          ProgramAddress
          PrimarySaleHappened
          Native
          Name
          MintAddress
          MetadataAddress
          Key
          IsMutable
          Fungible
          EditionNonce
          Decimals
          Wrapped
          VerifiedCollection
          Uri
          UpdateAuthority
          TokenStandard
        }
        PostBalance
      }
    }
  }
}`;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token =
    url.searchParams.get("token") ||
    process.env.BITQUERY_BEARER ||
    process.env.BITQUERY_API_KEY ||
    "";
  if (!token) {
    return new Response(
      JSON.stringify({
        error: "Missing Bitquery token. Provide ?token=... or set BITQUERY_BEARER / BITQUERY_API_KEY in env.",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Allow custom GraphQL subscription via ?q= (base64) or ?query=
  let subQuery = DEFAULT_SUB_QUERY;
  const qB64 = url.searchParams.get("q");
  const qRaw = url.searchParams.get("query");
  try {
    if (qB64) subQuery = atob(qB64);
    else if (qRaw) subQuery = qRaw;
  } catch {}

  // Optional variables via base64 JSON (?vars=)
  let vars: Record<string, any> | undefined = undefined;
  const vB64 = url.searchParams.get("vars");
  if (vB64) {
    try { vars = JSON.parse(atob(vB64)); } catch {}
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      const enqueue = (obj: any) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      const sendEvent = (type: string, payload?: any) => enqueue({ type, ...payload });

      const wsUrl = `${BITQUERY_WS}?token=${encodeURIComponent(token)}`;
      // Use correct GraphQL WS subprotocol per Bitquery docs
      const ws = new WebSocket(wsUrl, "graphql-ws");

      let alive = true;
      let hb: NodeJS.Timeout | null = null;
      let wsPing: NodeJS.Timeout | null = null;

      const closeAll = (reason?: string) => {
        try { if (hb) clearInterval(hb); } catch {}
        try { if (wsPing) clearInterval(wsPing); } catch {}
        try { ws.close(); } catch {}
        try { controller.close(); } catch {}
      };

      ws.on("open", () => {
        sendEvent("hello", { ts: Date.now(), endpoint: BITQUERY_WS });
        ws.send(connInit());
        wsPing = setInterval(() => { try { ws.send(ping()); } catch {} }, 20000);
        ws.send(subscribe("1", subQuery, vars));
        hb = setInterval(() => sendEvent("ping", { ts: Date.now() }), 20000);
      });

      ws.on("message", (raw) => {
        try {
          const text = typeof raw === "string" ? raw : (raw as any)?.toString?.() ?? "";
          const msg = JSON.parse(text);
          // mark alive on any message
          alive = true;
          switch (msg.type) {
            case "connection_ack":
              sendEvent("ready", { ts: Date.now() });
              break;
            case "next":
              // Forward Bitquery payload (minimally normalized)
              enqueue({ type: "data", data: msg.payload?.data, ts: Date.now() });
              break;
            case "error":
              sendEvent("error", { error: msg.payload || msg });
              break;
            case "complete":
              sendEvent("complete");
              closeAll("complete");
              break;
            case "ping":
              try { ws.send(JSON.stringify({ type: "pong" })); } catch {}
              break;
            default:
              enqueue({ type: "frame", msg });
          }
        } catch (e: any) {
          sendEvent("error", { error: e?.message || String(e) });
        }
      });

      ws.on("close", (code, reason) => {
        sendEvent("close", { code, reason: reason.toString() });
        closeAll("ws_close");
      });

      ws.on("error", (err) => {
        sendEvent("error", { error: (err as any)?.message || String(err) });
        closeAll("ws_error");
      });

      // @ts-ignore
      req.signal?.addEventListener("abort", () => closeAll("client_abort"));

      // Liveness guard
      setInterval(() => {
        if (!alive) {
          sendEvent("error", { error: "Upstream silent timeout" });
          closeAll("timeout");
        }
        alive = false;
      }, 90000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}