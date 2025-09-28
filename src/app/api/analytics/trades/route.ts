import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Convert URLSearchParams to a plain JSON object
function paramsToJson(sp: URLSearchParams): Record<string, any> {
  const obj: Record<string, any> = {};
  sp.forEach((v, k) => {
    // Coerce numeric-looking values, keep others as strings
    const num = Number(v);
    obj[k] = Number.isFinite(num) && v.trim() !== "" ? num : v;
  });
  return obj;
}

// Upstream 0x Trade Analytics endpoint (v2)
const ZEROEX_ANALYTICS_URL = "https://api.0x.org/analytics/trades";

export async function GET(req: NextRequest) {
  const apiKey = process.env.ZERO_EX_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ZERO_EX_API_KEY not set on server" }, { status: 500 });
  }

  // Build body from query params and call 0x with POST (their analytics endpoint may not allow GET)
  const base = `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host") || "localhost:3000"}`;
  const url = new URL(req.url, base);
  const bodyJson = paramsToJson(url.searchParams);

  try {
    const r = await fetch(ZEROEX_ANALYTICS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "0x-api-key": apiKey,
        "0x-version": "v2",
      },
      body: JSON.stringify(bodyJson),
      next: { revalidate: 0 },
    });
    const ct = r.headers.get("content-type") || "";
    const body = ct.includes("application/json") ? await r.json().catch(() => ({})) : await r.text().catch(() => "");
    if (!r.ok) {
      let msg = typeof body === "string" ? body : (body as any)?.error || (body as any)?.message || r.statusText;
      if (typeof msg === "string" && msg.length > 400) msg = msg.slice(0, 400) + "…";
      return NextResponse.json({ error: `0x analytics error ${r.status}: ${msg}` }, { status: 502 });
    }
    return NextResponse.json(body);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to fetch 0x analytics" }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ZERO_EX_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ZERO_EX_API_KEY not set on server" }, { status: 500 });
  }

  // Read JSON body and merge with any existing query params
  let payload: Record<string, any> = {};
  try {
    payload = (await req.json().catch(() => ({}))) || {};
  } catch {}
  const base = `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host") || "localhost:3000"}`;
  const url = new URL(req.url, base);
  const fromQuery = paramsToJson(url.searchParams);
  const bodyJson = { ...fromQuery, ...payload };

  try {
    const r = await fetch(ZEROEX_ANALYTICS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "0x-api-key": apiKey,
        "0x-version": "v2",
      },
      body: JSON.stringify(bodyJson),
      next: { revalidate: 0 },
    });
    const ct = r.headers.get("content-type") || "";
    const body = ct.includes("application/json") ? await r.json().catch(() => ({})) : await r.text().catch(() => "");
    if (!r.ok) {
      let msg = typeof body === "string" ? body : (body as any)?.error || (body as any)?.message || r.statusText;
      if (typeof msg === "string" && msg.length > 400) msg = msg.slice(0, 400) + "…";
      return NextResponse.json({ error: `0x analytics error ${r.status}: ${msg}` }, { status: 502 });
    }
    return NextResponse.json(body);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to fetch 0x analytics" }, { status: 502 });
  }
}