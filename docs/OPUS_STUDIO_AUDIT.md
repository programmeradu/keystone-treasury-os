# OPUS — Keystone Studio Audit & "The Architect" Roadmap

**Model:** Opus | **Date:** July 2025  
**Scope:** Diamond Merge Architecture Audit, Gap Analysis, "The Architect" Feature Design  

---

## Table of Contents
1. [Section 1: The Audit & Gap Analysis](#section-1-the-audit--gap-analysis)
2. [Section 2: "The Architect" — Prompt-to-App Engine](#section-2-the-architect--prompt-to-app-engine)
3. [Section 3: Tooling & Stack Recommendations](#section-3-tooling--stack-recommendations)
4. [Section 4: The UI/UX Blueprint](#section-4-the-uiux-blueprint)
5. [Appendix: Bug Registry](#appendix-bug-registry)

---

## Section 1: The Audit & Gap Analysis

### 1.1 The Conflict: Sandpack vs. Custom Iframe

**Finding:** `PROJECT_OVERVIEW.md` line 91 lists Sandpack as "In-browser code playground." `package.json` confirms `@codesandbox/sandpack-react@^2.20.0` and `@codesandbox/sandpack-themes@^2.0.21` are installed. However, **Sandpack is never imported anywhere in the codebase.** The Studio uses a fully custom system: Monaco + hand-built iframe + esm.sh Import Maps.

#### Verdict: Custom Iframe Wins

| Criterion | Sandpack | Custom Iframe | Winner |
|---|---|---|---|
| **AI Streaming** | `updateFile()` is atomic — no char-by-char streaming. Would require hacking CodeMirror internals. | Full control via Monaco `executeEdits()` — insert characters at arbitrary positions in real-time. | **Custom** |
| **Virtual Bridge** | Runs its own iframe with its own bundler. Injecting `postMessage` bridge requires forking `sandpack-client`. | We own the `srcdoc` HTML. Bridge is first-class, not a hack. | **Custom** |
| **SDK Injection** | Custom file resolution overrides break on Sandpack version updates. | One-line addition to Import Map. | **Custom** |
| **Self-Correction** | No built-in TS type-checking in preview. | Monaco provides `getModelMarkers()` — read TS errors programmatically for the AI fix loop. | **Custom** |
| **Bundle Size** | +180KB (duplicates editor functionality). | 0KB additional. | **Custom** |
| **Reliability** | Mature SWC bundler handles CSS modules, circular imports. | Babel single-pass cannot handle CSS modules or circular refs. | Sandpack |
| **Mobile** | CodeMirror 6 has superior touch/mobile support. | Monaco has poor mobile support. | Sandpack |

**Decision: Remove Sandpack.** The self-correction loop (read Monaco diagnostics → feed to AI → auto-fix) is the killer feature of "The Architect" and is only possible with Monaco's built-in TS worker.

**Actions:**
- Remove `@codesandbox/sandpack-react` and `@codesandbox/sandpack-themes` from `package.json`
- Update `PROJECT_OVERVIEW.md` line 91: replace "Sandpack" with "Custom Runtime (Monaco + esm.sh + Babel)"

### 1.2 The Dependency Hell Problem

**Scenario:** Developer imports `framer-motion`, `recharts`, and `lucide-react`.

**Current behavior (broken):** `LivePreview.tsx` lines 138-147 regex-detect bare imports and map to `https://esm.sh/${pkg}?bundle`. This causes:

1. **Version Anarchy** — No pinning. esm.sh resolves "latest" which may be a breaking version tomorrow.
2. **React Duplication** — `?bundle` inlines React inside each package. The iframe gets multiple React instances → "Invalid hook call" error.
3. **Transitive Conflicts** — No shared dependency resolution between packages.

**The Fix: Dependency Resolution Engine with `?external`**

```typescript
// Curated registry of known-good versions
const CURATED_REGISTRY: Record<string, { version: string; peerExternals?: string[] }> = {
  "framer-motion":    { version: "11.5.4", peerExternals: ["react", "react-dom"] },
  "recharts":         { version: "2.15.3", peerExternals: ["react", "react-dom"] },
  "lucide-react":     { version: "0.468.0", peerExternals: ["react"] },
  "@tanstack/react-query": { version: "5.62.0", peerExternals: ["react"] },
  "zustand":          { version: "5.0.3", peerExternals: ["react"] },
  "date-fns":         { version: "4.1.0" },
  "lightweight-charts": { version: "4.2.2" },
  "d3":               { version: "7.9.0" },
};

function resolveImportMap(userCode: string): Record<string, string> {
  const imports: Record<string, string> = {
    "react": "https://esm.sh/react@19.0.0?dev",
    "react-dom/client": "https://esm.sh/react-dom@19.0.0/client?dev",
    "@keystone-os/sdk": "blob:...", // SDK blob URL
  };

  const importRegex = /from\s+['"]([^./][^'"]*)['"]/g;
  let match;
  while ((match = importRegex.exec(userCode)) !== null) {
    const pkg = match[1];
    if (imports[pkg]) continue;
    const curated = CURATED_REGISTRY[pkg];
    if (curated) {
      const ext = curated.peerExternals ? `&external=${curated.peerExternals.join(",")}` : "";
      imports[pkg] = `https://esm.sh/${pkg}@${curated.version}?dev${ext}`;
    } else {
      // Unknown: externalize React as safety measure
      imports[pkg] = `https://esm.sh/${pkg}?dev&external=react,react-dom`;
    }
  }
  return imports;
}
```

**Key insight:** `?external=react,react-dom` tells esm.sh to NOT bundle React inside the package. Instead it imports from our shared Import Map instance. This eliminates the "two Reacts" problem entirely. No more `?bundle`.

### 1.3 UI/UX Gap: "Cyberpunk Bloomberg Terminal"

The current Studio is clean but generic. Key upgrades needed:

| Element | Current | Target |
|---|---|---|
| Theme | `vs-dark` default | Custom "Keystone Neon" — emerald accents, cyan types, amber strings |
| Minimap | Disabled | Enabled with neon glow on active region |
| Streaming | None (atomic replace) | Matrix-style char-by-char ghost typing |
| Console | Plain text | Terminal with timestamps, color-coded severity, blinking cursor |
| Background | Flat black | Faint grid pattern: `rgba(52,226,123,0.03)` lines at 20px intervals |
| Transitions | None | Glitch effect on tab switch, fade-in on file change |

**Custom Monaco Theme:**

```typescript
const KEYSTONE_NEON_THEME: monaco.editor.IStandaloneThemeData = {
  base: "vs-dark", inherit: true,
  rules: [
    { token: "type", foreground: "22D3EE" },           // Cyan
    { token: "string", foreground: "FBBF24" },          // Amber
    { token: "keyword", foreground: "A78BFA" },          // Purple
    { token: "function", foreground: "F9FAFB", fontStyle: "bold" },
    { token: "comment", foreground: "52525B", fontStyle: "italic" },
    { token: "number", foreground: "FB923C" },           // Orange
    { token: "tag", foreground: "34E27B" },              // Emerald (JSX)
  ],
  colors: {
    "editor.background": "#09090B",
    "editorCursor.foreground": "#34E27B",
    "editorLineNumber.activeForeground": "#34E27B",
    "editor.selectionBackground": "#34E27B22",
    "minimap.selectionHighlight": "#34E27B40",
    "minimapSlider.background": "#34E27B15",
  },
};
```

**CRT Scanline Overlay (CSS):**
```css
.studio-editor-crt::after {
  content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 10;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px);
}
```

---

## Section 2: "The Architect" — Prompt-to-App Engine

### 2.1 The Vision

User types: *"Build a Sniper Bot that watches Raydium for new liquidity pools > $50k and buys instantly."*

The pipeline:

```
USER PROMPT
    │
    ▼
PHASE 1: INTENT DECOMPOSITION (200ms)
    Architect Agent produces a Build Plan:
    1. UI: Dashboard with pool feed, buy button, PnL tracker
    2. Data: useEventBus("ON_BLOCK_UPDATE") for real-time feed
    3. Logic: Filter pools by TVL > $50k
    4. Action: useTurnkey().signTransaction() for instant buy
    5. Safety: Simulate before sign (Simulation Firewall)
    │
    ▼
PHASE 2: CODE STREAMING (5-15s)
    LLM streams tokens → SSE → Monaco executeEdits()
    User WATCHES code being written character-by-character.
    Cursor moves. Lines appear. Ghost is typing.
    │
    ▼
PHASE 3: SELF-CORRECTION LOOP (0-3 iterations)
    1. Stream complete → wait 800ms for Monaco TS worker
    2. Read diagnostics: monaco.editor.getModelMarkers()
    3. If errors → extract messages + line numbers
    4. Feed errors back to LLM as "fix" prompt
    5. LLM streams a PATCH (not full rewrite)
    6. Apply patch via executeEdits() at specific lines
    7. Repeat until zero errors OR max 3 iterations
    │
    ▼
PHASE 4: LIVE PREVIEW AUTO-REFRESH
    Zero TS errors → auto-trigger LivePreview rebuild.
    User sees their Sniper Bot running in the right panel.
```

### 2.2 Streaming: Character-by-Character Code Generation

The current `generate/route.ts` waits for the full LLM response then returns JSON atomically. This must change to **Server-Sent Events (SSE)**.

#### New API: `/api/studio/architect`

```typescript
// src/app/api/studio/architect/route.ts
import { NextRequest } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  const { prompt, contextFiles, mode } = await req.json();
  const systemPrompt = buildArchitectSystemPrompt(mode);
  const userPrompt = buildUserPrompt(prompt, contextFiles);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4, // Lower than current 0.7 for deterministic code
    max_tokens: 8000, // Doubled from current 4000
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let currentFile = "App.tsx";

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || "";

        // Detect file boundary markers: // === FILE: App.tsx ===
        const fileMarker = token.match(/\/\/ === FILE: (.+?) ===/);
        if (fileMarker) currentFile = fileMarker[1];

        if (token) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: "token", file: currentFile, content: token })}\n\n`
          ));
        }
      }

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

#### Client-Side: Monaco Streaming Insertion

```typescript
// src/lib/studio/architect-stream.ts
async function streamToMonaco(
  editor: monaco.editor.IStandaloneCodeEditor,
  prompt: string,
  contextFiles: Record<string, any>,
  onProgress: (phase: string, detail: string) => void,
): Promise<void> {
  const model = editor.getModel();
  if (!model) throw new Error("No editor model");

  onProgress("thinking", "Decomposing intent...");

  const response = await fetch("/api/studio/architect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, contextFiles, mode: "generate" }),
  });

  if (!response.ok || !response.body) throw new Error("Stream failed");

  onProgress("streaming", "Writing code...");
  model.setValue(""); // Clear for fresh generation
  let insertPosition = model.getPositionAt(0);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    sseBuffer += decoder.decode(value, { stream: true });
    const events = sseBuffer.split("\n\n");
    sseBuffer = events.pop() || "";

    for (const event of events) {
      const dataLine = event.replace(/^data: /, "").trim();
      if (!dataLine) continue;

      try {
        const parsed = JSON.parse(dataLine);
        if (parsed.type === "token") {
          // Insert token at current cursor position
          const range = new monaco.Range(
            insertPosition.lineNumber, insertPosition.column,
            insertPosition.lineNumber, insertPosition.column
          );
          editor.executeEdits("architect", [{
            range, text: parsed.content, forceMoveMarkers: true,
          }]);

          // Advance cursor
          const newOffset = model.getOffsetAt(insertPosition) + parsed.content.length;
          insertPosition = model.getPositionAt(newOffset);
          editor.revealPosition(insertPosition, monaco.editor.ScrollType.Smooth);
          editor.setPosition(insertPosition);
        }
        if (parsed.type === "done") {
          onProgress("validating", "Checking for errors...");
        }
      } catch { /* skip malformed SSE */ }
    }
  }
}
```

### 2.3 Self-Correction: The Diagnostic Feedback Loop

After streaming completes, read Monaco's TypeScript diagnostics and feed errors back to the LLM:

```typescript
// src/lib/studio/architect-self-correct.ts

interface DiagnosticError {
  line: number;
  column: number;
  message: string;
  codeSnippet: string; // 3 lines of context
}

async function selfCorrect(
  editor: monaco.editor.IStandaloneCodeEditor,
  monacoInstance: typeof monaco,
  contextFiles: Record<string, any>,
  maxIterations: number = 3,
  onProgress: (iteration: number, errors: DiagnosticError[]) => void,
): Promise<{ success: boolean; iterations: number }> {

  for (let i = 0; i < maxIterations; i++) {
    // Wait for Monaco TS worker to finish
    await new Promise(r => setTimeout(r, 800));

    const model = editor.getModel();
    if (!model) return { success: false, iterations: i };

    const markers = monacoInstance.editor.getModelMarkers({ resource: model.uri });
    const errors = markers
      .filter(m => m.severity === monacoInstance.MarkerSeverity.Error)
      .map(m => ({
        line: m.startLineNumber,
        column: m.startColumn,
        message: m.message,
        codeSnippet: getCodeContext(model, m.startLineNumber, 3),
      }));

    if (errors.length === 0) return { success: true, iterations: i };

    onProgress(i + 1, errors);

    // Build fix prompt with error context
    const fixPrompt = `The following code has ${errors.length} TypeScript error(s). Fix ONLY the errors.

CURRENT CODE:
\`\`\`tsx
${model.getValue()}
\`\`\`

ERRORS:
${errors.map(e => `Line ${e.line}: ${e.message}\n${e.codeSnippet}`).join("\n\n")}

Return the COMPLETE fixed file. Do NOT add features or refactor unrelated code.`;

    // Get fix from LLM (non-streaming for patches)
    const res = await fetch("/api/studio/architect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: fixPrompt, contextFiles, mode: "fix" }),
    });

    const fixData = await res.json();
    if (fixData.patchedCode) {
      const oldCode = model.getValue();
      model.setValue(fixData.patchedCode);
      highlightDiff(editor, oldCode, fixData.patchedCode); // Green glow on changed lines
    }
  }

  return { success: false, iterations: maxIterations };
}

function getCodeContext(model: monaco.editor.ITextModel, line: number, radius: number): string {
  const start = Math.max(1, line - radius);
  const end = Math.min(model.getLineCount(), line + radius);
  const lines: string[] = [];
  for (let i = start; i <= end; i++) {
    lines.push(`${i === line ? ">>> " : "    "}${i}: ${model.getLineContent(i)}`);
  }
  return lines.join("\n");
}
```

### 2.4 The Architect Agent System Prompt

This encodes ALL runtime constraints to prevent the AI from hallucinating insecure code:

```typescript
const ARCHITECT_SYSTEM_PROMPT = `You are "The Architect" — the AI code engine for Keystone Studio.

═══════════════════════════════════════════════════════════
RUNTIME CONSTRAINTS (VIOLATIONS CRASH THE SANDBOX)
═══════════════════════════════════════════════════════════

1. EXECUTION CONTEXT: Sandboxed iframe. NO filesystem, NO Node.js, NO server-side.
   FORBIDDEN: fs, path, process, require(), child_process, net, http.createServer
   FORBIDDEN: window.solana, window.ethereum (wallet objects are sandboxed away)
   FORBIDDEN: localStorage, sessionStorage, indexedDB, cookies (opaque origin)
   FORBIDDEN: fetch() to external APIs (CSP blocks connect-src)
   ALL data must flow through SDK hooks.

2. AVAILABLE IMPORTS:
   - "react" (React 19 — hooks, JSX, Suspense, use())
   - "@keystone-os/sdk":
     • useVault(): { activeVault, balance, tokens, totalValueUsd, change24h, config, loading, refresh }
     • useTurnkey(): { getPublicKey, signTransaction, simulate, signing, lastSimulation }
     • useEventBus(): { subscribe, once, emit }
     • KeystoneGate: License-gating component
     • serializeTx, deserializeTx, lamportsToSol, formatUsd
   - "lucide-react" — Icons
   - Third-party: framer-motion, recharts, lightweight-charts, zustand, date-fns, d3, swr

3. STYLING: Tailwind CSS. Dark theme: bg-zinc-900/950, accent emerald-400, borders zinc-800.

4. SECURITY:
   - NEVER construct transactions manually. ALWAYS use useTurnkey().signTransaction().
   - NEVER hardcode private keys, mnemonics, or wallet addresses.
   - NEVER use eval(), Function(), or dynamic code execution.
   - NEVER access window.parent or window.top.

5. OUTPUT: Single default export React component in App.tsx. TypeScript with proper types.
   No placeholders. Write ACTUAL logic.

═══════════════════════════════════════════════════════════
WHEN IN "fix" MODE
═══════════════════════════════════════════════════════════
Fix ONLY reported errors. Do NOT add features or refactor. Return COMPLETE file.`;
```

**Security guardrails encoded in the prompt:**
- `window.solana` explicitly forbidden → AI cannot generate bridge-bypass code
- `fetch()` forbidden → forces all data through SDK hooks (mediated by bridge + permissions)
- `eval()` forbidden → prevents sandbox-escape code generation
- Manual TX construction forbidden → forces signing through Simulation Firewall

### 2.5 Architect State Machine

```
         ┌────────┐
         │  IDLE  │
         └───┬────┘
             │ User submits prompt
             ▼
         ┌────────┐
         │PLANNING│ 200ms — intent decomposition
         └───┬────┘
             ▼
         ┌──────────┐
         │STREAMING │ 5-15s — SSE tokens → Monaco
         └───┬──────┘
             ▼
         ┌──────────┐
         │VALIDATING│ 800ms — wait for TS worker
         └───┬──────┘
             │
        ┌────┴────┐
        │ Errors? │
        └────┬────┘
        YES  │  NO
    ┌────────┴────────┐
    ▼                 ▼
┌────────┐      ┌──────────┐
│ FIXING │      │PREVIEWING│ auto-refresh iframe
│(iter<3)│      └───┬──────┘
└───┬────┘          ▼
    │          ┌──────────┐
    └─back──►  │ COMPLETE │
  to VALIDATING└──────────┘
```

---

## Section 3: Tooling & Stack Recommendations

### 3.1 Editor Engine: Monaco vs. CodeMirror 6

| Criterion | Monaco | CodeMirror 6 | Winner |
|---|---|---|---|
| **TS IntelliSense** | Built-in TS worker: type checking, auto-complete, go-to-definition | Requires external TS server. No built-in type checking. | **Monaco** |
| **Diagnostics API** | `getModelMarkers()` — critical for self-correction loop | No built-in diagnostics. Custom LSP bridge needed. | **Monaco** |
| **AI Streaming** | `executeEdits()` with undo support | `dispatch({ changes })` — equivalent | Tie |
| **Bundle Size** | ~2.5MB (async loaded) | ~200KB core | CodeMirror |
| **Mobile** | Poor touch/keyboard support | Excellent mobile-first design | **CodeMirror** |

**Decision: Keep Monaco for desktop.** The self-correction loop is only possible with Monaco's TS worker. For a future mobile "prompt-only" mode, consider CodeMirror for the read-only preview.

### 3.2 Language Policy

**TypeScript-first, JavaScript tolerated.**

- **Architect Mode (AI):** Always TypeScript. The system prompt enforces this. TS errors are the signal for the self-correction loop — without types, the AI can't self-correct.
- **Manual Editing:** Accept `.tsx` and `.jsx`. Babel handles both.
- **Monaco Config:** Keep `allowJs: true` (already set in `CodeEditor.tsx` line 41).

### 3.3 Top 5 Starter Templates

| # | Template | Description | Hooks Used | Level |
|---|---|---|---|---|
| 1 | **Liquidity Sniper** | Watches Raydium/Orca for new pools via `ON_BLOCK_UPDATE`, filters by TVL, one-click buy | `useVault`, `useTurnkey`, `useEventBus` | Advanced |
| 2 | **Yield Heatmap** | Visual grid of DeFi yields across Marinade, Jito, marginfi. Color-coded by APY. Click to deposit. | `useVault`, `useTurnkey`, `useEventBus` | Medium |
| 3 | **Treasury Dashboard** | Real-time portfolio: token balances, 24h change, pie chart allocation, CSV export | `useVault`, `useEventBus` | Beginner |
| 4 | **DAO Voting Booth** | Lists active Squads proposals, voting status, cast-vote transactions | `useVault`, `useTurnkey`, `useEventBus` | Medium |
| 5 | **DCA Autopilot** | Configure recurring buys (e.g., $100 USDC → SOL weekly). Execution history + avg cost basis. | `useVault`, `useTurnkey` | Medium |

Each template ships with: complete `App.tsx`, loading/error states, responsive layout, SDK hook usage comments.

---

## Section 4: The UI/UX Blueprint

### 4.1 Layout: The Split-Screen Experience

```
┌──────────────────────────────────────────────────────────────────────┐
│ HEADER: [●] KEYSTONE OS // STUDIO  │ App Name │ [Vault] [Save] [Ship] │
├──── LEFT (30%) ────┬──── CENTER (35%) ─────┬──── RIGHT (35%) ────────┤
│                    │                       │                          │
│  AI ARCHITECT      │  CODE EDITOR          │  TABS: [Preview]         │
│  ┌──────────────┐  │  ┌─ FILE TABS ──────┐│        [Console]         │
│  │ Chat History │  │  │ App.tsx │ utils.ts││        [Simulation]      │
│  │              │  │  └──────────────────┘│                          │
│  │ Build Plan:  │  │                       │  ┌─ LIVE PREVIEW ──────┐│
│  │ ✅ 1. Pool   │  │  1│ import React...   │  │                      ││
│  │ ⏳ 2. Filter │  │  2│ import { useVault │  │  [Running Mini-App]  ││
│  │ ○ 3. Buy     │  │  3│ ...               │  │                      ││
│  │              │  │                       │  └──────────────────────┘│
│  │ ████████░░   │  │  ┌─ MINIMAP ────────┐│                          │
│  │ 67% streaming│  │  │ ▓▓▓░░░░░░░░░░░░░││  ┌─ BRIDGE LOG ────────┐│
│  └──────────────┘  │  └──────────────────┘│  │ → VAULT_READ  (12ms)││
│                    │                       │  │ ← VAULT_RESP  OK    ││
│  ┌──────────────┐  │                       │  │ → SIMULATE   (342ms)││
│  │ [Prompt Box] │  │                       │  └──────────────────────┘│
│  │ [🧠] [Send]  │  │                       │                          │
│  └──────────────┘  │                       │                          │
└────────────────────┴───────────────────────┴──────────────────────────┘
```

**Key decisions:**
- **Left (30%):** AI Architect chat — primary input. Prompt box at bottom with Deep Research toggle.
- **Center (35%):** Monaco with file tabs. During streaming: read-only "ghost typing" mode with emerald cursor.
- **Right (35%):** Tabbed: Preview, Console, **Simulation** (NEW — Bridge Inspector + Firewall log).

### 4.2 Streaming Visual Feedback

**Chat Panel (during generation):**
```
🧠 Architect

Build Plan:
✅ 1. Pool monitoring via EventBus
✅ 2. TVL filter logic
⏳ 3. Buy execution via Turnkey    ← currently streaming
○  4. PnL tracking dashboard
○  5. Error handling & loading UI

████████████░░░░░░ 67%
347 tokens · 4.2s elapsed

[Stop Generation]
```

**Editor (during streaming):**
- Background: subtle emerald tint `rgba(52, 226, 123, 0.02)`
- Cursor: emerald, rapid blink
- Top banner: `ARCHITECT MODE — GENERATING...` with pulsing dot
- Editor is **read-only** during streaming (prevents conflicts)
- After completion: banner → `VALIDATING...` → `COMPLETE ✓`, editor becomes editable

**Self-Correction Visual:**
```
⚠ SELF-CORRECTION (Iteration 1/3)

Found 2 TypeScript errors:

Line 23: Property 'tokens' does not exist on type 'VaultState'.
→ Fixing: Changed to 'vaultTokens'

Line 47: Argument of type 'string' not assignable to 'Uint8Array'.
→ Fixing: Added serializeTx() wrapper

████████████████████ Applying fix...
```

Fixed lines get a **green highlight glow** that fades over 2 seconds — visual diff of what the AI changed.

### 4.3 Simulation Firewall Feedback in the Studio

When a Mini-App calls `useTurnkey().signTransaction()` during Live Preview, the new **Simulation tab** shows:

```
┌─────────────────────────────────────────────────┐
│  SIMULATION FIREWALL                    [Clear]  │
│─────────────────────────────────────────────────│
│                                                  │
│  ┌─ TX-001 ─────────────────────────────────┐   │
│  │ 14:23:07 │ TURNKEY_SIGN                   │   │
│  │ "Swap 1 SOL → USDC via Jupiter"           │   │
│  │                                           │   │
│  │ Status: ✅ PASSED                          │   │
│  │ Balance Changes:                          │   │
│  │   SOL:  124.50 → 123.50  (-1.00)         │   │
│  │   USDC: 5400.20 → 5580.20 (+180.00)      │   │
│  │ Fee: 0.000025 SOL                         │   │
│  │ Programs: Jupiter Aggregator v6           │   │
│  │ Risk: 🟢 LOW                               │   │
│  │                                           │   │
│  │ [✓ Approved] Sig: 5xK...3mN              │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  ┌─ TX-002 ─────────────────────────────────┐   │
│  │ 14:23:12 │ TURNKEY_SIGN                   │   │
│  │ "Transfer to unknown address"             │   │
│  │                                           │   │
│  │ Status: 🛑 BLOCKED                         │   │
│  │ Warnings:                                 │   │
│  │   ⚠ Unknown program invoked               │   │
│  │   ⚠ Transfer to unverified address        │   │
│  │   ⚠ Simulation error: Insufficient funds  │   │
│  │ Risk: 🔴 HIGH                               │   │
│  │                                           │   │
│  │ [✗ Rejected] User denied transaction      │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  ┌─ BRIDGE LOG ─────────────────────────────┐   │
│  │ 14:23:01  → VAULT_READ         (12ms)    │   │
│  │ 14:23:01  ← VAULT_READ_RESP    OK        │   │
│  │ 14:23:07  → TURNKEY_SIGN       (1,204ms) │   │
│  │ 14:23:08  ← TURNKEY_SIGN_RESP  OK        │   │
│  │ 14:23:12  → TURNKEY_SIGN       (342ms)   │   │
│  │ 14:23:12  ← TURNKEY_SIGN_RESP  REJECTED  │   │
│  └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**Key UX properties:**
1. **Color-coded status** — Green passed, red blocked. Instant visual feedback.
2. **Balance change preview** — Shows exactly what the TX would do. No ambiguity.
3. **Risk badge** — Heuristic: unknown programs = HIGH, known DEX = LOW, value > threshold = MEDIUM.
4. **Bridge log** — Time-travel debugging with latency per message.
5. **Blocked TXs are educational** — Warnings explain WHY, helping developers fix their code.

### 4.4 Cyberpunk Bloomberg Aesthetic Checklist

| Element | Implementation | Priority |
|---|---|---|
| Custom Monaco Theme | `KEYSTONE_NEON_THEME` — emerald cursor, cyan types, amber strings | P0 |
| Matrix Streaming | Chat shows tokens appearing green-on-black terminal style | P0 |
| Minimap with Glow | Enable minimap, `box-shadow` on slider region | P1 |
| CRT Scanlines | CSS `repeating-linear-gradient` overlay on editor | P1 |
| Grid Background | Preview panel: `rgba(52,226,123,0.03)` grid at 20px intervals | P1 |
| Neon Border Glow | Active panel: `box-shadow: 0 0 20px rgba(52,226,123,0.1)` | P1 |
| Status Bar Metrics | Bottom bar: FPS, Memory, Bridge msg/s, Active subscriptions | P2 |
| Glitch Tab Transitions | 50ms CSS `clip-path` glitch on tab switch | P2 |
| Pulse on Bridge Activity | Simulation tab icon pulses emerald on message received | P1 |

---

## Appendix: Bug Registry

| ID | Severity | File | Line | Description | Fix |
|---|---|---|---|---|---|
| BUG-001 | **CRITICAL** | `LivePreview.tsx` | 295 | `allow-same-origin` exposes `window.parent.solana` to iframe | Remove `allow-same-origin` from sandbox attr |
| BUG-002 | HIGH | `LivePreview.tsx` | 93, 106 | `Math.random()` for bridge IDs — collision risk | Use `crypto.randomUUID()` |
| BUG-003 | HIGH | `LivePreview.tsx` | 194 | No `event.source` validation on bridge messages | Add `event.source === iframeRef.current?.contentWindow` check |
| BUG-004 | MEDIUM | `LivePreview.tsx` | 74, 77 | React 18.2.0 in iframe vs React 19 in host | Update iframe URLs to `react@19.0.0` |
| BUG-005 | MEDIUM | `generate/route.ts` | 120-130 | No streaming — 10-30s spinner, zero feedback | Implement SSE streaming (Section 2.2) |
| BUG-006 | LOW | `package.json` | 23-24 | Dead Sandpack deps (~180KB unused) | `npm uninstall` both packages |
| BUG-007 | LOW | `studio/page.tsx` | 252, 585 | Hardcoded `"7KeY...StUdIo"` user ID | Derive from wallet address or session |
| BUG-008 | UX | `CodeEditor.tsx` | 110 | Minimap disabled — missing visual density | Enable with neon theme styling |
| BUG-009 | MEDIUM | `LivePreview.tsx` | 144 | `?bundle` on esm.sh causes React duplication | Use `?external=react,react-dom` instead |
| BUG-010 | LOW | `generate/route.ts` | 12 | System prompt uses `'./keystone'` but SDK TDD uses `'@keystone-os/sdk'` | Update prompt to match SDK spec |
| BUG-011 | MEDIUM | `CodeEditor.tsx` | 62-66 | Keystone type stubs are `any` — no IntelliSense value | Replace with full SDK type definitions |
| BUG-012 | LOW | `LivePreview.tsx` | 128-129 | Regex import rewriting is fragile (breaks on comments/strings) | Use AST-based detection via Babel parse |

### Implementation Priority

| Priority | Items | Effort |
|---|---|---|
| **P0 — Ship Blockers** | BUG-001 (security), BUG-009 (React dup), SSE streaming, Custom theme | 1 week |
| **P1 — Core Architect** | Self-correction loop, Simulation tab, Dependency resolver, Minimap | 2 weeks |
| **P2 — Polish** | Starter templates, CRT scanlines, Grid background, Status bar | 1 week |
| **P3 — Future** | Mobile CodeMirror mode, Sound effects, Glitch transitions | Backlog |

---

*End of OPUS Studio Audit*
