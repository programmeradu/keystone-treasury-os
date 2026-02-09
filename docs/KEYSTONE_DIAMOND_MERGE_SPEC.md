# Keystone Diamond Merge Master Specification

**Version:** 1.0
**Date:** February 6, 2026
**Architecture:** Diamond Merge (Opus + GPT + Gemini + Kimi)
**Status:** APPROVED FOR IMPLEMENTATION

This document consolidates the four pillars of the Keystone Studio architecture into a single execution plan.

---

# Part 1: Marketplace & App Registry (Opus)

**Role:** System Architect (Opus)
**Subject:** Keystone Marketplace & App Registry Specification
**Architecture:** Hybrid Web2/Web3

## 1. Storage & Distribution Strategy

To balance **Enterprise Performance** (millisecond load times) with **Web3 Sovereignty** (censorship resistance), we will utilize a **Hybrid Storage Model**.

### 1.1 The "Hot" Path (Production)
The definitive source of truth for the *active* Keystone Studio is a **Centralized PostgreSQL Database** (via Supabase/Drizzle).
*   **Reasoning:** "Mini-Apps" are small React components. Storing them as text blobs in SQL allows for instant indexing, search, and retrieval without the latency of IPFS gateways.
*   **Schema (`schema.ts`):**

```typescript
// Drizzle Schema
export const miniApps = pgTable('mini_apps', {
  id: uuid('id').defaultRandom().primaryKey(),
  developerId: text('developer_id').notNull(), // Solana Wallet Address
  name: text('name').notNull(),
  version: text('version').notNull(), // Semantic Versioning (1.0.0)
  
  // The Code
  codeSrc: text('code_src').notNull(), // The raw TSX string
  
  // Marketplace Metadata
  priceUsdc: integer('price_usdc').default(0),
  description: text('description'),
  iconUrl: text('icon_url'),
  category: text('category').enum(['DEFI', 'NFT', 'ANALYTICS', 'SECURITY']),
  
  // Security Flags
  isAudited: boolean('is_audited').default(false),
  auditReportId: text('audit_report_id'), // Link to Scan Report
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const userInstallations = pgTable('user_installations', {
  userId: text('user_id').notNull(), // Wallet Address
  appId: uuid('app_id').references(() => miniApps.id),
  licenseTokenMint: text('license_token_mint'), // On-chain proof of purchase
  installedAt: timestamp('installed_at').defaultNow(),
});
```

### 1.2 The "Cold" Path (Sovereignty)
Every published version is anchored to Arweave via Irys (formerly Bundlr).
*   **Purpose:** If Keystone disappears, the app code survives.
*   **Implementation:** The `auditReportId` in the DB acts as the Arweave TX ID.

## 2. The 80/20 Revenue Split (The Smart Contract)

We reject the "Database Flag" model for payments. Keystone is a crypto-native OS; ownership must be on-chain.

### 2.1 The "KeystoneMarket" Contract
A rigid Program (Anchor) that handles the atomic swap of USDC for a **License NFT**.

*   **Logic:**
    1.  User calls `buyApp(appId, developerWallet)`.
    2.  Program splits payment:
        *   **80%** -> `developerWallet`
        *   **20%** -> `keystoneTreasuryWallet`
    3.  Program Mints a **Soulbound License NFT (SBT)** to the User.
        *   *Metadata:* `{ "appId": "uuid", "access": "lifetime" }`

### 2.2 License Verification
*   **Runtime Check:** When the user opens the app:
    1.  Keystone OS checks: `Does User Wallet hold License NFT for App ID?`
    2.  If YES -> Decrypt/Load code from DB.
    3.  If NO -> Show "Purchase Overlay".
*   **Advantage:** This allows users to carry their tools across different interfaces (if we ever support alternative clients).

## 3. The "Security Scan" Pipeline (Static Analysis)

Before an app is listed in the `mini_apps` table, it must pass the **Gatekeeper Pipeline**. This runs server-side (Next.js Server Action) on publish.

### 3.1 The AST Scanner
We use `swc` or `babel/parser` to generate an Abstract Syntax Tree (AST) of the submitted code and traverse it for forbidden patterns.

**Rule Set 1: The "Instant Rejects"**
*   `eval()` or `new Function()`: **BLOCK**. (Arbitrary code execution).
*   `innerHTML` or `dangerouslySetInnerHTML`: **BLOCK**. (XSS vector).
*   `document.cookie` or `localStorage`: **BLOCK**. (Data exfiltration).
*   `window.solana`: **BLOCK**. (Must use `useTurnkey()` bridge).

**Rule Set 2: The "Proxy Enforcement"**
*   **Pattern:** `fetch('https://evil.com')`
*   **Action:** **BLOCK**.
*   **Requirement:** Developer must use `useFetch()`, which routes through our `/api/proxy` (See Model 4 Spec).

**Rule Set 3: Resource Limits**
*   **Max File Size:** 50KB (Text).
*   **Max Loop Depth:** Heuristic check for infinite loops (limited effectiveness, but catches basic `while(true)`).

## 4. Installation Lifecycle & "The Dock"

### 4.1 "Installing" an App
1.  **Browse:** User clicks "Get" in the Marketplace.
2.  **Purchase:** Wallet Interaction (Sign USDC Transfer).
3.  **Indexing:** Helius Webhook detects the License NFT Mint -> Calls Keystone API -> Adds row to `userInstallations`.
4.  **Sync:** Client polls `useInstallations()` hook.

### 4.2 "The Dock" Persistence
The Dock is the user's taskbar. It must persist across sessions.
*   **Storage:** `localStorage` key `keystone_dock_layout`.
*   **Structure:** `['app-uuid-1', 'app-uuid-2', 'system-app-settings']`.
*   **Loading:**
    *   On Boot: Keystone reads `keystone_dock_layout`.
    *   Fetches metadata for these IDs from `miniApps` table.
    *   Renders icons.
    *   *Lazy Loading:* The actual code (`codeSrc`) is only fetched when the icon is clicked to save bandwidth.

---

# Part 2: Runtime Engine (GPT)

**Role:** Runtime Engineer (GPT-4 Turbo)
**Subject:** Keystone Compiler & Runtime Environment Specification
**Architecture:** Zero-Build (Browser-Native)

## 1. The "Keystone Lockfile" Strategy

To prevent "Dependency Hell" where Mini-Apps break because `framer-motion` updated, we enforce a strict **pinned dependency system**.

### 1.1 The Registry (`keystone.lock.json`)
This file lives in the `src/lib/runtime/` folder and acts as the **Authoritative Import Map**. The Runtime generates the browser's Import Map from this JSON at boot.

```json
{
  "version": "1.0.0",
  "packages": {
    "react": {
      "url": "https://esm.sh/react@19.0.0",
      "types": "https://esm.sh/v135/@types/react@19.0.0/index.d.ts",
      "external": true
    },
    "react-dom": {
      "url": "https://esm.sh/react-dom@19.0.0",
      "types": "https://esm.sh/v135/@types/react-dom@19.0.0/index.d.ts",
      "external": true
    },
    "@keystone-os/sdk": {
      "url": "blob:keystone-sdk", 
      "types": "file:///node_modules/@keystone-os/sdk/index.d.ts",
      "external": false
    },
    "framer-motion": {
      "url": "https://esm.sh/framer-motion@11.5.4?external=react,react-dom",
      "types": "https://esm.sh/v135/framer-motion@11.5.4/dist/index.d.ts"
    },
    "recharts": {
      "url": "https://esm.sh/recharts@2.12.7?external=react,react-dom",
      "types": "https://esm.sh/v135/@types/recharts@1.8.29/index.d.ts"
    },
    "lucide-react": {
      "url": "https://esm.sh/lucide-react@0.400.0?external=react,react-dom",
      "types": "https://esm.sh/v135/lucide-react@0.400.0/dist/lucide-react.d.ts"
    },
    "@solana/web3.js": {
      "url": "https://esm.sh/@solana/web3.js@1.98.0",
      "types": "https://esm.sh/v135/@solana/web3.js@1.98.0/lib/index.d.ts"
    }
  }
}
```

### 1.2 Resolution Logic
When the Runtime boots:
1.  It parses `keystone.lock.json`.
2.  It constructs a valid `<script type="importmap">` string.
3.  It explicitly adds `?external=react,react-dom` to every URL (unless manually specified) to ensure **Singleton React** (crucial for Hooks to work).

## 2. The Compiler Pipeline

We use **Babel Standalone** running in a Web Worker (or Service Worker) to keep the UI thread unblocked.

### 2.1 Babel Configuration
We need a custom preset to strip TypeScript and handle JSX, but *preserve* line numbers so stack traces point to the user's actual code.

```javascript
// src/lib/runtime/compiler.ts

import * as Babel from '@babel/standalone';

export const compileCode = (sourceCode: string): string => {
  try {
    const result = Babel.transform(sourceCode, {
      filename: 'MiniApp.tsx',
      presets: [
        ['react', { runtime: 'automatic' }], // Use React 19 JSX transform
        ['typescript', { isTSX: true, allExtensions: true }]
      ],
      retainLines: true, // CRITICAL: Keeps line numbers 1:1 for debugging
      sourceMaps: 'inline'
    });
    return result.code;
  } catch (error) {
    throw new CompilationError(error.message, error.loc);
  }
};
```

### 2.2 Execution
The compiled code is essentially:
```javascript
import { jsx as _jsx } from "react/jsx-runtime";
export default function App() { ... }
```
This string is injected into the iframe via `URL.createObjectURL(new Blob([code], { type: 'application/javascript' }))` and imported dynamically.

## 3. Language Support (Monaco TS Config)

The editor must scream if the user tries to use a forbidden API or type.

### 3.1 `tsconfig.json` (Virtual)
We inject these compiler options into `monaco.languages.typescript.typescriptDefaults`.

```javascript
{
  "target": "ESNext",
  "module": "ESNext",
  "jsx": "react-jsx",
  "strict": true,
  "moduleResolution": "node",
  "allowSyntheticDefaultImports": true,
  "typeRoots": ["node_modules/@types"],
  // Security: Disallow standard DOM types to discourage direct DOM manipulation
  // We provide a curated 'lib.dom.d.ts' subset instead
  "lib": ["esnext"] 
}
```

### 3.2 Type Injection
We fetch the `.d.ts` URLs from `keystone.lock.json` and inject them into Monaco's virtual filesystem:
`monaco.languages.typescript.typescriptDefaults.addExtraLib(content, 'file:///node_modules/@types/react/index.d.ts');`

## 4. The "Hello World" Template

This is the canonical "Counter App" that demonstrates the Keystone SDK.

```tsx
import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from '@keystone-os/ui'; // Mock UI kit
import { useVault, useTurnkey, VaultAsset } from '@keystone-os/sdk';
import { Zap, ShieldCheck } from 'lucide-react';

export default function TreasuryCounter() {
  // 1. Access Trusted OS Data
  const { totalUsd, assets } = useVault();
  
  // 2. Access Signing Capabilities
  const { signTransaction } = useTurnkey();
  
  const [count, setCount] = useState(0);
  const [topAsset, setTopAsset] = useState<VaultAsset | null>(null);

  useEffect(() => {
    if (assets.length > 0) {
      setTopAsset(assets[0]);
    }
  }, [assets]);

  return (
    <div className="p-4 space-y-4">
      <Card className="bg-slate-900 border-slate-800">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="text-emerald-400" />
            Treasury Guard
          </h1>
          <Badge variant="outline">${totalUsd.toLocaleString()}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800 p-4 rounded-lg">
            <p className="text-slate-400 text-sm">Top Asset</p>
            <p className="text-2xl font-mono text-white">
              {topAsset ? topAsset.symbol : '---'}
            </p>
          </div>
          
          <div className="bg-slate-800 p-4 rounded-lg flex flex-col items-center justify-center">
             <p className="text-slate-400 text-sm mb-2">Approvals</p>
             <div className="flex items-center gap-3">
               <Button onClick={() => setCount(c => c - 1)}>-</Button>
               <span className="text-xl font-bold text-white w-8 text-center">{count}</span>
               <Button onClick={() => setCount(c => c + 1)}>+</Button>
             </div>
          </div>
        </div>

        <Button 
          className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700"
          onClick={() => signTransaction({ type: 'TEST_PING' })}
        >
          <Zap className="w-4 h-4 mr-2" />
          Test Signature Connection
        </Button>
      </Card>
    </div>
  );
}
```

---

# Part 3: The Architect Brain (Gemini)

**Role:** AI Specialist (Gemini)
**Subject:** "The Architect" Agent Specification
**Architecture:** Ouroboros Self-Correction Loop

## 1. The System Prompt (The Constraints)

The Architect is not a general-purpose coder. It is a specialized **Keystone Studio Engineer**. It must strictly adhere to the runtime's limitations.

```text
SYSTEM_PROMPT = """
You are THE ARCHITECT, a specialized AI engineer for the Keystone Treasury OS.
Your goal is to build secure, high-performance "Mini-Apps" that run in a browser sandbox.

### 1. THE RUNTIME ENVIRONMENT (CRITICAL)
- **Framework:** React 19 (Functional Components Only).
- **Language:** TypeScript 5.8 (Strict Mode).
- **Styling:** Tailwind CSS (Standard Utility Classes).
- **Icons:** `lucide-react` (Import as `import { IconName } from 'lucide-react'`).
- **Charts:** `recharts` (ResponsiveContainer, AreaChart, etc.).
- **Animations:** `framer-motion` (motion.div, AnimatePresence).
- **Dates:** `date-fns`.

### 2. THE RESTRICTIONS (DO NOT HALLUCINATE)
- **NO npm installs:** You cannot install new packages. You MUST use only the libraries listed above.
- **NO Node.js APIs:** Do not use `fs`, `path`, `process`, or `crypto`. This runs in the browser.
- **NO External Fetch:** Do not use `fetch()` directly. Use the provided hooks.

### 3. THE KEYSTONE SDK (YOUR SUPERPOWERS)
You have access to `@keystone-os/sdk`.
- `useVault()`: Returns `{ totalUsd: number, assets: Asset[] }`. Use this for treasury data.
- `useTurnkey()`: Returns `{ signTransaction: (payload) => Promise<string> }`.
- `useFetch()`: Returns `{ data, error, isLoading }`. Proxied safe requests.

### 4. CODING STYLE
- Export a single `default function App()`.
- Use `useEffect` sparingly. Prefer derived state.
- Handle all loading/error states gracefully.
- Write "Cyberpunk" UI code: Dark mode, slate-900 backgrounds, emerald-400 accents.

### 5. SELF-CORRECTION
- If you make a mistake, I will feed you the TypeScript error.
- You must acknowledge the error and output ONLY the corrected code block.
"""
```

## 2. The Self-Correction Loop (The Ouroboros)

This is the state machine that ensures the code actually works.

### 2.1 The Cycle
1.  **GENERATION**: The LLM streams the full file to the `Monaco` buffer.
2.  **ANALYSIS**: We wait for the stream to finish + 500ms debounce.
3.  **DIAGNOSTICS**: We query `monaco.editor.getModelMarkers({ owner: 'typescript' })`.
    *   *Filter:* Severity.Error only. Ignore Warnings.
4.  **DECISION**:
    *   If `errors.length === 0`: **SUCCESS**.
    *   If `errors.length > 0`: **REJECT**. Trigger Correction.

### 2.2 The Correction Prompt
When errors are detected, we send a hidden message to the Architect's context window:

```text
[SYSTEM_MESSAGE]
Your code successfully compiled but generated the following TypeScript errors:
1. Line 14: Property 'price' does not exist on type 'Asset'.
2. Line 32: Module 'chart.js' not found.

Please fix these specific errors. Maintain the rest of the logic.
Output the full corrected file.
```

### 2.3 The "Give Up" Threshold
To prevent infinite loops (cost protection):
*   Max Retries: **3**.
*   If still broken after 3 attempts: Stop and show the error to the user with a "Manual Fix Required" toast.

## 3. Streaming UI (The "Ghost" Aesthetic)

We want the user to feel like they are watching a hacker code in real-time.

### 3.1 The Ghost Cursor
Instead of simply appending text, we render a **Block Caret** that moves ahead of the stream.

*   **Implementation:**
    *   CSS Class: `.ghost-cursor { animation: blink 1s step-end infinite; background: #34d399; }`
    *   Logic: The Monaco cursor position is forcibly moved to the end of the stream buffer on every token update.

### 3.2 The Matrix Rain (Thinking State)
When the AI is "Thinking" (waiting for the first token or performing Self-Correction):
*   **Visual:** The empty lines of the editor are overlaid with a faint, falling character canvas (`<canvas id="matrix">`).
*   **Color:** Low-opacity Emerald Green (`rgba(52, 211, 153, 0.1)`).
*   **Trigger:**
    *   `onStreamStart`: Start Animation.
    *   `onFirstToken`: Fade out Animation over 300ms.

---

# Part 4: Connectivity & IO (Kimi)

**Role:** Integrator (Kimi)
**Subject:** External Connectivity & Sandbox IO Specification
**Architecture:** Proxy Gate + Allowlist

## 1. The Proxy Gate (`useFetch`)

Mini-Apps running in a `sandbox="allow-scripts"` iframe usually face strict CORS (Cross-Origin Resource Sharing) blocks. They cannot simply `fetch('https://api.jup.ag/price/v2')` because the Origin is `null` or `about:blank`.

To solve this, we implement a **Sovereign Proxy**.

### 1.1 The SDK Hook
The developer uses `useFetch`, which mimics the standard browser API but routes through the bridge.

```typescript
// @keystone-os/sdk
export function useFetch<T = any>(url: string, options?: RequestInit) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Send Request to Parent via Bridge
        const response = await window.KeystoneBridge.request('PROXY_FETCH', { url, options });
        setData(response.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [url]);

  return { data, error, loading };
}
```

### 1.2 The Next.js Backend Route (`/api/proxy`)
The Parent window forwards the request to our server-side API, which executes the fetch from a Node.js environment (no CORS).

*   **Endpoint:** `POST /api/proxy`
*   **Headers:** `x-keystone-signature` (Verifies the request came from an authenticated user session).
*   **Body:** `{ targetUrl: string, method: string }`

## 2. Allowlist Logic (The Security Fence)

We cannot allow Mini-Apps to call *any* URL (e.g., `attacker.com/steal-keys`). We enforce a **Strict Domain Allowlist**.

### 2.1 The Allowlist Configuration
Stored in `src/lib/security/allowlist.json`.

```json
{
  "allowed_domains": [
    "*.jup.ag",          // Jupiter Aggregator
    "api.helius.xyz",    // Helius RPC
    "api.coingecko.com", // Market Data
    "public-api.birdeye.so",
    "shdw-drive.genesysgo.net"
  ]
}
```

### 2.2 Enforcement Logic
Before the Proxy executes the fetch:
1.  Parse `targetUrl`.
2.  Check Hostname against `allowed_domains` glob patterns.
3.  **Pass:** Execute Request.
4.  **Fail:** Return `403 Forbidden: Domain not in allowlist.`.

### 2.3 User Permission Override (The "Android" Model)
If a developer needs a new domain (e.g., their own backend `api.yield-pro.io`), the Manifest (`mini_app.json`) must declare it.
*   **On Install:** User sees: *"This app needs access to: api.yield-pro.io"*.
*   **Runtime:** The Proxy checks the `user_installations` table to see if the user granted this specific permission.

## 3. External Tools & Widget Integration

Developers often want to embed heavyweight widgets like TradingView or the Jupiter Terminal.

### 3.1 The "Trusted Frame" Strategy
We allow specific `iframe` sources in our Content Security Policy (CSP).

**SDK Component:**
```tsx
// @keystone-os/sdk/components
export const TradingViewWidget = ({ symbol, theme }) => {
  const src = `https://s.tradingview.com/widgetembed/?symbol=${symbol}&theme=${theme}`;
  return (
    <iframe 
      src={src} 
      className="w-full h-[400px] rounded-lg border border-slate-700"
      sandbox="allow-scripts allow-same-origin allow-popups" 
    />
  );
};
```

### 3.2 CSP Configuration
In `src/components/studio/LivePreview.tsx`:

```tsx
const csp = `
  default-src 'self' blob:;
  script-src 'self' 'unsafe-eval' blob: https://esm.sh;
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://esm.sh; 
  frame-src https://s.tradingview.com https://terminal.jup.ag; 
`;

// Inject into iframe head
<meta http-equiv="Content-Security-Policy" content={csp} />
```

This ensures that even if a developer tries to embed a malicious iframe, the browser will block it unless it matches the `frame-src` allowlist (TradingView, Jupiter).
