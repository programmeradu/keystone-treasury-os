# GPT — Compiler & Runtime Environment Specification

**Model:** GPT (Runtime Engineer)  
**Phase:** 2 — Deep Dive Implementation Spec  
**Domain:** Lockfile, Compiler Pipeline, TypeScript Config, Canonical Templates  

---

## 1. The Keystone Lockfile: `keystone.lock.json`

### 1.1 Why a Lockfile?

The browser has no `node_modules`, no `package.json`, and no package manager. When user code writes `import { motion } from 'framer-motion'`, the runtime must resolve this to a specific esm.sh URL. Without a lockfile:

- **Version drift:** `https://esm.sh/framer-motion` resolves to whatever is "latest" at request time. Tomorrow it could be a breaking version.
- **React duplication:** Without `?external=react`, each package bundles its own React copy.
- **Irreproducible builds:** The same code produces different results on different days.

The lockfile is the single source of truth for dependency resolution in the Keystone iframe runtime.

### 1.2 Schema Definition

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

### 1.3 Resolution Algorithm

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

### 1.4 Import Map Injection (Fixed for Firefox/Safari)

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

## 2. The Compiler Pipeline

### 2.1 Overview

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

### 2.2 Babel Configuration

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

### 2.3 Console Interceptor

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

### 2.4 Render Bootstrap

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

### 2.5 Source Map Accuracy

The `retainLines: true` Babel option is critical. It tells Babel to output code on the same line number as the input. This means when the iframe throws `"Error at line 47"`, line 47 in the compiled output corresponds to line 47 in the user's TypeScript source.

Without `retainLines`, Babel's JSX transform expands multi-line JSX into single expressions, shifting all line numbers. The Self-Correction Loop (Gemini spec) relies on accurate line numbers to feed errors back to the AI.

For deeper debugging, `sourceMaps: 'inline'` embeds a base64 source map comment at the end of the compiled code. Chrome DevTools will decode this and show the original TypeScript in the Sources panel.

---

## 3. TypeScript Configuration for Monaco

### 3.1 Browser tsconfig Equivalent

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

### 3.2 SDK Type Definitions

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

### 3.3 Diagnostic Code Suppression

Two TS diagnostic codes are suppressed:

| Code | Message | Why Suppressed |
|------|---------|----------------|
| `2307` | "Cannot find module 'framer-motion'" | TS doesn't know about our import map. The module resolves at runtime via esm.sh. |
| `7016` | "Could not find a declaration file for module 'X'" | Same reason. We don't have `.d.ts` for every esm.sh package. |

All other diagnostics — including type errors, missing properties, wrong argument counts — remain active and feed into the Self-Correction Loop.

---

## 4. Canonical "Hello World" Template

### 4.1 Treasury Pulse — The Starter App

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

### 4.2 Import Analysis

The template above imports:
- `react` (from import map → `esm.sh/react@19.0.0`)
- `@keystone-os/sdk` (from import map → Blob URL with virtual SDK)

No external packages needed. The lockfile for this template contains only the `runtime` section — zero `dependencies`. This makes it the ideal first-run experience: no dependency resolution, instant preview.

### 4.3 What the Import Chain Looks Like at Runtime

```
User writes:                    Browser resolves via Import Map:
─────────────                   ──────────────────────────────────
import React from 'react'   →  https://esm.sh/react@19.0.0?dev
import { useVault }          →  blob://sdk-virtual-module-abc123
  from '@keystone-os/sdk'
```

No bundler. No `npm install`. No build step. The browser's native ES Module system does all the work, guided by the import map we inject.

---

## Summary

| Component | Implementation | Key Detail |
|-----------|---------------|------------|
| **Lockfile** | `keystone.lock.json` in DB column | Pins versions, stores esm.sh URLs with `?external` flags, includes SRI integrity hashes |
| **Resolver** | Curated Registry + manifest pins + fallback | Unknown packages externalize React by default |
| **Compiler** | Babel Standalone with `['typescript', 'react']` presets | `retainLines: true` for accurate debugging; `runtime: 'automatic'` for jsx-runtime |
| **Import Map** | Static `<script type="importmap">` in `<head>` | Pre-computed on host, injected before any module scripts — Firefox/Safari compatible |
| **Monaco TS** | Full `tsconfig` equivalent via `setCompilerOptions` | Strict mode, suppress 2307/7016, inject comprehensive SDK `.d.ts` |
| **Hello World** | Treasury Pulse template | Uses `useVault()`, real-time `subscribe()`, sparklines, zero external deps |

---

*GPT — Document Version 1.0*
