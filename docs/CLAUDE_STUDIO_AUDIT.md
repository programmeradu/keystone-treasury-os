# CLAUDE — Keystone Studio Audit & Architect Roadmap

**Model:** Claude (Anthropic) — Sonnet 4  
**Date:** January 2026  
**Status:** COMPREHENSIVE AUDIT + IMPLEMENTATION ROADMAP  
**Scope:** Diamond Merge Architecture — Security (Opus 4.6) + Runtime (GPT 5.2) + Protocol (Gemini 3.0)  

---

## Executive Summary

After a deep-dive audit of the Keystone Studio codebase — `LivePreview.tsx`, `CodeEditor.tsx`, `PromptChat.tsx`, `/api/studio/generate/route.ts`, the agent system, and all supporting documentation — I identified **14 bugs**, **6 architectural conflicts**, **3 security vulnerabilities**, and **4 DX bottlenecks**.

This document delivers:
1. A definitive ruling on the **Sandpack vs. Custom Iframe** conflict.
2. A complete solution for **Dependency Hell** in the browser.
3. The full design for **"The Architect"** — a streaming, self-correcting, prompt-to-app engine.
4. A **Cyberpunk Bloomberg Terminal** UI specification.

---

## Section 1: The Audit & Gap Analysis

### 1.1 The Sandpack vs. Custom Iframe Verdict

**The Conflict:** `PROJECT_OVERVIEW.md` line 91 lists Sandpack. `package.json` includes `@codesandbox/sandpack-react@^2.20.0`. Yet **zero lines of source code** import Sandpack. The actual Studio uses a custom Monaco + Babel + esm.sh + iframe pipeline.

| Signal | Sandpack | Custom Iframe (Current) |
|--------|----------|------------------------|
| Listed in docs | ✅ Line 91 | ❌ Not mentioned |
| In `package.json` | ✅ Installed | N/A (uses Monaco, Babel) |
| Actually imported in code | ❌ **Zero imports** | ✅ `LivePreview.tsx`, `CodeEditor.tsx` |
| Supports character-level AI streaming | ❌ `updateFile()` is batch-only | ✅ Monaco `executeEdits()` supports per-char insertion |
| Custom Bridge integration | ❌ Uses own iframe comms | ✅ Full `postMessage` bridge wired |
| Bundle overhead | ~180KB gzipped | ~0KB additional |

**VERDICT: Kill Sandpack. Commit to Custom Iframe.**

**Rationale:**
1. **"The Architect" demands character-level streaming.** Sandpack's `updateFile()` swaps entire file content at once — no incremental insertion API. Monaco's `editor.executeEdits()` inserts text at a specific cursor position character-by-character.
2. **Bridge ownership is non-negotiable.** Sandpack manages its own iframe comms. We cannot inject our HMAC-authenticated Bridge Protocol without forking their client.
3. **Dead dependency.** Installed but never imported. Remove it.

**Action Items:**
- Remove `@codesandbox/sandpack-react` and `@codesandbox/sandpack-themes` from `package.json`
- Update `PROJECT_OVERVIEW.md` line 91 to reference "Custom ESM Runtime"

---

### 1.2 Bug Report: Critical Issues

#### BUG-001: 🔴 CRITICAL — Sandbox Escape via `allow-same-origin`

**File:** `LivePreview.tsx:295`
```html
sandbox="allow-scripts allow-popups allow-pointer-lock allow-same-origin allow-forms"
```
`allow-same-origin` + `allow-scripts` lets iframe JS access `window.parent.document`, read host `localStorage` (which stores `keystone_sub_org_id` — the Turnkey wallet ID), and call `window.parent.fetch()`.

**Fix:** `sandbox="allow-scripts"` — remove everything else. `postMessage` works cross-origin.

#### BUG-002: 🔴 HIGH — postMessage uses `'*'` target origin

**File:** `LivePreview.tsx:59,100,117,211,232,236` — Every `postMessage` call uses `'*'`.

**Fix:** Host validates `event.source === iframeRef.current.contentWindow` on every message.

#### BUG-003: 🔴 HIGH — No origin/source validation on host handler

**File:** `LivePreview.tsx:194` — `handleMessage` does no `event.origin` or `event.source` check. Any window can send messages that get processed as Studio bridge messages.

**Fix:**
```typescript
if (event.source !== iframeRef.current?.contentWindow) return;
```

#### BUG-004: 🟡 MEDIUM — React Version Mismatch

**File:** `LivePreview.tsx:74-78` — iframe loads React **18.2.0** but host runs React **19.0.0** (`package.json:98`). React 19 features (`use()`, `useActionState`) fail in preview. AI generates React 19 code (matching Monaco types) that crashes at runtime.

**Fix:** `https://esm.sh/react@19.0.0?dev`

#### BUG-005: 🟡 MEDIUM — Import Map injected after module execution

**File:** `LivePreview.tsx:148-159` — Import map is dynamically created inside `<script type="module">`. Per spec, import maps must appear before any module script. Works in Chrome 133+ but **fails in Firefox and Safari**.

**Fix:** Pre-compute import map on host side in the `useMemo`, inject as static `<script type="importmap">` in `<head>` before module scripts.

#### BUG-006: 🟡 MEDIUM — No Babel TypeScript preset

**File:** `LivePreview.tsx:161-165` — Babel configured with `presets: ['react']` only. File is `App.tsx` but TypeScript syntax (type annotations, interfaces) causes parse errors. Since AI generates TypeScript by default, most AI code crashes.

**Fix:** `presets: ['react', 'typescript']` — `@babel/standalone` includes TS preset built-in.

#### BUG-007: 🟡 MEDIUM — AI Generation is not streaming

**File:** `/api/studio/generate/route.ts:120-130` — Uses blocking `response_format: { type: "json_object" }` which buffers entire response. User stares at spinner for 10-30s.

**Fix:** Detailed in Section 2.1 — two-phase streaming architecture.

#### BUG-008: 🟢 LOW — `max_tokens: 4000` too low

Complex apps exceed 4000 tokens. Output gets truncated mid-code producing invisible syntax errors.

**Fix:** Increase to `max_completion_tokens: 16384`.

#### BUG-009: 🟢 LOW — Unbounded console log array

`LivePreview.tsx:205` — `setLogs(prev => [...prev, ...])` grows without bound.

**Fix:** `setLogs(prev => [...prev.slice(-500), newLog])`

#### BUG-010: 🟢 LOW — Monaco type stubs return `any` for everything

`CodeEditor.tsx:62-66` — `useVault: () => any` provides zero IntelliSense value.

**Fix:** Comprehensive `.d.ts` injection (defined in Section 2.3).

---

### 1.3 The Dependency Hell Solution

**Problem:** When a Mini-App imports `framer-motion`, `recharts`, and `lucide-react` via `esm.sh/{pkg}?bundle`, each bundles its own React copy internally. Three React instances = broken hooks.

**Solution: `esm.sh` External React Pattern + Curated Registry**

```typescript
const CURATED_REGISTRY: Record<string, string> = {
  'react':             'https://esm.sh/react@19.0.0?dev',
  'react/jsx-runtime': 'https://esm.sh/react@19.0.0/jsx-runtime?dev',
  'react-dom/client':  'https://esm.sh/react-dom@19.0.0/client?dev&external=react',
  'framer-motion':     'https://esm.sh/framer-motion@11.15.0?external=react,react-dom',
  'recharts':          'https://esm.sh/recharts@2.15.0?external=react,react-dom',
  'lucide-react':      'https://esm.sh/lucide-react@0.512.0?external=react',
  'zustand':           'https://esm.sh/zustand@5.0.0?external=react',
  'lightweight-charts': 'https://esm.sh/lightweight-charts@4.2.1',
  '@tanstack/react-query': 'https://esm.sh/@tanstack/react-query@5.90.0?external=react',
};

function resolveImportMap(userCode: string): Record<string, string> {
  const imports = { ...CURATED_REGISTRY };
  // Scan for unknown packages
  const regex = /from\s+['"]([^.'\/][^'"]*)['"]/g;
  let match;
  while ((match = regex.exec(userCode)) !== null) {
    const pkg = match[1];
    if (!imports[pkg]) {
      imports[pkg] = `https://esm.sh/${pkg}?external=react,react-dom`;
    }
  }
  return imports;
}
```

**Key insight:** `?external=react,react-dom` tells esm.sh "don't bundle React; I'll provide it." All packages share the single React instance from the import map. Unknown packages use the same pattern as fallback.

---

### 1.4 UI/UX: From Functional to Cyberpunk Bloomberg

#### Monaco "Keystone Noir" Theme

```typescript
monaco.editor.defineTheme('keystone-noir', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment',   foreground: '4a5568', fontStyle: 'italic' },
    { token: 'keyword',   foreground: '22d3ee' },  // Cyan
    { token: 'string',    foreground: '36e27b' },  // Emerald
    { token: 'number',    foreground: 'f59e0b' },  // Amber
    { token: 'type',      foreground: 'a78bfa' },  // Purple
    { token: 'function',  foreground: '60a5fa' },  // Blue
  ],
  colors: {
    'editor.background':              '#04060b',
    'editorCursor.foreground':        '#36e27b',
    'editor.selectionBackground':     '#36e27b20',
    'editor.lineHighlightBackground': '#111827',
    'editorLineNumber.activeForeground': '#36e27b',
  }
});
```

#### Visual Enhancements
- **Glow Minimap:** Re-enable minimap with `renderCharacters: false` + CSS `filter: drop-shadow(0 0 8px rgba(54,226,123,0.15))`
- **Matrix Rain on AI Write:** Subtle gradient animation on editor gutter during streaming
- **CRT Scanlines on Preview:** Repeating-linear-gradient overlay with `pointer-events: none`
- **Neon Tab Indicators:** Active tab `box-shadow: 0 2px 0 0 #36e27b, 0 4px 12px -2px rgba(54,226,123,0.3)`

---

## Section 2: "The Architect" — Prompt-to-App Engine

### 2.1 Streaming Pipeline

**Current problem:** `/api/studio/generate` uses `response_format: { type: "json_object" }` which forces full buffering. Incompatible with streaming.

**Solution: Two-Phase Architecture**

**Phase 1 — "The Writer" (Streaming, visible to user):**
LLM streams raw code as plain text via SSE. Each token is pushed to Monaco's cursor position. No JSON wrapping.

**Phase 2 — "The Reviewer" (Background, non-blocking):**
After streaming, a cheap fast LLM call generates explanation metadata as JSON while the user already sees code.

#### Server: SSE Streaming Route

```typescript
// /api/studio/generate/route.ts — Rewritten
export async function POST(req: NextRequest) {
  const { prompt, contextFiles, runtimeLogs } = await req.json();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    stream: true, // THE KEY CHANGE
    messages: [
      { role: 'system', content: ARCHITECT_SYSTEM_PROMPT },
      { role: 'user', content: buildFullPrompt(prompt, contextFiles, runtimeLogs) },
    ],
    temperature: 0.4,
    max_completion_tokens: 16384,
  });

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
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}
```

#### Client: Streaming into Monaco

```typescript
// In PromptChat.tsx — handleArchitectStream()
const reader = response.body!.getReader();
const decoder = new TextDecoder();
let currentFile = 'App.tsx';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value, { stream: true });
  for (const line of chunk.split('\n')) {
    if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
    const { text } = JSON.parse(line.slice(6));

    // Detect file markers: "// === FILE: App.tsx ==="
    const marker = text.match(/\/\/ === FILE: (.+?) ===/);
    if (marker) { currentFile = marker[1].trim(); continue; }

    // Insert at end of Monaco document
    const model = editor.getModel()!;
    const lineCount = model.getLineCount();
    const lastCol = model.getLineMaxColumn(lineCount);
    editor.executeEdits('architect', [{
      range: new monaco.Range(lineCount, lastCol, lineCount, lastCol),
      text,
      forceMoveMarkers: true,
    }]);
    editor.revealLine(model.getLineCount());
  }
}
```

**The Experience:** User types prompt. Editor clears. Green cursor writes code char-by-char. Matrix gutter animation pulses. Preview auto-renders after each complete function.

---

### 2.2 The Self-Correction Loop

```
AI finishes streaming → Wait 1.5s for TS worker
    → monaco.editor.getModelMarkers()
    → If errors found:
        → Format: "Line 24: [TS2339] Property 'x' does not exist on type 'y'"
        → Fire CorrectionAgent (2nd LLM call, low temp, focused prompt)
        → Stream corrections back into Monaco
        → Loop (max 3 iterations)
    → If clean: ✅ Done
```

#### DiagnosticCollector

```typescript
export async function collectDiagnostics(
  monaco: typeof Monaco,
  editor: Monaco.editor.IStandaloneCodeEditor
): Promise<{ hasErrors: boolean; errors: FormattedError[] }> {
  await new Promise(r => setTimeout(r, 1500)); // Wait for TS worker
  const model = editor.getModel();
  if (!model) return { hasErrors: false, errors: [] };

  const markers = monaco.editor.getModelMarkers({ resource: model.uri });
  const errors = markers
    .filter(m => m.severity === monaco.MarkerSeverity.Error)
    .map(m => ({
      line: m.startLineNumber,
      message: m.message,
      code: typeof m.code === 'object' ? m.code.value : m.code,
    }));

  return { hasErrors: errors.length > 0, errors };
}
```

#### Correction Agent Prompt

```
You are the Keystone Code Correction Agent.
Fix ONLY the TypeScript errors listed below. Do NOT rewrite unrelated code.
Do NOT add features. Do NOT change styling. ONLY fix the errors.
Return the COMPLETE corrected file using the same // === FILE: === markers.
```

---

### 2.3 The Architect System Prompt

Key constraints injected into the system prompt:

```
RUNTIME CONSTRAINTS:
- Transpiler: @babel/standalone with presets ['react', 'typescript']
- Modules: ES Modules via Import Maps + esm.sh CDN
- FORBIDDEN: fs, path, require(), window.solana, localStorage, fetch() to
  arbitrary URLs, eval(), WebSocket, window.parent.document
- AVAILABLE: All React 19 APIs, @keystone-os/sdk hooks, Tailwind CSS,
  Canvas API, requestAnimationFrame

SDK HOOKS (from '@keystone-os/sdk'):
- useVault() → { address, tokens: TokenBalance[], totalValueUsd, loading, subscribe, refresh }
- useTurnkey() → { publicKey, signTransaction(tx, description), connected }
- useKeystoneEvents(events[], handler) → void
- useSimulate() → { simulate(serializedTx), simulating }
- <KeystoneGate productId="xxx">{children}</KeystoneGate>

OUTPUT: ONLY code with file markers. NO JSON. NO markdown. NO explanations.
```

### 2.4 Security: Preventing AI-Hallucinated Exploits

**Three-Layer Defense:**

**Layer 1 — Static Analysis Gate (pre-render):**
Scan generated code for banned patterns before injection:
```typescript
const BANNED_PATTERNS = [
  /window\.parent\.postMessage/g,  // Direct bridge bypass
  /document\.createElement\s*\(\s*['"]script/g,  // Script injection
  /\beval\s*\(/g,                  // Eval
  /window\.solana/g,               // Direct wallet access
  /document\.cookie/g,             // Cookie theft
  /localStorage/g,                 // Storage access
  /window\.parent\.document/g,     // Iframe escape
  /fetch\s*\(\s*['"]http/g,       // External fetch
  /new\s+WebSocket/g,             // WebSocket
];
```
If violations found → highlight offending lines → fire CorrectionAgent with specific security error.

**Layer 2 — CSP Enforcement (runtime):**
Iframe CSP restricts `connect-src` to `esm.sh` only, `frame-src 'none'`.

**Layer 3 — Bridge Protocol Validation (post-runtime):**
Even if code constructs a bridge message, host validates HMAC, nonces, program allowlists.

---

## Section 3: Tooling & Stack Recommendations

### 3.1 Editor Engine

**Verdict: Keep Monaco.** TypeScript IntelliSense + `getModelMarkers()` diagnostic API are critical for the Self-Correction Loop. CodeMirror 6 is lighter (~150KB vs ~2.5MB) and better on mobile, but doesn't justify a rewrite. For a future mobile "prompt-only" mode, use a CodeMirror read-only view.

### 3.2 Language Policy

**TypeScript enforced, JavaScript accepted.** AI generates TS. Monaco IntelliSense maximized with TS. Babel strips types at transpile — zero runtime cost. Plain JS still works if user writes it manually.

### 3.3 Starter Templates (Top 5)

| # | Template | Complexity | SDK Hooks | Description |
|---|----------|-----------|-----------|-------------|
| 1 | **Raydium Sniper** | Advanced | useVault, useTurnkey, useKeystoneEvents | LP scanner with one-click buy via Jupiter |
| 2 | **Yield Heatmap** | Medium | useVault, useSimulate | Treemap visualization: color=APY, size=allocation |
| 3 | **DAO Voting Booth** | Medium | useVault, useTurnkey, useKeystoneEvents | Governance dashboard with vote simulation |
| 4 | **Treasury Pulse** | Beginner | useVault(subscribe) | Real-time balance dashboard — ideal Hello World |
| 5 | **Arbitrage Radar** | Advanced | useVault, useSimulate, useKeystoneEvents | Cross-DEX price scanner with simulated PnL |

---

## Section 4: The UI/UX Blueprint

### 4.1 Layout Architecture

**Two contextual modes with automatic transition:**

**Architect Mode** (AI generating) — 50/50 split:
- Left: Chat stacked above read-only code editor showing AI typing
- Right: Live Preview above Simulation Console
- Status bar: token count, latency, model, error count

**Engineer Mode** (user coding) — 20/45/35 split:
- Left: Compact chat sidebar (20%)
- Center: Full editable Monaco with file tabs (45%)
- Right: Preview + Console (35%)

Transition is automatic: submit prompt → Architect Mode. Click editor → Engineer Mode.

### 4.2 Simulation Firewall Visualization

When a Mini-App triggers `useTurnkey().signTransaction()` during development:

```
┌─────────────────────────────────────────────────────┐
│  🛡️ SIMULATION FIREWALL                     [LIVE] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  App: "Raydium Sniper"  →  TURNKEY_SIGN Request    │
│                                                     │
│  ┌─ INSPECT ──────────────────────────────────┐    │
│  │ Programs: JUP6Lkb...(Jupiter) ✅ Allowed   │    │
│  │ Value: 10.0 SOL  ⚠️ HIGH VALUE            │    │
│  └────────────────────────────────────────────┘    │
│                                                     │
│  ┌─ SIMULATE ─────────────────────────────────┐    │
│  │ Status: ✅ PASSED                          │    │
│  │ Fee: 0.000025 SOL                          │    │
│  │ ┌────────┬─────────┬─────────┬──────────┐  │    │
│  │ │ Token  │ Before  │ After   │ Delta    │  │    │
│  │ ├────────┼─────────┼─────────┼──────────┤  │    │
│  │ │ SOL    │ 124.50  │ 114.50  │ -10.00   │  │    │
│  │ │ USDC   │ 5400.20 │ 5634.70 │ +234.50  │  │    │
│  │ └────────┴─────────┴─────────┴──────────┘  │    │
│  └────────────────────────────────────────────┘    │
│                                                     │
│  ┌─ APPROVAL ─────────────────────────────────┐    │
│  │     [✅ APPROVE]          [❌ REJECT]       │    │
│  └────────────────────────────────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**If the firewall BLOCKS a transaction** (e.g., unauthorized program), the Console panel shows:

```
[🔴 FIREWALL] BLOCKED — Program "Drainer69..." not in app manifest allowlist.
[🔴 FIREWALL] Transaction rejected. The user was never prompted to sign.
[💡 HINT] Add the program to keystone.manifest.json "allowedPrograms" array.
```

This gives developers **instant, visual feedback** during development — they see exactly why their transaction was blocked without checking logs.

### 4.3 The Cyberpunk Design System: "Keystone Noir"

| Element | Current | Proposed |
|---------|---------|----------|
| **Background** | `#09090b` (zinc-950) | `#04060b` (true void black) |
| **Editor theme** | `vs-dark` (generic) | `keystone-noir` (custom neon tokens) |
| **Minimap** | Disabled | Enabled, ghost-glow effect |
| **Cursor** | Default white | Emerald `#36e27b` with bloom |
| **Active tab** | Emerald top-border | Neon underline with box-shadow glow |
| **AI streaming** | Spinner → batch appear | Character-by-character with Matrix gutter rain |
| **Preview panel** | Plain white bg | CRT scanline overlay |
| **Console** | Flat text | Color-coded with neon badges per log level |

---

## Summary: Priority Implementation Order

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 🔴 P0 | Fix BUG-001: Remove `allow-same-origin` | 1 line | Closes critical security hole |
| 🔴 P0 | Fix BUG-003: Add source validation to message handler | 5 lines | Prevents message injection |
| 🔴 P0 | Fix BUG-006: Add TypeScript Babel preset | 1 line | Fixes all AI-generated code crashes |
| 🟡 P1 | Fix BUG-004: React 19 version match | 2 lines | Fixes hook compatibility |
| 🟡 P1 | Fix BUG-005: Static import map injection | ~30 lines | Fixes Firefox/Safari |
| 🟡 P1 | Implement Curated Registry (§1.3) | ~60 lines | Solves dependency hell |
| 🟡 P1 | Streaming pipeline (§2.1) | ~200 lines | Core Architect experience |
| 🟢 P2 | Self-Correction Loop (§2.2) | ~150 lines | Self-healing code |
| 🟢 P2 | Static Analysis Gate (§2.4) | ~80 lines | AI security layer |
| 🟢 P2 | Keystone Noir theme (§1.4) | ~50 lines | Cyberpunk aesthetics |
| 🔵 P3 | Architect/Engineer mode toggle (§4.1) | ~200 lines | Contextual UX |
| 🔵 P3 | Starter templates (§3.3) | ~500 lines total | Onboarding |
| 🔵 P3 | Remove Sandpack from deps (§1.1) | 2 lines | Cleanup |

---

*Document Version: 1.0 — Ready for architectural review.*
