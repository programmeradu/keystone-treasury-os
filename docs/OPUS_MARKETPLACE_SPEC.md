# OPUS — Keystone Marketplace & App Registry Specification

**Model:** Claude Opus Thinking (System Architect)  
**Phase:** 2 — Deep Dive Implementation Spec  
**Domain:** Storage, Distribution, Revenue, Security Scanning, Installation Lifecycle  

---

## 1. Storage & Distribution

### 1.1 The Decision: Hybrid Storage (SQL + Arweave)

| Layer | What It Stores | Why |
|-------|---------------|-----|
| **SQLite (Turso)** | App metadata, indexes, ratings, install counts, purchase records | Fast queries, real-time marketplace browsing, relational joins |
| **Arweave** | Immutable source code bundles (the actual `.tsx` files) | Permanent, censorship-resistant, content-addressable, auditable |
| **NOT IPFS** | — | IPFS requires pinning services to stay available. Arweave is permanent by default. |
| **NOT centralized-only** | — | If Keystone goes down, creators lose their published code. Arweave ensures permanence. |

**Flow:** When a creator publishes, the code is uploaded to Arweave and the returned transaction ID is stored in the SQL `mini_apps.arweave_tx_id` column. The SQL DB is the index; Arweave is the source of truth.

### 1.2 Enhanced Database Schema

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

### 1.3 The App Manifest: `keystone.manifest.json`

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

### 1.4 Versioning Strategy

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

## 2. The 80/20 Revenue Split

### 2.1 Decision: On-Chain Split (No License Token NFT)

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **License Token (NFT)** | Resellable, composable, on-chain proof of ownership | Adds SPL token complexity, requires marketplace for secondary sales, gas costs for minting, UX friction | ❌ Overkill for v1 |
| **On-Chain Split TX + DB Flag** | Simple, atomic, verifiable on-chain, low gas | Not resellable | ✅ Ship this |

**Rationale:** A License NFT is a v2 feature. For launch, the 80/20 split happens atomically in a single Solana transaction (2 transfer instructions), and the `purchases` table records the receipt. The on-chain `txSignature` is the proof of purchase.

### 2.2 Enhanced Payment Flow

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

### 2.3 Purchase Verification

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

## 3. The Security Scan Pipeline

### 3.1 Scan Stages

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

### 3.2 Stage 1: Static Pattern Scan

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

### 3.3 Stage 3: Manifest Validation

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

### 3.4 Full Scan Orchestrator

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

## 4. Installation Lifecycle

### 4.1 State Machine

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

### 4.2 New Table: `user_installed_apps`

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

### 4.3 Dock Persistence

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

### 4.4 App Launch Flow

When a user clicks an app in the Dock:

1. **Fetch code:** Query `miniApps.code` by `appId` (already cached in SQLite, fast).
2. **Resolve lockfile:** Read `miniApps.lockfile` to build the import map with pinned versions.
3. **Check permissions:** Read `miniApps.manifest` to configure CSP and bridge allowlists.
4. **Render in iframe:** Pass code + import map + CSP to the `LivePreview` component.
5. **Update `lastOpenedAt`:** Timestamp for "Recently Used" sorting.

---

## Summary

| Component | Decision | Rationale |
|-----------|----------|-----------|
| **Code Storage** | SQLite (index) + Arweave (source) | Fast queries + permanent, censorship-resistant code |
| **Revenue Split** | On-chain 2-instruction TX + DB receipt | Simple, atomic, verifiable. NFT licenses are v2. |
| **Security Scan** | 5-stage pipeline (Pattern → AST → Manifest → Deps → Dry Run) | Defense in depth. Critical violations block publish. |
| **Installation** | Separate `user_installed_apps` table with dock position | Decouples "purchased" from "installed", enables uninstall |
| **Versioning** | Append-only version history with Arweave TX IDs | Full audit trail, rollback by re-publish |

---

*OPUS — Document Version 1.0*
