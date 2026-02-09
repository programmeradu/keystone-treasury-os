# Cascade Studio Audit & Roadmap (Diamond Merge + The Architect)

**Document:** `gpt_STUDIO_AUDIT.md`

## Executive Summary
Keystone Studio is currently a **Monaco + custom iframe runtime** with **Babel-in-browser + esm.sh** and a **postMessage bridge** that mocks privileged actions. The selected “Diamond Merge” target architecture is directionally correct, but the current implementation has **critical security gaps**, **runtime incompatibilities (TypeScript/React versions)**, and **scalability bottlenecks** that will block “The Architect” (AI-to-App generation) from feeling magical.

This document delivers:
- A **gap analysis** (bugs + UX/tooling bottlenecks)
- A definitive **Sandpack vs Custom Iframe** decision framework for Architect mode
- A browser-feasible solution to **dependency hell** without `package.json`
- The end-to-end design for **The Architect** (streaming code into Monaco + self-healing via diagnostics)
- A phased **roadmap** to ship it safely

---

# Section 1 — Audit & Gap Analysis (Critique)

## 1.1 The Conflict: Sandpack vs Custom Monaco + esm.sh
### Observed Reality (Codebase)
- `docs/PROJECT_OVERVIEW.md` lists **Sandpack** as “in-browser code playground”.
- Actual Studio runtime in `src/components/studio/LivePreview.tsx` is a **custom iframe**:
  - Loads `@babel/standalone` from CDN
  - Builds import map dynamically
  - Injects a virtual `keystone-api` module via Blob URL
  - Uses `window.postMessage` with `"*"` origin

### Which handles “The Architect” better?
**Decision:** Use a **Custom Monaco + Custom Iframe Runtime** as the primary engine for “The Architect”, and keep Sandpack as an **optional fallback mode** for “complex dependency graphs / multi-file apps / non-ESM edge cases**.

### Trade-offs (Evidence-based)
#### Custom Iframe (current approach)
- **Strengths**
  - **Streaming-friendly**: easiest to reflect “character-by-character” edits in Monaco while the preview hot-reloads.
  - **Fast iteration**: no bundler boot; import maps + ESM fetches are incremental.
  - **Security control**: you can harden `sandbox` and the bridge precisely for Keystone’s policy model.
- **Weaknesses**
  - **Dependency hell**: import maps are global and brittle without lockfiles.
  - **TypeScript runtime mismatch**: Babel preset `react` does not transpile TS types.
  - **ESM/CDN variability**: esm.sh URLs without pinning can change.

#### Sandpack
- **Strengths**
  - **Mature dependency resolution**: supports `package.json`-like semantics and can sandbox module graphs.
  - **Multi-file apps**: first-class file system model (ideal for “Architect writes multiple files”).
  - **Reliable TS transpilation**: compilation pipeline is well-tested.
- **Weaknesses**
  - **Heavier runtime cost**: more CPU/memory; hurts the “50 mini-apps” future.
  - **Less aligned with “Zero-Build + Import Maps”**: it’s closer to an embedded bundler.

### Product Recommendation
- **Default**: Custom Iframe runtime (Zero-Build) for 80% of Studio work.
- **Fallback**: “Compatibility Runtime (Sandpack Mode)” that can be toggled when:
  - user imports a package requiring CJS/polyfills
  - app spans >N files or uses advanced TS features
  - dependency resolver detects conflicting peer deps

This preserves the Diamond Merge intent while de-risking complex developer needs.

---

## 1.2 The Dependency Hell Problem (Import Maps w/o `package.json`)
### Current Behavior (Bug-prone)
`LivePreview.tsx`:
- Regex-scans `from 'pkg'` imports only.
- Maps to `https://esm.sh/${pkg}?bundle` (often unpinned).
- No peer dependency pinning, no lockfile, no deterministic resolution.

### Failure Modes
- **Version clashes**: `framer-motion`, `recharts`, `lucide-react` may pull different React expectations.
- **Non-determinism**: esm.sh build output can vary unless pinned to a build version.
- **Peer dep drift**: React 19 in app, but preview imports React 18.2.0.

### Resolution Strategy (Browser-feasible)
#### A) Introduce a “Keystone Lockfile” (no `package.json` required)
- Add per-project file: `keystone.lock.json` (stored in DB with the mini-app).
- Shape:
  - `react`, `react-dom` pinned
  - `deps` pinned
  - `esmBuildId` pinned when available

Example:
```json
{
  "react": "19.0.0",
  "reactDom": "19.0.0",
  "deps": {
    "framer-motion": "11.5.4",
    "lucide-react": "0.460.0",
    "recharts": "2.12.7"
  },
  "resolver": { "provider": "esm.sh", "build": "v135" }
}
```

#### B) Specifier Rewriting (transparent to dev)
Before Babel transform, rewrite imports:
- `import { X } from 'recharts'` → `import { X } from 'recharts@2.12.7'`
- Then import map maps `recharts@2.12.7` to a pinned URL.

This allows:
- deterministic builds
- side-by-side versions if absolutely necessary (rare)

#### C) Peer Dependency Pinning
Use esm.sh features to pin React:
- `https://esm.sh/framer-motion@11.5.4?deps=react@19.0.0,react-dom@19.0.0`

#### D) Allowlist + Security Scan
Only allow importing from:
- a Keystone-managed allowlist of packages
- plus optional “unsafe mode” behind explicit user toggle

This prevents supply-chain surprises.

---

## 1.3 Critical Security Bugs (Current Implementation)
### Bug 1 — Iframe sandbox is too permissive
Current:
```html
sandbox="allow-scripts allow-popups allow-pointer-lock allow-same-origin allow-forms"
```
Impact:
- `allow-same-origin` collapses isolation; iframe can access storage/cookies if same origin.
- popups/forms enable phishing vectors.

**Fix:** Restrict to **minimum**:
- `sandbox="allow-scripts"`
- If absolutely needed: add `allow-downloads` only for explicit export flows.

### Bug 2 — postMessage uses `"*"` and no origin/session validation
Current bridge:
- `window.parent.postMessage(..., '*')`
- parent accepts `message` events from anywhere.

Impact:
- any malicious window can send fake `TURNKEY_SIGN` events.

**Fix:** Move to **JSON-RPC 2.0 bridge** with:
- strict `event.source === iframe.contentWindow`
- explicit `sessionId` + `sessionToken`
- cryptographic nonces (per-request)
- `targetOrigin` fixed (no `*`)

### Bug 3 — No Simulation Firewall enforcement
Current `TURNKEY_SIGN` path is mocked and does not simulate.

**Fix:** Parent-side bridge must enforce:
- `simulateTransaction` always
- bind simulation digest to tx bytes
- block signing if simulation fails

### Bug 4 — React/Runtime version mismatch
- App stack: React 19 (docs)
- Preview imports React 18.2.0.

Impact:
- subtle hook/runtime differences, confusion during Architect generation.

**Fix:** Pin preview React to the same major version as Keystone OS.

---

## 1.4 Runtime/Tooling Bugs (Blocking “Architect”) 
### Bug 5 — Babel transform does not handle TypeScript
Current:
```js
Babel.transform(rawUserCode, { presets: ['react'] })
```
Impact:
- TS types will crash runtime.
- Architect will produce TS but preview fails.

**Fix options:**
- **Option A (preferred):** Use Babel preset `typescript` + `react`.
- **Option B:** Use `sucrase` or `esbuild-wasm` in a worker for fast TSX→JS.

### Bug 6 — Import parsing is regex-based
Impact:
- misses `import('x')`, re-exports, multiline imports.

**Fix:** Parse with a real parser in a worker:
- `es-module-lexer` or `acorn` to extract import specifiers.

### Bug 7 — Virtual Keystone module is a stub
- `useVault` returns fake data.
- `useTurnkey.signTransaction` assumes structured clone works for transactions.

**Fix:** Keystone SDK in preview must match the real SDK contract:
- accept `base64` tx bytes only
- never accept live Transaction objects

---

## 1.5 UI/UX Gap: “Functional” vs “Cyberpunk Bloomberg Terminal”
### Current State
- Studio UI has dark theme and some terminal copy, but lacks cohesive “operating system” feel.

### Blueprint (High-impact changes)
- **Monaco theme**: custom “Keystone Neon” theme:
  - keywords: emerald/cyan
  - strings: magenta
  - errors: red glow
- **Minimap glow**: re-enable minimap with subtle bloom; animate on diagnostics changes.
- **Scanlines + noise**: optional CSS overlay for “CRT” effect.
- **Matrix streaming**:
  - Architect chat shows token streaming with a “cursor beam”
  - code writes with a “laser caret” effect (CSS caret + sound optional)
- **High-density HUD**:
  - top bar shows CPU compile time, dependency count, simulation status

---

# Section 2 — “The Architect” (Prompt-to-App Engine)

## 2.1 Vision
User prompt:
> “Build a Sniper Bot that watches Raydium for new liquidity pools > $50k and buys instantly.”

Architect must:
- generate UI + logic + permissions request
- route privileged actions through Simulation Firewall
- produce working code in the Zero-Build runtime constraints

---

## 2.2 Architect Pipeline (AI writes into Monaco in real-time)
### System Components
- **Architect Chat UI** (left)
- **Monaco Editor** (center/left)
- **Live Preview** (right)
- **Simulation Console** (right/bottom)
- **Architect Orchestrator** (client state machine)
- **Architect API** (server streaming endpoint)

### Pipeline Stages
1. **Spec parse**
   - classify app type, required SDK hooks, dependencies
2. **Plan + File map**
   - decide whether single-file (`App.tsx`) or multi-file
3. **Streaming write**
   - stream edits into Monaco as incremental patches
4. **Compile + Diagnostics loop**
   - read Monaco markers, feed back to AI, auto-fix
5. **Runtime smoke**
   - load preview, capture console/runtime errors, feed back
6. **Stabilize + Explain**
   - produce final “what I built / how to test / what permissions needed”

---

## 2.3 Streaming: character-by-character writing
### Problem
Current `/api/studio/generate` returns a full JSON blob; user sees a jump cut.

### Solution
Add `/api/studio/architect/stream`:
- Server returns **SSE** (or chunked fetch) with events:
  - `plan`
  - `file_start`
  - `delta` (text)
  - `file_end`
  - `done`

Client behavior:
- Maintain a **write cursor** and apply `editor.executeEdits` with small chunks.
- Throttle to ~30–60 updates/second for smoothness.

Recommended edit format (more robust than raw deltas):
- Stream **operations**:
  - `{ op: 'insert', file: 'App.tsx', offset, text }`
  - `{ op: 'replace_range', start, end, text }`

This matches the JSON-RPC bridge mentality and avoids desync.

---

## 2.4 Self-Correction Loop (Red squiggle → AI fix)
### Detect TypeScript errors
Use Monaco markers:
- `monaco.editor.getModelMarkers({ resource: model.uri })`
- filter `severity === Error`

Debounced loop:
- after each write burst, wait 250–500ms
- if errors exist:
  - send top N markers + surrounding code context back to AI
  - request a patch (not a full rewrite)

### Provide “Auto-Heal” modes
- **Safe Auto-Heal (default)**: max 3 fix iterations; show diff before applying.
- **Aggressive Auto-Heal**: auto-apply patches, but log every action.

### Runtime error loop
- LivePreview already captures console errors.
- Feed the last 20 logs back as `[RUNTIME LOGS]`.

Bounded convergence criteria
- Stop when:
  - TS errors = 0
  - runtime errors = 0
  - preview emitted `ready`

---

## 2.5 Prompt Engineering: Architect Agent System Prompt
**Goal:** Prevent hallucinated Node APIs and enforce Keystone constraints.

### Architect System Prompt (proposed)
- **Identity**: “You are Architect Agent for Keystone Studio.”
- **Hard constraints**:
  - Browser-only: no `fs`, no `path`, no `net`, no `child_process`
  - No backend secrets, no private keys, no direct `window.solana`
  - Must use Keystone SDK hooks: `useVault`, `useTurnkey`, `AppEventBus`
  - All privileged actions must be requested via `useTurnkey` methods and must be simulatable
  - Only use allowed deps; if new deps needed, request them explicitly
  - Output must be **edit operations**, not a full file dump (enables streaming and self-correction)
- **Security policy**:
  - Never request signing without a simulation preflight step
  - Provide a human-readable intent summary for any tx

### Output schema
- Plan
- Dependency request list
- Edit operations for each file
- Test instructions

This makes the AI “compiler-friendly” and reduces churn.

---

# Section 3 — Tooling & Stack Recommendations

## 3.1 Editor Engine: Monaco vs CodeMirror 6
### Monaco (recommended for desktop Studio)
- **Pros**
  - Best-in-class TS language services and diagnostics.
  - Strong marker APIs for self-healing loop.
  - Familiar VS Code feel (aligned with Studio vision).
- **Cons**
  - Heavy on mobile.

### CodeMirror 6 (recommended for mobile companion)
- **Pros**
  - Better mobile performance and touch ergonomics.
  - Smaller bundle.
- **Cons**
  - Harder to replicate full TS IntelliSense.

**Recommendation:**
- Keep **Monaco** as primary for Architect mode.
- Add a **“Mobile Architect Console”** (chat + preview + minimal editing) using CodeMirror later.

---

## 3.2 Languages: TypeScript vs JavaScript
**Recommendation:** Default to **TypeScript**, allow **JavaScript mode** as a beginner toggle.

Rationale:
- TypeScript is essential for:
  - reliable self-healing via diagnostics
  - safe SDK usage contracts
  - fewer runtime-only surprises
- JavaScript mode is valuable for:
  - lower barrier
  - faster prototyping

Implementation:
- Monaco supports both; runtime transpiler must handle TSX and JSX.

---

## 3.3 Top 5 Starter Templates (must ship)
1. **Raydium Pool Watcher**
   - subscribes to events / polls API; alerts on new pools
2. **Jupiter Rebalance Bot UI**
   - target allocations, simulate route, request approval
3. **Yield Heatmap Dashboard**
   - reads vault holdings + shows best yield venues
4. **DAO Voting Booth**
   - reads proposals + prepares vote tx via policy engine
5. **Treasury Risk Radar Widget**
   - concentration risk + alerts via AppEventBus

Each template must include:
- “Simulation First” button
- “Request Approval” flow
- minimal allowed deps

---

# Section 4 — UI/UX Blueprint

## 4.1 Split-Screen Layout
### Left Pane (Architect + Editor)
- **Top-left:** Architect Chat (streaming)
- **Bottom-left:** “Architect Actions”
  - deps requested
  - permissions requested
  - simulation warnings
- **Center:** Monaco editor with:
  - neon theme
  - inline diff view (Architect edits)

### Right Pane (Preview + Simulation Console)
- **Top-right:** Live Preview iframe
- **Bottom-right:** Simulation Console
  - decoded tx intent
  - balance diffs
  - risk signals

---

## 4.2 Feedback Loops: Visualizing the Simulation Firewall
When a mini-app requests a transaction during development:
- show a **“FIREWALL CHECK”** overlay with states:
  - `SIMULATING` (animated)
  - `BLOCKED` (red with reason)
  - `APPROVAL_REQUIRED` (yellow)
  - `EXECUTING` (emerald)

Developer experience:
- A blocked tx should highlight:
  - the code location that triggered it (callsite)
  - the simulation error logs
  - the policy rule that denied it

This turns security into a learning tool, not just a wall.

---

# Roadmap (Phased)

## Phase A — Fix critical security/runtime issues (1–2 weeks)
- Restrict iframe sandbox to `allow-scripts`.
- Replace `*` postMessage with strict origin + session binding.
- Implement JSON-RPC 2.0 bridge envelope.
- Fix TS transpilation (Babel TS preset or esbuild-wasm).
- Pin React 19 in preview.

## Phase B — Dependency resolver + lockfile (1–2 weeks)
- Build import parser (real lexer) + lockfile generation.
- Implement specifier rewriting + pinned esm.sh URLs.
- Add allowlist and dependency approval UI.

## Phase C — The Architect v1 (2–3 weeks)
- Add streaming endpoint + client writer.
- Add diagnostics loop (Monaco markers → AI patch).
- Add runtime log feedback loop.
- Ship 5 starter templates.

## Phase D — The Architect v2 (ongoing)
- Multi-file generation mode.
- Sandpack fallback runtime.
- “Visual Diff + Approve” for all AI edits.
- Team collaboration: stream Architect actions via Liveblocks.

---

# Appendix — High-Priority Fix List (Concrete)
- Align Studio prompt (`./keystone`) with runtime rewrite and Monaco extra libs.
- Remove `allow-same-origin` from preview iframe.
- Remove `allow-popups` and `allow-forms`.
- Replace `Math.random()` IDs with `crypto.randomUUID()`.
- Enforce simulation before any signing.
- Replace regex import detection with AST/lexer.

---

# Status
This audit identifies critical gaps and provides an implementation roadmap for shipping “The Architect” with strong security, scalable dependency handling, and a premium cyberpunk terminal UX.
