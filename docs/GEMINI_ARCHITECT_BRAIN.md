# GEMINI — The Architect AI Agent Specification

**Model:** Gemini (AI Specialist)  
**Phase:** 2 — Deep Dive Implementation Spec  
**Domain:** System Prompt, Self-Correction State Machine, Streaming UI  

---

## 1. The System Prompt

### 1.1 Complete Architect Agent System Prompt

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

### 1.2 Prompt Builder Function

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

## 2. The Self-Correction Loop: State Machine

### 2.1 State Diagram

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

### 2.2 State Machine Implementation

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

### 2.3 Server-Side Route Update

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

## 3. Streaming UI: Ghost Cursor & Matrix Rain

### 3.1 The Ghost Cursor

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

### 3.2 Matrix Rain Effect

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

### 3.3 Status Bar Component

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

### 3.4 Integration: Wiring It All Together

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

---

## Summary

| Component | Implementation | Key Detail |
|-----------|---------------|------------|
| **System Prompt** | 6 sections: Runtime, Forbidden APIs, SDK Reference, Output Format, Self-Correction, Security | Every constraint maps to a real iframe limitation |
| **Prompt Builder** | Context-aware assembly with `[CURRENT CODE]`, `[TYPESCRIPT ERRORS]`, `[RUNTIME ERRORS]`, `[RESEARCH CONTEXT]` | Triggers Correction Mode via §5 when errors present |
| **State Machine** | 7 states: IDLE → STREAMING → ANALYZING → (CORRECTING → RE_ANALYZING)×3 → CLEAN/FAILED | Max 3 correction attempts; uses `gpt-4o-mini` at `temp=0.2` for corrections |
| **Ghost Cursor** | Monaco decoration with emerald glow + pulse animation | Updates position every animation frame during streaming |
| **Matrix Rain** | CSS gradient animation on `.margin-view-overlays::before` | Only active during STREAMING/CORRECTING states |
| **Status Bar** | State label, token count, attempt counter, elapsed time, model indicator | Real-time feedback on Architect progress |

---

*GEMINI — Document Version 1.0*
