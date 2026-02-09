# Keystone SDK & Plugin Framework — Technical Design Document

**Version:** 1.0  
**Author:** Solutions Architect  
**Date:** January 2026  
**Status:** PROPOSAL  
**Stack:** Next.js 15 · React 19 · TypeScript 5.8 · Monaco Editor · Turnkey · Squads v4  

---

## Executive Summary

This document specifies the complete design for `@keystone-os/sdk` — the developer toolkit that powers Mini-Apps inside the Keystone Treasury Operating System. It covers four pillars:

1. **The Protocol** — A typed, secure `postMessage` bridge between sandboxed iframes and the Keystone host.
2. **The Security Model** — A Simulation Firewall that makes "Blind Signing" physically impossible.
3. **The Developer Experience** — Zero-config React hooks with full IntelliSense, live preview, and a "Hello World" in 12 lines of code.
4. **The Business Logic** — An on-chain revenue split enforced at the SDK level via `<KeystoneGate>`.

---

## Table of Contents

- [Phase 1: The Protocol Spec](#phase-1-the-protocol-spec)
  - [1.1 Bridge Message Schema](#11-bridge-message-schema)
  - [1.2 SDK Exports & TypeScript Interfaces](#12-sdk-exports--typescript-interfaces)
  - [1.3 The Capability Manifest](#13-the-capability-manifest)
- [Phase 2: The Security Model](#phase-2-the-security-model)
  - [2.1 Sandbox Hardening](#21-sandbox-hardening)
  - [2.2 The Simulation Firewall Flow](#22-the-simulation-firewall-flow)
  - [2.3 Origin Validation & Message Authentication](#23-origin-validation--message-authentication)
  - [2.4 Resource Governance](#24-resource-governance)
- [Phase 3: The Developer Experience](#phase-3-the-developer-experience)
  - [3.1 Hello World Mini-App](#31-hello-world-mini-app)
  - [3.2 Runtime Environment & Live Preview](#32-runtime-environment--live-preview)
  - [3.3 Monaco IntelliSense Injection](#33-monaco-intellisense-injection)
  - [3.4 Local Development & Testing](#34-local-development--testing)
- [Phase 4: Implementation Steps](#phase-4-implementation-steps)
  - [4.1 Sprint 1: Bridge Protocol (Week 1-2)](#41-sprint-1-bridge-protocol-week-1-2)
  - [4.2 Sprint 2: SDK Hooks (Week 3-4)](#42-sprint-2-sdk-hooks-week-3-4)
  - [4.3 Sprint 3: Security & Simulation (Week 5-6)](#43-sprint-3-security--simulation-week-5-6)
  - [4.4 Sprint 4: Revenue & Marketplace (Week 7-8)](#44-sprint-4-revenue--marketplace-week-7-8)
- [Appendix A: Revenue & Licensing](#appendix-a-revenue--licensing)
- [Appendix B: Scalability Architecture](#appendix-b-scalability-architecture)

---

<a name="phase-1-the-protocol-spec"></a>
## Phase 1: The Protocol Spec

### 1.1 Bridge Message Schema

Every message crossing the iframe boundary follows a single envelope type. Messages are authenticated with a per-session HMAC nonce to prevent replay attacks and rogue iframes from injecting commands.

```typescript
// ─── Bridge Envelope ────────────────────────────────────────────────
/**
 * Every postMessage crossing the iframe ↔ host boundary is wrapped
 * in this envelope. The `nonce` field prevents replay attacks;
 * the `appId` scopes permissions to the registered Mini-App.
 */
interface BridgeMessage<T extends BridgeMessageType = BridgeMessageType> {
  /** Discriminated union tag */
  type: T;
  /** Unique per-request ID for correlating request → response */
  id: string;
  /** The registered Mini-App ID (from Marketplace listing) */
  appId: string;
  /** Monotonically increasing counter; host rejects out-of-order messages */
  nonce: number;
  /** HMAC-SHA256(nonce + appId + type, sessionSecret) */
  hmac: string;
  /** ISO-8601 timestamp; host rejects messages older than 30s */
  timestamp: string;
  /** Type-specific payload */
  payload: BridgePayloadMap[T];
}

// ─── Message Types (Discriminated Union) ────────────────────────────
type BridgeMessageType =
  // Lifecycle
  | 'HANDSHAKE_INIT'          // iframe → host: SDK boot
  | 'HANDSHAKE_ACK'           // host → iframe: session secret + capabilities
  // Vault (Read-Only)
  | 'VAULT_GET_BALANCES'      // iframe → host
  | 'VAULT_BALANCES_RESPONSE' // host → iframe
  | 'VAULT_SUBSCRIBE'         // iframe → host: real-time balance stream
  | 'VAULT_UPDATE'            // host → iframe: pushed balance delta
  // Turnkey (Write — requires simulation)
  | 'TURNKEY_SIGN'            // iframe → host: sign request
  | 'TURNKEY_SIGN_RESPONSE'   // host → iframe: signature or rejection
  | 'TURNKEY_GET_PK'          // iframe → host: request public key
  | 'TURNKEY_PK_RESPONSE'     // host → iframe
  // Event Bus
  | 'EVENT_SUBSCRIBE'         // iframe → host: subscribe to OS events
  | 'EVENT_UNSUBSCRIBE'       // iframe → host
  | 'EVENT_DISPATCH'          // host → iframe: pushed event
  // Simulation (Innovation: exposed to devs for "dry run" UX)
  | 'SIMULATE_TX'             // iframe → host
  | 'SIMULATE_TX_RESPONSE'    // host → iframe
  // Revenue Gate
  | 'LICENSE_CHECK'            // iframe → host
  | 'LICENSE_CHECK_RESPONSE'   // host → iframe
  // Console (debugging)
  | 'CONSOLE_LOG'             // iframe → host
  | 'ERROR_REPORT';           // iframe → host

// ─── Payload Map ────────────────────────────────────────────────────
interface BridgePayloadMap {
  HANDSHAKE_INIT: {
    sdkVersion: string;
    requestedCapabilities: Capability[];
  };
  HANDSHAKE_ACK: {
    sessionSecret: string;     // Ephemeral HMAC key (generated per mount)
    grantedCapabilities: Capability[];
    vaultAddress: string;
    networkCluster: 'mainnet-beta' | 'devnet';
  };
  VAULT_GET_BALANCES: {};
  VAULT_BALANCES_RESPONSE: {
    tokens: TokenBalance[];
    totalValueUsd: number;
    lastUpdated: string;
  };
  VAULT_SUBSCRIBE: { interval?: number };
  VAULT_UPDATE: { tokens: TokenBalance[]; totalValueUsd: number };
  TURNKEY_SIGN: {
    /** Base64-encoded serialized VersionedTransaction */
    serializedTx: string;
    /** Human-readable description shown in approval modal */
    description: string;
    /** Optional: skip simulation (host can override to false) */
    skipSimulation?: boolean;
  };
  TURNKEY_SIGN_RESPONSE: {
    signature?: string;
    error?: string;
    simulationResult?: SimulationSummary;
  };
  TURNKEY_GET_PK: {};
  TURNKEY_PK_RESPONSE: { publicKey: string };
  EVENT_SUBSCRIBE: { events: OSEventType[] };
  EVENT_UNSUBSCRIBE: { events: OSEventType[] };
  EVENT_DISPATCH: { event: OSEventType; data: unknown };
  SIMULATE_TX: { serializedTx: string };
  SIMULATE_TX_RESPONSE: {
    success: boolean;
    logs: string[];
    unitsConsumed: number;
    error?: string;
    balanceChanges: BalanceChange[];
  };
  LICENSE_CHECK: { productId: string };
  LICENSE_CHECK_RESPONSE: {
    licensed: boolean;
    expiresAt?: string;
    tier?: 'free' | 'pro' | 'institutional';
  };
  CONSOLE_LOG: { level: 'info' | 'warn' | 'error'; message: string };
  ERROR_REPORT: { message: string; stack?: string; line?: number; col?: number };
}

// ─── Supporting Types ───────────────────────────────────────────────
type Capability =
  | 'vault:read'
  | 'vault:subscribe'
  | 'turnkey:sign'
  | 'turnkey:pk'
  | 'events:subscribe'
  | 'simulate:tx'
  | 'license:check';

type OSEventType =
  | 'ON_BLOCK_UPDATE'
  | 'ON_PRICE_CHANGE'
  | 'ON_VAULT_REBALANCE'
  | 'ON_PROPOSAL_CREATED'
  | 'ON_PROPOSAL_EXECUTED'
  | 'ON_SIGNER_ONLINE'
  | 'ON_AGENT_LOG';

interface TokenBalance {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  priceUsd: number;
  valueUsd: number;
  change24h: number;
  logoUri?: string;
}

interface SimulationSummary {
  success: boolean;
  estimatedFeeSol: number;
  balanceChanges: BalanceChange[];
  logs: string[];
  warningFlags: string[];
}

interface BalanceChange {
  mint: string;
  symbol: string;
  before: number;
  after: number;
  delta: number;
  deltaUsd: number;
}
```

### 1.2 SDK Exports & TypeScript Interfaces

The `@keystone-os/sdk` package exposes the following public API to Mini-App developers:

```typescript
// ─── @keystone-os/sdk ───────────────────────────────────────────────

// === React Hooks ===
export function useVault(): UseVaultReturn;
export function useTurnkey(): UseTurnkeyReturn;
export function useKeystoneEvents(
  events: OSEventType[],
  handler: (event: OSEventType, data: unknown) => void
): void;
export function useSimulate(): UseSimulateReturn;

// === Components ===
export function KeystoneGate(props: KeystoneGateProps): JSX.Element;
export function KeystoneProvider(props: { children: React.ReactNode }): JSX.Element;

// === Utilities ===
export const AppEventBus: EventBusAPI;
export function formatSol(lamports: number): string;
export function formatUsd(value: number): string;

// ─── Hook Return Types ──────────────────────────────────────────────

interface UseVaultReturn {
  /** Current vault address */
  address: string | null;
  /** All token balances, enriched with metadata + pricing */
  tokens: TokenBalance[];
  /** Total vault value in USD */
  totalValueUsd: number;
  /** Weighted 24h portfolio change */
  change24h: number;
  /** True while initial fetch is in-flight */
  loading: boolean;
  /** Subscribe to real-time vault updates (returns unsubscribe fn) */
  subscribe: (interval?: number) => () => void;
  /** Force-refresh vault data */
  refresh: () => Promise<void>;
}

interface UseTurnkeyReturn {
  /** The vault's public key */
  publicKey: string | null;
  /** Request transaction signing (triggers Simulation Firewall) */
  signTransaction: (
    tx: SerializedTransaction,
    description: string
  ) => Promise<SignResult>;
  /** Check if the wallet is connected and ready */
  connected: boolean;
}

interface SerializedTransaction {
  /** Base64-encoded VersionedTransaction bytes */
  data: string;
  /** Optional metadata for the approval modal */
  metadata?: {
    protocol?: string;
    action?: string;
    estimatedValue?: number;
  };
}

interface SignResult {
  /** The on-chain transaction signature (base58) */
  signature: string;
  /** Full simulation results shown to user before signing */
  simulation: SimulationSummary;
}

interface UseSimulateReturn {
  /** Simulate a transaction without signing — "dry run" */
  simulate: (serializedTx: string) => Promise<SimulationSummary>;
  /** True while a simulation is in-flight */
  simulating: boolean;
}

interface EventBusAPI {
  /** Emit an event within the Mini-App (local, does not cross bridge) */
  emit: (type: string, payload?: unknown) => void;
  /** Subscribe to events from the OS (crosses bridge) */
  subscribe: (
    events: OSEventType[],
    handler: (event: OSEventType, data: unknown) => void
  ) => () => void;
}

interface KeystoneGateProps {
  /** The Marketplace product ID to check the license for */
  productId: string;
  /** Shown while the license check is in-flight */
  fallback?: React.ReactNode;
  /** Shown if the user does not own a license */
  lockedContent?: React.ReactNode;
  /** The gated content */
  children: React.ReactNode;
}
```

### 1.3 The Capability Manifest

Every Mini-App declares a `keystone.manifest.json` at its project root. The host reads this during the `HANDSHAKE_INIT` phase and grants only the requested capabilities. If a Mini-App requests `turnkey:sign` but was not approved for it in the Marketplace audit, the host denies the capability and the SDK hook throws a clear `CapabilityDeniedError`.

```json
{
  "$schema": "https://sdk.keystone.so/manifest/v1.json",
  "name": "Solana Token Sniper",
  "version": "1.0.0",
  "productId": "sniper-bot-001",
  "author": "0xDev.sol",
  "capabilities": ["vault:read", "turnkey:sign", "events:subscribe"],
  "permissions": {
    "maxTransactionValueSol": 50,
    "allowedPrograms": [
      "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
      "RaydiumV4...programId"
    ],
    "allowedInstructions": ["swap", "addLiquidity"]
  },
  "pricing": {
    "model": "one-time",
    "priceUsdc": 50,
    "revenueSplit": { "developer": 80, "protocol": 20 }
  }
}
```

**Innovation: Program Allowlists.** The manifest's `allowedPrograms` array is enforced by the Simulation Firewall. If a Mini-App constructs a transaction that invokes a program NOT in its allowlist, the simulation step rejects it before the user ever sees an approval modal. This is the "Programmatic Seatbelt" — each Mini-App can only touch what it declared.

---

<a name="phase-2-the-security-model"></a>
## Phase 2: The Security Model

### 2.1 Sandbox Hardening

**Current vulnerability identified:** The existing `LivePreview.tsx` uses:
```html
sandbox="allow-scripts allow-popups allow-pointer-lock allow-same-origin allow-forms"
```

**`allow-same-origin` is dangerous.** It lets the iframe access the parent's cookies, localStorage, and potentially `window.parent` references. We must remove it.

#### Hardened Sandbox Policy

```html
<iframe
  srcDoc={iframeContent}
  sandbox="allow-scripts"
  referrerpolicy="no-referrer"
  csp="default-src 'self' https://esm.sh https://cdn.tailwindcss.com;
       script-src 'self' 'unsafe-inline' 'unsafe-eval' https://esm.sh https://unpkg.com;
       connect-src https://esm.sh;
       style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com;
       img-src * data: blob:;
       frame-src 'none';"
  title="Mini-App Preview"
/>
```

**Key changes:**
- **Removed `allow-same-origin`**: The iframe is now fully cross-origin isolated. It cannot access `window.parent.document`, `localStorage`, `cookies`, or `indexedDB` of the host.
- **Removed `allow-popups`**: Mini-Apps cannot open new windows (prevents phishing overlays).
- **Added CSP header**: Restricts network access to `esm.sh` only. The Mini-App cannot make arbitrary HTTP requests to drain APIs or exfiltrate data.
- **Removed `allow-forms`**: Prevents hidden form submissions.

**Consequence:** Because `allow-same-origin` is removed, `window.parent.postMessage` still works (it's cross-origin safe), but direct DOM access to the parent is blocked by the browser's Same-Origin Policy. The only communication channel is our typed Bridge Protocol.

### 2.2 The Simulation Firewall Flow

This is the critical security path. When a Mini-App calls `useTurnkey().signTransaction()`, the following sequence executes:

```
┌──────────────────────────────────────────────────────────────────────┐
│                    SIMULATION FIREWALL SEQUENCE                      │
│                                                                      │
│  Mini-App (iframe)              Host (Keystone OS)                   │
│  ─────────────────              ────────────────────                  │
│                                                                      │
│  1. Developer calls:                                                 │
│     useTurnkey().signTransaction(tx, "Swap 10 SOL → USDC")          │
│         │                                                            │
│         ▼                                                            │
│  2. SDK serializes tx to base64                                      │
│     SDK increments nonce, computes HMAC                              │
│     SDK posts: { type: 'TURNKEY_SIGN', payload: { serializedTx } }  │
│         │                                                            │
│         ════════════ postMessage boundary ════════════                │
│         │                                                            │
│         ▼                                                            │
│  3. HOST: BridgeController receives message                          │
│     ├─ Verify HMAC(nonce + appId + type, sessionSecret)              │
│     ├─ Verify nonce > lastSeenNonce (anti-replay)                    │
│     ├─ Verify timestamp within 30s window                            │
│     └─ Verify appId matches registered iframe origin                 │
│         │                                                            │
│         ▼                                                            │
│  4. HOST: PermissionGate                                             │
│     ├─ Check: Does this appId have 'turnkey:sign' capability?        │
│     └─ Check: Is the tx size within resource limits?                 │
│         │                                                            │
│         ▼                                                            │
│  5. HOST: TransactionInspector                                       │
│     ├─ Deserialize the VersionedTransaction                          │
│     ├─ Extract all program IDs invoked                               │
│     ├─ CHECK: Are ALL programs in the manifest's allowedPrograms?    │
│     │   └─ If NO → REJECT with "Unauthorized program invocation"     │
│     ├─ Extract transfer amounts                                      │
│     └─ CHECK: Is total value ≤ manifest's maxTransactionValueSol?    │
│         │   └─ If NO → REJECT with "Exceeds value limit"            │
│         ▼                                                            │
│  6. HOST: SimulationFirewall (TransactionAgent.simulateTransaction)   │
│     ├─ Fork mainnet state via Connection.simulateTransaction()       │
│     ├─ Parse simulation logs                                         │
│     ├─ Compute balance deltas (before/after for all touched accounts)│
│     ├─ CHECK: Did simulation succeed?                                │
│     │   └─ If NO → REJECT with simulation error details              │
│     ├─ Compute estimated fee in SOL                                  │
│     └─ Generate human-readable SimulationSummary                     │
│         │                                                            │
│         ▼                                                            │
│  7. HOST: ApprovalModal (React component in parent window)           │
│     ├─ Display: "Solana Token Sniper wants to:"                      │
│     ├─ Display: "Swap 10 SOL → USDC via Jupiter"                    │
│     ├─ Display: Balance changes table:                               │
│     │   ┌──────────┬──────────┬──────────┬──────────┐                │
│     │   │  Token   │  Before  │  After   │  Delta   │                │
│     │   ├──────────┼──────────┼──────────┼──────────┤                │
│     │   │  SOL     │  124.50  │  114.50  │  -10.00  │                │
│     │   │  USDC    │  5400.20 │  5634.70 │ +234.50  │                │
│     │   └──────────┴──────────┴──────────┴──────────┘                │
│     ├─ Display: Fee: 0.000025 SOL                                    │
│     ├─ Display: [Approve] [Reject]                                   │
│     └─ Heuristic: If value > 10 SOL, show ⚠️ HIGH VALUE warning     │
│         │                                                            │
│         ▼                                                            │
│  8. HOST: User clicks [Approve]                                      │
│     ├─ Wallet Adapter signs the VersionedTransaction                 │
│     ├─ Transaction broadcast to Solana                               │
│     └─ Await confirmation                                            │
│         │                                                            │
│         ════════════ postMessage boundary ════════════                │
│         │                                                            │
│         ▼                                                            │
│  9. SDK resolves the Promise with { signature, simulation }          │
│     Developer receives the result.                                   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Why "Blind Signing" is impossible:**
- Step 5 inspects the raw transaction instructions — the user sees WHAT programs are called.
- Step 6 simulates — the user sees the EXACT balance impact before signing.
- Step 7 renders a human-readable diff — never a hex string.
- The Mini-App cannot skip steps 5-7. The `skipSimulation` flag in the payload is **always overridden to `false`** by the host for non-audited apps.

### 2.3 Origin Validation & Message Authentication

```typescript
// ─── BridgeController (Host-Side) ──────────────────────────────────

class BridgeController {
  private sessions = new Map<string, BridgeSession>();

  /**
   * Called when a Mini-App iframe mounts.
   * Generates an ephemeral HMAC secret unique to this session.
   */
  registerApp(appId: string, iframeElement: HTMLIFrameElement): BridgeSession {
    const sessionSecret = crypto.getRandomValues(new Uint8Array(32));
    const session: BridgeSession = {
      appId,
      iframeRef: iframeElement,
      sessionSecret: bufferToHex(sessionSecret),
      lastNonce: 0,
      grantedCapabilities: [],
      createdAt: Date.now(),
    };
    this.sessions.set(appId, session);
    return session;
  }

  /**
   * Validate every incoming postMessage.
   * Returns null if validation fails (message is silently dropped).
   */
  validateMessage(event: MessageEvent): BridgeMessage | null {
    const msg = event.data as BridgeMessage;

    // 1. Structural validation
    if (!msg?.type || !msg?.id || !msg?.appId || !msg?.hmac) return null;

    // 2. Session lookup
    const session = this.sessions.get(msg.appId);
    if (!session) return null;

    // 3. Source verification: ensure message comes from the correct iframe
    if (event.source !== session.iframeRef.contentWindow) return null;

    // 4. Timestamp freshness (reject messages older than 30 seconds)
    const age = Date.now() - new Date(msg.timestamp).getTime();
    if (age > 30_000 || age < -5_000) return null;

    // 5. Nonce ordering (anti-replay)
    if (msg.nonce <= session.lastNonce) return null;
    session.lastNonce = msg.nonce;

    // 6. HMAC verification
    const expectedHmac = computeHmac(
      `${msg.nonce}:${msg.appId}:${msg.type}`,
      session.sessionSecret
    );
    if (msg.hmac !== expectedHmac) return null;

    // 7. Capability check
    const requiredCapability = MESSAGE_CAPABILITY_MAP[msg.type];
    if (requiredCapability && !session.grantedCapabilities.includes(requiredCapability)) {
      this.sendError(session, msg.id, `Capability denied: ${requiredCapability}`);
      return null;
    }

    return msg;
  }
}
```

### 2.4 Resource Governance

To handle **50+ active Mini-Apps** without degrading the main dashboard:

| Resource           | Limit per Mini-App         | Enforcement              |
|--------------------|---------------------------|--------------------------|
| Bridge messages    | 60/minute                 | Token bucket in BridgeController |
| Simulation requests| 5/minute                  | Rate limiter on SIMULATE_TX |
| Sign requests      | 10/minute                 | Rate limiter on TURNKEY_SIGN |
| Event subscriptions| 10 concurrent topics      | Cap in EVENT_SUBSCRIBE handler |
| iframe memory      | 128MB (Chrome default)    | Browser-enforced per-origin |
| CPU time           | Idle iframes frozen after 30s of no interaction | IntersectionObserver-based visibility tracking |

**Innovation: Lazy Iframe Hydration.** Mini-Apps not currently visible in the viewport are "frozen" — their iframes are replaced with a static screenshot thumbnail. When the user scrolls them into view, the iframe is re-hydrated from cached `srcDoc`. This keeps memory usage O(visible) rather than O(total).

```typescript
// Host-side: Visibility-based lifecycle management
function useMiniAppLifecycle(appId: string, containerRef: RefObject<HTMLDivElement>) {
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsHydrated(entry.isIntersecting),
      { rootMargin: '200px' } // Pre-hydrate 200px before visible
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return isHydrated;
}
```

---

<a name="phase-3-the-developer-experience"></a>
## Phase 3: The Developer Experience

### 3.1 Hello World Mini-App

This is what a developer writes to build a working Mini-App that reads vault data and triggers a swap:

```tsx
// App.tsx — A "Hello World" Keystone Mini-App (12 lines of real logic)
import React, { useState } from 'react';
import { useVault, useTurnkey, KeystoneGate } from '@keystone-os/sdk';

export default function App() {
  const { tokens, totalValueUsd, loading } = useVault();
  const { signTransaction, connected } = useTurnkey();
  const [status, setStatus] = useState('idle');

  const handleSwap = async () => {
    setStatus('signing...');
    try {
      // The SDK handles simulation + approval modal automatically.
      // The developer NEVER builds raw transactions — they describe intent.
      const result = await signTransaction(
        { data: buildSwapTx(10, 'SOL', 'USDC') },
        'Swap 10 SOL to USDC via Jupiter'
      );
      setStatus(`✓ Confirmed: ${result.signature.slice(0, 8)}...`);
    } catch (err) {
      setStatus(`✗ ${err.message}`);
    }
  };

  if (loading) return <div className="p-8 text-zinc-500">Loading vault...</div>;

  return (
    <KeystoneGate productId="hello-world-001" lockedContent={<LockedBanner />}>
      <div className="p-8 max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-white">
          Treasury: <span className="text-emerald-400">${totalValueUsd.toLocaleString()}</span>
        </h1>

        <div className="space-y-2">
          {tokens.map(t => (
            <div key={t.mint} className="flex justify-between text-sm text-zinc-300">
              <span>{t.symbol}</span>
              <span>{t.balance.toFixed(2)} (${t.valueUsd.toFixed(2)})</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleSwap}
          disabled={!connected}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors"
        >
          Swap 10 SOL → USDC
        </button>

        <p className="text-xs text-zinc-600 text-center">{status}</p>
      </div>
    </KeystoneGate>
  );
}

function LockedBanner() {
  return (
    <div className="p-8 text-center text-zinc-500">
      <p className="text-lg font-bold">🔒 Purchase Required</p>
      <p className="text-sm mt-2">This Mini-App requires a license. Visit the Marketplace.</p>
    </div>
  );
}
```

**DX highlights:**
- **Zero boilerplate**: No wallet adapter setup, no RPC configuration, no Solana imports.
- **Intent-driven signing**: The developer says "Swap 10 SOL" — the host handles simulation, approval modal, and signing.
- **Revenue gating is 1 component**: Wrap content in `<KeystoneGate>` — done.
- **Full type safety**: Every hook return type is inferred. Hover over `tokens` and see `TokenBalance[]`.

### 3.2 Runtime Environment & Live Preview

#### ESM Module Resolution via Import Maps

The Live Preview engine uses a **two-phase module resolution strategy**:

**Phase 1: Static Import Map (injected into iframe `<head>`):**
```html
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@19.0.0?dev",
    "react/jsx-runtime": "https://esm.sh/react@19.0.0/jsx-runtime?dev",
    "react-dom/client": "https://esm.sh/react-dom@19.0.0/client?dev",
    "@keystone-os/sdk": "blob:keystone-sdk-virtual-module",
    "lucide-react": "https://esm.sh/lucide-react@0.512.0?bundle",
    "recharts": "https://esm.sh/recharts@2.15.0?bundle&external=react",
    "framer-motion": "https://esm.sh/framer-motion@11.5.4?bundle&external=react"
  }
}
</script>
```

**Phase 2: Dynamic Dependency Discovery:**
Before Babel transpilation, we regex-scan the user's code for bare specifier imports that aren't in the static map. Any unknown package `foo` is mapped to `https://esm.sh/foo?bundle&external=react`. This means developers can `import confetti from 'canvas-confetti'` and it "just works" — no `npm install` required.

```typescript
// Host-side: buildImportMap()
function buildImportMap(userCode: string): Record<string, string> {
  const staticMap: Record<string, string> = {
    'react': 'https://esm.sh/react@19.0.0?dev',
    'react/jsx-runtime': 'https://esm.sh/react@19.0.0/jsx-runtime?dev',
    'react-dom/client': 'https://esm.sh/react-dom@19.0.0/client?dev',
    '@keystone-os/sdk': '', // Will be blob URL
  };

  // Discover dynamic imports
  const importRegex = /from\s+['"]([^.'\/][^'"]*)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(userCode)) !== null) {
    const pkg = match[1];
    if (!staticMap[pkg]) {
      staticMap[pkg] = `https://esm.sh/${pkg}?bundle&external=react`;
    }
  }

  return staticMap;
}
```

#### Babel Transpilation Pipeline

```
User Code (TSX)
    │
    ▼
┌─────────────────────────────────┐
│ @babel/standalone (in-iframe)   │
│ Presets: ['react', 'typescript']│
│ Target: { esmodules: true }     │
│ Plugins: [                      │
│   'transform-typescript',       │
│   'transform-react-jsx'         │ → JSX to React.createElement
│ ]                               │
└─────────────────────────────────┘
    │
    ▼
Transpiled JS (ES Modules)
    │
    ▼
Blob URL → dynamic import()
    │
    ▼
React 19 createRoot().render()
```

**Innovation: Hot Module Boundary Detection.** Instead of full-reloading the iframe on every keystroke, we hash the transpiled output. If the hash matches the previous render, we skip the reload. If only the component body changed (not imports), we use React's `root.render()` to hot-swap just the component tree — preserving state. This gives sub-100ms feedback loops.

```typescript
// In the iframe runtime:
let lastCodeHash = '';
let root: ReactDOM.Root | null = null;

async function renderApp(transpiledCode: string) {
  const hash = await sha256(transpiledCode);
  if (hash === lastCodeHash) return; // No-op: code unchanged
  lastCodeHash = hash;

  const blob = new Blob([transpiledCode], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const module = await import(url);
  URL.revokeObjectURL(url);

  const App = module.default;
  if (!root) {
    root = ReactDOM.createRoot(document.getElementById('root')!);
  }
  // Re-render without destroying root → preserves React state
  root.render(React.createElement(App));
}
```

### 3.3 Monaco IntelliSense Injection

The current `CodeEditor.tsx` injects minimal stubs. We replace this with a comprehensive type definition file that gives developers full autocomplete for the entire SDK.

```typescript
// Host-side: Injected into Monaco on editor mount
const KEYSTONE_SDK_TYPES = `
declare module '@keystone-os/sdk' {
  // ═══ Hooks ═══════════════════════════════════════════════════════
  
  /**
   * Access the connected vault's balances, metadata, and real-time updates.
   * Automatically refreshes when the OS detects on-chain changes.
   *
   * @example
   * const { tokens, totalValueUsd } = useVault();
   * console.log(\`Treasury: $\${totalValueUsd}\`);
   */
  export function useVault(): {
    address: string | null;
    tokens: TokenBalance[];
    totalValueUsd: number;
    change24h: number;
    loading: boolean;
    subscribe: (interval?: number) => () => void;
    refresh: () => Promise<void>;
  };

  /**
   * Request transaction signing via the Keystone Policy Engine.
   * Every transaction is simulated before the user sees the approval modal.
   * "Blind Signing" is impossible — the user always sees balance diffs.
   *
   * @example
   * const { signTransaction } = useTurnkey();
   * const result = await signTransaction(
   *   { data: serializedTxBase64 },
   *   'Swap 10 SOL to USDC'
   * );
   */
  export function useTurnkey(): {
    publicKey: string | null;
    signTransaction: (
      tx: { data: string; metadata?: { protocol?: string; action?: string; estimatedValue?: number } },
      description: string
    ) => Promise<{ signature: string; simulation: SimulationSummary }>;
    connected: boolean;
  };

  /**
   * Subscribe to OS-level events like block updates, price changes, etc.
   *
   * @example
   * useKeystoneEvents(['ON_PRICE_CHANGE', 'ON_BLOCK_UPDATE'], (event, data) => {
   *   console.log('Event:', event, data);
   * });
   */
  export function useKeystoneEvents(
    events: OSEventType[],
    handler: (event: OSEventType, data: unknown) => void
  ): void;

  /**
   * Simulate a transaction without signing — perfect for "preview" UX.
   *
   * @example
   * const { simulate } = useSimulate();
   * const result = await simulate(serializedTxBase64);
   * if (!result.success) alert('This transaction would fail!');
   */
  export function useSimulate(): {
    simulate: (serializedTx: string) => Promise<SimulationSummary>;
    simulating: boolean;
  };

  // ═══ Components ══════════════════════════════════════════════════

  /**
   * Revenue gate — wraps content that requires a Marketplace license.
   * Automatically checks the user's purchase status via the Bridge.
   *
   * @example
   * <KeystoneGate productId="sniper-123">
   *   <PremiumDashboard />
   * </KeystoneGate>
   */
  export function KeystoneGate(props: {
    productId: string;
    fallback?: React.ReactNode;
    lockedContent?: React.ReactNode;
    children: React.ReactNode;
  }): JSX.Element;

  export function KeystoneProvider(props: {
    children: React.ReactNode;
  }): JSX.Element;

  // ═══ Utilities ═══════════════════════════════════════════════════

  export const AppEventBus: {
    emit: (type: string, payload?: unknown) => void;
    subscribe: (
      events: OSEventType[],
      handler: (event: OSEventType, data: unknown) => void
    ) => () => void;
  };

  export function formatSol(lamports: number): string;
  export function formatUsd(value: number): string;

  // ═══ Types ═══════════════════════════════════════════════════════

  interface TokenBalance {
    mint: string;
    symbol: string;
    name: string;
    balance: number;
    decimals: number;
    priceUsd: number;
    valueUsd: number;
    change24h: number;
    logoUri?: string;
  }

  interface SimulationSummary {
    success: boolean;
    estimatedFeeSol: number;
    balanceChanges: Array<{
      mint: string;
      symbol: string;
      before: number;
      after: number;
      delta: number;
      deltaUsd: number;
    }>;
    logs: string[];
    warningFlags: string[];
  }

  type OSEventType =
    | 'ON_BLOCK_UPDATE'
    | 'ON_PRICE_CHANGE'
    | 'ON_VAULT_REBALANCE'
    | 'ON_PROPOSAL_CREATED'
    | 'ON_PROPOSAL_EXECUTED'
    | 'ON_SIGNER_ONLINE'
    | 'ON_AGENT_LOG';
}
`;

// Injection code (in CodeEditor.tsx onMount):
monaco.languages.typescript.typescriptDefaults.addExtraLib(
  KEYSTONE_SDK_TYPES,
  'file:///node_modules/@keystone-os/sdk/index.d.ts'
);
```

### 3.4 Local Development & Testing

**Innovation: `keystone dev` CLI Emulator.**

For developers who want to build Mini-Apps outside the Studio (in their own VS Code), we provide a lightweight dev server that emulates the Keystone host environment:

```bash
npx @keystone-os/cli dev --port 3100
```

This spins up:
1. A mock host window that responds to all Bridge messages with configurable fixture data.
2. A hot-reloading iframe container (using Vite under the hood).
3. A "Bridge Inspector" panel (like Chrome DevTools' Network tab, but for Bridge messages).

```typescript
// keystone.dev.config.ts — Local development fixture configuration
import { defineConfig } from '@keystone-os/cli';

export default defineConfig({
  // Mock vault data returned by useVault()
  vault: {
    address: '7KeY...MockVault',
    tokens: [
      { mint: 'So11...', symbol: 'SOL', balance: 124.5, priceUsd: 234.0 },
      { mint: 'EPjF...', symbol: 'USDC', balance: 5400, priceUsd: 1.0 },
    ],
  },
  // Mock simulation behavior
  simulation: {
    alwaysSucceed: true,    // Set to false to test error paths
    latencyMs: 500,         // Simulate network delay
  },
  // Mock signing behavior
  signing: {
    autoApprove: true,      // Skip approval modal in dev
    mockSignature: 'sig_dev_mock_xxxxx',
  },
  // Events to emit on a schedule
  events: [
    { type: 'ON_BLOCK_UPDATE', interval: 400, data: { slot: 'auto-increment' } },
    { type: 'ON_PRICE_CHANGE', interval: 5000, data: { SOL: 'random-walk' } },
  ],
});
```

This means developers get a full feedback loop without ever needing access to a running Keystone instance. They build locally, test against fixtures, then publish to the Marketplace.

---

<a name="phase-4-implementation-steps"></a>
## Phase 4: Implementation Steps

### 4.1 Sprint 1: Bridge Protocol (Week 1-2)

**Goal:** Replace the current ad-hoc `postMessage` handling with the typed, authenticated Bridge Protocol.

| Step | Task | File(s) | Details |
|------|------|---------|---------|
| 1.1 | Define Bridge types | `src/lib/sdk/types.ts` | All interfaces from §1.1 — `BridgeMessage`, `BridgePayloadMap`, `Capability`, `OSEventType` |
| 1.2 | Implement `BridgeController` | `src/lib/sdk/bridge-controller.ts` | Host-side message router with HMAC validation, nonce tracking, rate limiting |
| 1.3 | Implement `BridgeClient` | `src/lib/sdk/bridge-client.ts` | Iframe-side message sender with auto-nonce, HMAC computation, promise tracking |
| 1.4 | Implement Handshake | Both controller + client | `HANDSHAKE_INIT` → `HANDSHAKE_ACK` flow with session secret exchange |
| 1.5 | Refactor `LivePreview.tsx` | `src/components/studio/LivePreview.tsx` | Replace current `useEffect` message handler with `BridgeController` instance. Remove `allow-same-origin` from sandbox. |
| 1.6 | Add `TransactionInspector` | `src/lib/sdk/transaction-inspector.ts` | Deserialize transactions, extract program IDs, validate against manifest allowlists |
| 1.7 | Unit tests | `src/lib/sdk/__tests__/` | Test HMAC validation, nonce rejection, capability gating, rate limiting |

### 4.2 Sprint 2: SDK Hooks (Week 3-4)

**Goal:** Build the `@keystone-os/sdk` virtual module that runs inside the iframe.

| Step | Task | File(s) | Details |
|------|------|---------|---------|
| 2.1 | `KeystoneProvider` | `src/lib/sdk/provider.tsx` | React context that initializes `BridgeClient`, performs handshake, stores session state |
| 2.2 | `useVault()` hook | `src/lib/sdk/hooks/use-vault.ts` | Sends `VAULT_GET_BALANCES`, caches result, supports `subscribe()` for real-time updates via `VAULT_SUBSCRIBE` → `VAULT_UPDATE` push |
| 2.3 | `useTurnkey()` hook | `src/lib/sdk/hooks/use-turnkey.ts` | Sends `TURNKEY_SIGN` / `TURNKEY_GET_PK`, returns typed promises. The hook itself is thin — all simulation logic lives host-side. |
| 2.4 | `useKeystoneEvents()` hook | `src/lib/sdk/hooks/use-events.ts` | Sends `EVENT_SUBSCRIBE`, registers handler for `EVENT_DISPATCH` messages, cleans up on unmount |
| 2.5 | `useSimulate()` hook | `src/lib/sdk/hooks/use-simulate.ts` | Sends `SIMULATE_TX`, returns `SimulationSummary` promise |
| 2.6 | `KeystoneGate` component | `src/lib/sdk/components/keystone-gate.tsx` | Sends `LICENSE_CHECK` on mount, renders `children` or `lockedContent` based on response |
| 2.7 | `AppEventBus` utility | `src/lib/sdk/event-bus.ts` | Wraps bridge event subscription with a simpler pub/sub interface |
| 2.8 | Build virtual module bundle | `src/lib/sdk/build-virtual-module.ts` | Concatenates all SDK code into a single ESM string that becomes the Blob URL for the import map entry |
| 2.9 | Wire into `LivePreview.tsx` | `src/components/studio/LivePreview.tsx` | Replace hardcoded `keystoneCode` template string with the built virtual module |

### 4.3 Sprint 3: Security & Simulation (Week 5-6)

**Goal:** Integrate the Simulation Firewall into the Bridge flow.

| Step | Task | File(s) | Details |
|------|------|---------|---------|
| 3.1 | Build `SimulationFirewall` | `src/lib/sdk/simulation-firewall.ts` | Wraps `TransactionAgent.simulateTransaction()`, computes `BalanceChange[]` diffs, generates `SimulationSummary` |
| 3.2 | Build `ApprovalModal` | `src/components/sdk/ApprovalModal.tsx` | React component: shows Mini-App name, description, balance diff table, fee, risk warnings. [Approve] / [Reject] buttons. |
| 3.3 | Integrate into `BridgeController` | `src/lib/sdk/bridge-controller.ts` | Wire `TURNKEY_SIGN` handler: inspect → simulate → show modal → sign → respond |
| 3.4 | Heuristic guardrails | `src/lib/sdk/guardrails.ts` | Configurable rules: value thresholds, program blocklists, slippage limits. Reads from manifest + OS-level config. |
| 3.5 | Sandbox hardening | `src/components/studio/LivePreview.tsx` | Remove `allow-same-origin`, `allow-popups`, `allow-forms`. Add CSP header via `csp` attribute. |
| 3.6 | Lazy iframe hydration | `src/hooks/use-mini-app-lifecycle.ts` | `IntersectionObserver`-based visibility tracking. Freeze/thaw iframes based on viewport. |
| 3.7 | Integration test | Manual + automated | End-to-end: Mini-App → Bridge → Simulate → Modal → Sign → Confirm |

### 4.4 Sprint 4: Revenue & Marketplace (Week 7-8)

**Goal:** Implement the 80/20 revenue split and license gating.

| Step | Task | File(s) | Details |
|------|------|---------|---------|
| 4.1 | `LICENSE_CHECK` handler | `src/lib/sdk/bridge-controller.ts` | Query `purchases` table via Drizzle ORM. Check if `userId` owns `productId`. |
| 4.2 | On-chain revenue split | `src/lib/sdk/revenue-split.ts` | On purchase: create a Solana transaction that sends 80% USDC to developer wallet, 20% to protocol treasury. Uses `@solana/spl-token` `createTransferInstruction`. |
| 4.3 | Manifest validation | `src/lib/sdk/manifest-validator.ts` | JSON Schema validation of `keystone.manifest.json`. Reject manifests with invalid capabilities or missing required fields. |
| 4.4 | Marketplace publish flow | `src/actions/studio-actions.ts` | Add `publishApp()` server action: validate manifest, run static analysis, create listing in `miniApps` table with `status: 'pending_review'`. |
| 4.5 | Static analysis scanner | `src/lib/sdk/static-analyzer.ts` | AST-walk the Mini-App code for: `eval()`, `Function()`, `document.cookie`, `window.opener`, `fetch()` to non-allowlisted domains. Flag violations. |
| 4.6 | `KeystoneGate` polish | `src/lib/sdk/components/keystone-gate.tsx` | Add loading skeleton, purchase CTA button that opens Marketplace modal, license caching in sessionStorage. |

---

<a name="appendix-a-revenue--licensing"></a>
## Appendix A: Revenue & Licensing

### The 80/20 Split Mechanism

```
┌──────────────────────────────────────────────────────────────────┐
│                     PURCHASE FLOW                                │
│                                                                  │
│  User clicks "Buy" on Marketplace listing ($50 USDC)            │
│      │                                                           │
│      ▼                                                           │
│  PurchaseModal.tsx                                               │
│      │ Creates SPL token transfer instruction:                   │
│      │   Transfer 40 USDC → Developer Wallet (80%)              │
│      │   Transfer 10 USDC → Protocol Treasury (20%)             │
│      │                                                           │
│      ▼                                                           │
│  TransactionAgent.simulateTransaction()                          │
│      │ Verify: correct amounts, correct recipients               │
│      │                                                           │
│      ▼                                                           │
│  User signs with Wallet Adapter                                  │
│      │                                                           │
│      ▼                                                           │
│  On confirmation → Server Action: recordPurchase()               │
│      │ INSERT INTO purchases (userId, appId, txSignature, ...)   │
│      │                                                           │
│      ▼                                                           │
│  LICENSE_CHECK now returns { licensed: true } for this user+app  │
│  KeystoneGate unlocks the content                                │
└──────────────────────────────────────────────────────────────────┘
```

**Why on-chain?** The split is enforced at the transaction level — not by the server. Even if our backend is compromised, the Solana transaction either sends 80/20 or it doesn't execute. This is trustless revenue sharing.

### License Verification in the SDK

```typescript
// Inside KeystoneGate component (runs in iframe)
function KeystoneGate({ productId, children, lockedContent, fallback }: KeystoneGateProps) {
  const [state, setState] = useState<'loading' | 'licensed' | 'locked'>('loading');
  const bridge = useBridgeClient();

  useEffect(() => {
    // Check sessionStorage cache first (avoids bridge round-trip)
    const cached = sessionStorage.getItem(`ks_license_${productId}`);
    if (cached) {
      const { licensed, expiresAt } = JSON.parse(cached);
      if (licensed && new Date(expiresAt) > new Date()) {
        setState('licensed');
        return;
      }
    }

    // Query host via bridge
    bridge.send('LICENSE_CHECK', { productId }).then((response) => {
      setState(response.licensed ? 'licensed' : 'locked');
      if (response.licensed) {
        sessionStorage.setItem(`ks_license_${productId}`, JSON.stringify(response));
      }
    });
  }, [productId]);

  if (state === 'loading') return <>{fallback || <LoadingSkeleton />}</>;
  if (state === 'locked') return <>{lockedContent || <DefaultLockedBanner />}</>;
  return <>{children}</>;
}
```

---

<a name="appendix-b-scalability-architecture"></a>
## Appendix B: Scalability Architecture

### Handling 50+ Active Mini-Apps

| Challenge | Solution | Mechanism |
|-----------|----------|-----------|
| **Memory** | Lazy Iframe Hydration | Only visible Mini-Apps have live iframes. Others are replaced with screenshot thumbnails. `IntersectionObserver` triggers hydration/dehydration. |
| **CPU** | Throttled Bridge messages | Token bucket rate limiter (60 msg/min per app). Idle iframes receive no event pushes. |
| **Network** | Shared ESM cache | All iframes load React/Recharts from the same `esm.sh` URLs. Browser HTTP cache deduplicates these across all 50 iframes. First load pays the cost; subsequent iframes are instant. |
| **Rendering** | `content-visibility: auto` | CSS containment on Mini-App containers. The browser skips layout/paint for off-screen apps. |
| **State sync** | Single `VaultContext` source | The host maintains ONE vault subscription. Balance updates are broadcast to all registered `BridgeController` sessions simultaneously via a shared `BroadcastChannel`. |
| **Event storms** | Debounced event dispatch | `ON_BLOCK_UPDATE` is debounced to 1 push per 400ms regardless of actual block production rate. Mini-Apps that subscribe to `ON_PRICE_CHANGE` receive batched updates every 5s, not per-tick. |

### Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        KEYSTONE OS (Parent Window)                     │
│                                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐ │
│  │ VaultContext  │  │ AppEventBus  │  │ ExecutionCoordinator         │ │
│  │ (Single src  │  │ (DOM Custom  │  │  ├─ TransactionAgent         │ │
│  │  of truth)   │  │  Events)     │  │  ├─ LookupAgent             │ │
│  └──────┬───────┘  └──────┬───────┘  │  ├─ AnalysisAgent           │ │
│         │                  │          │  └─ BuilderAgent             │ │
│         │                  │          └──────────┬───────────────────┘ │
│         │                  │                     │                     │
│  ┌──────▼──────────────────▼─────────────────────▼───────────────────┐ │
│  │                    BridgeController                                │ │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────────────────┐ │ │
│  │  │Session 1│  │Session 2│  │Session 3│  │  SimulationFirewall  │ │ │
│  │  │(Sniper) │  │(Yield)  │  │(NFT)    │  │  TransactionInspect  │ │ │
│  │  │nonce: 47│  │nonce: 12│  │nonce: 3 │  │  ApprovalModal       │ │ │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └──────────────────────┘ │ │
│  └───────┼─────────────┼───────────┼─────────────────────────────────┘ │
│          │             │           │                                    │
│  ════════╪═════════════╪═══════════╪══════ postMessage boundary ═════  │
│          │             │           │                                    │
│  ┌───────▼─────┐ ┌────▼──────┐ ┌──▼─────────┐                        │
│  │ iframe      │ │ iframe    │ │ iframe      │   (up to 50)           │
│  │ sandbox=    │ │ sandbox=  │ │ sandbox=    │                        │
│  │ allow-      │ │ allow-    │ │ allow-      │                        │
│  │ scripts     │ │ scripts   │ │ scripts     │                        │
│  │             │ │           │ │             │                        │
│  │ @keystone-  │ │ @keystone-│ │ @keystone-  │                        │
│  │ os/sdk      │ │ os/sdk    │ │ os/sdk      │                        │
│  │ (virtual)   │ │ (virtual) │ │ (virtual)   │                        │
│  │             │ │           │ │             │                        │
│  │ Sniper Bot  │ │ Yield Opt │ │ NFT Gallery │                        │
│  │ Mini-App    │ │ Mini-App  │ │ Mini-App    │                        │
│  └─────────────┘ └───────────┘ └─────────────┘                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Summary of Innovations

| # | Innovation | Impact |
|---|-----------|--------|
| 1 | **HMAC-authenticated Bridge Protocol** with per-session secrets and monotonic nonces | Prevents replay attacks, message injection, and cross-app impersonation |
| 2 | **Program Allowlists in Manifest** | Mini-Apps can only invoke pre-declared programs — the Simulation Firewall rejects undeclared program calls before the user even sees the modal |
| 3 | **Hot Module Boundary Detection** | Hash-based diffing skips full iframe reloads when only component bodies change → sub-100ms preview updates |
| 4 | **Lazy Iframe Hydration** via IntersectionObserver | Memory scales O(visible apps) not O(total apps) — handles 50+ Mini-Apps without lag |
| 5 | **`keystone dev` CLI Emulator** | Developers build and test Mini-Apps locally against fixture data without needing a running Keystone instance |
| 6 | **`useSimulate()` hook exposed to developers** | Mini-App developers can offer "preview" UX — simulate trades and show projected outcomes before the user commits |
| 7 | **On-chain 80/20 revenue split** | Trustless — the split is enforced at the Solana transaction level, not by our backend |
| 8 | **Shared ESM cache across iframes** | All 50 iframes load React from the same CDN URL — browser HTTP cache deduplicates automatically |

---

*Document Version: 1.0 — Ready for architectural review.*
