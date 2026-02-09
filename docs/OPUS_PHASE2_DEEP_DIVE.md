# OPUS — Phase 2: The Deep Dive — Unified Specification

**Model:** Opus (Lead Architect) | **Phase:** 2 — Deep Dive  
**Scope:** Marketplace, Compiler & Runtime, AI Architect Agent, External Connectivity  
**Architecture:** Diamond Merge (Opus Security + GPT Runtime + Gemini Protocol)  

---

## Master Table of Contents

### Part I: Marketplace & App Registry (Opus — System Architect)
1. [Storage & Distribution](#1-storage--distribution)
2. [The 80/20 Revenue Split](#2-the-8020-revenue-split)
3. [The Security Scan Pipeline](#3-the-security-scan-pipeline)
4. [Installation Lifecycle](#4-installation-lifecycle)

### Part II: Compiler & Runtime Environment (GPT — Runtime Engineer)
5. [The Keystone Lockfile](#5-the-keystone-lockfile)
6. [The Compiler Pipeline](#6-the-compiler-pipeline)
7. [Language Support & TypeScript Config](#7-language-support--typescript-config)
8. [Canonical "Hello World" Template](#8-canonical-hello-world-template)

### Part III: The Architect AI Agent (Gemini — AI Specialist)
9. [The System Prompt](#9-the-system-prompt)
10. [The Self-Correction Loop](#10-the-self-correction-loop)
11. [Streaming UI: Ghost Cursor & Matrix Rain](#11-streaming-ui-ghost-cursor--matrix-rain)

### Part IV: External Connectivity & Sandbox IO (Kimi — Integrator)
12. [The Proxy Gate](#12-the-proxy-gate)
13. [Allowlist Logic](#13-allowlist-logic)
14. [External Widget Integration](#14-external-widget-integration)

---

# ═══════════════════════════════════════════════════════════════
# PART I: MARKETPLACE & APP REGISTRY
# Model: Opus (System Architect)
# Domain: Storage, Distribution, Revenue, Security Scanning, Installation Lifecycle
# ═══════════════════════════════════════════════════════════════

---

## 1. Storage & Distribution

### 1.1 Decision: Hybrid Storage (SQL + Arweave)

| Layer | Technology | What It Stores | Why |
|---|---|---|---|
| **Primary** | SQLite (Turso/libSQL) | Metadata, indexes, purchase records, ratings | Already in use (`src/db/schema.ts`). Fast queries, relational integrity, full-text search. |
| **Immutable Archive** | Arweave | Published app code bundles (versioned) | Permanent, content-addressed storage. Once published, code cannot be silently modified. Provides audit trail. |
| **CDN Cache** | Cloudflare R2 / Vercel Blob | Hot-path code delivery | Sub-50ms global delivery for installed apps. Populated from Arweave on first install. |

**Why not IPFS?** IPFS requires pinning services to guarantee availability. Arweave's pay-once-store-forever model is simpler and aligns with the "immutable published code" requirement. IPFS content can disappear if no node pins it.

**Why not SQL-only?** The current implementation stores code as a JSON blob in the `mini_apps.code` column. This works for drafts but is dangerous for published apps — a database migration, admin error, or compromise could silently alter published code. Arweave provides tamper-proof storage for the published version.

### 1.2 Enhanced Database Schema

The existing schema in `src/db/schema.ts` (lines 193-249) is a solid foundation. Here are the required additions:

```typescript
// src/db/schema.ts — Enhanced mini_apps table

export const miniApps = sqliteTable('mini_apps', {
  // === EXISTING FIELDS (preserved) ===
  id: text('id').primaryKey(),                    // app_abc123
  name: text('name').notNull(),
  description: text('description').notNull(),
  code: text('code', { mode: 'json' }).notNull(), // Draft code: { files: { "App.tsx": "..." } }
  contractCode: text('contract_code'),
  programId: text('program_id'),
  version: text('version').notNull().default("1.0.0"),
  creatorWallet: text('creator_wallet').notNull(),
  creatorShare: real('creator_share').notNull().default(0.8),
  isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
  priceUsdc: real('price_usdc').notNull().default(0),
  category: text('category').notNull().default("utility"),
  tags: text('tags', { mode: 'json' }),
  installs: integer('installs').notNull().default(0),
  rating: real('rating'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),

  // === NEW FIELDS ===

  // Versioning
  semver: text('semver').notNull().default("1.0.0"),       // Semantic version (display)
  versionHistory: text('version_history', { mode: 'json' }), // Array of { semver, arweaveId, publishedAt }

  // Arweave Storage
  arweaveId: text('arweave_id'),                  // Current published version's Arweave TX ID
  codeHash: text('code_hash'),                    // SHA-256 of the published code bundle
  bundleSizeBytes: integer('bundle_size_bytes'),  // Size of the published bundle

  // Security
  securityScanStatus: text('security_scan_status').default('pending'),
    // 'pending' | 'scanning' | 'passed' | 'failed' | 'flagged'
  securityScanReport: text('security_scan_report', { mode: 'json' }),
    // { passedChecks: string[], failedChecks: string[], warnings: string[], scannedAt: number }
  lastScanAt: integer('last_scan_at'),

  // Lockfile
  lockfile: text('lockfile', { mode: 'json' }),   // keystone.lock.json content (see GPT_RUNTIME_SPEC)

  // Marketplace Metadata
  iconUrl: text('icon_url'),                      // App icon (dicebear or custom)
  screenshotUrls: text('screenshot_urls', { mode: 'json' }), // Array of screenshot URLs
  readme: text('readme'),                         // Markdown README
  license: text('license').default('MIT'),
  minRuntimeVersion: text('min_runtime_version').default('1.0.0'),

}, (table) => ({
  creatorIdx: index('mini_apps_creator_idx').on(table.creatorWallet),
  categoryIdx: index('mini_apps_category_idx').on(table.category),
  isPublishedIdx: index('mini_apps_is_published_idx').on(table.isPublished),
  arweaveIdx: index('mini_apps_arweave_idx').on(table.arweaveId),
  scanStatusIdx: index('mini_apps_scan_status_idx').on(table.securityScanStatus),
}));

// === NEW TABLE: App Versions ===
export const appVersions = sqliteTable('app_versions', {
  id: text('id').primaryKey(),                    // ver_abc123
  appId: text('app_id').notNull().references(() => miniApps.id, { onDelete: 'cascade' }),
  semver: text('semver').notNull(),               // "1.2.0"
  arweaveId: text('arweave_id').notNull(),        // Arweave TX ID
  codeHash: text('code_hash').notNull(),          // SHA-256
  changelog: text('changelog'),                   // What changed
  securityScanStatus: text('security_scan_status').notNull().default('pending'),
  publishedAt: integer('published_at').notNull(),
}, (table) => ({
  appIdx: index('app_versions_app_idx').on(table.appId),
  semverIdx: index('app_versions_semver_idx').on(table.semver),
}));

// === NEW TABLE: Installed Apps (User Dock) ===
export const installedApps = sqliteTable('installed_apps', {
  id: text('id').primaryKey(),                    // inst_abc123
  userId: text('user_id').notNull(),              // Wallet address
  appId: text('app_id').notNull().references(() => miniApps.id),
  installedVersion: text('installed_version').notNull(), // semver pinned at install
  pinnedToDock: integer('pinned_to_dock', { mode: 'boolean' }).default(true),
  dockPosition: integer('dock_position'),         // Order in the dock
  settings: text('settings', { mode: 'json' }),   // Per-user app settings
  installedAt: integer('installed_at').notNull(),
  lastOpenedAt: integer('last_opened_at'),
}, (table) => ({
  userIdx: index('installed_apps_user_idx').on(table.userId),
  appIdx: index('installed_apps_app_idx').on(table.appId),
  userAppUnique: index('installed_apps_user_app_idx').on(table.userId, table.appId),
}));
```

### 1.3 Publishing Flow: SQL → Arweave → CDN

```
Developer clicks "SHIP" in Studio
    │
    ▼
1. SECURITY SCAN (Section 3)
    │ Pass? ──NO──► Return errors, block publish
    ▼ YES
2. BUNDLE CODE
    │ Concatenate all files into a single JSON bundle:
    │ { files: { "App.tsx": "...", "utils.ts": "..." }, lockfile: {...}, metadata: {...} }
    │ Compute SHA-256 hash of the bundle
    ▼
3. UPLOAD TO ARWEAVE
    │ POST to Arweave via Bundlr/Irys
    │ Tags: { "App-Name": "Sniper Bot", "Version": "1.2.0", "Content-Type": "application/json" }
    │ Returns: arweaveId (transaction ID)
    ▼
4. UPDATE SQL
    │ Set arweaveId, codeHash, securityScanStatus='passed', isPublished=true
    │ Insert into appVersions table
    ▼
5. WARM CDN CACHE
    │ Fetch from Arweave, store in R2/Blob for fast delivery
    ▼
6. PUBLISHED ✓
    │ App appears in Marketplace
```

### 1.4 Code Bundle Format

```json
{
  "format": "keystone-app-bundle",
  "formatVersion": 1,
  "metadata": {
    "name": "Liquidity Sniper",
    "version": "1.2.0",
    "description": "Watches Raydium for new pools > $50k TVL",
    "author": "7KeY...3mN",
    "license": "MIT",
    "minRuntimeVersion": "1.0.0",
    "category": "trading",
    "tags": ["raydium", "sniper", "defi"]
  },
  "files": {
    "App.tsx": "import React from 'react';\nimport { useVault } from '@keystone-os/sdk';\n...",
    "utils.ts": "export const formatPool = (pool) => ...",
    "styles.css": "/* Custom styles */"
  },
  "lockfile": {
    "version": 1,
    "dependencies": {
      "framer-motion": { "version": "11.5.4", "integrity": "sha256-abc..." },
      "recharts": { "version": "2.15.3", "integrity": "sha256-def..." }
    }
  },
  "securityScan": {
    "status": "passed",
    "scannedAt": 1720000000000,
    "checks": ["no-eval", "no-fetch", "no-window-parent", "sdk-only-imports"]
  }
}
```

---

## 2. The 80/20 Revenue Split

### 2.1 Decision: On-Chain Split via Solana Transaction (No NFT)

**Why not License Token (NFT)?**
- NFTs add complexity: minting, metadata, transfer logic, marketplace integration.
- The purchase is a one-time event, not a transferable asset (users can't resell apps).
- An NFT would require an on-chain program, increasing deployment and maintenance cost.
- The current `purchases` table already records ownership — an NFT duplicates this.

**Why not a Smart Contract for the split?**
- A dedicated Solana program for 80/20 splits is over-engineering for this use case.
- The split can be done atomically in a single Solana transaction with two transfer instructions (already implemented in `marketplace-payments.ts`).
- The Simulation Firewall verifies the split before signing.

**Decision: Keep the current approach** — a single Solana transaction with two `SystemProgram.transfer` (or SPL `createTransferInstruction`) calls. The `purchases` table records the on-chain `txSignature` as proof.

### 2.2 Enhanced Payment Flow

The current `marketplace-payments.ts` is functional but needs hardening:

```typescript
// src/lib/studio/marketplace-payments.ts — Enhanced

import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { createTransferInstruction, getAssociatedTokenAddress,
         createAssociatedTokenAccountInstruction } from "@solana/spl-token";

// Keystone Treasury — derived from env, not hardcoded
const KEYSTONE_TREASURY = new PublicKey(
  process.env.NEXT_PUBLIC_KEYSTONE_TREASURY_WALLET!
);
const USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT!
);

interface PurchaseParams {
  connection: Connection;
  buyerPublicKey: PublicKey;
  creatorWallet: string;
  priceUsdc: number;
  creatorSharePercent?: number; // Default 0.8 (from mini_apps.creatorShare)
}

interface PurchaseResult {
  transaction: Transaction;
  creatorPayout: number;
  keystoneFee: number;
  breakdown: {
    creatorLamports: number;
    keystoneLamports: number;
  };
}

export async function createPurchaseTransaction(
  params: PurchaseParams
): Promise<PurchaseResult> {
  const {
    connection,
    buyerPublicKey,
    creatorWallet,
    priceUsdc,
    creatorSharePercent = 0.8,
  } = params;

  const transaction = new Transaction();
  const creatorKey = new PublicKey(creatorWallet);

  const creatorPayout = priceUsdc * creatorSharePercent;
  const keystoneFee = priceUsdc * (1 - creatorSharePercent);
  const decimals = 6; // USDC has 6 decimals
  const creatorAmount = Math.floor(creatorPayout * 10 ** decimals);
  const keystoneAmount = Math.floor(keystoneFee * 10 ** decimals);

  // Get Associated Token Accounts
  const buyerAta = await getAssociatedTokenAddress(USDC_MINT, buyerPublicKey);
  const creatorAta = await getAssociatedTokenAddress(USDC_MINT, creatorKey);
  const keystoneAta = await getAssociatedTokenAddress(USDC_MINT, KEYSTONE_TREASURY);

  // Create ATAs if they don't exist (idempotent)
  for (const [owner, ata] of [
    [creatorKey, creatorAta],
    [KEYSTONE_TREASURY, keystoneAta],
  ] as [PublicKey, PublicKey][]) {
    const account = await connection.getAccountInfo(ata);
    if (!account) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          buyerPublicKey, // payer
          ata,
          owner,
          USDC_MINT
        )
      );
    }
  }

  // 80% to Creator
  transaction.add(
    createTransferInstruction(buyerAta, creatorAta, buyerPublicKey, creatorAmount)
  );

  // 20% to Keystone
  transaction.add(
    createTransferInstruction(buyerAta, keystoneAta, buyerPublicKey, keystoneAmount)
  );

  // Add memo for on-chain audit trail
  // transaction.add(createMemoInstruction(`keystone:purchase:${appId}`));

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = buyerPublicKey;

  return {
    transaction,
    creatorPayout,
    keystoneFee,
    breakdown: {
      creatorLamports: creatorAmount,
      keystoneLamports: keystoneAmount,
    },
  };
}
```

### 2.3 Purchase Verification

After the transaction is signed and sent, the backend verifies it before recording the purchase:

```typescript
// src/actions/marketplace-actions.ts

export async function verifyAndRecordPurchase(
  appId: string,
  buyerWallet: string,
  txSignature: string,
): Promise<{ success: boolean; error?: string }> {
  const connection = new Connection(process.env.SOLANA_RPC_URL!);

  // 1. Fetch the transaction from chain
  const tx = await connection.getTransaction(txSignature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (!tx) return { success: false, error: "Transaction not found" };

  // 2. Verify the app exists and get expected amounts
  const app = await marketplace.getAppById(appId);
  if (!app) return { success: false, error: "App not found" };

  const expectedCreatorAmount = Math.floor(app.priceUsdc * app.creatorShare * 1e6);
  const expectedKeystoneAmount = Math.floor(app.priceUsdc * (1 - app.creatorShare) * 1e6);

  // 3. Verify transfer instructions match expected amounts
  // (Parse transaction instructions and verify recipient + amount)
  // This prevents a buyer from submitting a fake/modified transaction

  // 4. Record in database
  await marketplace.recordPurchase({
    appId,
    buyerWallet,
    txSignature,
    amountUsdc: app.priceUsdc,
    creatorPayout: app.priceUsdc * app.creatorShare,
    keystoneFee: app.priceUsdc * (1 - app.creatorShare),
  });

  return { success: true };
}
```

### 2.4 Free Apps

Free apps (`priceUsdc === 0`) skip the payment flow entirely. The "Install" action directly creates an `installedApps` record. No transaction needed.

---

## 3. The Security Scan Pipeline

### 3.1 Overview

Every app must pass a static analysis scan before being listed in the Marketplace. The scan runs server-side (Next.js API route) and checks the code bundle for dangerous patterns.

### 3.2 Scan Checks

| # | Check ID | Severity | Rule | Rationale |
|---|---|---|---|---|
| 1 | `no-eval` | **CRITICAL** | Reject if `eval(`, `new Function(`, `setTimeout(string` found | Arbitrary code execution, sandbox escape vector |
| 2 | `no-window-parent` | **CRITICAL** | Reject if `window.parent`, `window.top`, `parent.postMessage` found | Direct bridge bypass, can forge messages |
| 3 | `no-direct-fetch` | **HIGH** | Reject if `fetch(` is called with a URL not matching `@keystone-os/sdk` proxy | Data exfiltration, CORS bypass. All network must go through `useFetch()` proxy |
| 4 | `no-crypto-access` | **HIGH** | Reject if `window.solana`, `window.ethereum`, `window.phantom`, `navigator.credentials` found | Wallet theft vector |
| 5 | `no-storage-access` | **MEDIUM** | Reject if `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie` found | Data persistence outside sandbox (should be opaque origin anyway, but defense in depth) |
| 6 | `no-dom-manipulation` | **MEDIUM** | Warn if `document.createElement('script')`, `document.createElement('iframe')` found | Script injection, iframe nesting |
| 7 | `no-node-apis` | **HIGH** | Reject if `require(`, `__dirname`, `__filename`, `process.env`, `child_process` found | Node.js APIs don't exist in browser, indicates confused/malicious code |
| 8 | `sdk-imports-only` | **LOW** | Warn if imports don't match the curated registry or `@keystone-os/sdk` | Unknown packages may contain malicious code |
| 9 | `no-obfuscation` | **MEDIUM** | Warn if code contains base64-encoded strings > 200 chars, or `atob(`/`btoa(` with long literals | Obfuscated payloads hiding malicious logic |
| 10 | `max-bundle-size` | **LOW** | Reject if total code exceeds 500KB | Performance guardrail |

### 3.3 Scanner Implementation

```typescript
// src/lib/studio/security-scanner.ts

interface ScanResult {
  status: "passed" | "failed" | "warning";
  checks: CheckResult[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface CheckResult {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  passed: boolean;
  message: string;
  locations?: { file: string; line: number; snippet: string }[];
}

const SCAN_RULES: ScanRule[] = [
  {
    id: "no-eval",
    severity: "critical",
    patterns: [
      /\beval\s*\(/g,
      /\bnew\s+Function\s*\(/g,
      /\bsetTimeout\s*\(\s*['"`]/g,
      /\bsetInterval\s*\(\s*['"`]/g,
    ],
    message: "Dynamic code execution detected. eval(), new Function(), and string-based setTimeout/setInterval are forbidden.",
  },
  {
    id: "no-window-parent",
    severity: "critical",
    patterns: [
      /window\.parent/g,
      /window\.top/g,
      /parent\.postMessage/g,
      /top\.postMessage/g,
      /self\.parent/g,
    ],
    message: "Direct parent window access detected. All communication must go through the SDK bridge.",
  },
  {
    id: "no-direct-fetch",
    severity: "high",
    patterns: [
      /\bfetch\s*\(\s*['"`]https?:\/\//g,
      /\bfetch\s*\(\s*['"`]\/\//g,
      /\bXMLHttpRequest/g,
      /\bnew\s+WebSocket\s*\(/g,
    ],
    message: "Direct network access detected. Use useFetch() from @keystone-os/sdk for all HTTP requests.",
  },
  {
    id: "no-crypto-access",
    severity: "high",
    patterns: [
      /window\.solana/g,
      /window\.ethereum/g,
      /window\.phantom/g,
      /navigator\.credentials/g,
      /crypto\.subtle/g,
    ],
    message: "Direct wallet/crypto API access detected. Use useTurnkey() for all signing operations.",
  },
  {
    id: "no-storage-access",
    severity: "medium",
    patterns: [
      /\blocalStorage/g,
      /\bsessionStorage/g,
      /\bindexedDB/g,
      /document\.cookie/g,
    ],
    message: "Browser storage access detected. Sandboxed iframes use opaque origins — storage APIs will fail.",
  },
  {
    id: "no-dom-injection",
    severity: "medium",
    patterns: [
      /document\.createElement\s*\(\s*['"`]script/g,
      /document\.createElement\s*\(\s*['"`]iframe/g,
      /\.innerHTML\s*=/g,
      /\.outerHTML\s*=/g,
      /document\.write/g,
    ],
    message: "DOM injection detected. Dynamic script/iframe creation is a security risk.",
  },
  {
    id: "no-node-apis",
    severity: "high",
    patterns: [
      /\brequire\s*\(/g,
      /\b__dirname\b/g,
      /\b__filename\b/g,
      /\bprocess\.env/g,
      /\bchild_process/g,
      /\bimport\s+.*\s+from\s+['"]fs['"]/g,
      /\bimport\s+.*\s+from\s+['"]path['"]/g,
    ],
    message: "Node.js API usage detected. Mini-Apps run in the browser — Node APIs are unavailable.",
  },
  {
    id: "no-obfuscation",
    severity: "medium",
    patterns: [
      /atob\s*\(\s*['"`][A-Za-z0-9+/=]{200,}/g,
      /btoa\s*\(\s*['"`].{200,}/g,
    ],
    message: "Potential obfuscated payload detected. Long base64 strings may hide malicious code.",
  },
];

export function scanAppBundle(
  files: Record<string, string>,
  maxBundleSize: number = 500 * 1024,
): ScanResult {
  const checks: CheckResult[] = [];
  let totalSize = 0;

  // Size check
  for (const [fileName, content] of Object.entries(files)) {
    totalSize += new TextEncoder().encode(content).length;
  }

  checks.push({
    id: "max-bundle-size",
    severity: "low",
    passed: totalSize <= maxBundleSize,
    message: totalSize <= maxBundleSize
      ? `Bundle size: ${(totalSize / 1024).toFixed(1)}KB (limit: ${maxBundleSize / 1024}KB)`
      : `Bundle size ${(totalSize / 1024).toFixed(1)}KB exceeds limit of ${maxBundleSize / 1024}KB`,
  });

  // Pattern checks
  for (const rule of SCAN_RULES) {
    const locations: { file: string; line: number; snippet: string }[] = [];

    for (const [fileName, content] of Object.entries(files)) {
      // Skip scanning comments (naive but effective for most cases)
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip single-line comments
        const trimmed = line.trim();
        if (trimmed.startsWith("//")) continue;
        if (trimmed.startsWith("*")) continue;

        for (const pattern of rule.patterns) {
          pattern.lastIndex = 0; // Reset regex state
          if (pattern.test(line)) {
            locations.push({
              file: fileName,
              line: i + 1,
              snippet: line.trim().substring(0, 100),
            });
          }
        }
      }
    }

    checks.push({
      id: rule.id,
      severity: rule.severity,
      passed: locations.length === 0,
      message: locations.length === 0
        ? `${rule.id}: PASSED`
        : `${rule.message} (${locations.length} occurrence${locations.length > 1 ? "s" : ""})`,
      locations: locations.length > 0 ? locations : undefined,
    });
  }

  // Compute summary
  const failed = checks.filter(c => !c.passed);
  const summary = {
    critical: failed.filter(c => c.severity === "critical").length,
    high: failed.filter(c => c.severity === "high").length,
    medium: failed.filter(c => c.severity === "medium").length,
    low: failed.filter(c => c.severity === "low").length,
  };

  // Status: failed if any critical or high, warning if medium/low only
  const status = summary.critical > 0 || summary.high > 0
    ? "failed"
    : summary.medium > 0 || summary.low > 0
      ? "warning"
      : "passed";

  return { status, checks, summary };
}
```

### 3.4 Scan API Route

```typescript
// src/app/api/studio/security-scan/route.ts

import { NextRequest, NextResponse } from "next/server";
import { scanAppBundle } from "@/lib/studio/security-scanner";

export async function POST(req: NextRequest) {
  const { files } = await req.json();

  if (!files || typeof files !== "object") {
    return NextResponse.json({ error: "files object required" }, { status: 400 });
  }

  // Extract content strings from file objects
  const codeFiles: Record<string, string> = {};
  for (const [name, file] of Object.entries(files)) {
    codeFiles[name] = typeof file === "string" ? file : (file as any).content || "";
  }

  const result = scanAppBundle(codeFiles);

  return NextResponse.json(result);
}
```

---

## 4. Installation Lifecycle

### 4.1 State Machine

```
                    ┌────────────┐
                    │ DISCOVERED │  User sees app in Marketplace
                    └─────┬──────┘
                          │ Click "Install" / "Purchase"
                          ▼
                  ┌───────────────┐
         FREE ◄───┤  PRICE CHECK  ├───► PAID
         │        └───────────────┘        │
         │                                 │
         ▼                                 ▼
  ┌──────────┐                    ┌──────────────┐
  │ INSTALL  │                    │ PURCHASE TX  │
  │ (direct) │                    │ (sign + send)│
  └────┬─────┘                    └──────┬───────┘
       │                                 │
       │                                 ▼
       │                         ┌──────────────┐
       │                         │   VERIFY TX  │
       │                         │  (on-chain)  │
       │                         └──────┬───────┘
       │                                │
       ▼                                ▼
  ┌─────────────────────────────────────────┐
  │           FETCH CODE BUNDLE             │
  │  1. Check CDN cache (R2)                │
  │  2. Fallback: Fetch from Arweave        │
  │  3. Verify SHA-256 hash matches DB      │
  └──────────────────┬──────────────────────┘
                     │
                     ▼
  ┌─────────────────────────────────────────┐
  │         CREATE INSTALLED_APPS ROW       │
  │  userId, appId, installedVersion,       │
  │  pinnedToDock=true, dockPosition=next   │
  └──────────────────┬──────────────────────┘
                     │
                     ▼
  ┌─────────────────────────────────────────┐
  │              INSTALLED ✓                │
  │  App appears in user's Dock             │
  │  Code is cached client-side             │
  └─────────────────────────────────────────┘
```

### 4.2 The Dock

The "Dock" is the user's personal app launcher within Keystone OS. It persists across sessions.

```typescript
// src/actions/dock-actions.ts

export async function installApp(
  userId: string,
  appId: string,
): Promise<{ success: boolean; error?: string }> {
  // Check if already installed
  const existing = await db.select()
    .from(installedApps)
    .where(and(
      eq(installedApps.userId, userId),
      eq(installedApps.appId, appId),
    ))
    .limit(1);

  if (existing.length > 0) {
    return { success: false, error: "App already installed" };
  }

  // Get app metadata
  const app = await marketplace.getAppById(appId);
  if (!app || !app.isPublished) {
    return { success: false, error: "App not found or not published" };
  }

  // Get next dock position
  const userApps = await db.select()
    .from(installedApps)
    .where(eq(installedApps.userId, userId));
  const nextPosition = userApps.length;

  // Create installation record
  await db.insert(installedApps).values({
    id: `inst_${crypto.randomUUID().slice(0, 8)}`,
    userId,
    appId,
    installedVersion: app.semver,
    pinnedToDock: true,
    dockPosition: nextPosition,
    installedAt: Date.now(),
  });

  // Increment install count
  await db.update(miniApps)
    .set({ installs: (app.installs || 0) + 1 })
    .where(eq(miniApps.id, appId));

  return { success: true };
}

export async function uninstallApp(
  userId: string,
  appId: string,
): Promise<void> {
  await db.delete(installedApps)
    .where(and(
      eq(installedApps.userId, userId),
      eq(installedApps.appId, appId),
    ));
}

export async function reorderDock(
  userId: string,
  orderedAppIds: string[],
): Promise<void> {
  for (let i = 0; i < orderedAppIds.length; i++) {
    await db.update(installedApps)
      .set({ dockPosition: i })
      .where(and(
        eq(installedApps.userId, userId),
        eq(installedApps.appId, orderedAppIds[i]),
      ));
  }
}

export async function getUserDock(userId: string) {
  return await db.select()
    .from(installedApps)
    .where(and(
      eq(installedApps.userId, userId),
      eq(installedApps.pinnedToDock, true),
    ))
    .orderBy(installedApps.dockPosition);
}
```

### 4.3 App Update Flow

When a developer publishes a new version:

1. New `appVersions` row is created with the new `arweaveId`.
2. The `miniApps.semver` and `miniApps.arweaveId` are updated to the latest.
3. Users with the app installed see an "Update Available" badge in their Dock.
4. Clicking "Update" fetches the new code bundle and updates `installedApps.installedVersion`.
5. Users are NOT auto-updated — they control when to update (prevents breaking changes).

### 4.4 Running an Installed App

When a user clicks an app in their Dock:

1. Fetch the code bundle for the `installedVersion` from CDN (or Arweave fallback).
2. Verify the `codeHash` matches the expected hash from the `appVersions` table.
3. Load the code into the Studio's `LivePreview` iframe (same runtime as development).
4. The app runs in the same sandboxed environment with the same bridge, same SDK hooks.

The only difference between "development" and "installed" is the code source: development reads from the editor state, installed reads from the cached bundle.

---

# ═══════════════════════════════════════════════════════════════
# PART II: COMPILER & RUNTIME ENVIRONMENT
# Model: GPT (Runtime Engineer)
# Domain: Lockfile, Babel Compiler Pipeline, TypeScript Config, Canonical Templates
# ═══════════════════════════════════════════════════════════════

---

## 5. The Keystone Lockfile

### 5.1 Problem Statement

The current `LivePreview.tsx` (line 145) resolves unknown imports to `https://esm.sh/${pkg}?bundle` with no version pinning. This causes:
- **Non-deterministic builds** — the same code produces different results on different days.
- **React duplication** — `?bundle` inlines React inside each package.
- **No integrity verification** — a CDN compromise could inject malicious code.

### 5.2 Lockfile Format: `keystone.lock.json`

```json
{
  "$schema": "https://keystone.so/schemas/lockfile-v1.json",
  "version": 1,
  "runtime": {
    "react": "19.0.0",
    "typescript": "5.8.0",
    "babel": "7.28.5",
    "tailwindcss": "cdn-latest"
  },
  "dependencies": {
    "framer-motion": {
      "version": "11.5.4",
      "esm": "https://esm.sh/framer-motion@11.5.4?dev&external=react,react-dom",
      "integrity": "sha384-abc123...",
      "peerExternals": ["react", "react-dom"]
    },
    "recharts": {
      "version": "2.15.3",
      "esm": "https://esm.sh/recharts@2.15.3?dev&external=react,react-dom",
      "integrity": "sha384-def456...",
      "peerExternals": ["react", "react-dom"]
    },
    "lucide-react": {
      "version": "0.468.0",
      "esm": "https://esm.sh/lucide-react@0.468.0?dev&external=react",
      "integrity": "sha384-ghi789...",
      "peerExternals": ["react"]
    },
    "zustand": {
      "version": "5.0.3",
      "esm": "https://esm.sh/zustand@5.0.3?dev&external=react",
      "integrity": "sha384-jkl012...",
      "peerExternals": ["react"]
    },
    "date-fns": {
      "version": "4.1.0",
      "esm": "https://esm.sh/date-fns@4.1.0?dev",
      "integrity": "sha384-mno345...",
      "peerExternals": []
    },
    "lightweight-charts": {
      "version": "4.2.2",
      "esm": "https://esm.sh/lightweight-charts@4.2.2?dev",
      "integrity": "sha384-pqr678...",
      "peerExternals": []
    },
    "d3": {
      "version": "7.9.0",
      "esm": "https://esm.sh/d3@7.9.0?dev",
      "integrity": "sha384-stu901...",
      "peerExternals": []
    },
    "swr": {
      "version": "2.3.3",
      "esm": "https://esm.sh/swr@2.3.3?dev&external=react",
      "integrity": "sha384-vwx234...",
      "peerExternals": ["react"]
    },
    "@tanstack/react-query": {
      "version": "5.62.0",
      "esm": "https://esm.sh/@tanstack/react-query@5.62.0?dev&external=react",
      "integrity": "sha384-yza567...",
      "peerExternals": ["react"]
    },
    "animejs": {
      "version": "3.2.2",
      "esm": "https://esm.sh/animejs@3.2.2/lib/anime.es.js",
      "integrity": "sha384-bcd890...",
      "peerExternals": []
    }
  }
}
```

### 5.3 Key Design Decisions

| Decision | Rationale |
|---|---|
| **`?external=react,react-dom`** on all React-dependent packages | Prevents React duplication. All packages share the single React instance from the Import Map. |
| **`?dev`** flag | Enables better error messages during development. Stripped in production builds (future). |
| **No `?bundle`** | The current `?bundle` flag inlines ALL transitive deps. We use esm.sh's default tree-shaking mode + explicit externals instead. |
| **`integrity` field** | Subresource Integrity hash. The runtime can verify that the fetched module hasn't been tampered with (future enhancement). |
| **`peerExternals` array** | Documents which packages are externalized. Used by the Import Map builder to ensure the shared instances are available. |

### 5.4 Lockfile Resolution Algorithm

```typescript
// src/lib/studio/lockfile-resolver.ts

import type { KeystoneLockfile, ResolvedImportMap } from "./types";

// The default lockfile shipped with every new project
import DEFAULT_LOCKFILE from "./default-lockfile.json";

/**
 * Resolves a lockfile + user code into a complete Import Map
 * for injection into the iframe's <script type="importmap">.
 */
export function resolveImportMap(
  userCode: string,
  lockfile: KeystoneLockfile = DEFAULT_LOCKFILE,
): ResolvedImportMap {
  const reactVersion = lockfile.runtime.react;

  // Base imports — always present
  const imports: Record<string, string> = {
    "react": `https://esm.sh/react@${reactVersion}?dev`,
    "react/jsx-runtime": `https://esm.sh/react@${reactVersion}/jsx-runtime?dev`,
    "react-dom": `https://esm.sh/react-dom@${reactVersion}?dev&external=react`,
    "react-dom/client": `https://esm.sh/react-dom@${reactVersion}/client?dev&external=react`,
  };

  // SDK — injected as blob URL (see Section 6.4)
  // imports["@keystone-os/sdk"] is set by the LivePreview component

  // Detect bare imports from user code
  const importRegex = /(?:from|import)\s+['"]([^./][^'"]*)['"]/g;
  const detected = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(userCode)) !== null) {
    const specifier = match[1];
    // Skip react/react-dom (already in base) and SDK
    if (specifier.startsWith("react") || specifier === "@keystone-os/sdk") continue;
    detected.add(specifier);
  }

  // Resolve each detected import against the lockfile
  const unresolved: string[] = [];

  for (const pkg of detected) {
    const locked = lockfile.dependencies[pkg];
    if (locked) {
      imports[pkg] = locked.esm;
    } else {
      // Not in lockfile — use esm.sh with React externalized as safety net
      imports[pkg] = `https://esm.sh/${pkg}?dev&external=react,react-dom`;
      unresolved.push(pkg);
    }
  }

  return {
    imports,
    resolved: [...detected].filter(p => !unresolved.includes(p)),
    unresolved,
    warnings: unresolved.map(p =>
      `Package "${p}" is not in the lockfile. Using latest from esm.sh (unpinned).`
    ),
  };
}
```

### 5.5 Lockfile Generation

When a developer adds a new import, the Studio detects it and offers to "lock" the version:

```typescript
// src/lib/studio/lockfile-generator.ts

/**
 * Fetches the latest stable version of a package from esm.sh
 * and generates a lockfile entry.
 */
export async function lockPackage(
  packageName: string,
): Promise<LockfileEntry | null> {
  try {
    // esm.sh redirects to the resolved version URL
    const res = await fetch(`https://esm.sh/${packageName}`, {
      method: "HEAD",
      redirect: "follow",
    });

    // Extract version from the resolved URL
    // e.g., https://esm.sh/framer-motion@11.5.4/... → 11.5.4
    const resolvedUrl = res.url;
    const versionMatch = resolvedUrl.match(
      new RegExp(`${packageName.replace("/", "\\/")}@([\\d.]+)`)
    );

    if (!versionMatch) return null;

    const version = versionMatch[1];

    // Determine if package has React as peer dependency
    // by checking if the package page mentions react
    const pkgInfo = await fetch(`https://registry.npmjs.org/${packageName}/${version}`);
    const pkgJson = await pkgInfo.json();
    const peerDeps = Object.keys(pkgJson.peerDependencies || {});
    const peerExternals = peerDeps.filter(d => d === "react" || d === "react-dom");

    const externalParam = peerExternals.length > 0
      ? `&external=${peerExternals.join(",")}`
      : "";

    return {
      version,
      esm: `https://esm.sh/${packageName}@${version}?dev${externalParam}`,
      integrity: "", // Computed after first fetch
      peerExternals,
    };
  } catch {
    return null;
  }
}
```

---

## 6. The Compiler Pipeline

### 6.1 Overview

The Keystone runtime compiles TypeScript/JSX in the browser using `@babel/standalone`. There is no server-side build step. The pipeline:

```
User Code (TypeScript + JSX)
    │
    ▼
┌──────────────────────────────────────┐
│  STEP 1: IMPORT REWRITING            │
│  Replace './keystone' → SDK blob URL │
│  Replace bare imports → Import Map   │
│  (handled by Import Map, not Babel)  │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  STEP 2: BABEL TRANSFORM             │
│  Plugins:                            │
│  - @babel/plugin-transform-typescript│
│  - @babel/plugin-transform-react-jsx │
│  Config:                             │
│  - isTSX: true                       │
│  - allExtensions: true               │
│  - retainLines: true  ← KEY          │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  STEP 3: MODULE EXECUTION            │
│  Wrap in blob URL → import() via     │
│  Import Map resolution               │
└──────────────────────────────────────┘
```

### 6.2 Babel Configuration (In-Browser)

```typescript
// Inside the iframe's <script type="module"> block

async function compileAndRun(rawCode: string, importMap: Record<string, string>) {
  // Step 1: Babel Transform
  // @babel/standalone is loaded via <script> tag in the iframe head
  const transformed = Babel.transform(rawCode, {
    filename: "App.tsx",
    presets: [
      ["typescript", {
        isTSX: true,
        allExtensions: true,
        // Do NOT emit type-only imports — they don't exist at runtime
        onlyRemoveTypeImports: true,
      }],
    ],
    plugins: [
      ["transform-react-jsx", {
        runtime: "automatic",
        importSource: "react",
      }],
    ],
    // CRITICAL: Retain original line numbers for debugging
    retainLines: true,
    // Generate source map for error mapping
    sourceMaps: "inline",
    // Don't add "use strict" — ESM is strict by default
    sourceType: "module",
  });

  if (!transformed.code) throw new Error("Babel compilation failed");

  // Step 2: Create executable module
  const moduleBlob = new Blob([transformed.code], { type: "text/javascript" });
  const moduleUrl = URL.createObjectURL(moduleBlob);

  try {
    // Step 3: Dynamic import (resolved via Import Map)
    const AppModule = await import(/* @vite-ignore */ moduleUrl);
    const App = AppModule.default;

    if (!App) throw new Error("App.tsx must export a default component");

    // Step 4: Render
    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(React.createElement(App));
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }
}
```

### 6.3 Line Number Preservation

**Problem:** When Babel strips TypeScript types, it removes characters and potentially shifts line numbers. If the user sees an error on "line 23" in the console, it must correspond to line 23 in their editor.

**Solution:** `retainLines: true`

This Babel option preserves the original line structure by inserting empty statements where type annotations were removed. Example:

```typescript
// Input (line 5):
const x: number = 42;

// Output with retainLines: true (still line 5):
const x         = 42;

// Output WITHOUT retainLines (could shift):
const x = 42;
```

**Trade-off:** The output code has extra whitespace and empty lines, making it slightly larger. This is acceptable for development — the code never leaves the iframe.

### 6.4 Source Map Error Mapping

When a runtime error occurs in the iframe, we need to map it back to the original TypeScript source:

```typescript
// Inside the iframe's error handler

window.onerror = (msg, url, line, col, error) => {
  // With retainLines: true, the line number is already accurate
  // No source map parsing needed for line mapping
  window.parent.postMessage({
    type: "console",
    level: "error",
    message: `${msg}`,
    line: line,   // Accurate thanks to retainLines
    col: col,
    stack: error?.stack || "",
  }, "*");
};

// Unhandled promise rejections
window.onunhandledrejection = (event) => {
  window.parent.postMessage({
    type: "console",
    level: "error",
    message: `Unhandled Promise Rejection: ${event.reason}`,
  }, "*");
};
```

### 6.5 The Complete Iframe HTML Template

This replaces the current `iframeContent` in `LivePreview.tsx`:

```typescript
function buildIframeContent(
  userCode: string,
  importMap: Record<string, string>,
  sdkBlobUrl: string,
): string {
  // Add SDK to import map
  const fullImportMap = {
    imports: {
      ...importMap,
      "@keystone-os/sdk": sdkBlobUrl,
    },
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self' blob:;
    script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://esm.sh https://unpkg.com https://cdn.tailwindcss.com;
    style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com;
    connect-src https://esm.sh;
    img-src * data: blob:;
    font-src *;
  ">

  <!-- Babel Standalone (TypeScript + JSX compilation) -->
  <script src="https://unpkg.com/@babel/standalone@7.28.5/babel.min.js"></script>

  <!-- Tailwind CSS (CDN) -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            primary: '#34E27B',
          }
        }
      }
    };
  </script>

  <!-- Import Map (dependency resolution) -->
  <script type="importmap">
    ${JSON.stringify(fullImportMap, null, 2)}
  </script>

  <style>
    html { color-scheme: dark; }
    body { margin: 0; background: #09090b; color: #fafafa; font-family: system-ui, -apple-system, sans-serif; min-height: 100vh; }
    #root { min-height: 100vh; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #09090b; }
    ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 3px; }
  </style>

  <script>
    // Console hijack — forward all logs to parent
    (function() {
      const _log = console.log, _warn = console.warn, _error = console.error, _info = console.info;
      function send(level, args) {
        try {
          const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
          window.parent.postMessage({ type: 'console', level, message: msg }, '*');
        } catch(e) {}
      }
      console.log = (...a) => { _log(...a); send('info', a); };
      console.warn = (...a) => { _warn(...a); send('warn', a); };
      console.error = (...a) => { _error(...a); send('error', a); };
      console.info = (...a) => { _info(...a); send('info', a); };

      window.onerror = (msg, url, line, col, err) => {
        send('error', [\`Runtime Error (line \${line}): \${msg}\`]);
        return true;
      };
      window.onunhandledrejection = (e) => {
        send('error', [\`Unhandled Rejection: \${e.reason}\`]);
      };
    })();
  </script>
</head>
<body class="dark">
  <div id="root">
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;opacity:0.3;">
      <span style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;">Initializing Runtime...</span>
    </div>
  </div>

  <script type="module">
    import React from "react";
    import { createRoot } from "react-dom/client";

    const userCode = ${JSON.stringify(userCode)};

    try {
      // Babel transform: strip TS types, convert JSX
      const compiled = Babel.transform(userCode, {
        filename: "App.tsx",
        presets: [
          ["typescript", { isTSX: true, allExtensions: true, onlyRemoveTypeImports: true }],
        ],
        plugins: [
          ["transform-react-jsx", { runtime: "automatic", importSource: "react" }],
        ],
        retainLines: true,
        sourceMaps: "inline",
        sourceType: "module",
      });

      if (!compiled.code) throw new Error("Compilation produced no output");

      // Execute as ESM module
      const blob = new Blob([compiled.code], { type: "text/javascript" });
      const url = URL.createObjectURL(blob);

      const mod = await import(url);
      URL.revokeObjectURL(url);

      const App = mod.default;
      if (!App) throw new Error("App.tsx must have a default export");

      const root = createRoot(document.getElementById("root"));
      root.render(React.createElement(App));

      console.log("[Runtime] App mounted successfully");
    } catch (err) {
      console.error("[Runtime] Fatal:", err.message);
      document.getElementById("root").innerHTML =
        '<div style="padding:2rem;color:#ef4444;font-family:monospace;font-size:13px;">' +
        '<div style="font-weight:bold;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.1em;">Runtime Error</div>' +
        '<pre style="white-space:pre-wrap;opacity:0.8;">' + err.message + '</pre></div>';
    }
  </script>
</body>
</html>`;
}
```

---

## 7. Language Support & TypeScript Config

### 7.1 Monaco TypeScript Compiler Options

These options are set in `CodeEditor.tsx` and define the TypeScript environment for the editor's IntelliSense and diagnostics:

```typescript
// src/lib/studio/monaco-ts-config.ts

export function configureMonacoTypeScript(monaco: typeof import("monaco-editor")) {
  const compilerOptions: monaco.languages.typescript.CompilerOptions = {
    // === Module System ===
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,

    // === JSX ===
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    jsxImportSource: "react",

    // === Strictness (enforced) ===
    strict: true,
    noImplicitAny: true,
    strictNullChecks: true,
    strictFunctionTypes: true,
    noImplicitReturns: true,
    noFallthroughCasesInSwitch: true,
    noUnusedLocals: false,        // Too noisy during development
    noUnusedParameters: false,    // Too noisy during development

    // === Interop ===
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    forceConsistentCasingInFileNames: true,
    resolveJsonModule: true,
    isolatedModules: true,        // Required for single-file transpilation (Babel)

    // === Output ===
    declaration: false,           // No .d.ts generation needed
    sourceMap: false,             // Handled by Babel
    skipLibCheck: true,           // Skip checking node_modules types

    // === Compatibility ===
    allowJs: true,                // Accept .jsx files in manual mode
    checkJs: false,               // Don't type-check .js files
    lib: ["ESNext", "DOM", "DOM.Iterable"],

    // === Paths (virtual module resolution) ===
    baseUrl: ".",
    paths: {
      "@keystone-os/sdk": ["./keystone-sdk.d.ts"],
    },
  };

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);

  // Disable semantic validation for JS files (only TS gets full checking)
  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  });

  // Enable full diagnostics for TS files
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });
}
```

### 7.2 SDK Type Definitions

The current `CodeEditor.tsx` injects minimal stubs (`export declare const useVault: () => any`). This provides zero IntelliSense value. Here are the full type definitions:

```typescript
// src/lib/studio/sdk-types.d.ts
// Injected into Monaco via addExtraLib()

export const SDK_TYPE_DEFINITIONS = `
declare module "@keystone-os/sdk" {
  // ═══════════════════════════════════════
  // VAULT HOOK
  // ═══════════════════════════════════════

  interface Token {
    symbol: string;
    name: string;
    mint: string;
    balance: number;
    decimals: number;
    price: number;
    value: number;
    change24h: number;
    logoUri?: string;
  }

  interface VaultConfig {
    name: string;
    authority: string;
    threshold: number;
    members: string[];
  }

  interface VaultState {
    activeVault: string;
    balance: number;
    totalValueUsd: number;
    change24h: number;
    tokens: Token[];
    config: VaultConfig;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
  }

  export function useVault(): VaultState;

  // ═══════════════════════════════════════
  // TURNKEY HOOK
  // ═══════════════════════════════════════

  interface SimulationResult {
    success: boolean;
    balanceChanges: Array<{
      token: string;
      before: number;
      after: number;
      delta: number;
    }>;
    fee: number;
    computeUnits: number;
    programs: string[];
    risk: "low" | "medium" | "high";
    warnings: string[];
  }

  interface TurnkeyState {
    getPublicKey: () => Promise<string>;
    signTransaction: (transaction: Uint8Array | string) => Promise<string>;
    simulate: (transaction: Uint8Array | string) => Promise<SimulationResult>;
    signing: boolean;
    lastSimulation: SimulationResult | null;
  }

  export function useTurnkey(): TurnkeyState;

  // ═══════════════════════════════════════
  // EVENT BUS HOOK
  // ═══════════════════════════════════════

  type EventChannel =
    | "ON_BLOCK_UPDATE"
    | "ON_PRICE_UPDATE"
    | "ON_VAULT_CHANGE"
    | "ON_TX_CONFIRMED"
    | "ON_TX_FAILED"
    | "ON_APPROVAL_REQUIRED";

  interface EventBusState {
    subscribe: (channel: EventChannel, callback: (data: any) => void) => () => void;
    once: (channel: EventChannel, callback: (data: any) => void) => void;
    emit: (channel: EventChannel, data: any) => void;
  }

  export function useEventBus(): EventBusState;

  // ═══════════════════════════════════════
  // FETCH HOOK (Proxy)
  // ═══════════════════════════════════════

  interface FetchOptions {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
  }

  interface FetchResult<T = any> {
    data: T | null;
    error: string | null;
    loading: boolean;
    refetch: () => Promise<void>;
  }

  export function useFetch<T = any>(url: string, options?: FetchOptions): FetchResult<T>;

  // ═══════════════════════════════════════
  // LICENSE GATE
  // ═══════════════════════════════════════

  interface KeystoneGateProps {
    productId: string;
    fallback?: React.ReactNode;
    children: React.ReactNode;
  }

  export const KeystoneGate: React.FC<KeystoneGateProps>;

  // ═══════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════

  export function serializeTx(transaction: any): Uint8Array;
  export function deserializeTx(data: Uint8Array): any;
  export function lamportsToSol(lamports: number): number;
  export function formatUsd(amount: number): string;
  export function formatToken(amount: number, decimals?: number): string;
  export function shortenAddress(address: string, chars?: number): string;
}
`;

// Injection function for Monaco
export function injectSdkTypes(monaco: typeof import("monaco-editor")) {
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    SDK_TYPE_DEFINITIONS,
    "file:///node_modules/@keystone-os/sdk/index.d.ts"
  );
}
```

### 7.3 React Type Definitions

The current `CodeEditor.tsx` injects a minimal React type stub. For proper IntelliSense on hooks, JSX elements, and component props, we need richer types:

```typescript
export function injectReactTypes(monaco: typeof import("monaco-editor")) {
  // Fetch the actual React types from esm.sh or use a bundled version
  // For now, inject a comprehensive subset that covers 95% of use cases
  const REACT_TYPES = `
declare module "react" {
  export type ReactNode = string | number | boolean | null | undefined | ReactElement | ReactNode[];
  export interface ReactElement<P = any> { type: any; props: P; key: string | null; }

  // Hooks
  export function useState<T>(initial: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  export function useMemo<T>(factory: () => T, deps: any[]): T;
  export function useRef<T>(initial: T): { current: T };
  export function useContext<T>(context: React.Context<T>): T;
  export function useReducer<S, A>(reducer: (state: S, action: A) => S, initial: S): [S, (action: A) => void];
  export function useId(): string;
  export function useTransition(): [boolean, (callback: () => void) => void];
  export function useDeferredValue<T>(value: T): T;

  // Components
  export function memo<P>(component: React.FC<P>): React.FC<P>;
  export function forwardRef<T, P>(render: (props: P, ref: React.Ref<T>) => ReactElement | null): React.FC<P & { ref?: React.Ref<T> }>;
  export function lazy<T extends React.ComponentType<any>>(factory: () => Promise<{ default: T }>): T;
  export const Suspense: React.FC<{ fallback: ReactNode; children: ReactNode }>;
  export const Fragment: React.FC<{ children?: ReactNode }>;
  export function createElement(type: any, props?: any, ...children: any[]): ReactElement;

  // Types
  export type FC<P = {}> = (props: P) => ReactElement | null;
  export type Ref<T> = { current: T | null } | ((instance: T | null) => void);
  export type Context<T> = { Provider: FC<{ value: T; children: ReactNode }>; Consumer: FC<{ children: (value: T) => ReactNode }> };
  export function createContext<T>(defaultValue: T): Context<T>;

  // Events
  export interface ChangeEvent<T = Element> { target: T & { value: string }; }
  export interface FormEvent<T = Element> { preventDefault(): void; }
  export interface MouseEvent<T = Element> { clientX: number; clientY: number; preventDefault(): void; stopPropagation(): void; }
  export interface KeyboardEvent<T = Element> { key: string; code: string; preventDefault(): void; }

  // CSS
  export interface CSSProperties { [key: string]: string | number | undefined; }

  // Default export
  const React: {
    createElement: typeof createElement;
    useState: typeof useState;
    useEffect: typeof useEffect;
    useCallback: typeof useCallback;
    useMemo: typeof useMemo;
    useRef: typeof useRef;
    memo: typeof memo;
    Fragment: typeof Fragment;
    Suspense: typeof Suspense;
  };
  export default React;
}

declare module "react/jsx-runtime" {
  export function jsx(type: any, props: any, key?: string): any;
  export function jsxs(type: any, props: any, key?: string): any;
  export const Fragment: any;
}
`;

  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    REACT_TYPES,
    "file:///node_modules/@types/react/index.d.ts"
  );
}
```

---

## 8. Canonical "Hello World" Template

### 8.1 Counter App — The Canonical Template

This is the first thing a developer sees when they open the Studio. It demonstrates all three core SDK hooks:

```typescript
// Template: "Counter App" — App.tsx

import React, { useState, useCallback } from "react";
import { useVault, useTurnkey, useEventBus } from "@keystone-os/sdk";
import { Wallet, RefreshCw, Zap, Activity } from "lucide-react";

export default function App() {
  const { tokens, totalValueUsd, loading, refresh } = useVault();
  const { getPublicKey, signTransaction, signing } = useTurnkey();
  const { subscribe } = useEventBus();

  const [count, setCount] = useState(0);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<string>("Waiting...");

  // Fetch wallet address on first render
  React.useEffect(() => {
    getPublicKey().then(setWalletAddress);
  }, []);

  // Subscribe to price updates
  React.useEffect(() => {
    const unsubscribe = subscribe("ON_PRICE_UPDATE", (data) => {
      setLastEvent(`SOL: $${data.price?.toFixed(2) || "—"}`);
    });
    return unsubscribe;
  }, []);

  // Example: Sign a mock transaction
  const handleSign = useCallback(async () => {
    try {
      const sig = await signTransaction("mock_tx_payload");
      console.log("Signed:", sig);
      setCount((c) => c + 1);
    } catch (err) {
      console.error("Sign failed:", err);
    }
  }, [signTransaction]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <div className="flex items-center gap-3 text-zinc-500">
          <RefreshCw size={16} className="animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest">
            Loading Vault...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
          Keystone Mini-App
        </span>
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
        Counter App
      </h1>
      <p className="text-zinc-500 text-sm mb-8">
        A minimal template demonstrating useVault, useTurnkey, and useEventBus.
      </p>

      {/* Wallet Info */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">
            <Wallet size={12} />
            Wallet
          </div>
          <p className="font-mono text-sm text-white truncate">
            {walletAddress || "Connecting..."}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">
            <Activity size={12} />
            Portfolio
          </div>
          <p className="text-2xl font-bold text-white">
            ${totalValueUsd?.toLocaleString() || "0"}
          </p>
        </div>
      </div>

      {/* Token List */}
      <div className="space-y-2 mb-8">
        {tokens?.map((token) => (
          <div
            key={token.symbol}
            className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900/30"
          >
            <div>
              <span className="font-bold text-white">{token.symbol}</span>
              <span className="text-zinc-500 text-xs ml-2">{token.name}</span>
            </div>
            <div className="text-right">
              <span className="font-mono text-white">{token.balance.toLocaleString()}</span>
              <span className="text-emerald-400 text-xs ml-2">
                ${(token.balance * token.price).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Counter + Sign */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={handleSign}
          disabled={signing}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm uppercase tracking-wider transition-colors disabled:opacity-50"
        >
          <Zap size={14} />
          {signing ? "Signing..." : `Sign TX (${count})`}
        </button>

        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-3 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors text-sm"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Event Bus Monitor */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
        <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">
          Event Bus — ON_PRICE_UPDATE
        </div>
        <p className="font-mono text-sm text-emerald-400">{lastEvent}</p>
      </div>
    </div>
  );
}
```

### 8.2 Import Structure Explained

```typescript
// ✅ CORRECT — SDK imports from the virtual module
import { useVault, useTurnkey, useEventBus } from "@keystone-os/sdk";

// ✅ CORRECT — React from Import Map
import React, { useState, useCallback } from "react";

// ✅ CORRECT — Icons from curated lockfile
import { Wallet, RefreshCw } from "lucide-react";

// ❌ WRONG — Direct file import (old pattern)
import { useVault } from "./keystone";

// ❌ WRONG — Node.js import
import fs from "fs";

// ❌ WRONG — Direct wallet access
const wallet = window.solana;
```

### 8.3 How the Template Loads

1. User opens Studio → `page.tsx` initializes `files["App.tsx"]` with the template code.
2. `CodeEditor.tsx` renders the code in Monaco with full IntelliSense (SDK types injected).
3. `LivePreview.tsx` builds the iframe:
   - Detects imports: `react`, `@keystone-os/sdk`, `lucide-react`.
   - Resolves via lockfile: `lucide-react@0.468.0?dev&external=react`.
   - Builds Import Map with all resolved URLs.
   - Babel compiles TSX → JS with `retainLines: true`.
   - Module executes via `import()` from blob URL.
4. The Counter App renders in the preview panel.

---

# ═══════════════════════════════════════════════════════════════
# PART III: THE ARCHITECT AI AGENT
# Model: Gemini (AI Specialist)
# Domain: System Prompt, Self-Correction State Machine, Streaming UI
# ═══════════════════════════════════════════════════════════════

---

## 9. The System Prompt

### 9.1 Design Philosophy

The Architect's system prompt must accomplish three goals simultaneously:
1. **Constrain** — prevent the AI from generating code that crashes, escapes the sandbox, or accesses forbidden APIs.
2. **Empower** — give the AI enough context about the SDK to write correct, idiomatic code on the first attempt.
3. **Adapt** — support two modes: `generate` (write new code from a prompt) and `fix` (patch existing code based on TypeScript errors).

### 9.2 The Complete System Prompt

```typescript
// src/lib/studio/architect-prompt.ts

export function buildArchitectSystemPrompt(mode: "generate" | "fix"): string {
  const BASE_PROMPT = `You are "The Architect" — the AI code generation engine for Keystone Studio.
You write production-grade TypeScript/React Mini-Apps that run inside the Keystone Treasury OS.

╔══════════════════════════════════════════════════════════════╗
║  SANDBOX ENVIRONMENT — HARD CONSTRAINTS                     ║
╚══════════════════════════════════════════════════════════════╝

Your code executes in a sandboxed <iframe> with an opaque origin.
The following APIs DO NOT EXIST in this environment:

  FILESYSTEM:    fs, path, __dirname, __filename, process, require()
  NETWORK:       fetch() to external URLs, XMLHttpRequest, WebSocket
  WALLET:        window.solana, window.ethereum, window.phantom
  STORAGE:       localStorage, sessionStorage, indexedDB, document.cookie
  ESCAPE:        window.parent, window.top, parent.postMessage
  EXECUTION:     eval(), new Function(), setTimeout(string), setInterval(string)
  NODE:          child_process, net, http, https, crypto (Node version)

Attempting to use ANY of the above will crash the sandbox or be blocked by CSP.
ALL data and actions MUST flow through the @keystone-os/sdk hooks.

╔══════════════════════════════════════════════════════════════╗
║  AVAILABLE IMPORTS                                           ║
╚══════════════════════════════════════════════════════════════╝

1. "react" (v19)
   - All hooks: useState, useEffect, useCallback, useMemo, useRef, useReducer, useId
   - Components: Suspense, Fragment, memo, forwardRef, lazy
   - JSX runtime: automatic (no need to import React for JSX)

2. "@keystone-os/sdk"
   ┌─────────────────────────────────────────────────────────┐
   │ useVault()                                               │
   │ Returns: {                                               │
   │   activeVault: string,                                   │
   │   balance: number,          // SOL balance               │
   │   totalValueUsd: number,    // Total portfolio in USD    │
   │   change24h: number,        // 24h change percentage     │
   │   tokens: Token[],          // All token holdings        │
   │   config: VaultConfig,      // Multisig config           │
   │   loading: boolean,                                      │
   │   error: string | null,                                  │
   │   refresh: () => Promise<void>                           │
   │ }                                                        │
   │ Token: { symbol, name, mint, balance, decimals,          │
   │          price, value, change24h, logoUri? }             │
   ├─────────────────────────────────────────────────────────┤
   │ useTurnkey()                                             │
   │ Returns: {                                               │
   │   getPublicKey: () => Promise<string>,                   │
   │   signTransaction: (tx: Uint8Array | string)             │
   │                     => Promise<string>,                   │
   │   simulate: (tx: Uint8Array | string)                    │
   │             => Promise<SimulationResult>,                 │
   │   signing: boolean,                                      │
   │   lastSimulation: SimulationResult | null                │
   │ }                                                        │
   │ SimulationResult: { success, balanceChanges[], fee,      │
   │   computeUnits, programs[], risk, warnings[] }           │
   │                                                          │
   │ IMPORTANT: signTransaction() automatically triggers      │
   │ the Simulation Firewall. The user sees a confirmation    │
   │ dialog with balance changes before signing.              │
   ├─────────────────────────────────────────────────────────┤
   │ useEventBus()                                            │
   │ Returns: {                                               │
   │   subscribe: (channel, callback) => unsubscribe,         │
   │   once: (channel, callback) => void,                     │
   │   emit: (channel, data) => void                          │
   │ }                                                        │
   │ Channels: ON_BLOCK_UPDATE, ON_PRICE_UPDATE,              │
   │   ON_VAULT_CHANGE, ON_TX_CONFIRMED, ON_TX_FAILED,       │
   │   ON_APPROVAL_REQUIRED                                   │
   ├─────────────────────────────────────────────────────────┤
   │ useFetch<T>(url, options?)                               │
   │ Returns: { data: T | null, error, loading, refetch }    │
   │ Routes through Keystone proxy. Only allowlisted domains. │
   ├─────────────────────────────────────────────────────────┤
   │ Utilities:                                               │
   │   serializeTx(tx) => Uint8Array                          │
   │   deserializeTx(data) => Transaction                     │
   │   lamportsToSol(lamports) => number                      │
   │   formatUsd(amount) => string                            │
   │   formatToken(amount, decimals?) => string               │
   │   shortenAddress(address, chars?) => string              │
   ├─────────────────────────────────────────────────────────┤
   │ Components:                                              │
   │   <KeystoneGate productId="..." fallback={...}>          │
   │     License-gated content                                │
   │   </KeystoneGate>                                        │
   └─────────────────────────────────────────────────────────┘

3. "lucide-react" — Icon library
   Common icons: Activity, Shield, Zap, RefreshCw, Wallet, ArrowUpRight,
   ArrowDownRight, TrendingUp, AlertTriangle, CheckCircle, XCircle,
   Layers, Settings, Search, Filter, Download, ExternalLink, Copy

4. Third-party (from lockfile):
   - "framer-motion" — Animations (motion.div, AnimatePresence, etc.)
   - "recharts" — Charts (LineChart, BarChart, PieChart, etc.)
   - "lightweight-charts" — TradingView-style financial charts
   - "zustand" — State management (create store)
   - "date-fns" — Date formatting (format, formatDistanceToNow, etc.)
   - "d3" — Data visualization
   - "swr" — Data fetching with caching

╔══════════════════════════════════════════════════════════════╗
║  STYLING                                                     ║
╚══════════════════════════════════════════════════════════════╝

Tailwind CSS is globally available. Use ONLY Tailwind classes.
Design system tokens:
  Background:  bg-zinc-950, bg-zinc-900, bg-zinc-800
  Text:        text-white, text-zinc-400, text-zinc-500
  Accent:      text-emerald-400, bg-emerald-500, border-emerald-500/20
  Danger:      text-red-400, bg-red-500/10
  Warning:     text-amber-400, bg-amber-500/10
  Borders:     border-zinc-800, border-zinc-700
  Radius:      rounded-lg, rounded-xl, rounded-2xl
  Typography:  font-mono (data), font-sans (UI)
  Labels:      text-xs font-bold uppercase tracking-widest text-zinc-500

╔══════════════════════════════════════════════════════════════╗
║  OUTPUT RULES                                                ║
╚══════════════════════════════════════════════════════════════╝

1. Export a SINGLE default React component from App.tsx.
2. All sub-components, hooks, types, and logic MUST be in this one file.
3. Use TypeScript with proper type annotations (no \`any\` unless unavoidable).
4. Handle loading states: show a skeleton/spinner while useVault() loads.
5. Handle error states: try/catch around signTransaction, show error UI.
6. Format numbers with formatUsd() or Intl.NumberFormat.
7. NO placeholder comments ("// TODO", "// implement later").
   Write the ACTUAL working logic.
8. NO emojis in code or UI text.

╔══════════════════════════════════════════════════════════════╗
║  SECURITY RULES (VIOLATIONS = IMMEDIATE REJECTION)           ║
╚══════════════════════════════════════════════════════════════╝

- NEVER construct transactions manually. ALWAYS use useTurnkey().signTransaction().
- NEVER hardcode private keys, seed phrases, or wallet addresses.
- NEVER use eval(), Function constructor, or dynamic code execution.
- NEVER attempt to access window.parent, window.top, or postMessage directly.
- NEVER use fetch() directly. Use useFetch() from the SDK.
- NEVER import from "fs", "path", "child_process", or any Node.js module.`;

  if (mode === "generate") {
    return BASE_PROMPT + `

╔══════════════════════════════════════════════════════════════╗
║  GENERATE MODE                                               ║
╚══════════════════════════════════════════════════════════════╝

You will receive a user prompt describing what they want to build.
Generate a COMPLETE, WORKING App.tsx file.

Output format — raw TypeScript code only. No markdown fences, no explanation.
The response must start with an import statement and end with the closing brace
of the default export component.

If the user provides [CURRENT FILES] context, read them to understand
the existing codebase and build upon it.

If the user provides [RUNTIME LOGS] with errors, prioritize FIXING
the errors before adding new features.`;
  }

  if (mode === "fix") {
    return BASE_PROMPT + `

╔══════════════════════════════════════════════════════════════╗
║  FIX MODE                                                    ║
╚══════════════════════════════════════════════════════════════╝

You will receive:
1. The CURRENT CODE with TypeScript errors.
2. A list of ERRORS with line numbers and messages.

Your job:
- Fix ONLY the reported errors.
- Do NOT add features, refactor, or change unrelated code.
- Do NOT change the overall structure or design.
- If an import is missing, add it at the top.
- If a type is wrong, fix the type annotation.
- If a variable is undefined, declare it or remove the reference.

Output format — the COMPLETE fixed file. Raw TypeScript code only.
No markdown fences, no explanation, no diff format.`;
  }

  return BASE_PROMPT;
}
```

### 9.3 Prompt Variants for Context Injection

```typescript
// src/lib/studio/architect-prompt.ts (continued)

export function buildUserPrompt(
  userMessage: string,
  contextFiles?: Record<string, { content: string }>,
  runtimeLogs?: string[],
): string {
  let prompt = "";

  // Inject current file context
  if (contextFiles && Object.keys(contextFiles).length > 0) {
    prompt += "[CURRENT FILES]\n";
    for (const [name, file] of Object.entries(contextFiles)) {
      if (name === "keystone.ts") continue; // Skip the stub file
      prompt += `--- ${name} ---\n${file.content}\n\n`;
    }
  }

  // Inject runtime errors if present
  if (runtimeLogs && runtimeLogs.length > 0) {
    const errorLogs = runtimeLogs.filter(
      (l) => l.includes("error") || l.includes("Error") || l.includes("fail")
    );
    if (errorLogs.length > 0) {
      prompt += "[RUNTIME LOGS]\n";
      prompt += errorLogs.slice(-10).join("\n"); // Last 10 error logs
      prompt += "\n\n";
    }
  }

  prompt += `[USER REQUEST]\n${userMessage}`;

  return prompt;
}
```

---

## 10. The Self-Correction Loop

### 10.1 State Machine Definition

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARCHITECT STATE MACHINE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────┐                                                      │
│   │ IDLE │ ◄──────────────────────────────────────────────┐     │
│   └──┬───┘                                                │     │
│      │ user submits prompt                                │     │
│      ▼                                                    │     │
│   ┌──────────┐                                            │     │
│   │ PLANNING │ 100-300ms                                  │     │
│   │          │ • Parse intent                             │     │
│   │          │ • Select mode (generate/fix)               │     │
│   │          │ • Build system + user prompt               │     │
│   └──┬───────┘                                            │     │
│      │                                                    │     │
│      ▼                                                    │     │
│   ┌───────────┐                                           │     │
│   │ STREAMING │ 5-20s                                     │     │
│   │           │ • SSE connection to /api/studio/architect  │     │
│   │           │ • Tokens → Monaco executeEdits()           │     │
│   │           │ • Editor in read-only ghost mode           │     │
│   │           │ • Progress bar in chat panel               │     │
│   └──┬────────┘                                           │     │
│      │ stream complete                                    │     │
│      ▼                                                    │     │
│   ┌────────────┐                                          │     │
│   │ VALIDATING │ 500-1000ms                               │     │
│   │            │ • Wait for Monaco TS worker               │     │
│   │            │ • Read getModelMarkers()                  │     │
│   │            │ • Filter severity === Error               │     │
│   └──┬─────────┘                                          │     │
│      │                                                    │     │
│      ├── 0 errors ──────────────────────┐                 │     │
│      │                                  ▼                 │     │
│      │                           ┌────────────┐           │     │
│      │                           │ PREVIEWING │           │     │
│      │                           │            │           │     │
│      │                           │ • Trigger  │           │     │
│      │                           │   iframe   │           │     │
│      │                           │   rebuild  │           │     │
│      │                           │ • Show app │           │     │
│      │                           └──┬─────────┘           │     │
│      │                              │                     │     │
│      │                              ▼                     │     │
│      │                           ┌──────────┐             │     │
│      │                           │ COMPLETE │─────────────┘     │
│      │                           └──────────┘                   │
│      │                                                          │
│      ├── errors found, iteration < MAX_ITERATIONS ──┐           │
│      │                                              ▼           │
│      │                                     ┌─────────────┐      │
│      │                                     │   FIXING    │      │
│      │                                     │             │      │
│      │                                     │ • Build fix │      │
│      │                                     │   prompt    │      │
│      │                                     │ • Call LLM  │      │
│      │                                     │   (fix mode)│      │
│      │                                     │ • Apply     │      │
│      │                                     │   patched   │      │
│      │                                     │   code      │      │
│      │                                     │ • Highlight │      │
│      │                                     │   diff      │      │
│      │                                     └──┬──────────┘      │
│      │                                        │                 │
│      │                                        └──► VALIDATING   │
│      │                                             (loop back)  │
│      │                                                          │
│      └── errors found, iteration >= MAX_ITERATIONS ──┐          │
│                                                      ▼          │
│                                              ┌────────────┐     │
│                                              │   FAILED   │     │
│                                              │            │     │
│                                              │ Show errors│     │
│                                              │ to user    │     │
│                                              │ with manual│     │
│                                              │ fix hints  │     │
│                                              └──┬─────────┘     │
│                                                 │               │
│                                                 └───────► IDLE  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Constants:
  MAX_ITERATIONS = 3
  VALIDATION_DELAY_MS = 800
  STREAM_TIMEOUT_MS = 60000
```

### 10.2 Implementation

```typescript
// src/lib/studio/architect-engine.ts

import type * as Monaco from "monaco-editor";

type ArchitectState =
  | "idle"
  | "planning"
  | "streaming"
  | "validating"
  | "fixing"
  | "previewing"
  | "complete"
  | "failed";

interface ArchitectEvent {
  type: "state_change" | "progress" | "error" | "fix_applied" | "complete";
  state: ArchitectState;
  detail?: string;
  errors?: DiagnosticError[];
  iteration?: number;
  tokenCount?: number;
  elapsedMs?: number;
}

interface DiagnosticError {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  message: string;
  code: string | number;
  snippet: string; // 3 lines of surrounding context
}

const MAX_ITERATIONS = 3;
const VALIDATION_DELAY_MS = 800;

export class ArchitectEngine {
  private state: ArchitectState = "idle";
  private abortController: AbortController | null = null;
  private editor: Monaco.editor.IStandaloneCodeEditor;
  private monacoInstance: typeof Monaco;
  private onEvent: (event: ArchitectEvent) => void;

  constructor(
    editor: Monaco.editor.IStandaloneCodeEditor,
    monacoInstance: typeof Monaco,
    onEvent: (event: ArchitectEvent) => void,
  ) {
    this.editor = editor;
    this.monacoInstance = monacoInstance;
    this.onEvent = onEvent;
  }

  // ─── PUBLIC API ───────────────────────────────────────

  async generate(
    prompt: string,
    contextFiles: Record<string, { content: string }>,
  ): Promise<void> {
    if (this.state !== "idle") {
      throw new Error(`Cannot generate while in state: ${this.state}`);
    }

    this.abortController = new AbortController();
    const startTime = Date.now();

    try {
      // ── PHASE 1: PLANNING ──
      this.transition("planning", "Analyzing prompt...");
      await this.sleep(200); // Brief pause for UX

      // ── PHASE 2: STREAMING ──
      this.transition("streaming", "Writing code...");
      this.setEditorReadOnly(true);

      const tokenCount = await this.streamCode(prompt, contextFiles);

      // ── PHASE 3: VALIDATION + SELF-CORRECTION LOOP ──
      let iteration = 0;
      let success = false;

      while (iteration < MAX_ITERATIONS) {
        this.transition("validating", `Checking types (attempt ${iteration + 1})...`);
        await this.sleep(VALIDATION_DELAY_MS);

        const errors = this.readDiagnostics();

        if (errors.length === 0) {
          success = true;
          break;
        }

        if (iteration >= MAX_ITERATIONS - 1) {
          // Last iteration and still errors — give up
          break;
        }

        // ── FIXING ──
        this.transition("fixing", `Fixing ${errors.length} error(s)...`);
        this.onEvent({
          type: "error",
          state: "fixing",
          errors,
          iteration: iteration + 1,
        });

        await this.applyFix(errors, contextFiles);
        iteration++;
      }

      this.setEditorReadOnly(false);

      if (success) {
        // ── PHASE 4: PREVIEW ──
        this.transition("previewing", "Launching preview...");
        await this.sleep(300);
        this.transition("complete", "Done");
        this.onEvent({
          type: "complete",
          state: "complete",
          tokenCount,
          elapsedMs: Date.now() - startTime,
        });
      } else {
        const finalErrors = this.readDiagnostics();
        this.transition("failed",
          `${finalErrors.length} error(s) remain after ${MAX_ITERATIONS} fix attempts`
        );
        this.onEvent({
          type: "error",
          state: "failed",
          errors: finalErrors,
          iteration: MAX_ITERATIONS,
        });
      }
    } catch (err: any) {
      this.setEditorReadOnly(false);
      if (err.name === "AbortError") {
        this.transition("idle", "Generation cancelled");
      } else {
        this.transition("failed", err.message);
      }
    } finally {
      this.state = "idle";
      this.abortController = null;
    }
  }

  cancel(): void {
    this.abortController?.abort();
  }

  // ─── PRIVATE: STREAMING ───────────────────────────────

  private async streamCode(
    prompt: string,
    contextFiles: Record<string, { content: string }>,
  ): Promise<number> {
    const response = await fetch("/api/studio/architect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, contextFiles, mode: "generate" }),
      signal: this.abortController!.signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Architect API error: ${response.status}`);
    }

    const model = this.editor.getModel();
    if (!model) throw new Error("No editor model");

    // Clear editor for fresh generation
    model.setValue("");
    let insertPosition = model.getPositionAt(0);
    let tokenCount = 0;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const event of events) {
        const data = event.replace(/^data:\s*/, "").trim();
        if (!data) continue;

        try {
          const parsed = JSON.parse(data);

          if (parsed.type === "token" && parsed.content) {
            tokenCount++;

            // Insert at cursor
            const range = new this.monacoInstance.Range(
              insertPosition.lineNumber,
              insertPosition.column,
              insertPosition.lineNumber,
              insertPosition.column,
            );

            this.editor.executeEdits("architect", [{
              range,
              text: parsed.content,
              forceMoveMarkers: true,
            }]);

            // Advance cursor
            const offset = model.getOffsetAt(insertPosition) + parsed.content.length;
            insertPosition = model.getPositionAt(offset);
            this.editor.setPosition(insertPosition);
            this.editor.revealPosition(
              insertPosition,
              this.monacoInstance.editor.ScrollType.Smooth,
            );

            // Emit progress every 10 tokens
            if (tokenCount % 10 === 0) {
              this.onEvent({
                type: "progress",
                state: "streaming",
                tokenCount,
              });
            }
          }

          if (parsed.type === "done") break;
        } catch {
          // Skip malformed events
        }
      }
    }

    return tokenCount;
  }

  // ─── PRIVATE: DIAGNOSTICS ─────────────────────────────

  private readDiagnostics(): DiagnosticError[] {
    const model = this.editor.getModel();
    if (!model) return [];

    const markers = this.monacoInstance.editor.getModelMarkers({
      resource: model.uri,
    });

    return markers
      .filter((m) => m.severity === this.monacoInstance.MarkerSeverity.Error)
      .map((m) => ({
        line: m.startLineNumber,
        column: m.startColumn,
        endLine: m.endLineNumber,
        endColumn: m.endColumn,
        message: m.message,
        code: m.code || "",
        snippet: this.getSnippet(model, m.startLineNumber, 2),
      }));
  }

  private getSnippet(
    model: Monaco.editor.ITextModel,
    line: number,
    radius: number,
  ): string {
    const start = Math.max(1, line - radius);
    const end = Math.min(model.getLineCount(), line + radius);
    const lines: string[] = [];
    for (let i = start; i <= end; i++) {
      const prefix = i === line ? ">>>" : "   ";
      lines.push(`${prefix} ${i}: ${model.getLineContent(i)}`);
    }
    return lines.join("\n");
  }

  // ─── PRIVATE: FIX APPLICATION ─────────────────────────

  private async applyFix(
    errors: DiagnosticError[],
    contextFiles: Record<string, { content: string }>,
  ): Promise<void> {
    const model = this.editor.getModel();
    if (!model) return;

    const currentCode = model.getValue();

    const fixPrompt = [
      `The following TypeScript code has ${errors.length} error(s).`,
      `Fix ONLY the errors. Do not add features or refactor.`,
      ``,
      `CURRENT CODE:`,
      "```tsx",
      currentCode,
      "```",
      ``,
      `ERRORS:`,
      ...errors.map((e) =>
        `Line ${e.line}: ${e.message}\n${e.snippet}`
      ),
    ].join("\n");

    const response = await fetch("/api/studio/architect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: fixPrompt,
        contextFiles,
        mode: "fix",
      }),
      signal: this.abortController!.signal,
    });

    if (!response.ok) return;

    const data = await response.json();
    const fixedCode = data.code || data.patchedCode;

    if (fixedCode && fixedCode !== currentCode) {
      // Apply fix and highlight changed lines
      model.setValue(fixedCode);
      this.highlightChangedLines(currentCode, fixedCode);

      this.onEvent({
        type: "fix_applied",
        state: "fixing",
        detail: `Applied fix for ${errors.length} error(s)`,
      });
    }
  }

  private highlightChangedLines(
    oldCode: string,
    newCode: string,
  ): void {
    const oldLines = oldCode.split("\n");
    const newLines = newCode.split("\n");
    const decorations: Monaco.editor.IModelDeltaDecoration[] = [];

    const maxLines = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLines; i++) {
      if (oldLines[i] !== newLines[i]) {
        decorations.push({
          range: new this.monacoInstance.Range(i + 1, 1, i + 1, 1),
          options: {
            isWholeLine: true,
            className: "architect-fix-highlight", // CSS: green glow
            glyphMarginClassName: "architect-fix-glyph",
          },
        });
      }
    }

    // Apply decorations, auto-remove after 3 seconds
    const ids = this.editor.deltaDecorations([], decorations);
    setTimeout(() => {
      this.editor.deltaDecorations(ids, []);
    }, 3000);
  }

  // ─── PRIVATE: HELPERS ─────────────────────────────────

  private transition(state: ArchitectState, detail: string): void {
    this.state = state;
    this.onEvent({ type: "state_change", state, detail });
  }

  private setEditorReadOnly(readOnly: boolean): void {
    this.editor.updateOptions({ readOnly });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
```

---

## 11. Streaming UI: Ghost Cursor & Matrix Rain

### 11.1 Ghost Cursor Effect

During the `streaming` state, the Monaco editor displays a "ghost typing" effect:

```css
/* src/styles/architect-streaming.css */

/* ── GHOST CURSOR ── */
/* The real Monaco cursor becomes emerald and blinks rapidly */
.architect-streaming .cursor {
  background-color: #34E27B !important;
  border-color: #34E27B !important;
  animation: architect-cursor-blink 200ms step-end infinite !important;
}

@keyframes architect-cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* ── EDITOR TINT ── */
/* Subtle emerald wash over the editor during streaming */
.architect-streaming .monaco-editor .view-overlays {
  background: rgba(52, 226, 123, 0.015);
}

/* ── READ-ONLY INDICATOR ── */
/* Top banner during streaming */
.architect-banner {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 28px;
  background: linear-gradient(90deg, rgba(52,226,123,0.1), transparent);
  display: flex;
  align-items: center;
  padding: 0 12px;
  z-index: 100;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #34E27B;
  gap: 8px;
  border-bottom: 1px solid rgba(52,226,123,0.15);
}

.architect-banner .pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34E27B;
  animation: pulse-dot 1s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.8); }
}

/* ── FIX HIGHLIGHT ── */
/* Green glow on lines changed by self-correction */
.architect-fix-highlight {
  background: rgba(52, 226, 123, 0.08) !important;
  border-left: 3px solid #34E27B !important;
  animation: fix-fade 3s ease-out forwards;
}

@keyframes fix-fade {
  0% { background: rgba(52, 226, 123, 0.15); }
  100% { background: transparent; border-left-color: transparent; }
}

.architect-fix-glyph {
  background: #34E27B;
  width: 3px !important;
  margin-left: 3px;
  border-radius: 1px;
}
```

### 11.2 Matrix Rain in the Chat Panel

While the Architect is in `planning` or `streaming` state, the chat panel shows a "Matrix rain" effect behind the progress indicator:

```typescript
// src/components/studio/MatrixRain.tsx

import React, { useRef, useEffect } from "react";

interface MatrixRainProps {
  active: boolean;
  width?: number;
  height?: number;
}

export function MatrixRain({ active, width = 300, height = 120 }: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!active || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const chars = "01アイウエオカキクケコ{}[]<>/=;:";
    const fontSize = 10;
    const columns = Math.floor(width / fontSize);
    const drops: number[] = new Array(columns).fill(1);

    function draw() {
      if (!ctx) return;

      // Semi-transparent black to create trail effect
      ctx.fillStyle = "rgba(9, 9, 11, 0.08)";
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "#34E27B";
      ctx.font = `${fontSize}px monospace`;
      ctx.globalAlpha = 0.6;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Vary brightness
        ctx.globalAlpha = Math.random() * 0.5 + 0.1;
        ctx.fillText(char, x, y);

        // Reset drop to top randomly
        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
      }
    };
  }, [active, width, height]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 opacity-30 pointer-events-none"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
```

### 11.3 Chat Panel Progress Component

```typescript
// src/components/studio/ArchitectProgress.tsx

import React from "react";
import { MatrixRain } from "./MatrixRain";
import { Loader2, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface ArchitectProgressProps {
  state: string;
  detail: string;
  tokenCount?: number;
  elapsedMs?: number;
  errors?: Array<{ line: number; message: string }>;
  iteration?: number;
}

export function ArchitectProgress({
  state,
  detail,
  tokenCount = 0,
  elapsedMs = 0,
  errors,
  iteration,
}: ArchitectProgressProps) {
  const isActive = ["planning", "streaming", "validating", "fixing"].includes(state);

  return (
    <div className="relative rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 overflow-hidden">
      {/* Matrix rain background */}
      <MatrixRain active={state === "streaming" || state === "planning"} />

      <div className="relative z-10">
        {/* Status header */}
        <div className="flex items-center gap-2 mb-3">
          {state === "streaming" && (
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
          {state === "validating" && (
            <Loader2 size={14} className="text-amber-400 animate-spin" />
          )}
          {state === "fixing" && (
            <AlertTriangle size={14} className="text-amber-400" />
          )}
          {state === "complete" && (
            <CheckCircle size={14} className="text-emerald-400" />
          )}
          {state === "failed" && (
            <XCircle size={14} className="text-red-400" />
          )}

          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
            {state === "planning" && "Analyzing..."}
            {state === "streaming" && "Generating"}
            {state === "validating" && "Type Checking"}
            {state === "fixing" && `Self-Correcting (${iteration}/${3})`}
            {state === "complete" && "Complete"}
            {state === "failed" && "Errors Remain"}
          </span>
        </div>

        {/* Detail text */}
        <p className="text-xs text-zinc-500 mb-3 font-mono">{detail}</p>

        {/* Progress bar during streaming */}
        {state === "streaming" && (
          <div className="space-y-2">
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((tokenCount / 500) * 100, 95)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
              <span>{tokenCount} tokens</span>
              <span>{(elapsedMs / 1000).toFixed(1)}s</span>
            </div>
          </div>
        )}

        {/* Error list during fixing/failed */}
        {errors && errors.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {errors.slice(0, 5).map((err, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-[11px] font-mono"
              >
                <span className="text-red-400 shrink-0">L{err.line}</span>
                <span className="text-zinc-500 truncate">{err.message}</span>
              </div>
            ))}
            {errors.length > 5 && (
              <span className="text-[10px] text-zinc-600">
                +{errors.length - 5} more errors
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 11.4 Editor Banner Component

```typescript
// src/components/studio/ArchitectBanner.tsx

import React from "react";

interface ArchitectBannerProps {
  state: string;
  visible: boolean;
}

export function ArchitectBanner({ state, visible }: ArchitectBannerProps) {
  if (!visible) return null;

  const labels: Record<string, string> = {
    streaming: "Architect Mode — Generating...",
    validating: "Architect Mode — Validating...",
    fixing: "Architect Mode — Self-Correcting...",
    complete: "Architect Mode — Complete",
  };

  const colors: Record<string, string> = {
    streaming: "text-emerald-400 border-emerald-400/15",
    validating: "text-amber-400 border-amber-400/15",
    fixing: "text-amber-400 border-amber-400/15",
    complete: "text-emerald-400 border-emerald-400/15",
  };

  return (
    <div
      className={`absolute top-0 left-0 right-0 h-7 z-50 flex items-center px-3 gap-2 border-b ${
        colors[state] || "text-zinc-500 border-zinc-800"
      }`}
      style={{
        background:
          state === "streaming"
            ? "linear-gradient(90deg, rgba(52,226,123,0.08), transparent)"
            : state === "fixing"
              ? "linear-gradient(90deg, rgba(251,191,36,0.08), transparent)"
              : "rgba(9,9,11,0.9)",
      }}
    >
      {state !== "complete" && (
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            state === "fixing" ? "bg-amber-400" : "bg-emerald-400"
          } animate-pulse`}
        />
      )}
      {state === "complete" && (
        <span className="text-emerald-400">✓</span>
      )}
      <span className="text-[9px] font-black uppercase tracking-[0.25em]">
        {labels[state] || "Architect Mode"}
      </span>
    </div>
  );
}
```

---

# ═══════════════════════════════════════════════════════════════
# PART IV: EXTERNAL CONNECTIVITY & SANDBOX IO
# Model: Kimi (Integrator)
# Domain: Proxy Gate, Domain Allowlist, External Widget Integration
# ═══════════════════════════════════════════════════════════════

---

## 12. The Proxy Gate

### 12.1 Problem Statement

Mini-Apps run in a sandboxed iframe with an opaque origin. The Content Security Policy (CSP) blocks `connect-src` to arbitrary domains. This is intentional — a malicious Mini-App could:

- **Exfiltrate vault data** to an attacker-controlled server.
- **Phone home** with the user's wallet address and token balances.
- **Proxy-jack** the user's session by forwarding bridge messages externally.

However, legitimate Mini-Apps need external data: price feeds, DeFi protocol APIs, on-chain data, chart data, etc. The solution is a **Proxy Gate** — all external HTTP requests are routed through a Keystone-controlled Next.js API route that enforces an allowlist.

### 12.2 The `useFetch()` SDK Hook

Mini-Apps use `useFetch()` instead of `fetch()`. This hook sends the request to the Keystone proxy, which validates the target domain against the allowlist before forwarding.

```typescript
// @keystone-os/sdk — useFetch implementation (inside iframe)

interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;       // Default: 10000ms
  cache?: "default" | "no-cache" | "force-cache";
  retries?: number;       // Default: 0
}

interface FetchResult<T = any> {
  data: T | null;
  error: string | null;
  loading: boolean;
  status: number | null;
  refetch: () => Promise<void>;
}

export function useFetch<T = any>(
  url: string,
  options: FetchOptions = {},
): FetchResult<T> {
  const [state, setState] = React.useState<FetchResult<T>>({
    data: null,
    error: null,
    loading: true,
    status: null,
    refetch: async () => {},
  });

  const fetchData = React.useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Route through the bridge → parent → proxy
      const response = await new Promise<{ data: T; status: number }>((resolve, reject) => {
        const requestId = crypto.randomUUID();

        const handler = (event: MessageEvent) => {
          if (event.data.type === "PROXY_RESPONSE" && event.data.id === requestId) {
            window.removeEventListener("message", handler);
            if (event.data.error) {
              reject(new Error(event.data.error));
            } else {
              resolve({ data: event.data.body, status: event.data.status });
            }
          }
        };

        window.addEventListener("message", handler);

        // Timeout
        const timeoutMs = options.timeout || 10000;
        setTimeout(() => {
          window.removeEventListener("message", handler);
          reject(new Error(`Proxy request timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        // Send request to parent via bridge
        window.parent.postMessage({
          type: "PROXY_REQUEST",
          id: requestId,
          payload: {
            url,
            method: options.method || "GET",
            headers: options.headers || {},
            body: options.body,
          },
        }, "*");
      });

      setState({
        data: response.data,
        error: null,
        loading: false,
        status: response.status,
        refetch: fetchData,
      });
    } catch (err: any) {
      setState({
        data: null,
        error: err.message,
        loading: false,
        status: null,
        refetch: fetchData,
      });
    }
  }, [url, options.method, options.body]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return state;
}
```

### 12.3 Parent-Side Bridge Handler

The parent window (Keystone OS) listens for `PROXY_REQUEST` messages from the iframe and forwards them to the Next.js proxy API:

```typescript
// src/lib/studio/proxy-bridge.ts

export function setupProxyBridge(
  iframeRef: React.RefObject<HTMLIFrameElement>,
) {
  const handler = async (event: MessageEvent) => {
    // Validate source
    if (event.source !== iframeRef.current?.contentWindow) return;
    if (event.data.type !== "PROXY_REQUEST") return;

    const { id, payload } = event.data;
    const { url, method, headers, body } = payload;

    try {
      const response = await fetch("/api/studio/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, method, headers, body }),
      });

      const result = await response.json();

      if (!response.ok) {
        iframeRef.current?.contentWindow?.postMessage({
          type: "PROXY_RESPONSE",
          id,
          error: result.error || `Proxy error: ${response.status}`,
          status: response.status,
        }, "*");
        return;
      }

      iframeRef.current?.contentWindow?.postMessage({
        type: "PROXY_RESPONSE",
        id,
        body: result.data,
        status: result.status,
      }, "*");
    } catch (err: any) {
      iframeRef.current?.contentWindow?.postMessage({
        type: "PROXY_RESPONSE",
        id,
        error: err.message,
      }, "*");
    }
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}
```

### 12.4 The Proxy API Route

```typescript
// src/app/api/studio/proxy/route.ts

import { NextRequest, NextResponse } from "next/server";
import { isAllowedDomain } from "@/lib/studio/domain-allowlist";

// Rate limiting per user session
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;          // requests per window
const RATE_WINDOW_MS = 60_000;  // 1 minute

export async function POST(req: NextRequest) {
  const { url, method, headers, body } = await req.json();

  // 1. Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json(
      { error: "Invalid URL format" },
      { status: 400 },
    );
  }

  // 2. Check allowlist
  const allowed = isAllowedDomain(parsedUrl);
  if (!allowed.permitted) {
    return NextResponse.json(
      {
        error: `Domain "${parsedUrl.hostname}" is not in the allowlist. ${allowed.reason}`,
        allowedDomains: allowed.suggestions,
      },
      { status: 403 },
    );
  }

  // 3. Rate limiting
  const clientIp = req.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();
  const limiter = rateLimiter.get(clientIp);

  if (limiter) {
    if (now > limiter.resetAt) {
      rateLimiter.set(clientIp, { count: 1, resetAt: now + RATE_WINDOW_MS });
    } else if (limiter.count >= RATE_LIMIT) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Max ${RATE_LIMIT} requests per minute.` },
        { status: 429 },
      );
    } else {
      limiter.count++;
    }
  } else {
    rateLimiter.set(clientIp, { count: 1, resetAt: now + RATE_WINDOW_MS });
  }

  // 4. Sanitize headers — strip sensitive headers
  const safeHeaders: Record<string, string> = {};
  const BLOCKED_HEADERS = [
    "cookie", "authorization", "x-api-key",
    "x-forwarded-for", "x-real-ip",
  ];

  for (const [key, value] of Object.entries(headers || {})) {
    if (!BLOCKED_HEADERS.includes(key.toLowerCase())) {
      safeHeaders[key] = value as string;
    }
  }

  // 5. Add Keystone proxy identifier
  safeHeaders["X-Keystone-Proxy"] = "1";
  safeHeaders["User-Agent"] = "Keystone-Studio-Proxy/1.0";

  // 6. Forward the request
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(url, {
      method: method || "GET",
      headers: safeHeaders,
      body: method !== "GET" && body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // 7. Read response
    const contentType = response.headers.get("content-type") || "";
    let responseData: any;

    if (contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    // 8. Limit response size (1MB max)
    const responseStr = JSON.stringify(responseData);
    if (responseStr.length > 1_000_000) {
      return NextResponse.json(
        { error: "Response exceeds 1MB size limit" },
        { status: 413 },
      );
    }

    return NextResponse.json({
      data: responseData,
      status: response.status,
      headers: {
        "content-type": contentType,
      },
    });
  } catch (err: any) {
    if (err.name === "AbortError") {
      return NextResponse.json(
        { error: "Upstream request timed out (15s)" },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { error: `Proxy fetch failed: ${err.message}` },
      { status: 502 },
    );
  }
}
```

---

## 13. Allowlist Logic

### 13.1 Design Principles

1. **Default deny** — all domains are blocked unless explicitly allowed.
2. **Category-based** — domains are grouped by purpose (DeFi, Data, Infrastructure).
3. **Path-scoped** — some domains are only allowed for specific API paths.
4. **User-extensible** — developers can request new domains via a review process (future).

### 13.2 The Allowlist Registry

```typescript
// src/lib/studio/domain-allowlist.ts

interface AllowlistEntry {
  domain: string;
  category: "defi" | "data" | "infrastructure" | "social" | "storage";
  description: string;
  pathPatterns?: RegExp[];  // If set, only these paths are allowed
  methods?: string[];       // If set, only these HTTP methods are allowed
  rateLimit?: number;       // Per-minute rate limit override for this domain
}

const DOMAIN_ALLOWLIST: AllowlistEntry[] = [
  // ═══════════════════════════════════════
  // SOLANA INFRASTRUCTURE
  // ═══════════════════════════════════════
  {
    domain: "api.mainnet-beta.solana.com",
    category: "infrastructure",
    description: "Solana Mainnet RPC",
    methods: ["POST"],
  },
  {
    domain: "api.devnet.solana.com",
    category: "infrastructure",
    description: "Solana Devnet RPC",
    methods: ["POST"],
  },
  {
    domain: "*.helius-rpc.com",
    category: "infrastructure",
    description: "Helius RPC endpoints",
    methods: ["POST"],
  },
  {
    domain: "api.helius.xyz",
    category: "infrastructure",
    description: "Helius DAS API",
    pathPatterns: [/^\/v0\//, /^\/v1\//],
  },

  // ═══════════════════════════════════════
  // DEFI PROTOCOLS
  // ═══════════════════════════════════════
  {
    domain: "quote-api.jup.ag",
    category: "defi",
    description: "Jupiter Aggregator — Swap quotes",
    pathPatterns: [/^\/v6\/quote/, /^\/v6\/swap/],
    methods: ["GET", "POST"],
  },
  {
    domain: "price.jup.ag",
    category: "defi",
    description: "Jupiter Price API",
    pathPatterns: [/^\/v6\/price/],
    methods: ["GET"],
  },
  {
    domain: "api.raydium.io",
    category: "defi",
    description: "Raydium AMM API",
    methods: ["GET"],
  },
  {
    domain: "api.orca.so",
    category: "defi",
    description: "Orca Whirlpool API",
    methods: ["GET"],
  },
  {
    domain: "api.marinade.finance",
    category: "defi",
    description: "Marinade Staking API",
    methods: ["GET", "POST"],
  },
  {
    domain: "api.marginfi.com",
    category: "defi",
    description: "marginfi Lending API",
    methods: ["GET"],
  },
  {
    domain: "api.jito.network",
    category: "defi",
    description: "Jito MEV & Staking API",
    methods: ["GET", "POST"],
  },

  // ═══════════════════════════════════════
  // DATA & ANALYTICS
  // ═══════════════════════════════════════
  {
    domain: "api.coingecko.com",
    category: "data",
    description: "CoinGecko price data",
    pathPatterns: [/^\/api\/v3\//],
    methods: ["GET"],
    rateLimit: 30, // CoinGecko has strict rate limits
  },
  {
    domain: "pro-api.coinmarketcap.com",
    category: "data",
    description: "CoinMarketCap data",
    methods: ["GET"],
    rateLimit: 30,
  },
  {
    domain: "api.dexscreener.com",
    category: "data",
    description: "DEX Screener — pair/token data",
    pathPatterns: [/^\/latest\//],
    methods: ["GET"],
  },
  {
    domain: "public-api.birdeye.so",
    category: "data",
    description: "Birdeye token analytics",
    methods: ["GET"],
  },
  {
    domain: "streaming.bitquery.io",
    category: "data",
    description: "Bitquery GraphQL streaming",
    methods: ["POST"],
  },
  {
    domain: "api.flipside.xyz",
    category: "data",
    description: "Flipside Crypto analytics",
    methods: ["GET", "POST"],
  },

  // ═══════════════════════════════════════
  // STORAGE & MEDIA
  // ═══════════════════════════════════════
  {
    domain: "arweave.net",
    category: "storage",
    description: "Arweave gateway — read-only",
    methods: ["GET"],
  },
  {
    domain: "*.ipfs.io",
    category: "storage",
    description: "IPFS gateway — read-only",
    methods: ["GET"],
  },
  {
    domain: "api.dicebear.com",
    category: "social",
    description: "Avatar generation",
    methods: ["GET"],
  },
  {
    domain: "raw.githubusercontent.com",
    category: "storage",
    description: "GitHub raw content — token lists, configs",
    methods: ["GET"],
  },
];

// ═══════════════════════════════════════
// MATCHER
// ═══════════════════════════════════════

interface AllowlistResult {
  permitted: boolean;
  reason: string;
  suggestions?: string[];
}

export function isAllowedDomain(url: URL): AllowlistResult {
  const hostname = url.hostname;
  const pathname = url.pathname;
  const method = "GET"; // Default; actual method passed separately

  for (const entry of DOMAIN_ALLOWLIST) {
    // Support wildcard subdomains: *.helius-rpc.com
    const domainPattern = entry.domain.replace("*.", "");
    const matches = entry.domain.startsWith("*.")
      ? hostname.endsWith(domainPattern)
      : hostname === entry.domain;

    if (!matches) continue;

    // Check path patterns if specified
    if (entry.pathPatterns && entry.pathPatterns.length > 0) {
      const pathAllowed = entry.pathPatterns.some((p) => p.test(pathname));
      if (!pathAllowed) {
        return {
          permitted: false,
          reason: `Domain "${hostname}" is allowed, but path "${pathname}" is not permitted.`,
        };
      }
    }

    return { permitted: true, reason: "Allowed" };
  }

  // Not found — suggest similar domains
  const suggestions = DOMAIN_ALLOWLIST
    .filter((e) => {
      const baseDomain = e.domain.replace("*.", "");
      return hostname.includes(baseDomain.split(".")[0]);
    })
    .map((e) => e.domain)
    .slice(0, 3);

  return {
    permitted: false,
    reason: `Domain "${hostname}" is not in the Keystone allowlist. Mini-Apps can only access pre-approved APIs for security.`,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}

// ═══════════════════════════════════════
// DOMAIN LISTING (for UI display)
// ═══════════════════════════════════════

export function getAllowedDomains(): {
  category: string;
  domains: { domain: string; description: string }[];
}[] {
  const grouped = new Map<string, { domain: string; description: string }[]>();

  for (const entry of DOMAIN_ALLOWLIST) {
    const list = grouped.get(entry.category) || [];
    list.push({ domain: entry.domain, description: entry.description });
    grouped.set(entry.category, list);
  }

  return Array.from(grouped.entries()).map(([category, domains]) => ({
    category,
    domains,
  }));
}
```

### 13.3 Method-Level Enforcement

The proxy also validates HTTP methods per domain:

```typescript
// Enhanced check in the proxy route (addition to Section 12.4)

export function isMethodAllowed(url: URL, method: string): boolean {
  const hostname = url.hostname;

  for (const entry of DOMAIN_ALLOWLIST) {
    const domainPattern = entry.domain.replace("*.", "");
    const matches = entry.domain.startsWith("*.")
      ? hostname.endsWith(domainPattern)
      : hostname === entry.domain;

    if (!matches) continue;

    // If no method restriction, all methods allowed
    if (!entry.methods) return true;

    return entry.methods.includes(method.toUpperCase());
  }

  return false;
}
```

### 13.4 Anti-Exfiltration Measures

Beyond the domain allowlist, additional protections prevent data leakage:

| Measure | Implementation | Rationale |
|---|---|---|
| **Request body size limit** | Max 100KB per request body | Prevents bulk data exfiltration |
| **Response size limit** | Max 1MB per response | Prevents memory exhaustion in iframe |
| **Rate limiting** | 60 req/min per user session | Prevents abuse and API key exhaustion |
| **No auth forwarding** | Strip `Authorization`, `Cookie`, `X-API-Key` headers | Prevents credential leakage |
| **Logging** | Log all proxy requests with user ID, domain, path | Audit trail for abuse detection |
| **POST body inspection** | Reject if body contains wallet private keys or seed phrases | Defense in depth against exfiltration |

```typescript
// src/lib/studio/proxy-sanitizer.ts

const SENSITIVE_PATTERNS = [
  /[1-9A-HJ-NP-Za-km-z]{87,88}/,     // Base58 private key (Solana)
  /0x[a-fA-F0-9]{64}/,                 // Hex private key (EVM)
  /\b(abandon|ability|able)\b.*\b(zoo|zone)\b/i, // BIP39 mnemonic fragment
  /-----BEGIN.*PRIVATE KEY-----/,       // PEM private key
];

export function containsSensitiveData(body: any): boolean {
  const bodyStr = typeof body === "string" ? body : JSON.stringify(body);

  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(bodyStr)) return true;
  }

  return false;
}
```

---

## 14. External Widget Integration

### 14.1 Problem Statement

Some Mini-Apps need to embed third-party widgets:
- **TradingView** — Advanced charting (candlestick, indicators).
- **Jupiter Terminal** — Swap widget for in-app token swaps.
- **Dialect Blinks** — Solana Actions/Blinks rendering.

These widgets typically require loading external scripts, which the sandbox CSP blocks. We need a controlled mechanism to allow specific widget integrations.

### 14.2 The Widget Registry

Widgets are pre-approved, sandboxed components that the SDK provides as React wrappers. They are NOT arbitrary iframes — each widget is a curated integration.

```typescript
// @keystone-os/sdk — Widget components

// ═══════════════════════════════════════
// TRADINGVIEW CHART WIDGET
// ═══════════════════════════════════════

interface TradingViewChartProps {
  symbol: string;           // e.g., "SOL/USDC"
  interval?: string;        // "1m" | "5m" | "15m" | "1h" | "4h" | "1D"
  theme?: "dark" | "light";
  height?: number;
  showToolbar?: boolean;
  showVolume?: boolean;
  indicators?: string[];    // e.g., ["RSI", "MACD", "BB"]
}

export const TradingViewChart: React.FC<TradingViewChartProps>;

// ═══════════════════════════════════════
// JUPITER SWAP WIDGET
// ═══════════════════════════════════════

interface JupiterSwapProps {
  inputMint?: string;       // Default input token mint
  outputMint?: string;      // Default output token mint
  fixedInputMint?: boolean; // Lock the input token
  fixedOutputMint?: boolean;
  initialAmount?: string;   // Pre-filled amount
  onSuccess?: (txSignature: string) => void;
  onError?: (error: string) => void;
  compact?: boolean;        // Minimal UI mode
}

export const JupiterSwap: React.FC<JupiterSwapProps>;

// ═══════════════════════════════════════
// TOKEN INFO CARD
// ═══════════════════════════════════════

interface TokenInfoProps {
  mint: string;             // Token mint address
  showChart?: boolean;      // Include mini price chart
  showHolders?: boolean;    // Show holder count
  showLinks?: boolean;      // Show social/website links
}

export const TokenInfo: React.FC<TokenInfoProps>;
```

### 14.3 Widget Implementation Architecture

Widgets are implemented as **nested iframes** within the Mini-App iframe. Each widget iframe has its own CSP that allows loading the specific third-party script.

```
┌─ Keystone OS (Parent) ──────────────────────────────────┐
│                                                          │
│  ┌─ Mini-App Iframe (Sandbox) ────────────────────────┐  │
│  │  CSP: script-src 'self' blob: esm.sh unpkg.com    │  │
│  │                                                    │  │
│  │  ┌─ Widget Iframe (Nested) ─────────────────────┐  │  │
│  │  │  CSP: script-src 'self' s3.tradingview.com   │  │  │
│  │  │                                               │  │  │
│  │  │  <script src="tradingview/charting.js">       │  │  │
│  │  │  Renders chart inside this nested iframe      │  │  │
│  │  │                                               │  │  │
│  │  │  Communication: postMessage to parent iframe  │  │  │
│  │  └───────────────────────────────────────────────┘  │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 14.4 TradingView Widget Implementation

```typescript
// src/lib/studio/widgets/tradingview-widget.ts
// This code runs INSIDE the Mini-App iframe as part of the SDK

import React, { useRef, useEffect } from "react";

interface TradingViewChartProps {
  symbol: string;
  interval?: string;
  theme?: "dark" | "light";
  height?: number;
  showToolbar?: boolean;
  showVolume?: boolean;
}

export function TradingViewChart({
  symbol,
  interval = "1h",
  theme = "dark",
  height = 400,
  showToolbar = true,
  showVolume = true,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Build the widget iframe HTML
    const widgetHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; overflow: hidden; background: ${theme === "dark" ? "#09090b" : "#fff"}; }
    #tv-container { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="tv-container"></div>
  <script src="https://s3.tradingview.com/tv.js"></script>
  <script>
    new TradingView.widget({
      container_id: "tv-container",
      symbol: "${symbol.replace("/", "")}",
      interval: "${interval}",
      theme: "${theme === "dark" ? "dark" : "light"}",
      style: "1",
      locale: "en",
      toolbar_bg: "${theme === "dark" ? "#09090b" : "#f1f3f6"}",
      enable_publishing: false,
      hide_top_toolbar: ${!showToolbar},
      hide_legend: false,
      save_image: false,
      hide_volume: ${!showVolume},
      width: "100%",
      height: "100%",
      backgroundColor: "${theme === "dark" ? "#09090b" : "#ffffff"}",
      gridColor: "${theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.06)"}",
      autosize: true,
    });
  </script>
</body>
</html>`;

    // Create sandboxed iframe for the widget
    const iframe = document.createElement("iframe");
    iframe.style.width = "100%";
    iframe.style.height = `${height}px`;
    iframe.style.border = "none";
    iframe.style.borderRadius = "8px";
    iframe.style.overflow = "hidden";

    // Widget iframe sandbox — more permissive than Mini-App iframe
    // because it needs to load TradingView scripts
    iframe.sandbox.add("allow-scripts");
    iframe.sandbox.add("allow-same-origin"); // Required for TradingView
    // NOTE: This iframe is nested INSIDE the Mini-App iframe,
    // so allow-same-origin here does NOT give access to Keystone OS parent.
    // The Mini-App iframe's own sandbox prevents upward escape.

    iframe.srcdoc = widgetHtml;

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(iframe);
    iframeRef.current = iframe;

    return () => {
      if (iframeRef.current) {
        iframeRef.current.remove();
        iframeRef.current = null;
      }
    };
  }, [symbol, interval, theme, height, showToolbar, showVolume]);

  return React.createElement("div", {
    ref: containerRef,
    style: {
      width: "100%",
      height: `${height}px`,
      borderRadius: "8px",
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.05)",
    },
  });
}
```

### 14.5 Jupiter Swap Widget Implementation

```typescript
// src/lib/studio/widgets/jupiter-widget.ts

import React, { useRef, useEffect } from "react";

interface JupiterSwapProps {
  inputMint?: string;
  outputMint?: string;
  fixedInputMint?: boolean;
  fixedOutputMint?: boolean;
  initialAmount?: string;
  onSuccess?: (txSignature: string) => void;
  onError?: (error: string) => void;
  compact?: boolean;
}

export function JupiterSwap({
  inputMint = "So11111111111111111111111111111111111111112", // SOL
  outputMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  fixedInputMint = false,
  fixedOutputMint = false,
  initialAmount = "",
  onSuccess,
  onError,
  compact = false,
}: JupiterSwapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Jupiter Terminal loads via their CDN script
    const widgetHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; background: #09090b; display: flex; justify-content: center; padding: 16px; }
  </style>
</head>
<body>
  <div id="jupiter-terminal"></div>
  <script src="https://terminal.jup.ag/main-v2-alpha.js"></script>
  <script>
    window.Jupiter.init({
      displayMode: "${compact ? "widget" : "integrated"}",
      integratedTargetId: "jupiter-terminal",
      endpoint: "https://api.mainnet-beta.solana.com",
      formProps: {
        initialInputMint: "${inputMint}",
        initialOutputMint: "${outputMint}",
        fixedInputMint: ${fixedInputMint},
        fixedOutputMint: ${fixedOutputMint},
        initialAmount: "${initialAmount}",
      },
      enableWalletPassthrough: true,
      onSuccess: ({ txid }) => {
        window.parent.postMessage({
          type: "JUPITER_SWAP_SUCCESS",
          txSignature: txid,
        }, "*");
      },
      onSwapError: ({ error }) => {
        window.parent.postMessage({
          type: "JUPITER_SWAP_ERROR",
          error: error.message || "Swap failed",
        }, "*");
      },
    });
  </script>
</body>
</html>`;

    const iframe = document.createElement("iframe");
    iframe.style.width = "100%";
    iframe.style.height = compact ? "300px" : "500px";
    iframe.style.border = "none";
    iframe.style.borderRadius = "12px";
    iframe.sandbox.add("allow-scripts");
    iframe.sandbox.add("allow-same-origin");
    iframe.sandbox.add("allow-forms");
    iframe.srcdoc = widgetHtml;

    // Listen for swap results from the widget iframe
    const handler = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      if (event.data.type === "JUPITER_SWAP_SUCCESS" && onSuccess) {
        onSuccess(event.data.txSignature);
      }
      if (event.data.type === "JUPITER_SWAP_ERROR" && onError) {
        onError(event.data.error);
      }
    };

    window.addEventListener("message", handler);
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(iframe);

    return () => {
      window.removeEventListener("message", handler);
      iframe.remove();
    };
  }, [inputMint, outputMint, fixedInputMint, fixedOutputMint, initialAmount, compact]);

  return React.createElement("div", {
    ref: containerRef,
    style: {
      width: "100%",
      borderRadius: "12px",
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.05)",
    },
  });
}
```

### 14.6 Widget Security Model

| Concern | Mitigation |
|---|---|
| **Widget iframe escaping to Keystone OS** | Widget iframe is nested inside Mini-App iframe. The Mini-App iframe's sandbox (`allow-scripts` only, no `allow-same-origin`) prevents any upward traversal. The widget can only `postMessage` to the Mini-App iframe, not to Keystone OS. |
| **Widget loading malicious scripts** | Only pre-approved widget types exist. The widget HTML is generated by the SDK, not by the Mini-App developer. Developers cannot create arbitrary nested iframes. |
| **Widget accessing user wallet** | Widget iframes have no access to the Turnkey bridge. Only the Mini-App iframe can communicate with the parent via the bridge. Widgets must request actions through the Mini-App. |
| **Widget exfiltrating data** | Widget iframes have their own CSP scoped to the specific widget's CDN. They cannot make arbitrary network requests. |
| **Developer creating custom iframes** | The Security Scanner (Section 3) rejects code containing `document.createElement('iframe')`. Only SDK-provided widget components can create nested iframes. |

### 14.7 Usage Example

A Mini-App using both TradingView and Jupiter:

```typescript
import React from "react";
import { useVault, TradingViewChart, JupiterSwap } from "@keystone-os/sdk";

export default function TradingDashboard() {
  const { tokens, totalValueUsd } = useVault();

  return (
    <div className="min-h-screen bg-zinc-950 p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Trading Dashboard</h1>

      {/* TradingView Chart */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
          SOL/USDC Chart
        </h2>
        <TradingViewChart
          symbol="SOL/USDC"
          interval="1h"
          height={400}
          showVolume={true}
        />
      </div>

      {/* Jupiter Swap */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
          Quick Swap
        </h2>
        <JupiterSwap
          inputMint="So11111111111111111111111111111111111111112"
          outputMint="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
          compact={true}
          onSuccess={(sig) => console.log("Swap complete:", sig)}
        />
      </div>

      {/* Portfolio */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
          Portfolio — ${totalValueUsd?.toLocaleString()}
        </h2>
        {tokens?.map((t) => (
          <div key={t.symbol} className="flex justify-between p-3 rounded-lg border border-zinc-800">
            <span className="font-bold text-white">{t.symbol}</span>
            <span className="font-mono text-zinc-400">{t.balance.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

*End of OPUS Phase 2 Deep Dive — Unified Specification*
