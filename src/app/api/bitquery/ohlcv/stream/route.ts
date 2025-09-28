import { NextRequest } from "next/server";

// Simple SSE stream that emits synthetic OHLCV candles by polling our existing price proxy
// Query: ?symbol=SOL&interval=5s (interval supports: 2s,5s,10s,30s,60s)
export const runtime = "edge";

function parseInterval(ms: string | null): number {
  switch ((ms || "5s").toLowerCase()) {
    case "2s": return 2000;
    case "5s": return 5000;
    case "10s": return 10000;
    case "30s": return 30000;
    case "60s": return 60000;
    default: return 5000;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "SOL").toUpperCase();
  const intervalMs = parseInterval(searchParams.get("interval"));

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function send(data: any) {
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      }

      // Emit hello
      send({ type: "hello", symbol, intervalMs, ts: Date.now() });

      let open = 0, high = 0, low = 0, volume = 0, first = true;

      async function tick() {
        try {
          // Reuse Jupiter price proxy for simplicity (use absolute URL based on current origin)
          const res = await fetch(`${origin}/api/jupiter/price?ids=${symbol}`, { cache: "no-store" });
          const j = await res.json();
          const price: number = j?.data?.[symbol]?.price ?? 0;
          if (!price) {
            send({ type: "warn", msg: "no_price", symbol, ts: Date.now() });
            return;
          }

          if (first) {
            open = high = low = price;
            volume = 0;
            first = false;
          } else {
            high = Math.max(high, price);
            low = Math.min(low, price);
            volume += Math.random() * 10; // synthetic volume placeholder
          }

          const candle = {
            t: Date.now(),
            s: symbol,
            o: open,
            h: high,
            l: low,
            c: price,
            v: Number(volume.toFixed(4)),
            intervalMs,
          };
          send({ type: "candle", candle });
        } catch (e: any) {
          send({ type: "error", message: e?.message || String(e) });
        }
      }

      const id = setInterval(tick, intervalMs);
      // send first immediately
      tick();

      // heartbeat every 20s
      const hb = setInterval(() => {
        send({ type: "ping", ts: Date.now() });
      }, 20000);

      // Cleanup if the client disconnects
      // @ts-ignore
      req.signal?.addEventListener("abort", () => {
        clearInterval(id);
        clearInterval(hb);
        controller.close();
      });
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