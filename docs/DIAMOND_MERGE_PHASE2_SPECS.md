# OPUS Marketplace & App Registry Specification (Keystone Studio)

**Architecture Context:** Diamond Merge
- **Security:** Simulation Firewall + Crypto Nonces + Impact Reports
- **Runtime:** Monaco + Custom Iframe + esm.sh Import Maps (Zero-Build)
- **Protocol:** JSON-RPC 2.0 Bridge

This specification defines how Mini-Apps are **stored, versioned, scanned, distributed, purchased, licensed, and installed**.

---

## 1) Storage & Distribution

### 1.1 Source of Truth (MVP → Scale)
**MVP (recommended): Centralized SQL/SQLite (Drizzle) + content-addressed code blobs**
- **Why:** Fast iteration, easy moderation/takedown, simple queries for catalog/search, and aligns with the existing `mini_apps` table.
- **Integrity:** Every version stores a `codeSha256` so the runtime can verify the fetched code equals what was scanned/purchased.

**Scale upgrade path (optional): Dual storage (SQL metadata + Arweave/IPFS artifacts)**
- Store compiled artifacts and/or raw sources on Arweave/IPFS for immutability.
- Keep **catalog metadata, permissions, scans, and install state** in SQL.

### 1.2 Code Packaging Format
Mini-App code is stored as a **project bundle**:
- `files`: map of file path → `{ content, language }`
- `entry`: typically `App.tsx`
- `lockfile`: `keystone.lock.json` (pinned deps)
- `manifest`: permissions + connectivity allowlist + UI metadata

Canonical JSON structure:
```json
{
  "manifest": {
    "appId": "app_abc123",
    "name": "Yield Heatmap",
    "version": "1.2.0",
    "entry": "App.tsx",
    "permissions": {
      "vaultRead": true,
      "turnkeySign": false,
      "eventBus": ["ON_BLOCK_UPDATE"]
    },
    "connectivity": {
      "allowDomains": ["api.coingecko.com"],
      "allowKeystoneProxy": true
    }
  },
  "files": {
    "App.tsx": { "language": "typescript", "content": "..." }
  },
  "lockfile": { "schema": 1, "deps": {} }
}
```

---

## 2) Marketplace Schema (Versioning + Registry)

### 2.1 Current Schema (Existing)
The repo already defines `mini_apps`, `purchases`, `reviews` in `src/db/schema.ts`.

### 2.2 Required Additions for Versioning + Security
To support immutable version history, security scans per version, and per-user dock installs, add the following tables (names are illustrative; final names should match migrations conventions):

#### `mini_app_versions`
Stores immutable versions (drafts and published releases).
- `id` (pk): `appver_...`
- `appId` (fk → `mini_apps.id`)
- `version` (semver string)
- `bundle` (json): `{ manifest, files, lockfile }`
- `codeSha256` (text)
- `createdAt`
- `createdByWallet`
- `releaseNotes`
- `status`: `DRAFT | SUBMITTED | APPROVED | REJECTED | PUBLISHED | DEPRECATED`

#### `mini_app_security_scans`
- `id` (pk)
- `appVersionId` (fk)
- `scannerVersion` (text)
- `status`: `PASS | FAIL | WARN`
- `report` (json): findings with file/line/rule
- `createdAt`

#### `user_app_installs`
Persists dock state.
- `id` (pk)
- `userWallet` (index)
- `appId` (fk)
- `installedVersion` (semver or appVersionId)
- `dockPinned` (boolean)
- `dockPosition` (int)
- `lastOpenedAt`
- `createdAt`

#### `app_permissions_grants`
Tracks what the user granted at install time (and later updates).
- `id` (pk)
- `userWallet`
- `appId`
- `grants` (json)
- `createdAt`, `updatedAt`

### 2.3 Compatibility with Existing `mini_apps.code`
Short-term:
- keep `mini_apps.code` as “latest draft” for Studio editing.
- on publish, snapshot into `mini_app_versions` and mark it published.

Long-term:
- move all code to `mini_app_versions.bundle`; keep `mini_apps` as the registry root (name, creator, stats, currentPublishedVersion, etc.).

---

## 3) The 80/20 Split (Revenue + Licensing)

### 3.1 MVP Payments (Off-chain verified, on-chain executed)
**Mechanism:** A single Solana transaction that transfers:
- **80%** to creator
- **20%** to Keystone treasury

This is already conceptually implemented in `src/lib/studio/marketplace-payments.ts`.

**Verification:** Keystone records the purchase only after verifying:
- signature exists on-chain
- token mint matches expected (e.g. USDC)
- recipient accounts match creator + treasury
- amount matches `priceUsdc`

### 3.2 Licensing Model
**Recommendation:** Start with **database-backed license** anchored by the on-chain payment signature.
- The `purchases` row is the license.
- The runtime/OS checks purchases for `userWallet + appId`.

**Upgrade Path (portable license token):**
- Mint a non-transferable “License Token” (NFT or SPL token) on purchase.
- Runtime verifies token ownership directly on-chain.

### 3.3 Refunds / Chargebacks
- On-chain transfers are final; refunds are optional and must be tracked explicitly.
- Add `purchaseStatus: ACTIVE | REFUNDED | REVOKED` in `purchases`.

---

## 4) Security Scan Pipeline (Pre-listing Static Analysis)

### 4.1 Pipeline Stages
1. **Bundle normalization**
   - normalize line endings
   - compute `codeSha256`
2. **Static analysis** (AST-based; no regex-only checks)
3. **Policy extraction**
   - detect required permissions (vault read, signing, event subscriptions)
4. **Dependency allowlist validation**
   - validate `keystone.lock.json` only references allowlisted packages
5. **Connectivity allowlist validation**
   - ensure external domains are declared and match policy
6. **Signed scan report**
   - persist in `mini_app_security_scans`
   - mark version `APPROVED` / `REJECTED`

### 4.2 Required Checks (Minimum Set)
Reject if:
- `eval`, `new Function`, dynamic code execution
- `WebAssembly.instantiate` or `instantiateStreaming`
- attempts to access privileged globals:
  - `window.solana`, `window.phantom`, wallet adapters
  - `window.top`, `parent.location`, `document.cookie`
- direct network exfiltration patterns:
  - `fetch("https://...")` to non-allowlisted domains
  - `navigator.sendBeacon` usage
- attempts to bypass proxy gate:
  - raw `XMLHttpRequest`, `WebSocket` to unknown origins
- bridge abuse:
  - `postMessage` not going through Keystone SDK client

Warn (allow with caution + user consent) if:
- high-frequency timers (`setInterval` < 250ms)
- excessive DOM mutation loops
- heavy deps count above thresholds

### 4.3 Scan Output Format
Report records:
- rule id
- severity
- file
- line/column (best effort)
- snippet
- remediation guidance

---

## 5) Installation Lifecycle (Install → Dock → Updates)

### 5.1 Install Flow
1. User clicks **Install** in Marketplace.
2. OS displays:
   - permissions requested
   - connectivity domains
   - price + split disclosure
3. Payment (if paid):
   - user signs purchase tx
   - OS verifies tx on-chain
   - records `purchases`
4. Create `user_app_installs` row.
5. App appears in the user Dock.

### 5.2 Dock Persistence
Dock ordering is **explicitly stored** (not derived).
- `dockPinned`, `dockPosition` used for deterministic ordering.
- `lastOpenedAt` supports “Recent” sorting.

### 5.3 Updates
- Installed apps track `installedVersion`.
- OS can show “Update Available” if `currentPublishedVersion > installedVersion`.
- Updates require:
  - diff of permissions/connectivity
  - re-consent if scope expands

---

## 6) Registry APIs (Suggested)
- `GET /api/marketplace/apps` (published list)
- `GET /api/marketplace/apps/:id` (detail + latest version metadata)
- `POST /api/marketplace/apps/:id/install`
- `POST /api/marketplace/apps/:id/purchase`
- `POST /api/marketplace/apps/:id/publish` (triggers scan pipeline)

All APIs should bind to an authenticated `userWallet` session (do not trust a passed wallet string).


# GPT Compiler & Runtime Environment Specification (Keystone Studio)

**Architecture Context:** Diamond Merge
- **Runtime:** Monaco + Custom Iframe + esm.sh Import Maps (Zero-Build)
- **Security:** Simulation Firewall + Crypto Nonces + Impact Reports
- **Protocol:** JSON-RPC 2.0 Bridge

This document specifies:
- `keystone.lock.json` (dependency pinning)
- the in-browser TypeScript compiler/transpiler pipeline
- Monaco “tsconfig equivalent” strictness
- canonical template code + import conventions

---

## 1) The Keystone Lockfile (`keystone.lock.json`)

### 1.1 Design Goals
- deterministic resolution (no semver ranges at runtime)
- explicit React/ReactDOM pinning
- ability to force peer deps (React 19)
- stable import map generation

### 1.2 File Location
Stored inside the Mini-App bundle (DB `code` JSON) under:
- `files["keystone.lock.json"]` **or** top-level `lockfile` field.

### 1.3 Exact JSON Structure
```json
{
  "schema": 1,
  "generatedAt": 1730000000000,
  "runtime": {
    "react": "19.0.0",
    "reactDom": "19.0.0",
    "jsxRuntime": "react-jsx"
  },
  "resolver": {
    "provider": "esm.sh",
    "baseUrl": "https://esm.sh/",
    "build": "v135",
    "defaultQuery": {
      "bundle": true,
      "dev": true,
      "target": "es2022"
    }
  },
  "deps": {
    "lucide-react": {
      "version": "0.460.0",
      "subpathExports": ["/", "/icons"],
      "query": { "bundle": true }
    },
    "framer-motion": {
      "version": "11.5.4",
      "query": { "bundle": true }
    },
    "recharts": {
      "version": "2.12.7",
      "query": { "bundle": true }
    }
  }
}
```

### 1.4 Resolution Algorithm → Import Map
Given lockfile + detected imports:
1. Pin React/ReactDOM:
   - `react` → `${baseUrl}react@${reactVersion}?dev&target=es2022`
   - `react-dom/client` → `${baseUrl}react-dom@${reactDomVersion}/client?dev&target=es2022`
2. For each dependency `name@version`:
   - build URL:
     - `${baseUrl}${name}@${version}?bundle&dev&target=es2022&deps=react@${reactVersion},react-dom@${reactDomVersion}`
3. For subpaths:
   - import map prefix entries:
     - `"lucide-react/" : "https://esm.sh/lucide-react@0.460.0/"`

### 1.5 Version Clash Rules
- Runtime never resolves ranges; if user types `import x from "recharts"` and lockfile pins `recharts@2.12.7`, that’s used.
- If code imports `recharts@2.13.0` explicitly and lockfile says `2.12.7`, the compiler rewrites to the lockfile unless the user explicitly “unlocks” that package.

---

## 2) Compiler Pipeline (Browser, No Server)

### 2.1 Goals
- Strip TypeScript types in-browser.
- Preserve line numbers sufficiently for debugging.
- Produce ESM output and stable errors.

### 2.2 Compilation Architecture
- **Worker thread:** parse imports, build import map, transpile TSX→JS.
- **Main thread:** update iframe `srcDoc` and stream logs.

### 2.3 Babel Standalone Configuration (Required)
In the iframe (or worker), load:
- `@babel/standalone`
- configure presets:
  - `typescript`
  - `react`

Recommended transform options:
```js
Babel.transform(code, {
  filename: "App.tsx",
  presets: [
    ["typescript", { isTSX: true, allExtensions: true, allowDeclareFields: true }],
    ["react", { runtime: "automatic", development: true }]
  ],
  sourceMaps: "inline",
  retainLines: true
});
```

### 2.4 Line Numbers + Debugging
- `retainLines: true` keeps approximate line mapping.
- `sourceMaps: "inline"` enables runtime stack traces to map back to TSX lines in devtools.
- The runtime console should print:
  - file name
  - line/column
  - the failing import specifier if module load fails

### 2.5 Import Extraction (No Regex)
Replace regex import scanning with a lexer:
- `es-module-lexer` (fast, worker-friendly)

Imports extracted from:
- static imports
- dynamic imports (optional support)
- re-exports

---

## 3) TypeScript Enforcement in Monaco (tsconfig equivalent)

### 3.1 Compiler Options
Monaco should enforce strict TS in-browser.

Recommended `monaco.languages.typescript.typescriptDefaults.setCompilerOptions`:
- `target: ES2022`
- `module: ESNext`
- `moduleResolution: NodeNext`
- `jsx: ReactJSX` (or `ReactJSXDev` in dev)
- `strict: true`
- `noImplicitAny: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- `useDefineForClassFields: true`
- `isolatedModules: true`
- `allowJs: false`
- `skipLibCheck: true` (performance)

### 3.2 Keystone SDK Type Injection
Monaco must receive a virtual lib that declares:
- `declare module "@keystone-os/sdk" { ... }`

Minimum types exposed:
- `useVault()` return shape
- `useTurnkey()` methods
- `AppEventBus.subscribe/emit`
- `useFetch()` (connectivity spec)

This replaces the current `file:///keystone.ts` “any” stubs with authoritative SDK d.ts.

---

## 4) Canonical Import Conventions

### 4.1 Developer Code Imports
**Canonical:**
```ts
import { useVault, useTurnkey, AppEventBus } from "@keystone-os/sdk";
```

### 4.2 Runtime Import Map
In the iframe, import map must map:
- `@keystone-os/sdk` → Blob URL module injected by OS (bridge client)
- `react` and `react-dom/client` → pinned esm.sh URLs

This avoids the current mismatch where:
- the generator uses `./keystone`
- LivePreview rewrites to `keystone-api`

---

## 5) Canonical “Hello World” Template (Counter + Vault + Turnkey)

```tsx
import React from "react";
import { useVault, useTurnkey } from "@keystone-os/sdk";

export default function App() {
  const vault = useVault();
  const turnkey = useTurnkey();
  const [count, setCount] = React.useState(0);
  const [pk, setPk] = React.useState<string | null>(null);

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6">
      <div className="text-emerald-400 text-xs font-bold uppercase tracking-[0.2em]">Keystone Studio</div>
      <h1 className="mt-3 text-xl font-black tracking-tight">Counter App</h1>

      <div className="mt-6 flex items-center gap-3">
        <button
          className="px-3 py-2 rounded bg-zinc-800 border border-zinc-700"
          onClick={() => setCount((c) => c + 1)}
        >
          Increment
        </button>
        <div className="font-mono text-sm">count = {count}</div>
      </div>

      <div className="mt-8">
        <div className="text-xs uppercase tracking-widest text-zinc-400 font-bold">Vault Snapshot</div>
        <pre className="mt-2 text-xs bg-black/40 border border-zinc-800 rounded p-3 overflow-auto">
          {JSON.stringify(vault, null, 2)}
        </pre>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button
          className="px-3 py-2 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
          onClick={async () => {
            const next = await turnkey.getPublicKey();
            setPk(String(next));
          }}
        >
          Get Public Key
        </button>
        {pk && <div className="font-mono text-xs text-zinc-300">{pk}</div>}
      </div>

      <p className="mt-10 text-[10px] text-zinc-500 uppercase tracking-[0.25em] font-bold opacity-60">
        Simulation Firewall enforced in OS for any signing requests.
      </p>
    </div>
  );
}
```

---

## 6) Non-negotiable Runtime Constraints (for Architect + Templates)
- No Node APIs (`fs`, `path`, etc.).
- No direct wallet access (`window.solana`).
- No direct external `fetch()` unless routed through Keystone proxy / SDK.
- All signing requests must provide intent metadata and are subject to simulation + policy.


# GEMINI Architect Brain Specification (AI Agent for Keystone Studio)

**Architecture Context:** Diamond Merge
- **Runtime:** Monaco + Custom Iframe + esm.sh Import Maps (Zero-Build)
- **Security:** Simulation Firewall + Crypto Nonces + Impact Reports
- **Protocol:** JSON-RPC 2.0 Bridge

This specification defines:
- the Architect Agent system prompt
- the self-correction state machine (Monaco markers → patches)
- streaming UX (Ghost Cursor + Matrix Rain)

---

## 1) Architect Agent System Prompt (Exact)

### 1.1 System Prompt
```text
You are the Architect Agent inside Keystone Studio.

You write and repair Mini-App code that runs in a sandboxed browser iframe.

HARD CONSTRAINTS (must obey):
- Browser-only. Do not use Node.js APIs (fs, path, os, net, child_process).
- Do not access window.solana, wallet adapters, private keys, localStorage secrets, cookies, or parent DOM.
- All privileged actions must go through @keystone-os/sdk hooks:
  - useVault() for portfolio/balances
  - useTurnkey() for any signing requests (the OS will simulate and apply policy)
  - AppEventBus for OS events
  - useFetch() for external HTTP (routes through Keystone proxy)
- Do not use eval(), new Function(), or dynamic code execution.
- Do not create your own postMessage bridge. Use the SDK only.

RUNTIME RULES:
- Target runtime is ESM in the browser with import maps. Use ESM imports.
- TypeScript is required. Output TSX for React components.
- Keep the app runnable. Prefer a single entry file App.tsx unless explicitly asked for multi-file.

SECURITY RULE:
- Never instruct the user to “blind sign”. Any signing flow must:
  - include a human-readable intent title/description
  - offer a simulate-only step if the UI is complex

OUTPUT FORMAT (STRICT JSON; no markdown):
Return a single JSON object with:
- plan: short list of steps
- deps: array of required packages (name + pinned version) or empty
- edits: array of edit operations
- tests: steps the user can do in the preview to verify

EDIT OPERATION FORMAT:
Each edit must be one of:
- {"op":"set_file","path":"App.tsx","content":"...full file..."}
- {"op":"replace_range","path":"App.tsx","start":123,"end":456,"content":"..."}
- {"op":"insert","path":"App.tsx","offset":123,"content":"..."}

When fixing errors, prefer replace_range patches over rewriting the entire file.
```

### 1.2 Additional “Context Injection” Fields (from Studio)
The client should supply:
- current project files
- `keystone.lock.json`
- import allowlist constraints
- latest Monaco diagnostics
- last 20 runtime console logs

---

## 2) Self-Correction Loop (State Machine)

### 2.1 Overview
The Architect is not a single call; it’s a bounded convergence loop:
- stream code
- compile
- read Monaco markers
- patch
- re-check
- run preview

### 2.2 State Machine
States (deterministic):
- `IDLE`
- `PLANNING`
- `STREAMING_EDITS`
- `DIAGNOSTICS_CHECK`
- `PATCH_REQUEST`
- `APPLY_PATCH`
- `RUNTIME_CHECK`
- `DONE`
- `FAILED`

Transitions:
1. `IDLE → PLANNING`
   - parse user prompt
   - decide single-file vs multi-file
   - decide deps
2. `PLANNING → STREAMING_EDITS`
   - open SSE stream of edit ops
   - apply ops gradually
3. `STREAMING_EDITS → DIAGNOSTICS_CHECK`
   - debounce 300–500ms after last edit
4. `DIAGNOSTICS_CHECK → PATCH_REQUEST` (if TS errors > 0)
   - select top N markers (N=10)
   - include code context windows (±20 lines)
5. `PATCH_REQUEST → APPLY_PATCH`
   - request patch edits only
6. `APPLY_PATCH → DIAGNOSTICS_CHECK`
   - iterate until TS errors == 0 or maxIters reached
7. `DIAGNOSTICS_CHECK → RUNTIME_CHECK` (if TS errors == 0)
   - reload preview
   - capture runtime errors
8. `RUNTIME_CHECK → PATCH_REQUEST` (if runtime errors)
9. `RUNTIME_CHECK → DONE` (if preview ready)

Bounds:
- `maxFixIterations`: 3 (default) / 7 (advanced)
- if exceeded: `FAILED` with a minimal reproducible error report and a rollback suggestion.

### 2.3 Monaco Marker Extraction (Contract)
Input to AI patch requests:
```json
{
  "markers": [
    {
      "path": "App.tsx",
      "message": "Cannot find module ...",
      "severity": "error",
      "startLineNumber": 12,
      "startColumn": 8,
      "endLineNumber": 12,
      "endColumn": 32,
      "code": "TS2307"
    }
  ],
  "snippets": {
    "App.tsx": "...full text or bounded slices..."
  }
}
```

### 2.4 Patch Safety Rules
Before applying any patch:
- validate it modifies only allowed files
- re-run security scan checks on changed text (no eval, no window.solana, no direct fetch)
- show a visual diff if user is in “Safe Mode”

---

## 3) Streaming UI Specification (Ghost Cursor + Matrix Rain)

### 3.1 Ghost Cursor
Goal: user visually sees the AI “writing into Monaco”.

Implementation:
- Maintain an `architectCursor` state: `{ path, line, column, phase }`.
- When applying streamed edits:
  - compute the end position of the applied text
  - update `architectCursor` to that position
- Render:
  - a translucent caret overlay at the cursor position
  - a subtle trailing highlight for the last edited range

Monaco APIs:
- use decorations (`editor.deltaDecorations`) with a custom CSS class.
- update decorations at 30–60fps max (throttle).

### 3.2 Matrix Rain (Thinking/Planning Visualization)
Goal: make waiting feel intentional and “cyberpunk terminal”.

Behavior:
- When in `PLANNING` or `PATCH_REQUEST`:
  - render a low-opacity animated glyph rain behind the chat panel
  - show token streaming in the assistant bubble with a “beam cursor”

Constraints:
- Must be GPU-cheap:
  - prefer CSS animation + small canvas
  - disable on low-power mode / mobile

### 3.3 “Compilation Pulse” Feedback
Whenever Monaco markers go from >0 to 0:
- flash the minimap glow
- emit a “BUILD: GREEN” toast in the simulation console

---

## 4) Architect Streaming Transport

### 4.1 SSE Event Types
- `plan`
- `deps`
- `edit_op`
- `diagnostics_request`
- `done`
- `error`

### 4.2 Edit Application Semantics
- edits are applied in order
- each edit op includes `opId`
- client acks `opId` to allow backpressure

---

## 5) Security Alignment (Non-negotiable)
- Architect can never generate code that bypasses:
  - Simulation Firewall
  - JSON-RPC bridge
  - Proxy Gate
- If user requests malicious behavior, Architect must refuse and propose safe alternatives.


# KIMI External Connectivity & Sandbox IO Specification (Keystone Studio)

**Architecture Context:** Diamond Merge
- **Runtime:** Monaco + Custom Iframe + esm.sh Import Maps (Zero-Build)
- **Security:** Simulation Firewall + Crypto Nonces + Impact Reports
- **Protocol:** JSON-RPC 2.0 Bridge

This spec defines how Mini-Apps access external HTTP and third-party widgets without becoming exfiltration vectors.

---

## 1) The Proxy Gate

### 1.1 Problem Statement
Mini-Apps are untrusted code.
- Allowing arbitrary `fetch()` lets them:
  - exfiltrate vault data
  - bypass API key controls
  - hit malware/phishing endpoints
  - create legal/compliance issues

Therefore, Mini-Apps **must not fetch the public internet directly**.

### 1.2 Design Principle
All outbound HTTP must route through:
- **Keystone OS** → **Next.js proxy** (`/api/proxy`) → external API

This enables:
- domain allowlisting
- request signing
- API key injection server-side
- rate limiting and audit logs

---

## 2) `useFetch()` Hook (Mini-App API)

### 2.1 Hook Surface
```ts
type KeystoneFetchRequest = {
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
};

type KeystoneFetchResponse<T> = {
  ok: boolean;
  status: number;
  data?: T;
  error?: { code: string; message: string };
};

export function useFetch(): {
  request: <T = unknown>(req: KeystoneFetchRequest) => Promise<KeystoneFetchResponse<T>>;
};
```

### 2.2 Runtime Enforcement
Inside the sandbox iframe runtime bootstrap:
- override `window.fetch` to throw by default (enterprise mode), or
- monkey patch `fetch` to only allow same-origin and Keystone endpoints.

Preferred behavior:
- Disallow external origins entirely.
- Allow only:
  - `https://<keystone-host>/api/proxy`
  - `blob:` and `data:` internal module loads

This makes the hook the “one true path”.

---

## 3) Next.js Proxy Endpoint: `/api/proxy`

### 3.1 Request Format
```json
{
  "appId": "app_abc123",
  "sessionId": "sess_...",
  "nonce": "base64...",
  "request": {
    "url": "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
    "method": "GET",
    "headers": { "accept": "application/json" },
    "body": null
  }
}
```

### 3.2 Validation Rules
- verify JSON-RPC bridge session (appId/sessionId)
- verify `nonce` is unused (replay protection)
- parse URL and check:
  - protocol is `https:`
  - hostname is allowlisted
  - path is allowed if path allowlisting is enabled
- enforce method allowlist
- enforce payload size limits

### 3.3 Response Format
```json
{
  "ok": true,
  "status": 200,
  "data": { "solana": { "usd": 123.45 } }
}
```

### 3.4 Rate Limiting + Audit
- token bucket per `appId` + per `userWallet`
- log:
  - appId, userWallet
  - hostname, path
  - status
  - latency

---

## 4) Allowlist Logic (Prevent Exfiltration)

### 4.1 Where the Allowlist Lives
Per app version (manifest):
```json
{
  "connectivity": {
    "allowDomains": ["api.coingecko.com", "price.jup.ag"],
    "allowPaths": {
      "api.coingecko.com": ["/api/v3/"],
      "price.jup.ag": ["/"]
    }
  }
}
```

### 4.2 Who Controls It
- Developer proposes domains during publish.
- Security scan validates domains.
- User sees requested domains at install/update and must consent.

### 4.3 Enforcement Points (Defense in Depth)
- **Static analysis**: reject code with raw `fetch("https://evil-site.com")` literals.
- **Runtime sandbox**: block external `fetch` and websockets.
- **Proxy**: hard deny any non-allowlisted domain.

### 4.4 Preventing Data Exfiltration
- Proxy strips sensitive headers.
- Proxy disallows:
  - `cookie` forwarding
  - `authorization` unless the domain is Keystone-managed
- Add response size limits to avoid covert channels.

---

## 5) External Tools & Third-Party Widgets in the Iframe

### 5.1 Problem
Third-party widgets (TradingView, Jupiter Terminal) are often:
- script tags requiring broad `script-src`
- cross-origin iframes
- postMessage-heavy

We must integrate them without granting the Mini-App broad scripting/network rights.

### 5.2 `KeystoneEmbed` Component (Recommended)
Expose an SDK component to embed vetted widgets:
```tsx
type KeystoneEmbedProps = {
  kind: "TRADINGVIEW" | "JUPITER_TERMINAL";
  config: Record<string, unknown>;
};
```

Implementation strategy:
- embed widgets as **nested iframes** with:
  - strict sandbox
  - explicit `src` allowlist
- do not allow arbitrary script injection by Mini-App.

### 5.3 TradingView
Preferred:
- use TradingView’s official iframe widget endpoint.
- block arbitrary TradingView script injection.

### 5.4 Jupiter Terminal
Preferred:
- embed as nested iframe (if supported)
- or proxy a vetted bundle hosted by Keystone CDN

### 5.5 postMessage Hygiene
If a widget requires postMessage:
- messages must be scoped to the widget iframe window
- do not forward widget messages to Keystone OS bridge

---

## 6) Relationship to JSON-RPC Bridge
Mini-App calls:
- `useFetch().request(...)`
SDK converts it into a JSON-RPC call:
- method: `keystone.fetch`
- params: request object + nonce
OS handles:
- validates allowlist
- forwards to `/api/proxy`
- returns sanitized response

This keeps all IO inside the same audited bridge surface.
