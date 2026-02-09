# KEYSTONE STUDIO — Phase 2: The Deep Dive Master Specification

**Architecture:** Diamond Merge (Opus Security + GPT Runtime + Gemini Protocol)  
**Phase:** 2 — Detailed Implementation Specifications  
**Date:** January 2026  
**Status:** LOCKED — Ready for Implementation  

---

## Document Structure

This master specification consolidates four domain-specific specs into a single authoritative document:

| Part | Model | Domain | Sections |
|------|-------|--------|----------|
| **Part I** | OPUS (System Architect) | Marketplace & App Registry | Storage, Revenue Split, Security Scan, Installation |
| **Part II** | GPT (Runtime Engineer) | Compiler & Runtime Environment | Lockfile, Babel Pipeline, TS Config, Templates |
| **Part III** | GEMINI (AI Specialist) | The Architect AI Agent | System Prompt, Self-Correction State Machine, Streaming UI |
| **Part IV** | KIMI (The Integrator) | External Connectivity & Sandbox IO | Proxy Gate, Allowlist, Widget Integration |

### Cross-Document Dependencies

- **OPUS** Security Scan → validates the `allowedDomains` from **KIMI**'s manifest spec
- **GPT** Lockfile → resolves the `dependencies` declared in **OPUS**'s manifest schema
- **GEMINI** System Prompt → references the SDK hooks typed in **GPT**'s `.d.ts` definitions
- **KIMI** `useFetch()` → is part of the virtual SDK module whose types **GPT** injects into Monaco
- **GEMINI** Self-Correction Loop → reads Monaco markers configured by **GPT**'s tsconfig

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PART I: OPUS — Keystone Marketplace & App Registry Specification
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Model:** Claude Opus Thinking (System Architect)  
**Domain:** Storage, Distribution, Revenue, Security Scanning, Installation Lifecycle  

---

## OPUS §1. Storage & Distribution

### OPUS §1.1 The Decision: Hybrid Storage (SQL + Arweave)

| Layer | What It Stores | Why |
|-------|---------------|-----|
| **SQLite (Turso)** | App metadata, indexes, ratings, install counts, purchase records | Fast queries, real-time marketplace browsing, relational joins |
| **Arweave** | Immutable source code bundles (the actual `.tsx` files) | Permanent, censorship-resistant, content-addressable, auditable |
| **NOT IPFS** | — | IPFS requires pinning services to stay available. Arweave is permanent by default. |
| **NOT centralized-only** | — | If Keystone goes down, creators lose their published code. Arweave ensures permanence. |

**Flow:** When a creator publishes, the code is uploaded to Arweave and the returned transaction ID is stored in the SQL `mini_apps.arweave_tx_id` column. The SQL DB is the index; Arweave is the source of truth.

### OPUS §1.2 Enhanced Database Schema

The current `miniApps` table in `src/db/schema.ts:193-222` is a solid start but missing critical fields for a production marketplace. Here is the complete schema:

```typescript
// src/db/schema.ts — Enhanced mini_apps table

export const miniApps = sqliteTable('mini_apps', {
  // ─── Identity ─────────────────────────────────────────
  id: text('id').primaryKey(),                          // app_abc123
  slug: text('slug').notNull().unique(),                // "raydium-sniper" (URL-friendly)
  name: text('name').notNull(),
  description: text('description').notNull(),
  longDescription: text('long_description'),            // Markdown, shown on detail page
  iconUrl: text('icon_url'),                            // Dicebear or custom

  // ─── Code Storage ─────────────────────────────────────
  code: text('code', { mode: 'json' }).notNull(),       // { files: { "App.tsx": "...", ... } }
  codeHash: text('code_hash').notNull(),                 // SHA-256 of JSON.stringify(code)
  arweaveTxId: text('arweave_tx_id'),                   // Arweave transaction ID (set on publish)
  lockfile: text('lockfile', { mode: 'json' }),          // keystone.lock.json (dependency pins)

  // ─── Versioning ───────────────────────────────────────
  version: text('version').notNull().default("1.0.0"),   // semver
  versionHistory: text('version_history', { mode: 'json' }), // [{ version, codeHash, arweaveTxId, date }]
  changelog: text('changelog'),                          // Markdown per-version notes

  // ─── Smart Contract (Optional) ────────────────────────
  contractCode: text('contract_code'),                   // Anchor/Rust source
  programId: text('program_id'),                         // Deployed program address
  contractAuditUrl: text('contract_audit_url'),          // Link to audit report

  // ─── Creator ──────────────────────────────────────────
  creatorWallet: text('creator_wallet').notNull(),
  creatorShare: real('creator_share').notNull().default(0.8),

  // ─── Marketplace ──────────────────────────────────────
  isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
  priceUsdc: real('price_usdc').notNull().default(0),
  category: text('category').notNull().default("utility"),
  tags: text('tags', { mode: 'json' }),                 // ["defi", "sniper", "raydium"]

  // ─── Security ─────────────────────────────────────────
  securityScanPassed: integer('security_scan_passed', { mode: 'boolean' }).default(false),
  securityScanReport: text('security_scan_report', { mode: 'json' }), // { passed, violations, scannedAt }
  securityScanVersion: text('security_scan_version'),    // Scanner version that approved it

  // ─── Manifest (Permissions) ───────────────────────────
  manifest: text('manifest', { mode: 'json' }),          // keystone.manifest.json (see below)

  // ─── Stats ────────────────────────────────────────────
  installs: integer('installs').notNull().default(0),
  rating: real('rating'),
  reviewCount: integer('review_count').notNull().default(0),
  totalRevenue: real('total_revenue').notNull().default(0),

  // ─── Timestamps ───────────────────────────────────────
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  publishedAt: integer('published_at'),
}, (table) => ({
  creatorIdx: index('mini_apps_creator_idx').on(table.creatorWallet),
  categoryIdx: index('mini_apps_category_idx').on(table.category),
  publishedIdx: index('mini_apps_published_idx').on(table.isPublished),
  slugIdx: index('mini_apps_slug_idx').on(table.slug),
}));
```

### OPUS §1.3 The App Manifest: `keystone.manifest.json`

Every Mini-App must declare its permissions and dependencies. This is stored in the `manifest` column and enforced at runtime.

```jsonc
{
  "name": "Raydium Sniper",
  "version": "1.2.4",
  "author": "7KeY...StUdIo",
  "license": "MIT",

  // SDK hooks the app uses (enforced — if it imports useSimulate but
  // doesn't declare it here, the security scan rejects it)
  "permissions": {
    "vault.read": true,          // useVault() — read balances
    "vault.subscribe": true,     // useVault().subscribe() — real-time
    "turnkey.sign": true,        // useTurnkey().signTransaction()
    "events.listen": ["ON_BLOCK_UPDATE", "ON_PRICE_CHANGE"],
    "simulate": true,            // useSimulate()
    "proxy.fetch": true          // useFetch() — external API via proxy
  },

  // External domains the app may fetch via /api/proxy
  "allowedDomains": [
    "api.jup.ag",
    "api.raydium.io",
    "price.jup.ag"
  ],

  // On-chain programs the app may interact with (validated by Simulation Firewall)
  "allowedPrograms": [
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",  // Jupiter v6
    "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"   // Raydium AMM
  ],

  // NPM dependencies with pinned versions
  "dependencies": {
    "recharts": "2.15.0",
    "framer-motion": "11.15.0",
    "lightweight-charts": "4.2.1"
  },

  // Entry point
  "entry": "App.tsx"
}
```

### OPUS §1.4 Versioning Strategy

```
Version History is an append-only JSON array:

[
  { "version": "1.0.0", "codeHash": "sha256:abc...", "arweaveTxId": "tx_001", "date": 1706000000 },
  { "version": "1.1.0", "codeHash": "sha256:def...", "arweaveTxId": "tx_002", "date": 1706100000 },
  { "version": "1.2.4", "codeHash": "sha256:ghi...", "arweaveTxId": "tx_003", "date": 1706200000 }
]
```

- Users always run the latest version unless they pin a version (future feature).
- Rollback = re-publish a previous version's code as a new version entry.
- Arweave stores every version permanently — full audit trail.

---

## OPUS §2. The 80/20 Revenue Split

### OPUS §2.1 Decision: On-Chain Split (No License Token NFT)

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **License Token (NFT)** | Resellable, composable, on-chain proof of ownership | Adds SPL token complexity, requires marketplace for secondary sales, gas costs for minting, UX friction | ❌ Overkill for v1 |
| **On-Chain Split TX + DB Flag** | Simple, atomic, verifiable on-chain, low gas | Not resellable | ✅ Ship this |

**Rationale:** A License NFT is a v2 feature. For launch, the 80/20 split happens atomically in a single Solana transaction (2 transfer instructions), and the `purchases` table records the receipt. The on-chain `txSignature` is the proof of purchase.

### OPUS §2.2 Enhanced Payment Flow

The current `marketplace-payments.ts` is functional but needs hardening:

```typescript
// src/lib/studio/marketplace-payments.ts — Production-ready

import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createTransferInstruction, getAssociatedTokenAddress, getAccount, createAssociatedTokenAccountInstruction } from "@solana/spl-token";

const KEYSTONE_TREASURY = new PublicKey(process.env.NEXT_PUBLIC_KEYSTONE_TREASURY!);
const USDC_MINT = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT!);

export interface PurchaseParams {
  connection: Connection;
  buyerPublicKey: PublicKey;
  creatorWallet: string;
  priceUsdc: number;
  token: "SOL" | "USDC";
}

export interface PurchaseResult {
  transaction: Transaction;
  creatorAmount: number;
  keystoneFee: number;
}

export async function createPurchaseTransaction(params: PurchaseParams): Promise<PurchaseResult> {
  const { connection, buyerPublicKey, creatorWallet, priceUsdc, token } = params;
  const tx = new Transaction();
  const creatorKey = new PublicKey(creatorWallet);

  const creatorAmount = priceUsdc * 0.8;
  const keystoneFee = priceUsdc * 0.2;

  if (token === "SOL") {
    // Convert USDC price to SOL using an oracle or fixed rate
    // For now, use lamports directly (caller converts)
    tx.add(SystemProgram.transfer({
      fromPubkey: buyerPublicKey,
      toPubkey: creatorKey,
      lamports: Math.floor(creatorAmount * LAMPORTS_PER_SOL),
    }));
    tx.add(SystemProgram.transfer({
      fromPubkey: buyerPublicKey,
      toPubkey: KEYSTONE_TREASURY,
      lamports: Math.floor(keystoneFee * LAMPORTS_PER_SOL),
    }));
  } else {
    const decimals = 6;
    const factor = 10 ** decimals;

    const buyerAta = await getAssociatedTokenAddress(USDC_MINT, buyerPublicKey);
    const creatorAta = await getAssociatedTokenAddress(USDC_MINT, creatorKey);
    const treasuryAta = await getAssociatedTokenAddress(USDC_MINT, KEYSTONE_TREASURY);

    // Create ATAs if they don't exist
    for (const [owner, ata] of [[creatorKey, creatorAta], [KEYSTONE_TREASURY, treasuryAta]] as const) {
      try {
        await getAccount(connection, ata);
      } catch {
        tx.add(createAssociatedTokenAccountInstruction(buyerPublicKey, ata, owner, USDC_MINT));
      }
    }

    tx.add(createTransferInstruction(buyerAta, creatorAta, buyerPublicKey, Math.floor(creatorAmount * factor)));
    tx.add(createTransferInstruction(buyerAta, treasuryAta, buyerPublicKey, Math.floor(keystoneFee * factor)));
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = buyerPublicKey;

  return { transaction: tx, creatorAmount, keystoneFee };
}
```

### OPUS §2.3 Purchase Verification

After signing, the backend verifies the transaction on-chain before recording the purchase:

```typescript
// /api/marketplace/verify-purchase/route.ts

export async function POST(req: NextRequest) {
  const { txSignature, appId, buyerWallet } = await req.json();
  const connection = new Connection(process.env.SOLANA_RPC_URL!);

  // 1. Confirm transaction finalized
  const status = await connection.getSignatureStatus(txSignature, { searchTransactionHistory: true });
  if (!status.value?.confirmationStatus || status.value.confirmationStatus === 'processed') {
    return NextResponse.json({ error: 'Transaction not confirmed' }, { status: 400 });
  }

  // 2. Parse transaction to verify correct recipients and amounts
  const tx = await connection.getTransaction(txSignature, { maxSupportedTransactionVersion: 0 });
  if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

  // 3. Verify the transfer instructions match expected amounts
  const app = await marketplace.getAppById(appId);
  if (!app) return NextResponse.json({ error: 'App not found' }, { status: 404 });

  // ... verify instruction data matches app.priceUsdc * 0.8 to creator, * 0.2 to treasury ...

  // 4. Record purchase in DB (idempotent — check for duplicate txSignature)
  const existing = await db.select().from(purchases).where(eq(purchases.txSignature, txSignature)).limit(1);
  if (existing.length > 0) return NextResponse.json({ alreadyRecorded: true });

  const purchaseId = await marketplace.recordPurchase({
    appId,
    buyerWallet,
    txSignature,
    amountUsdc: app.priceUsdc,
    creatorPayout: app.priceUsdc * app.creatorShare,
    keystoneFee: app.priceUsdc * (1 - app.creatorShare),
  });

  return NextResponse.json({ purchaseId, success: true });
}
```

---

## OPUS §3. The Security Scan Pipeline

### OPUS §3.1 Scan Stages

Every app must pass ALL stages before `isPublished` can be set to `true`.

```
┌─────────────────────────────────────────────────────────┐
│             SECURITY SCAN PIPELINE                       │
│                                                         │
│  Stage 1: STATIC PATTERN SCAN                           │
│  ─────────────────────────────                          │
│  Regex-based detection of banned patterns.              │
│  Fast (<100ms). Catches obvious exploits.               │
│                                                         │
│  Stage 2: AST ANALYSIS                                  │
│  ─────────────────────                                  │
│  Parse code into AST via @babel/parser.                 │
│  Walk the tree to detect:                               │
│  - Dynamic property access on window/parent             │
│  - Obfuscated eval (e.g., window['ev'+'al'])            │
│  - Computed import specifiers                           │
│                                                         │
│  Stage 3: MANIFEST VALIDATION                           │
│  ────────────────────────────                           │
│  Compare declared permissions vs actual code usage.     │
│  Reject if code uses undeclared hooks or domains.       │
│                                                         │
│  Stage 4: DEPENDENCY AUDIT                              │
│  ─────────────────────────                              │
│  Check all imports against a known-vulnerable           │
│  package list. Flag deprecated or yanked versions.      │
│                                                         │
│  Stage 5: SANDBOX DRY RUN                               │
│  ────────────────────────                               │
│  Compile code in a headless iframe.                     │
│  Verify it renders without uncaught exceptions.         │
│  Timeout: 10 seconds.                                   │
│                                                         │
│  Result: PASS / FAIL + Violation Report                 │
└─────────────────────────────────────────────────────────┘
```

### OPUS §3.2 Stage 1: Static Pattern Scan

```typescript
// src/lib/studio/security-scanner.ts

interface ScanViolation {
  stage: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  rule: string;
  line: number;
  snippet: string;
  message: string;
}

interface ScanResult {
  passed: boolean;
  violations: ScanViolation[];
  scannedAt: number;
  scannerVersion: string;
}

const SCANNER_VERSION = '1.0.0';

const BANNED_PATTERNS: Array<{
  pattern: RegExp;
  rule: string;
  severity: ScanViolation['severity'];
  message: string;
}> = [
  {
    pattern: /window\.parent\.postMessage/g,
    rule: 'NO_DIRECT_BRIDGE',
    severity: 'critical',
    message: 'Direct bridge manipulation detected. Use SDK hooks instead.',
  },
  {
    pattern: /window\.parent\.document/g,
    rule: 'NO_PARENT_DOM',
    severity: 'critical',
    message: 'Attempting to access parent DOM. Sandbox escape attempt.',
  },
  {
    pattern: /\beval\s*\(/g,
    rule: 'NO_EVAL',
    severity: 'critical',
    message: 'eval() is forbidden. Use SDK-approved patterns.',
  },
  {
    pattern: /new\s+Function\s*\(/g,
    rule: 'NO_FUNCTION_CONSTRUCTOR',
    severity: 'critical',
    message: 'new Function() is forbidden.',
  },
  {
    pattern: /document\.cookie/g,
    rule: 'NO_COOKIE_ACCESS',
    severity: 'critical',
    message: 'Cookie access is forbidden in sandboxed Mini-Apps.',
  },
  {
    pattern: /localStorage|sessionStorage/g,
    rule: 'NO_STORAGE_ACCESS',
    severity: 'high',
    message: 'Web Storage APIs are unavailable in sandbox. Use SDK state.',
  },
  {
    pattern: /window\.solana|window\.phantom|window\.backpack/g,
    rule: 'NO_WALLET_SNIFFING',
    severity: 'critical',
    message: 'Direct wallet access forbidden. Use useTurnkey() from SDK.',
  },
  {
    pattern: /fetch\s*\(\s*['"`]https?:\/\/(?!esm\.sh)/g,
    rule: 'NO_EXTERNAL_FETCH',
    severity: 'high',
    message: 'Direct external fetch forbidden. Use useFetch() proxy hook.',
  },
  {
    pattern: /new\s+WebSocket/g,
    rule: 'NO_WEBSOCKET',
    severity: 'high',
    message: 'WebSocket connections are not allowed. Use SDK event hooks.',
  },
  {
    pattern: /document\.createElement\s*\(\s*['"`](?:script|iframe|link)/g,
    rule: 'NO_DYNAMIC_ELEMENTS',
    severity: 'critical',
    message: 'Dynamic script/iframe/link injection is forbidden.',
  },
  {
    pattern: /window\.open\s*\(/g,
    rule: 'NO_WINDOW_OPEN',
    severity: 'high',
    message: 'window.open() is blocked by sandbox. Use in-app navigation.',
  },
  {
    pattern: /import\s*\(\s*[^'"]/g,
    rule: 'NO_DYNAMIC_IMPORT_VAR',
    severity: 'medium',
    message: 'Dynamic imports with variables are flagged. Use static import specifiers.',
  },
];

export function runStaticScan(files: Record<string, string>): ScanViolation[] {
  const violations: ScanViolation[] = [];

  for (const [filename, code] of Object.entries(files)) {
    const lines = code.split('\n');

    for (const rule of BANNED_PATTERNS) {
      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = rule.pattern.exec(code)) !== null) {
        const lineNum = code.substring(0, match.index).split('\n').length;
        violations.push({
          stage: 'static_pattern',
          severity: rule.severity,
          rule: rule.rule,
          line: lineNum,
          snippet: lines[lineNum - 1]?.trim() || '',
          message: `[${filename}:${lineNum}] ${rule.message}`,
        });
      }
    }
  }

  return violations;
}
```

### OPUS §3.3 Stage 3: Manifest Validation

```typescript
export function validateManifest(
  manifest: AppManifest,
  files: Record<string, string>
): ScanViolation[] {
  const violations: ScanViolation[] = [];
  const allCode = Object.values(files).join('\n');

  // Check: does code use useTurnkey but manifest doesn't declare turnkey.sign?
  if (/useTurnkey\s*\(\s*\)/.test(allCode) && !manifest.permissions['turnkey.sign']) {
    violations.push({
      stage: 'manifest_validation',
      severity: 'high',
      rule: 'UNDECLARED_PERMISSION',
      line: 0,
      snippet: '',
      message: 'Code uses useTurnkey() but manifest does not declare "turnkey.sign" permission.',
    });
  }

  // Check: does code use useSimulate but manifest doesn't declare simulate?
  if (/useSimulate\s*\(\s*\)/.test(allCode) && !manifest.permissions.simulate) {
    violations.push({
      stage: 'manifest_validation',
      severity: 'high',
      rule: 'UNDECLARED_PERMISSION',
      line: 0,
      snippet: '',
      message: 'Code uses useSimulate() but manifest does not declare "simulate" permission.',
    });
  }

  // Check: fetch/useFetch calls that don't match allowedDomains
  const fetchDomainRegex = /useFetch\s*\(\s*['"`](https?:\/\/([^\/'"]+))/g;
  let match;
  while ((match = fetchDomainRegex.exec(allCode)) !== null) {
    const domain = match[2];
    if (!manifest.allowedDomains?.includes(domain)) {
      violations.push({
        stage: 'manifest_validation',
        severity: 'high',
        rule: 'UNDECLARED_DOMAIN',
        line: 0,
        snippet: match[0],
        message: `Fetch to "${domain}" not declared in manifest allowedDomains.`,
      });
    }
  }

  return violations;
}
```

### OPUS §3.4 Full Scan Orchestrator

```typescript
export async function runSecurityScan(
  files: Record<string, string>,
  manifest: AppManifest
): Promise<ScanResult> {
  const allViolations: ScanViolation[] = [];

  // Stage 1: Static patterns
  allViolations.push(...runStaticScan(files));

  // Stage 2: AST analysis (uses @babel/parser — server-side)
  allViolations.push(...runAstScan(files));

  // Stage 3: Manifest validation
  allViolations.push(...validateManifest(manifest, files));

  // Stage 4: Dependency audit
  allViolations.push(...auditDependencies(manifest.dependencies || {}));

  // Stage 5: Sandbox dry run (headless — only if stages 1-4 pass)
  const hasCritical = allViolations.some(v => v.severity === 'critical');
  if (!hasCritical) {
    const dryRunResult = await sandboxDryRun(files, manifest);
    allViolations.push(...dryRunResult);
  }

  return {
    passed: allViolations.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0,
    violations: allViolations,
    scannedAt: Date.now(),
    scannerVersion: SCANNER_VERSION,
  };
}
```

---

## OPUS §4. Installation Lifecycle

### OPUS §4.1 State Machine

```
┌──────────┐  user clicks   ┌──────────────┐  payment    ┌────────────┐
│ BROWSING │ ──"Install"──→ │  PURCHASING  │ ──verified──→│ INSTALLED  │
│          │                │  (modal)     │              │  (in Dock) │
└──────────┘                └──────────────┘              └────────────┘
                                   │                           │
                              payment fails              user clicks
                                   │                     "Uninstall"
                                   ▼                           │
                            ┌──────────────┐                   ▼
                            │   FAILED     │            ┌─────────────┐
                            └──────────────┘            │ UNINSTALLED │
                                                        └─────────────┘

For FREE apps: BROWSING → INSTALLED (skip PURCHASING)
```

### OPUS §4.2 New Table: `user_installed_apps`

The current system uses the `purchases` table to derive installed apps (`studio-actions.ts:109-146`). This conflates "purchased" with "installed" — a user should be able to uninstall without losing their purchase record.

```typescript
export const userInstalledApps = sqliteTable('user_installed_apps', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),            // wallet address or auth ID
  appId: text('app_id').notNull().references(() => miniApps.id),
  installedVersion: text('installed_version').notNull(),
  pinnedVersion: text('pinned_version'),         // null = always latest
  dockPosition: integer('dock_position'),        // Order in the Dock bar
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastOpenedAt: integer('last_opened_at'),
  installedAt: integer('installed_at').notNull(),
  uninstalledAt: integer('uninstalled_at'),
}, (table) => ({
  userIdx: index('installed_user_idx').on(table.userId),
  appIdx: index('installed_app_idx').on(table.appId),
  userAppIdx: index('installed_user_app_idx').on(table.userId, table.appId),
}));
```

### OPUS §4.3 Dock Persistence

The Dock is the horizontal app launcher bar at the bottom of the Keystone OS interface. Installed apps appear as icons. The `dockPosition` column controls ordering.

```typescript
// src/lib/studio/dock.ts

export async function installApp(userId: string, appId: string, version: string): Promise<string> {
  // Get next dock position
  const existing = await db.select({ maxPos: max(userInstalledApps.dockPosition) })
    .from(userInstalledApps)
    .where(and(eq(userInstalledApps.userId, userId), eq(userInstalledApps.isActive, true)));

  const nextPosition = (existing[0]?.maxPos ?? -1) + 1;
  const id = `inst_${nanoid(10)}`;

  await db.insert(userInstalledApps).values({
    id,
    userId,
    appId,
    installedVersion: version,
    dockPosition: nextPosition,
    isActive: true,
    installedAt: Date.now(),
  });

  return id;
}

export async function uninstallApp(userId: string, appId: string): Promise<void> {
  await db.update(userInstalledApps)
    .set({ isActive: false, uninstalledAt: Date.now() })
    .where(and(
      eq(userInstalledApps.userId, userId),
      eq(userInstalledApps.appId, appId),
      eq(userInstalledApps.isActive, true),
    ));
}

export async function reorderDock(userId: string, appIds: string[]): Promise<void> {
  for (let i = 0; i < appIds.length; i++) {
    await db.update(userInstalledApps)
      .set({ dockPosition: i })
      .where(and(
        eq(userInstalledApps.userId, userId),
        eq(userInstalledApps.appId, appIds[i]),
      ));
  }
}

export async function getDockApps(userId: string) {
  return await db.select()
    .from(userInstalledApps)
    .innerJoin(miniApps, eq(userInstalledApps.appId, miniApps.id))
    .where(and(
      eq(userInstalledApps.userId, userId),
      eq(userInstalledApps.isActive, true),
    ))
    .orderBy(userInstalledApps.dockPosition);
}
```

### OPUS §4.4 App Launch Flow

When a user clicks an app in the Dock:

1. **Fetch code:** Query `miniApps.code` by `appId` (already cached in SQLite, fast).
2. **Resolve lockfile:** Read `miniApps.lockfile` to build the import map with pinned versions.
3. **Check permissions:** Read `miniApps.manifest` to configure CSP and bridge allowlists.
4. **Render in iframe:** Pass code + import map + CSP to the `LivePreview` component.
5. **Update `lastOpenedAt`:** Timestamp for "Recently Used" sorting.

### OPUS Summary

| Component | Decision | Rationale |
|-----------|----------|-----------|
| **Code Storage** | SQLite (index) + Arweave (source) | Fast queries + permanent, censorship-resistant code |
| **Revenue Split** | On-chain 2-instruction TX + DB receipt | Simple, atomic, verifiable. NFT licenses are v2. |
| **Security Scan** | 5-stage pipeline (Pattern → AST → Manifest → Deps → Dry Run) | Defense in depth. Critical violations block publish. |
| **Installation** | Separate `user_installed_apps` table with dock position | Decouples "purchased" from "installed", enables uninstall |
| **Versioning** | Append-only version history with Arweave TX IDs | Full audit trail, rollback by re-publish |

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PART II: GPT — Compiler & Runtime Environment Specification
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Model:** GPT (Runtime Engineer)  
**Domain:** Lockfile, Compiler Pipeline, TypeScript Config, Canonical Templates  

---

## GPT §1. The Keystone Lockfile: `keystone.lock.json`

### GPT §1.1 Why a Lockfile?

The browser has no `node_modules`, no `package.json`, and no package manager. When user code writes `import { motion } from 'framer-motion'`, the runtime must resolve this to a specific esm.sh URL. Without a lockfile:

- **Version drift:** `https://esm.sh/framer-motion` resolves to whatever is "latest" at request time. Tomorrow it could be a breaking version.
- **React duplication:** Without `?external=react`, each package bundles its own React copy.
- **Irreproducible builds:** The same code produces different results on different days.

The lockfile is the single source of truth for dependency resolution in the Keystone iframe runtime.

### GPT §1.2 Schema Definition

```jsonc
// keystone.lock.json — stored in miniApps.lockfile column

{
  // Metadata
  "$schema": "https://keystone.so/schemas/lockfile-v1.json",
  "lockfileVersion": 1,
  "generatedAt": "2026-01-15T12:00:00Z",
  "generatedBy": "keystone-resolver@1.0.0",

  // Core runtime (always present, never user-modified)
  "runtime": {
    "react": {
      "version": "19.0.0",
      "url": "https://esm.sh/react@19.0.0?dev",
      "integrity": "sha384-abc123..."
    },
    "react/jsx-runtime": {
      "version": "19.0.0",
      "url": "https://esm.sh/react@19.0.0/jsx-runtime?dev",
      "integrity": "sha384-def456..."
    },
    "react-dom/client": {
      "version": "19.0.0",
      "url": "https://esm.sh/react-dom@19.0.0/client?dev&external=react",
      "integrity": "sha384-ghi789..."
    },
    "@keystone-os/sdk": {
      "version": "1.0.0",
      "url": "blob://virtual",
      "integrity": null
    }
  },

  // User dependencies (from manifest.dependencies + auto-detected imports)
  "dependencies": {
    "framer-motion": {
      "version": "11.15.0",
      "url": "https://esm.sh/framer-motion@11.15.0?external=react,react-dom",
      "external": ["react", "react-dom"],
      "integrity": "sha384-jkl012..."
    },
    "recharts": {
      "version": "2.15.0",
      "url": "https://esm.sh/recharts@2.15.0?external=react,react-dom",
      "external": ["react", "react-dom"],
      "integrity": "sha384-mno345..."
    },
    "lucide-react": {
      "version": "0.512.0",
      "url": "https://esm.sh/lucide-react@0.512.0?external=react",
      "external": ["react"],
      "integrity": "sha384-pqr678..."
    },
    "lightweight-charts": {
      "version": "4.2.1",
      "url": "https://esm.sh/lightweight-charts@4.2.1",
      "external": [],
      "integrity": "sha384-stu901..."
    }
  },

  // Scoped sub-path imports (e.g., "recharts/lib/component/Cell")
  "subpaths": {
    "react-dom": "https://esm.sh/react-dom@19.0.0?dev&external=react"
  }
}
```

### GPT §1.3 Resolution Algorithm

```typescript
// src/lib/studio/lockfile-resolver.ts

import type { Lockfile, ImportMap } from './types';

/**
 * Curated Registry: packages tested against the Keystone iframe runtime.
 * These have verified version pins and correct ?external flags.
 */
const CURATED_REGISTRY: Record<string, { version: string; external: string[] }> = {
  'framer-motion':          { version: '11.15.0', external: ['react', 'react-dom'] },
  'recharts':               { version: '2.15.0',  external: ['react', 'react-dom'] },
  'lucide-react':           { version: '0.512.0', external: ['react'] },
  'zustand':                { version: '5.0.0',   external: ['react'] },
  '@tanstack/react-query':  { version: '5.90.0',  external: ['react'] },
  'lightweight-charts':     { version: '4.2.1',   external: [] },
  'd3':                     { version: '7.9.0',   external: [] },
  'canvas-confetti':        { version: '1.9.3',   external: [] },
  'clsx':                   { version: '2.1.1',   external: [] },
  'date-fns':               { version: '4.1.0',   external: [] },
  'axios':                  { version: '1.7.9',   external: [] },
};

/**
 * Build an esm.sh URL for a given package.
 */
function buildEsmUrl(pkg: string, version: string, external: string[]): string {
  let url = `https://esm.sh/${pkg}@${version}`;
  if (external.length > 0) {
    url += `?external=${external.join(',')}`;
  }
  return url;
}

/**
 * Scan user code for bare import specifiers and resolve against lockfile.
 * If a package is not in the lockfile, resolve it dynamically.
 */
export function resolveImportMap(
  userCode: Record<string, string>,
  lockfile: Lockfile | null,
  manifest?: { dependencies?: Record<string, string> }
): ImportMap {
  const imports: Record<string, string> = {};

  // 1. Always inject core runtime
  const REACT_VERSION = '19.0.0';
  imports['react'] = `https://esm.sh/react@${REACT_VERSION}?dev`;
  imports['react/jsx-runtime'] = `https://esm.sh/react@${REACT_VERSION}/jsx-runtime?dev`;
  imports['react-dom/client'] = `https://esm.sh/react-dom@${REACT_VERSION}/client?dev&external=react`;
  imports['react-dom'] = `https://esm.sh/react-dom@${REACT_VERSION}?dev&external=react`;
  // SDK is injected as a Blob URL at render time
  // imports['@keystone-os/sdk'] = sdkBlobUrl;

  // 2. If lockfile exists, use it as the primary source
  if (lockfile) {
    for (const [pkg, entry] of Object.entries(lockfile.dependencies)) {
      imports[pkg] = entry.url;
    }
    for (const [pkg, url] of Object.entries(lockfile.subpaths || {})) {
      imports[pkg] = url;
    }
  }

  // 3. Scan all user files for bare specifier imports not yet resolved
  const allCode = Object.values(userCode).join('\n');
  const importRegex = /(?:import|from)\s+['"]([^.'\/][^'"]*)['"]/g;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(allCode)) !== null) {
    const specifier = match[1];
    if (imports[specifier]) continue; // Already resolved

    // Check manifest pinned version first
    const manifestVersion = manifest?.dependencies?.[specifier];

    // Check curated registry
    const curated = CURATED_REGISTRY[specifier];

    if (manifestVersion) {
      // Manifest pins a specific version
      const external = curated?.external ?? ['react', 'react-dom'];
      imports[specifier] = buildEsmUrl(specifier, manifestVersion, external);
    } else if (curated) {
      // Known curated package
      imports[specifier] = buildEsmUrl(specifier, curated.version, curated.external);
    } else {
      // Unknown package: externalize React by default (safe fallback)
      imports[specifier] = `https://esm.sh/${specifier}?external=react,react-dom`;
    }
  }

  return { imports };
}

/**
 * Generate a lockfile from the resolved import map.
 * Called when a creator clicks "Save" or "Publish."
 */
export function generateLockfile(
  importMap: ImportMap,
  existingLockfile?: Lockfile
): Lockfile {
  const runtime: Lockfile['runtime'] = {};
  const dependencies: Lockfile['dependencies'] = {};

  for (const [specifier, url] of Object.entries(importMap.imports)) {
    const entry = {
      version: extractVersion(url),
      url,
      external: extractExternals(url),
      integrity: null, // Computed asynchronously via SRI fetch
    };

    if (['react', 'react/jsx-runtime', 'react-dom/client', 'react-dom', '@keystone-os/sdk'].includes(specifier)) {
      runtime[specifier] = entry;
    } else {
      dependencies[specifier] = entry;
    }
  }

  return {
    $schema: 'https://keystone.so/schemas/lockfile-v1.json',
    lockfileVersion: 1,
    generatedAt: new Date().toISOString(),
    generatedBy: 'keystone-resolver@1.0.0',
    runtime,
    dependencies,
    subpaths: {},
  };
}

function extractVersion(url: string): string {
  const match = url.match(/@(\d+\.\d+\.\d+)/);
  return match?.[1] ?? 'latest';
}

function extractExternals(url: string): string[] {
  const match = url.match(/[?&]external=([^&]+)/);
  return match ? match[1].split(',') : [];
}
```

### GPT §1.4 Import Map Injection (Fixed for Firefox/Safari)

Per BUG-005 from the audit, the import map must be a static `<script type="importmap">` in `<head>` before any module scripts. Here is the corrected `iframeContent` builder:

```typescript
// In LivePreview.tsx useMemo

function buildIframeHtml(
  compiledCode: string,
  importMap: ImportMap,
  sdkCode: string,
  cspDirective: string
): string {
  // SDK is provided as a Blob URL
  const sdkBlob = new Blob([sdkCode], { type: 'application/javascript' });
  const sdkBlobUrl = URL.createObjectURL(sdkBlob);
  importMap.imports['@keystone-os/sdk'] = sdkBlobUrl;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="${cspDirective}" />
  <script type="importmap">${JSON.stringify(importMap)}</script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #04060b; color: #e2e8f0; font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    ${compiledCode}
  </script>
</body>
</html>`;
}
```

**Key change:** The `<script type="importmap">` is now a static element in the HTML, placed before the `<script type="module">`. No dynamic injection. Works in Chrome, Firefox, and Safari.

---

## GPT §2. The Compiler Pipeline

### GPT §2.1 Overview

```
┌──────────────────────────────────────────────────────────────┐
│                 KEYSTONE COMPILER PIPELINE                     │
│                                                              │
│  Input: User TypeScript+JSX files (Record<string, string>)  │
│                                                              │
│  Step 1: SCAN IMPORTS                                        │
│  ────────────────────                                        │
│  Extract all bare specifiers from user code.                 │
│  Resolve against lockfile → build import map.                │
│                                                              │
│  Step 2: TRANSPILE (Babel Standalone)                        │
│  ─────────────────────────────────────                       │
│  Strip TypeScript types + transform JSX.                     │
│  Presets: ['react', 'typescript']                            │
│  Source maps: enabled for debugging.                         │
│                                                              │
│  Step 3: REWRITE IMPORTS                                     │
│  ────────────────────────                                    │
│  Convert relative imports (./utils) to inline modules.       │
│  Bare specifiers (react, framer-motion) are resolved         │
│  by the browser's import map — no rewrite needed.            │
│                                                              │
│  Step 4: BUILD ENTRY                                         │
│  ─────────────────────                                       │
│  Wrap compiled App.tsx in a ReactDOM.createRoot() call.      │
│  Inject console.log interceptor for Studio Console.          │
│                                                              │
│  Output: Single JS string ready for <script type="module">  │
└──────────────────────────────────────────────────────────────┘
```

### GPT §2.2 Babel Configuration

```typescript
// src/lib/studio/compiler.ts

interface CompileResult {
  success: boolean;
  code: string;
  sourceMap?: string;
  errors: CompileError[];
}

interface CompileError {
  message: string;
  line: number;
  column: number;
  filename: string;
}

/**
 * Compile a set of user files into a single executable JS module.
 * Runs in the browser via @babel/standalone.
 */
export function compileUserFiles(
  files: Record<string, string>,
  entryFile: string = 'App.tsx'
): CompileResult {
  const errors: CompileError[] = [];

  // Step 1: Compile each file individually
  const compiled: Record<string, string> = {};

  for (const [filename, source] of Object.entries(files)) {
    try {
      const result = Babel.transform(source, {
        presets: [
          // TypeScript preset — strips type annotations, interfaces, enums
          ['typescript', {
            isTSX: filename.endsWith('.tsx'),
            allExtensions: true,
            // Preserve JSX for the React preset to handle
            jsxPragma: undefined,
          }],
          // React preset — transforms JSX to React.createElement / jsx-runtime
          ['react', {
            runtime: 'automatic',  // Uses jsx-runtime import (React 17+ style)
            // This generates import { jsx } from 'react/jsx-runtime'
            // which our import map resolves to esm.sh
          }],
        ],
        filename,
        sourceType: 'module',
        // Source maps for accurate line-number debugging
        sourceMaps: 'inline',
        // Retain line numbers — critical for Self-Correction Loop
        retainLines: true,
      });

      if (result?.code) {
        compiled[filename] = result.code;
      }
    } catch (err: any) {
      errors.push({
        message: err.message,
        line: err.loc?.line ?? 0,
        column: err.loc?.column ?? 0,
        filename,
      });
    }
  }

  if (errors.length > 0) {
    return { success: false, code: '', errors };
  }

  // Step 2: Inline relative imports
  // Convert: import { formatPrice } from './utils'
  // To: inlined code from utils.ts, wrapped in a module scope
  const entryCode = compiled[entryFile];
  if (!entryCode) {
    return {
      success: false,
      code: '',
      errors: [{ message: `Entry file "${entryFile}" not found`, line: 0, column: 0, filename: entryFile }],
    };
  }

  let bundled = '';

  // Inline non-entry files as module-scoped IIFEs
  const nonEntryFiles = Object.entries(compiled).filter(([name]) => name !== entryFile);
  for (const [filename, code] of nonEntryFiles) {
    const moduleName = filename.replace(/\.(tsx?|jsx?)$/, '');
    bundled += `// --- Module: ${filename} ---\n`;
    bundled += `const __module_${sanitizeName(moduleName)} = (() => {\n`;
    bundled += `  const exports = {};\n`;
    bundled += rewriteExports(code);
    bundled += `\n  return exports;\n`;
    bundled += `})();\n\n`;
  }

  // Rewrite relative imports in entry file to reference inlined modules
  let rewrittenEntry = entryCode;
  for (const [filename] of nonEntryFiles) {
    const moduleName = filename.replace(/\.(tsx?|jsx?)$/, '');
    const importPattern = new RegExp(
      `from\\s+['"]\\.\\/(?:${escapeRegex(moduleName)})(?:\\.tsx?)?['"]`,
      'g'
    );
    // This is simplified — a full implementation would use an AST transform
    // to properly rewrite destructured imports
  }

  // Step 3: Build entry wrapper
  bundled += `// --- Entry: ${entryFile} ---\n`;
  bundled += rewrittenEntry;
  bundled += `\n\n`;
  bundled += CONSOLE_INTERCEPTOR;
  bundled += `\n`;
  bundled += RENDER_BOOTSTRAP;

  return { success: true, code: bundled, errors: [] };
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rewriteExports(code: string): string {
  // Convert: export const foo = ...  →  exports.foo = ...
  // Convert: export default ...      →  exports.default = ...
  // This is a simplified transform; production would use AST
  return code
    .replace(/export\s+default\s+/g, 'exports.default = ')
    .replace(/export\s+(?:const|let|var|function|class)\s+(\w+)/g, (_, name) => {
      return `exports.${name} = ${name}; const ${name}`;
    });
}
```

### GPT §2.3 Console Interceptor

```typescript
const CONSOLE_INTERCEPTOR = `
// Intercept console.* and forward to parent for Studio Console panel
(function() {
  const _log = console.log;
  const _warn = console.warn;
  const _error = console.error;
  const _info = console.info;

  function forward(level, args) {
    try {
      const message = args.map(a => {
        if (a instanceof Error) return a.message + '\\n' + a.stack;
        if (typeof a === 'object') return JSON.stringify(a, null, 2);
        return String(a);
      }).join(' ');
      window.parent.postMessage({
        type: 'CONSOLE_LOG',
        level,
        message,
        timestamp: Date.now()
      }, '*');
    } catch(e) { /* prevent infinite recursion */ }
  }

  console.log = (...args) => { forward('log', args); _log.apply(console, args); };
  console.warn = (...args) => { forward('warn', args); _warn.apply(console, args); };
  console.error = (...args) => { forward('error', args); _error.apply(console, args); };
  console.info = (...args) => { forward('info', args); _info.apply(console, args); };

  // Catch unhandled errors
  window.addEventListener('error', (e) => {
    forward('error', [e.message + ' at ' + e.filename + ':' + e.lineno + ':' + e.colno]);
  });
  window.addEventListener('unhandledrejection', (e) => {
    forward('error', ['Unhandled Promise Rejection: ' + (e.reason?.message || e.reason)]);
  });
})();
`;
```

### GPT §2.4 Render Bootstrap

```typescript
const RENDER_BOOTSTRAP = `
// Bootstrap React rendering
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = createRoot(rootEl);
  // The entry file's default export is the App component
  // After Babel transform with automatic runtime, it's available as the default export
  import('./App.tsx').then(mod => {
    const App = mod.default || mod;
    root.render(createElement(App));
  }).catch(err => {
    console.error('[Keystone Runtime] Failed to render App:', err);
    rootEl.innerHTML = '<div style="color:red;padding:20px;font-family:monospace;">' +
      '<h2>Runtime Error</h2><pre>' + (err.message || err) + '</pre></div>';
  });
}
`;
```

### GPT §2.5 Source Map Accuracy

The `retainLines: true` Babel option is critical. It tells Babel to output code on the same line number as the input. This means when the iframe throws `"Error at line 47"`, line 47 in the compiled output corresponds to line 47 in the user's TypeScript source.

Without `retainLines`, Babel's JSX transform expands multi-line JSX into single expressions, shifting all line numbers. The Self-Correction Loop (GEMINI §2) relies on accurate line numbers to feed errors back to the AI.

For deeper debugging, `sourceMaps: 'inline'` embeds a base64 source map comment at the end of the compiled code. Chrome DevTools will decode this and show the original TypeScript in the Sources panel.

---

## GPT §3. TypeScript Configuration for Monaco

### GPT §3.1 Browser tsconfig Equivalent

Monaco's TypeScript worker runs a full TypeScript compiler in a Web Worker. We configure it via `monaco.languages.typescript.typescriptDefaults`:

```typescript
// src/lib/studio/monaco-ts-config.ts

export function configureMonacoTypeScript(monaco: typeof import('monaco-editor')) {
  const tsDefaults = monaco.languages.typescript.typescriptDefaults;

  // Compiler options — equivalent to tsconfig.json
  tsDefaults.setCompilerOptions({
    // ─── Core ───────────────────────────────────
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,  // automatic runtime
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,

    // ─── Strict Mode ────────────────────────────
    strict: true,
    noImplicitAny: true,
    strictNullChecks: true,
    noUnusedLocals: false,       // Don't red-squiggly unused vars during active coding
    noUnusedParameters: false,   // Same — too noisy for real-time dev

    // ─── Paths (resolved to virtual files) ──────
    baseUrl: '.',
    paths: {
      '@keystone-os/sdk': ['./keystone-sdk.d.ts'],
    },

    // ─── Output ─────────────────────────────────
    declaration: false,
    sourceMap: false,
    outDir: './dist',

    // ─── Interop ────────────────────────────────
    resolveJsonModule: true,
    isolatedModules: true,       // Matches Babel's per-file transform model
    skipLibCheck: true,
  });

  // Diagnostic options — what shows red squiggles
  tsDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,   // Enable semantic checks (type errors)
    noSyntaxValidation: false,     // Enable syntax checks (parse errors)
    diagnosticCodesToIgnore: [
      2307,  // "Cannot find module" — we resolve via import maps, not TS
      7016,  // "Could not find a declaration file" — same reason
    ],
  });
}
```

### GPT §3.2 SDK Type Definitions

Replace the current `any`-typed stubs with comprehensive type definitions:

```typescript
// src/lib/studio/keystone-sdk.d.ts
// Injected into Monaco via addExtraLib()

export function injectKeystoneTypes(monaco: typeof import('monaco-editor')) {
  const SDK_TYPES = `
declare module '@keystone-os/sdk' {
  // ─── Types ────────────────────────────────────────────
  export interface TokenBalance {
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

  export interface VaultState {
    address: string | null;
    tokens: TokenBalance[];
    totalValueUsd: number;
    change24h: number;
    loading: boolean;
    subscribe: (intervalMs?: number) => () => void;
    refresh: () => Promise<void>;
  }

  export interface SignResult {
    signature: string;
    simulation: SimulationSummary;
  }

  export interface TurnkeyState {
    publicKey: string | null;
    signTransaction: (
      tx: { data: string; metadata?: Record<string, unknown> },
      description: string
    ) => Promise<SignResult>;
    connected: boolean;
  }

  export interface SimulationSummary {
    passed: boolean;
    fee: number;
    balanceChanges: Array<{
      token: string;
      before: number;
      after: number;
      delta: number;
    }>;
    programsInvoked: string[];
    error?: string;
  }

  export interface SimulateState {
    simulate: (serializedTx: string) => Promise<SimulationSummary>;
    simulating: boolean;
  }

  export type OSEventType =
    | 'ON_BLOCK_UPDATE'
    | 'ON_PRICE_CHANGE'
    | 'ON_VAULT_REBALANCE'
    | 'ON_PROPOSAL_CREATED'
    | 'ON_PROPOSAL_EXECUTED'
    | 'ON_SIGNER_ONLINE';

  export interface OSEvent {
    type: OSEventType;
    payload: unknown;
    timestamp: number;
  }

  export interface FetchOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: unknown;
  }

  export interface FetchResult<T = unknown> {
    data: T | null;
    error: string | null;
    loading: boolean;
    refetch: () => Promise<void>;
  }

  // ─── Hooks ────────────────────────────────────────────

  /** Access vault balances, tokens, and portfolio data. */
  export function useVault(): VaultState;

  /** Access Turnkey wallet for signing transactions. */
  export function useTurnkey(): TurnkeyState;

  /** Subscribe to OS-level events. */
  export function useKeystoneEvents(
    events: OSEventType[],
    handler: (event: OSEvent) => void
  ): void;

  /** Pre-flight transaction simulation. */
  export function useSimulate(): SimulateState;

  /** Fetch external APIs via the Keystone proxy. */
  export function useFetch<T = unknown>(
    url: string,
    options?: FetchOptions
  ): FetchResult<T>;

  // ─── Components ───────────────────────────────────────

  /** Gate content behind a marketplace purchase. */
  export function KeystoneGate(props: {
    productId: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
  }): JSX.Element;

  // ─── Event Bus ────────────────────────────────────────

  export const AppEventBus: {
    emit: (type: string, payload?: unknown) => void;
    subscribe: (callback: (event: { type: string; payload?: unknown }) => void) => () => void;
  };
}
`;

  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    SDK_TYPES,
    'file:///node_modules/@keystone-os/sdk/index.d.ts'
  );

  // Also add React 19 types for full IntelliSense
  // (abbreviated — in production, fetch from esm.sh or bundle the .d.ts)
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    REACT_TYPES,
    'file:///node_modules/@types/react/index.d.ts'
  );
}
```

### GPT §3.3 Diagnostic Code Suppression

Two TS diagnostic codes are suppressed:

| Code | Message | Why Suppressed |
|------|---------|----------------|
| `2307` | "Cannot find module 'framer-motion'" | TS doesn't know about our import map. The module resolves at runtime via esm.sh. |
| `7016` | "Could not find a declaration file for module 'X'" | Same reason. We don't have `.d.ts` for every esm.sh package. |

All other diagnostics — including type errors, missing properties, wrong argument counts — remain active and feed into the Self-Correction Loop.

---

## GPT §4. Canonical "Hello World" Template

### GPT §4.1 Treasury Pulse — The Starter App

This is the canonical beginner template. It demonstrates `useVault()`, real-time subscriptions, data formatting, and Tailwind styling within the Keystone runtime constraints.

```typescript
// === FILE: App.tsx ===
import React, { useEffect, useState } from 'react';
import { useVault } from '@keystone-os/sdk';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

function Sparkline({ data, width = 80, height = 24, color = '#36e27b' }: SparklineProps) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

function formatUsd(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function App() {
  const { tokens, totalValueUsd, change24h, loading, subscribe } = useVault();
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>({});

  // Subscribe to real-time balance updates
  useEffect(() => {
    const unsub = subscribe(5000); // Every 5 seconds
    return unsub;
  }, [subscribe]);

  // Accumulate price history for sparklines
  useEffect(() => {
    if (tokens.length === 0) return;
    setPriceHistory(prev => {
      const next = { ...prev };
      for (const token of tokens) {
        const history = next[token.mint] || [];
        next[token.mint] = [...history.slice(-19), token.priceUsd];
      }
      return next;
    });
  }, [tokens]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#04060b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
          <span className="text-xs text-zinc-500 uppercase tracking-widest">Syncing Vault...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#04060b] text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight">Treasury Pulse</h1>
        <p className="text-sm text-zinc-500 mt-1">Real-time portfolio monitor</p>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5">
          <span className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">Total Value</span>
          <span className="text-3xl font-black text-emerald-400">{formatUsd(totalValueUsd)}</span>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5">
          <span className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">24h Change</span>
          <span className={`text-3xl font-black ${change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Token List */}
      <div className="space-y-2">
        {tokens.map(token => (
          <div
            key={token.mint}
            className="flex items-center justify-between p-4 bg-zinc-900/30 border border-zinc-800/30 rounded-lg hover:border-emerald-400/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              {token.logoUri ? (
                <img src={token.logoUri} alt={token.symbol} className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold">
                  {token.symbol.slice(0, 2)}
                </div>
              )}
              <div>
                <span className="font-bold text-sm">{token.symbol}</span>
                <span className="text-xs text-zinc-500 ml-2">{token.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <Sparkline
                data={priceHistory[token.mint] || [token.priceUsd]}
                color={token.change24h >= 0 ? '#36e27b' : '#ef4444'}
              />
              <div className="text-right min-w-[120px]">
                <div className="font-bold text-sm">{formatUsd(token.valueUsd)}</div>
                <div className={`text-xs ${token.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tokens.length === 0 && (
        <div className="text-center py-20 text-zinc-600">
          <p className="text-lg font-bold mb-2">No tokens found</p>
          <p className="text-sm">Your vault is empty. Deposit tokens to get started.</p>
        </div>
      )}
    </div>
  );
}
```

### GPT §4.2 Import Analysis

The template above imports:
- `react` (from import map → `esm.sh/react@19.0.0`)
- `@keystone-os/sdk` (from import map → Blob URL with virtual SDK)

No external packages needed. The lockfile for this template contains only the `runtime` section — zero `dependencies`. This makes it the ideal first-run experience: no dependency resolution, instant preview.

### GPT §4.3 What the Import Chain Looks Like at Runtime

```
User writes:                    Browser resolves via Import Map:
─────────────                   ──────────────────────────────────
import React from 'react'   →  https://esm.sh/react@19.0.0?dev
import { useVault }          →  blob://sdk-virtual-module-abc123
  from '@keystone-os/sdk'
```

No bundler. No `npm install`. No build step. The browser's native ES Module system does all the work, guided by the import map we inject.

### GPT Summary

| Component | Implementation | Key Detail |
|-----------|---------------|------------|
| **Lockfile** | `keystone.lock.json` in DB column | Pins versions, stores esm.sh URLs with `?external` flags, includes SRI integrity hashes |
| **Resolver** | Curated Registry + manifest pins + fallback | Unknown packages externalize React by default |
| **Compiler** | Babel Standalone with `['typescript', 'react']` presets | `retainLines: true` for accurate debugging; `runtime: 'automatic'` for jsx-runtime |
| **Import Map** | Static `<script type="importmap">` in `<head>` | Pre-computed on host, injected before any module scripts — Firefox/Safari compatible |
| **Monaco TS** | Full `tsconfig` equivalent via `setCompilerOptions` | Strict mode, suppress 2307/7016, inject comprehensive SDK `.d.ts` |
| **Hello World** | Treasury Pulse template | Uses `useVault()`, real-time `subscribe()`, sparklines, zero external deps |

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PART III: GEMINI — The Architect AI Agent Specification
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Model:** Gemini (AI Specialist)  
**Domain:** System Prompt, Self-Correction State Machine, Streaming UI  

---

## GEMINI §1. The System Prompt

### GEMINI §1.1 Complete Architect Agent System Prompt

This is the production system prompt injected as the `system` message in every Architect LLM call. Every constraint maps to a real limitation in the Keystone iframe runtime.

```
You are THE ARCHITECT — Keystone Studio's AI code generation engine.

You write production-grade TypeScript/React Mini-Apps that run inside the
Keystone Treasury Operating System. Your output is streamed character-by-
character into a Monaco Editor while the user watches. Write clean, concise,
working code on the first attempt.

══════════════════════════════════════════════════════════════════════════
§1  RUNTIME ENVIRONMENT
══════════════════════════════════════════════════════════════════════════

Your code runs in a SANDBOXED IFRAME — not Node.js, not a build system.

TRANSPILER: @babel/standalone
  Presets: ['typescript', 'react'] with { runtime: 'automatic' }
  You CAN use: TypeScript syntax, interfaces, type annotations, generics,
    enums, optional chaining, nullish coalescing, template literals.
  You CANNOT use: decorators, namespace merging, const enums, path aliases,
    CommonJS require(), __dirname, __filename, process.env.

MODULE SYSTEM: ES Modules via HTML Import Maps + esm.sh CDN
  ✅ import React from 'react'              → React 19.0.0
  ✅ import { motion } from 'framer-motion'  → esm.sh auto-resolved
  ✅ import { useVault } from '@keystone-os/sdk'  → Virtual SDK module
  ❌ import fs from 'fs'                     → DOES NOT EXIST
  ❌ import path from 'path'                 → DOES NOT EXIST
  ❌ require('anything')                     → DOES NOT EXIST

STYLING: Tailwind CSS is available via CDN. Use utility classes.
  Dark theme base: bg-[#04060b] text-white
  Primary accent: emerald-400 (#36e27b)
  Secondary: cyan-400 (#22d3ee)
  Borders: border-zinc-800/50

══════════════════════════════════════════════════════════════════════════
§2  FORBIDDEN APIs (will crash, be blocked by CSP, or violate security)
══════════════════════════════════════════════════════════════════════════

ABSOLUTELY NEVER USE THESE:
  - window.solana, window.phantom, window.backpack  (wallet sniffing)
  - window.parent.postMessage(...)                  (bridge bypass — use SDK)
  - window.parent.document, window.top              (iframe escape)
  - document.cookie, localStorage, sessionStorage   (cross-origin blocked)
  - eval(), new Function(), setTimeout(string)      (code injection)
  - fetch('https://...')                             (use useFetch() proxy)
  - new WebSocket(...)                               (use useKeystoneEvents)
  - document.createElement('script')                 (dynamic injection)
  - window.open(), window.close()                    (popup blocked)
  - XMLHttpRequest                                   (use useFetch())

If the user asks you to do something that requires a forbidden API,
explain WHY it's blocked and suggest the SDK alternative.

══════════════════════════════════════════════════════════════════════════
§3  KEYSTONE SDK — import from '@keystone-os/sdk'
══════════════════════════════════════════════════════════════════════════

HOOKS:

useVault() → VaultState
  {
    address: string | null,         // Vault public key (Solana address)
    tokens: TokenBalance[],         // All token balances with metadata
    totalValueUsd: number,          // Total portfolio USD value
    change24h: number,              // Weighted 24h change percentage
    loading: boolean,               // True during initial fetch
    subscribe: (intervalMs?: number) => () => void,  // Real-time updates
    refresh: () => Promise<void>,   // Force refresh balances
  }

  TokenBalance = {
    mint: string,        // Token mint address
    symbol: string,      // e.g., "SOL", "USDC"
    name: string,        // e.g., "Solana", "USD Coin"
    balance: number,     // Human-readable (already divided by decimals)
    decimals: number,    // Token decimals
    priceUsd: number,    // Current price in USD
    valueUsd: number,    // balance * priceUsd
    change24h: number,   // 24h price change percentage
    logoUri?: string,    // Token logo URL
  }

useTurnkey() → TurnkeyState
  {
    publicKey: string | null,       // User's wallet public key
    signTransaction: (
      tx: { data: string, metadata?: Record<string, unknown> },
      description: string           // Human-readable (shown in approval modal)
    ) => Promise<{ signature: string, simulation: SimulationSummary }>,
    connected: boolean,
  }
  NOTE: signTransaction AUTOMATICALLY triggers the Simulation Firewall.
  The user sees a balance-diff approval modal before signing.
  You do NOT need to simulate manually before calling signTransaction.

useKeystoneEvents(events, handler) → void
  events: Array of OSEventType
  handler: (event: OSEvent) => void
  OSEventType = 'ON_BLOCK_UPDATE' | 'ON_PRICE_CHANGE' | 'ON_VAULT_REBALANCE'
              | 'ON_PROPOSAL_CREATED' | 'ON_PROPOSAL_EXECUTED' | 'ON_SIGNER_ONLINE'

useSimulate() → SimulateState
  {
    simulate: (serializedTx: string) => Promise<SimulationSummary>,
    simulating: boolean,
  }
  SimulationSummary = {
    passed: boolean,
    fee: number,
    balanceChanges: Array<{ token, before, after, delta }>,
    programsInvoked: string[],
    error?: string,
  }

useFetch<T>(url, options?) → FetchResult<T>
  Fetches external APIs via the Keystone proxy (/api/proxy).
  url: Full URL (e.g., 'https://api.jup.ag/v6/quote?...')
  options?: { method, headers, body }
  Returns: { data: T | null, error: string | null, loading: boolean, refetch }
  NOTE: The domain must be in the app's manifest allowedDomains.

COMPONENTS:

<KeystoneGate productId="xxx">
  {children}
</KeystoneGate>
  Wraps premium content. Shows locked state if user hasn't purchased.

AppEventBus
  { emit: (type, payload?) => void, subscribe: (cb) => () => void }

══════════════════════════════════════════════════════════════════════════
§4  OUTPUT FORMAT
══════════════════════════════════════════════════════════════════════════

Output ONLY code. Use file markers to separate multiple files:

// === FILE: App.tsx ===
import React from 'react';
import { useVault } from '@keystone-os/sdk';

export default function App() {
  const { tokens, loading } = useVault();
  // ...implementation
}

// === FILE: utils.ts ===
export function formatPrice(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

RULES:
1. App.tsx MUST have a default export (the root component).
2. NEVER output JSON, markdown fences, explanations, or commentary.
   ONLY output code with file markers.
3. Use Tailwind CSS for all styling. No inline style objects unless
   computing dynamic values.
4. Handle loading states: show skeleton/spinner, not blank screen.
5. Handle error states: show user-friendly message, not raw error.
6. Write REAL logic. If asked for a sniper bot, write the actual
   monitoring loop with useFetch and useKeystoneEvents.
7. NO placeholder data unless explicitly building a demo/mockup.
   Use useVault() for real token data.
8. Import from '@keystone-os/sdk' — NEVER from './keystone'.
9. Keep code concise. No excessive comments. Self-documenting names.
10. One component per concern. Extract hooks for complex state logic.

══════════════════════════════════════════════════════════════════════════
§5  SELF-CORRECTION CONTEXT
══════════════════════════════════════════════════════════════════════════

If the message contains a [TYPESCRIPT ERRORS] block, you are in
CORRECTION MODE. In this mode:

1. Fix ONLY the listed errors. Do NOT rewrite unrelated code.
2. Do NOT add new features or change styling.
3. Do NOT remove functionality to "fix" an error.
4. If an import is missing, add it.
5. If a type is wrong, fix the type annotation.
6. If a variable is undefined, define it or fix the reference.
7. Output the COMPLETE corrected file(s) with file markers.
8. If you truly cannot fix an error, add a // TODO: comment explaining why.

══════════════════════════════════════════════════════════════════════════
§6  SECURITY CONSTRAINTS
══════════════════════════════════════════════════════════════════════════

Your generated code will be scanned by a static analyzer before execution.
The following patterns will be REJECTED:

  /window\.parent\.postMessage/     → Use SDK hooks instead
  /eval\s*\(/                       → Never use eval
  /new\s+Function\s*\(/             → Never use Function constructor
  /document\.cookie/                → Blocked in sandbox
  /localStorage|sessionStorage/     → Blocked in sandbox
  /window\.solana/                  → Use useTurnkey()
  /fetch\s*\(\s*['"]https?:/        → Use useFetch()
  /new\s+WebSocket/                 → Use useKeystoneEvents()

If your code contains any of these patterns, it will be automatically
rejected and you will be asked to regenerate. Avoid them entirely.
```

### GEMINI §1.2 Prompt Builder Function

The system prompt is static. The user prompt is dynamically assembled from multiple context sources:

```typescript
// src/lib/studio/prompt-builder.ts

interface PromptContext {
  userMessage: string;
  currentFiles: Record<string, string>;
  runtimeLogs?: string[];
  typescriptErrors?: FormattedError[];
  researchContext?: string;
  manifest?: AppManifest;
}

export function buildArchitectPrompt(ctx: PromptContext): string {
  const sections: string[] = [];

  // 1. User's request
  sections.push(`[USER REQUEST]\n${ctx.userMessage}`);

  // 2. Current code context (if editing existing app)
  if (Object.keys(ctx.currentFiles).length > 0) {
    sections.push('[CURRENT CODE]');
    for (const [name, code] of Object.entries(ctx.currentFiles)) {
      sections.push(`--- ${name} ---\n${code}`);
    }
  }

  // 3. TypeScript errors (triggers Correction Mode — §5)
  if (ctx.typescriptErrors && ctx.typescriptErrors.length > 0) {
    sections.push('[TYPESCRIPT ERRORS]');
    for (const err of ctx.typescriptErrors) {
      sections.push(`Line ${err.line}, Col ${err.column}: [TS${err.code}] ${err.message}`);
    }
    sections.push('Fix ONLY these errors. Do not add features or rewrite unrelated code.');
  }

  // 4. Runtime errors from iframe console
  if (ctx.runtimeLogs && ctx.runtimeLogs.length > 0) {
    const errors = ctx.runtimeLogs.filter(log =>
      log.includes('[error]') || log.includes('Error') || log.includes('fail')
    );
    if (errors.length > 0) {
      sections.push('[RUNTIME ERRORS]');
      sections.push(errors.slice(-10).join('\n'));
      sections.push('Prioritize fixing these runtime errors before adding new features.');
    }
  }

  // 5. Research context (from web search or docs)
  if (ctx.researchContext) {
    sections.push(`[RESEARCH CONTEXT]\n${ctx.researchContext}`);
    sections.push('Use the above API documentation as your PRIMARY source of truth for endpoints and data shapes.');
  }

  // 6. Manifest constraints
  if (ctx.manifest) {
    sections.push('[APP MANIFEST]');
    sections.push(`Allowed domains: ${(ctx.manifest.allowedDomains || []).join(', ') || 'none'}`);
    sections.push(`Allowed programs: ${(ctx.manifest.allowedPrograms || []).join(', ') || 'none'}`);
    sections.push(`Permissions: ${Object.entries(ctx.manifest.permissions || {}).filter(([,v]) => v).map(([k]) => k).join(', ')}`);
  }

  return sections.join('\n\n');
}
```

---

## GEMINI §2. The Self-Correction Loop: State Machine

### GEMINI §2.1 State Diagram

```
                          ┌─────────────────────┐
                          │                     │
                          │   IDLE              │
                          │   (waiting for      │
                          │    user prompt)     │
                          │                     │
                          └────────┬────────────┘
                                   │
                          user submits prompt
                                   │
                                   ▼
                          ┌─────────────────────┐
                          │                     │
                          │   STREAMING         │
                          │   (AI writing code  │
                          │    char-by-char)    │
                          │                     │
                          └────────┬────────────┘
                                   │
                          stream ends ([DONE])
                                   │
                                   ▼
                          ┌─────────────────────┐
                          │                     │
                          │   ANALYZING         │
                          │   (waiting 1.5s for │
                          │    TS worker, then  │
                          │    read markers)    │
                          │                     │
                          └────────┬────────────┘
                                   │
                      ┌────────────┴────────────┐
                      │                         │
                markers.length === 0      markers with ERROR
                      │                         │
                      ▼                         ▼
             ┌────────────────┐        ┌─────────────────────┐
             │                │        │                     │
             │   CLEAN        │        │   CORRECTING        │
             │   (render      │        │   (2nd LLM call     │
             │    preview,    │        │    with errors,     │
             │    done)       │        │    stream patch)    │
             │                │        │                     │
             └────────────────┘        └────────┬────────────┘
                                                │
                                       patch stream ends
                                                │
                                                ▼
                                       ┌─────────────────────┐
                                       │                     │
                                       │   RE-ANALYZING      │
                                       │   (check markers    │
                                       │    again)           │
                                       │                     │
                                       └────────┬────────────┘
                                                │
                                   ┌────────────┴────────────┐
                                   │                         │
                             clean again              still errors
                                   │                    AND attempts < 3
                                   │                         │
                                   ▼                         │
                          ┌────────────────┐                 │
                          │   CLEAN        │        (loop back to CORRECTING)
                          └────────────────┘
                                                             │
                                                   attempts >= 3
                                                             │
                                                             ▼
                                                    ┌─────────────────┐
                                                    │   FAILED        │
                                                    │   (show errors  │
                                                    │    to user,     │
                                                    │    "Fix Manual")│
                                                    └─────────────────┘
```

### GEMINI §2.2 State Machine Implementation

```typescript
// src/lib/studio/architect-state-machine.ts

type ArchitectState =
  | 'IDLE'
  | 'STREAMING'
  | 'ANALYZING'
  | 'CORRECTING'
  | 'RE_ANALYZING'
  | 'CLEAN'
  | 'FAILED';

interface ArchitectContext {
  state: ArchitectState;
  attempt: number;
  maxAttempts: number;
  currentFiles: Record<string, string>;
  errors: FormattedError[];
  streamedTokens: number;
  startTime: number;
}

interface FormattedError {
  line: number;
  column: number;
  code: string;
  message: string;
  filename: string;
}

export class ArchitectStateMachine {
  private ctx: ArchitectContext;
  private monaco: typeof import('monaco-editor');
  private editor: import('monaco-editor').editor.IStandaloneCodeEditor;
  private onStateChange: (state: ArchitectState, ctx: ArchitectContext) => void;

  constructor(
    monaco: typeof import('monaco-editor'),
    editor: import('monaco-editor').editor.IStandaloneCodeEditor,
    onStateChange: (state: ArchitectState, ctx: ArchitectContext) => void
  ) {
    this.monaco = monaco;
    this.editor = editor;
    this.onStateChange = onStateChange;
    this.ctx = {
      state: 'IDLE',
      attempt: 0,
      maxAttempts: 3,
      currentFiles: {},
      errors: [],
      streamedTokens: 0,
      startTime: 0,
    };
  }

  // ─── Public API ──────────────────────────────────────

  async generate(prompt: string, existingFiles: Record<string, string>) {
    this.ctx = {
      ...this.ctx,
      state: 'STREAMING',
      attempt: 0,
      currentFiles: existingFiles,
      errors: [],
      streamedTokens: 0,
      startTime: Date.now(),
    };
    this.emit();

    try {
      // Phase 1: Stream code from LLM
      const files = await this.streamCode(prompt, existingFiles);
      this.ctx.currentFiles = files;

      // Phase 2: Analyze for errors
      await this.analyzeAndCorrect(prompt);
    } catch (err: any) {
      this.ctx.state = 'FAILED';
      this.ctx.errors = [{ line: 0, column: 0, code: 'STREAM_ERROR', message: err.message, filename: '' }];
      this.emit();
    }
  }

  // ─── Internal: Streaming ─────────────────────────────

  private async streamCode(
    prompt: string,
    contextFiles: Record<string, string>
  ): Promise<Record<string, string>> {
    const response = await fetch('/api/studio/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        contextFiles,
        mode: this.ctx.attempt === 0 ? 'generate' : 'correct',
        errors: this.ctx.errors,
      }),
    });

    if (!response.ok) throw new Error(`Generation failed: ${response.status}`);

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let currentFile = 'App.tsx';
    const fileBuffers: Record<string, string> = {};

    // Clear editor for fresh generation (not for corrections)
    if (this.ctx.attempt === 0) {
      const model = this.editor.getModel();
      if (model) model.setValue('');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;

        try {
          const { text } = JSON.parse(data);
          this.ctx.streamedTokens++;

          // Detect file markers
          const markerMatch = text.match(/\/\/ === FILE: (.+?) ===/);
          if (markerMatch) {
            currentFile = markerMatch[1].trim();
            if (!fileBuffers[currentFile]) fileBuffers[currentFile] = '';
            continue;
          }

          // Accumulate
          if (!fileBuffers[currentFile]) fileBuffers[currentFile] = '';
          fileBuffers[currentFile] += text;

          // Insert into Monaco
          const model = this.editor.getModel();
          if (model) {
            const end = model.getFullModelRange().getEndPosition();
            this.editor.executeEdits('architect', [{
              range: new this.monaco.Range(end.lineNumber, end.column, end.lineNumber, end.column),
              text,
              forceMoveMarkers: true,
            }]);
            this.editor.revealLine(model.getLineCount());
          }
        } catch {
          // Skip malformed SSE chunks
        }
      }
    }

    return fileBuffers;
  }

  // ─── Internal: Analyze & Correct ─────────────────────

  private async analyzeAndCorrect(originalPrompt: string) {
    this.ctx.state = 'ANALYZING';
    this.emit();

    // Wait for Monaco's TypeScript worker to finish
    await this.waitForDiagnostics();

    // Collect markers
    const errors = this.collectErrors();

    if (errors.length === 0) {
      // Clean! We're done.
      this.ctx.state = 'CLEAN';
      this.emit();
      return;
    }

    // Errors found — attempt correction
    this.ctx.errors = errors;
    this.ctx.attempt++;

    if (this.ctx.attempt > this.ctx.maxAttempts) {
      // Too many attempts — give up and show errors to user
      this.ctx.state = 'FAILED';
      this.emit();
      return;
    }

    // Enter correction mode
    this.ctx.state = 'CORRECTING';
    this.emit();

    // Stream the correction
    const correctedFiles = await this.streamCode(
      this.buildCorrectionPrompt(errors),
      this.ctx.currentFiles
    );
    this.ctx.currentFiles = correctedFiles;

    // Re-analyze
    this.ctx.state = 'RE_ANALYZING';
    this.emit();
    await this.analyzeAndCorrect(originalPrompt); // Recursive (bounded by maxAttempts)
  }

  private async waitForDiagnostics(): Promise<void> {
    // TypeScript worker is async — wait for it to process new code
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Additional: wait for marker count to stabilize
    let prevCount = -1;
    let stableIterations = 0;
    while (stableIterations < 3) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const model = this.editor.getModel();
      if (!model) return;
      const currentCount = this.monaco.editor.getModelMarkers({ resource: model.uri }).length;
      if (currentCount === prevCount) {
        stableIterations++;
      } else {
        stableIterations = 0;
        prevCount = currentCount;
      }
    }
  }

  private collectErrors(): FormattedError[] {
    const model = this.editor.getModel();
    if (!model) return [];

    return this.monaco.editor
      .getModelMarkers({ resource: model.uri })
      .filter(m => m.severity === this.monaco.MarkerSeverity.Error)
      .map(m => ({
        line: m.startLineNumber,
        column: m.startColumn,
        code: typeof m.code === 'object' ? String(m.code.value) : String(m.code),
        message: m.message,
        filename: model.uri.path.split('/').pop() || 'App.tsx',
      }));
  }

  private buildCorrectionPrompt(errors: FormattedError[]): string {
    const errorList = errors.map(e =>
      `Line ${e.line}, Col ${e.column}: [TS${e.code}] ${e.message}`
    ).join('\n');

    const codeContext = Object.entries(this.ctx.currentFiles)
      .map(([name, code]) => `--- ${name} ---\n${code}`)
      .join('\n\n');

    return [
      '[TYPESCRIPT ERRORS]',
      errorList,
      '',
      '[CURRENT CODE]',
      codeContext,
      '',
      'Fix ONLY these errors. Do not add features or rewrite unrelated code.',
      'Output the COMPLETE corrected file(s) with // === FILE: === markers.',
    ].join('\n');
  }

  private emit() {
    this.onStateChange(this.ctx.state, { ...this.ctx });
  }
}
```

### GEMINI §2.3 Server-Side Route Update

The `/api/studio/generate` route needs to handle both `generate` and `correct` modes:

```typescript
// /api/studio/generate/route.ts — Updated

export async function POST(req: NextRequest) {
  const { prompt, contextFiles, runtimeLogs, mode, errors } = await req.json();

  const systemPrompt = ARCHITECT_SYSTEM_PROMPT; // Same prompt for both modes
  // The prompt builder includes [TYPESCRIPT ERRORS] block when mode === 'correct',
  // which triggers §5 in the system prompt (Correction Mode).

  const userPrompt = mode === 'correct'
    ? prompt  // Already contains [TYPESCRIPT ERRORS] + [CURRENT CODE]
    : buildArchitectPrompt({
        userMessage: prompt,
        currentFiles: contextFiles || {},
        runtimeLogs,
        typescriptErrors: errors,
      });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const stream = await openai.chat.completions.create({
    model: mode === 'correct' ? 'gpt-4o-mini' : 'gpt-4o', // Cheaper model for corrections
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: mode === 'correct' ? 0.2 : 0.4, // Lower temp for corrections
    max_completion_tokens: mode === 'correct' ? 8192 : 16384,
  });

  // SSE stream (same as Phase 1 spec)
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

## GEMINI §3. Streaming UI: Ghost Cursor & Matrix Rain

### GEMINI §3.1 The Ghost Cursor

When the Architect is streaming code, a glowing "ghost cursor" pulses at the insertion point, mimicking a human typing. This is distinct from the user's regular cursor.

```typescript
// src/lib/studio/ghost-cursor.ts

export class GhostCursor {
  private decoration: string[] = [];
  private editor: import('monaco-editor').editor.IStandaloneCodeEditor;
  private monaco: typeof import('monaco-editor');
  private animFrame: number | null = null;
  private opacity = 1;
  private increasing = false;

  constructor(
    monaco: typeof import('monaco-editor'),
    editor: import('monaco-editor').editor.IStandaloneCodeEditor
  ) {
    this.monaco = monaco;
    this.editor = editor;
  }

  /** Show the ghost cursor at the current end of document */
  show() {
    this.animate();
  }

  /** Hide and clean up */
  hide() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this.editor.deltaDecorations(this.decoration, []);
    this.decoration = [];
  }

  /** Update position to end of document */
  updatePosition() {
    const model = this.editor.getModel();
    if (!model) return;

    const lastLine = model.getLineCount();
    const lastCol = model.getLineMaxColumn(lastLine);

    this.decoration = this.editor.deltaDecorations(this.decoration, [{
      range: new this.monaco.Range(lastLine, lastCol, lastLine, lastCol + 1),
      options: {
        className: `ghost-cursor ghost-cursor--opacity-${Math.round(this.opacity * 10)}`,
        stickiness: this.monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
      },
    }]);
  }

  private animate() {
    // Pulse opacity between 0.3 and 1.0
    if (this.increasing) {
      this.opacity += 0.05;
      if (this.opacity >= 1) this.increasing = false;
    } else {
      this.opacity -= 0.05;
      if (this.opacity <= 0.3) this.increasing = true;
    }

    this.updatePosition();
    this.animFrame = requestAnimationFrame(() => this.animate());
  }
}
```

**CSS for the Ghost Cursor:**

```css
/* src/styles/architect.css */

/* Ghost Cursor — glowing emerald block at insertion point */
.ghost-cursor {
  background-color: rgba(54, 226, 123, 0.6);
  border-left: 2px solid #36e27b;
  box-shadow: 0 0 8px rgba(54, 226, 123, 0.4), 0 0 20px rgba(54, 226, 123, 0.15);
  width: 2px !important;
  animation: ghostPulse 1s ease-in-out infinite;
}

@keyframes ghostPulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(54, 226, 123, 0.4); }
  50%      { opacity: 0.4; box-shadow: 0 0 4px rgba(54, 226, 123, 0.2); }
}

/* Dynamic opacity classes (set by JS) */
.ghost-cursor--opacity-3  { opacity: 0.3; }
.ghost-cursor--opacity-5  { opacity: 0.5; }
.ghost-cursor--opacity-7  { opacity: 0.7; }
.ghost-cursor--opacity-10 { opacity: 1.0; }
```

### GEMINI §3.2 Matrix Rain Effect

A subtle digital rain animation in the editor's gutter (line number area) during AI streaming:

```css
/* Matrix Rain — gutter animation during Architect streaming */

.architect-streaming .monaco-editor .margin-view-overlays {
  position: relative;
}

.architect-streaming .monaco-editor .margin-view-overlays::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(54, 226, 123, 0.04) 30%,
    rgba(54, 226, 123, 0.08) 50%,
    rgba(54, 226, 123, 0.04) 70%,
    transparent 100%
  );
  background-size: 100% 300%;
  animation: matrixRain 2.5s linear infinite;
  pointer-events: none;
  z-index: 1;
}

@keyframes matrixRain {
  0%   { background-position: 0% 0%; }
  100% { background-position: 0% 100%; }
}

/* Glow effect on line numbers during streaming */
.architect-streaming .monaco-editor .line-numbers {
  color: #36e27b !important;
  text-shadow: 0 0 4px rgba(54, 226, 123, 0.3);
  transition: color 0.3s ease, text-shadow 0.3s ease;
}

/* Subtle pulse on the active line highlight */
.architect-streaming .monaco-editor .current-line {
  background-color: rgba(54, 226, 123, 0.03) !important;
  animation: linePulse 2s ease-in-out infinite;
}

@keyframes linePulse {
  0%, 100% { background-color: rgba(54, 226, 123, 0.03); }
  50%      { background-color: rgba(54, 226, 123, 0.06); }
}
```

### GEMINI §3.3 Status Bar Component

The status bar at the bottom of the editor shows the Architect's current state:

```typescript
// src/components/studio/ArchitectStatusBar.tsx

import React from 'react';

interface Props {
  state: ArchitectState;
  attempt: number;
  maxAttempts: number;
  streamedTokens: number;
  errorCount: number;
  elapsedMs: number;
}

const STATE_LABELS: Record<ArchitectState, { label: string; color: string; icon: string }> = {
  IDLE:          { label: 'Ready',              color: 'text-zinc-500',    icon: '◉' },
  STREAMING:     { label: 'Writing Code...',    color: 'text-emerald-400', icon: '▶' },
  ANALYZING:     { label: 'Checking Types...',  color: 'text-cyan-400',    icon: '◎' },
  CORRECTING:    { label: 'Self-Correcting...', color: 'text-amber-400',   icon: '⟳' },
  RE_ANALYZING:  { label: 'Re-checking...',     color: 'text-cyan-400',    icon: '◎' },
  CLEAN:         { label: 'Clean Build',        color: 'text-emerald-400', icon: '✓' },
  FAILED:        { label: 'Errors Remain',      color: 'text-red-400',     icon: '✗' },
};

export function ArchitectStatusBar({ state, attempt, maxAttempts, streamedTokens, errorCount, elapsedMs }: Props) {
  const config = STATE_LABELS[state];
  const isActive = state !== 'IDLE' && state !== 'CLEAN' && state !== 'FAILED';

  return (
    <div className="h-7 bg-[#04060b] border-t border-zinc-800/50 flex items-center px-4 text-[10px] font-mono tracking-wider select-none">
      {/* State indicator */}
      <div className={`flex items-center gap-2 ${config.color}`}>
        <span className={isActive ? 'animate-pulse' : ''}>{config.icon}</span>
        <span className="uppercase font-bold">{config.label}</span>
      </div>

      <div className="mx-3 w-px h-3 bg-zinc-800" />

      {/* Metrics */}
      <div className="flex items-center gap-4 text-zinc-600">
        <span>Tokens: <span className="text-zinc-400">{streamedTokens.toLocaleString()}</span></span>
        <span>Attempt: <span className="text-zinc-400">{attempt}/{maxAttempts}</span></span>
        {errorCount > 0 && (
          <span>Errors: <span className="text-red-400">{errorCount}</span></span>
        )}
        <span>Time: <span className="text-zinc-400">{(elapsedMs / 1000).toFixed(1)}s</span></span>
      </div>

      {/* Model indicator (right-aligned) */}
      <div className="ml-auto text-zinc-600">
        Model: <span className="text-zinc-400">{state === 'CORRECTING' ? 'gpt-4o-mini' : 'gpt-4o'}</span>
      </div>
    </div>
  );
}
```

### GEMINI §3.4 Integration: Wiring It All Together

```typescript
// In src/app/app/studio/page.tsx — Architect integration

function StudioPage() {
  const monacoRef = useRef<typeof import('monaco-editor')>();
  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor>();
  const ghostCursorRef = useRef<GhostCursor>();
  const [architectState, setArchitectState] = useState<ArchitectState>('IDLE');
  const [architectCtx, setArchitectCtx] = useState<ArchitectContext | null>(null);

  // Initialize state machine when editor mounts
  const architectRef = useRef<ArchitectStateMachine>();

  const handleEditorMount = (editor, monaco) => {
    monacoRef.current = monaco;
    editorRef.current = editor;
    ghostCursorRef.current = new GhostCursor(monaco, editor);

    architectRef.current = new ArchitectStateMachine(
      monaco,
      editor,
      (state, ctx) => {
        setArchitectState(state);
        setArchitectCtx(ctx);

        // Manage visual effects based on state
        const editorEl = document.querySelector('.monaco-editor')?.parentElement;
        if (!editorEl) return;

        if (state === 'STREAMING' || state === 'CORRECTING') {
          editorEl.classList.add('architect-streaming');
          ghostCursorRef.current?.show();
          editor.updateOptions({ readOnly: true }); // Lock editor during generation
        } else {
          editorEl.classList.remove('architect-streaming');
          ghostCursorRef.current?.hide();
          editor.updateOptions({ readOnly: false });
        }
      }
    );
  };

  // Handle prompt submission
  const handleArchitectGenerate = async (prompt: string) => {
    if (!architectRef.current) return;
    await architectRef.current.generate(prompt, files);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* ... header ... */}
      <div className="flex-1 flex">
        {/* Left: Chat + Editor */}
        <div className="flex flex-col flex-1">
          <PromptChat onSubmit={handleArchitectGenerate} state={architectState} />
          <CodeEditor onMount={handleEditorMount} files={files} />
          <ArchitectStatusBar
            state={architectState}
            attempt={architectCtx?.attempt ?? 0}
            maxAttempts={architectCtx?.maxAttempts ?? 3}
            streamedTokens={architectCtx?.streamedTokens ?? 0}
            errorCount={architectCtx?.errors.length ?? 0}
            elapsedMs={architectCtx ? Date.now() - architectCtx.startTime : 0}
          />
        </div>
        {/* Right: Preview + Console */}
        <div className="flex flex-col w-[45%]">
          <LivePreview files={files} />
          <SimulationConsole />
        </div>
      </div>
    </div>
  );
}
```

### GEMINI Summary

| Component | Implementation | Key Detail |
|-----------|---------------|------------|
| **System Prompt** | 6 sections: Runtime, Forbidden APIs, SDK Reference, Output Format, Self-Correction, Security | Every constraint maps to a real iframe limitation |
| **Prompt Builder** | Context-aware assembly with `[CURRENT CODE]`, `[TYPESCRIPT ERRORS]`, `[RUNTIME ERRORS]`, `[RESEARCH CONTEXT]` | Triggers Correction Mode via §5 when errors present |
| **State Machine** | 7 states: IDLE → STREAMING → ANALYZING → (CORRECTING → RE_ANALYZING)×3 → CLEAN/FAILED | Max 3 correction attempts; uses `gpt-4o-mini` at `temp=0.2` for corrections |
| **Ghost Cursor** | Monaco decoration with emerald glow + pulse animation | Updates position every animation frame during streaming |
| **Matrix Rain** | CSS gradient animation on `.margin-view-overlays::before` | Only active during STREAMING/CORRECTING states |
| **Status Bar** | State label, token count, attempt counter, elapsed time, model indicator | Real-time feedback on Architect progress |

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PART IV: KIMI — External Connectivity & Sandbox IO Specification
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Model:** Kimi (The Integrator)  
**Domain:** Proxy Gate, Domain Allowlist, External Widget Integration  

---

## KIMI §1. The Proxy Gate: `useFetch()` Hook

### KIMI §1.1 Why a Proxy?

Mini-Apps run inside a sandboxed iframe with a restrictive Content Security Policy. Direct `fetch()` calls to external APIs are blocked for two reasons:

1. **CORS:** Most APIs (Jupiter, Raydium, CoinGecko) don't include `null` in their `Access-Control-Allow-Origin` header. The iframe's origin is `null` (srcdoc without `allow-same-origin`), so every cross-origin request fails.

2. **Security:** An unrestricted `fetch()` lets a malicious Mini-App exfiltrate vault data to `evil-site.com`. The proxy enforces a domain allowlist and logs all outbound requests.

**Solution:** All external HTTP requests route through `/api/proxy` on the Keystone Next.js server. The Mini-App uses a `useFetch()` hook from `@keystone-os/sdk` which transparently proxies requests.

### KIMI §1.2 SDK Hook: `useFetch()`

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

### KIMI §1.3 Host-Side Proxy Handler

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

### KIMI §1.4 Next.js API Route: `/api/proxy`

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

## KIMI §2. Allowlist Logic

### KIMI §2.1 Two-Tier Allowlist Architecture

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
│  Validated during Security Scan (OPUS §3).               │
│                                                         │
│  Resolution: request.domain ∈ (Global ∪ Manifest)       │
│  If not in either → 403 Forbidden                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### KIMI §2.2 Preventing Data Exfiltration

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

### KIMI §2.3 Adding Custom Domains

Developers declare custom domains in their `keystone.manifest.json`:

```jsonc
{
  "allowedDomains": [
    "my-custom-api.vercel.app",
    "data.myproject.io"
  ]
}
```

During the Security Scan (OPUS §3, Stage 3), the scanner validates:
1. Each declared domain is actually used in the code (no orphan declarations).
2. The domain is HTTPS (no HTTP allowed).
3. The domain is not a known malicious domain (checked against a blocklist).
4. The domain is not a catch-all wildcard (no `*.example.com`).

### KIMI §2.4 Developer Experience: Clear Error Messages

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

## KIMI §3. External Widget Integration

### KIMI §3.1 The Challenge

Mini-Apps may need to embed third-party widgets:
- **TradingView charts** (lightweight-charts or TradingView widget)
- **Jupiter Terminal** (swap widget)
- **Phantom Connect** button (for external wallet connections)

These widgets often load external scripts, create their own iframes, or require DOM access patterns that conflict with our sandbox.

### KIMI §3.2 Strategy: Three Tiers of Widget Integration

| Tier | Widget Type | Integration Method | Example |
|------|------------|-------------------|---------|
| **Tier 1: NPM Package** | Pure JS/React libraries available on npm | Import via esm.sh import map. No special handling. | `lightweight-charts`, `recharts`, `d3`, `chart.js` |
| **Tier 2: Keystone Wrapper** | Widgets that need network access | Build a React wrapper component in the SDK that uses `useFetch()` internally | Jupiter quotes, Birdeye charts |
| **Tier 3: Nested Iframe** | Widgets that must load external scripts | Embed as a nested iframe with strict CSP, communicate via postMessage | TradingView advanced widget |

### KIMI §3.3 Tier 1: NPM Package Widgets (Recommended)

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

### KIMI §3.4 Tier 2: Keystone SDK Wrapper Components

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

### KIMI §3.5 Tier 3: Nested Iframe Widgets (Advanced)

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

### KIMI §3.6 Widget Integration Summary

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

## KIMI §4. Advanced: API Key Management

### KIMI §4.1 The Problem

Some APIs (Helius, Birdeye Pro, CoinGecko Pro) require API keys. Mini-Apps cannot embed API keys in their source code (it's visible in the marketplace). The proxy must inject keys server-side.

### KIMI §4.2 Solution: Keystone Key Vault

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

### KIMI Summary

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

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MASTER SUMMARY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Part | Model | Key Deliverables |
|------|-------|-----------------|
| **I. OPUS** | System Architect | Hybrid storage (SQLite + Arweave), 80/20 on-chain revenue split, 5-stage security scan pipeline, `user_installed_apps` table with dock persistence |
| **II. GPT** | Runtime Engineer | `keystone.lock.json` schema, Curated Registry resolver, Babel `retainLines` compiler, Monaco tsconfig with full SDK `.d.ts`, Treasury Pulse template |
| **III. GEMINI** | AI Specialist | 6-section system prompt, `ArchitectStateMachine` (7 states, 3 max corrections), prompt builder, Ghost Cursor + Matrix Rain CSS, status bar |
| **IV. KIMI** | The Integrator | `useFetch()` proxy hook, 2-tier domain allowlist, 7-layer anti-exfiltration, 3-tier widget integration, server-side API key injection |

---

*KEYSTONE PHASE 2 MASTER SPECIFICATION — Document Version 1.0*  
*Diamond Merge Architecture — LOCKED for Implementation*
