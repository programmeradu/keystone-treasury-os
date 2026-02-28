# Keystone Studio & SDK: Architectural Review & Roadmap to "The Cursor for Web3"

## Executive Summary
This report analyzes the current state of the Keystone Studio, `@keystone-os/sdk`, and `@keystone-os/cli` following the "Sovereign OS 2026" updates. The goal is to identify gaps and blind spots and provide actionable improvements to elevate Keystone Studio into the ultimate IDE for Web3 mini-apps (the "Cursor for Web3").

---

## 1. Gaps and Blind Spots in Current Implementation

### 1.1. Incomplete Studio Editor Introspection (The "Blind" Editor)
**Gap:** The new hooks introduced in the SDK (`useEncryptedSecret`, `useACEReport`, `useAgentHandoff`, `useMCPClient`, `useMCPServer`, `useSIWS`, `useJupiterSwap`, `useImpactReport`, `useTaxForensics`, `useYieldOptimizer`, `useGaslessTx`) are currently invisible to the Studio's Monaco editor (`CodeEditor.tsx`).
**Impact:** Developers building in Keystone Studio get zero autocomplete, type checking, or tooltip documentation for the most powerful features of Sovereign OS 2026. This leads to a frustrating developer experience and runtime errors.
**Resolution:** Introduce a build-time generation step that derives the injected `KEYSTONE_SDK_TYPES` consumed by `CodeEditor.tsx` from the source-of-truth SDK definitions in `packages/sdk/src/types.ts` (including the full interfaces and corresponding hook signatures), so Monaco always reflects the current SDK without manual string duplication.

### 1.2. Broken Iframe Bridge Implementations (The "Phantom" Hooks)
**Gap:** While the SDK defines the hooks and routes them via `keystoneBridge.call(BridgeMethods.*)`, the actual iframe implementation in `LivePreview.tsx` (`VIRTUAL_SDK_MODULE` and `__keystoneSDK`) does not expose or handle these new hooks.
**Impact:** If a user tries to use `useJupiterSwap()` in their Mini-App, it will throw a runtime error in the Live Preview because the hook is undefined in the virtualized `__keystoneSDK` module.
**Resolution:** The `VIRTUAL_SDK_MODULE` injected into the iframe must be updated to export all new hooks, wiring them directly to `keystoneBridge.call` or `keystoneBridge.notify`. Furthermore, the host-side `BridgeController` needs stub or real handlers for these new JSON-RPC methods to prevent "Method Not Found" errors.

### 1.3. CLI & Local Development Disconnect
**Gap:** The CLI (`@keystone-os/cli`) allows scaffolding a new app via `keystone init`, but the template is rudimentary and doesn't showcase the "Sovereign OS" capabilities. Additionally, local development relies on `keystone validate` which has regex-based blocklists but lacks deep AST parsing for security.
**Impact:** The local developer experience feels disjointed from the robust "Studio" experience.
**Resolution:** Enhance the CLI template to include a more robust example (e.g., using `useJupiterSwap` or `useImpactReport`). Implement a local dev server (`keystone dev`) that spins up a local iframe sandbox mirroring the Studio's `LivePreview.tsx` environment.

### 1.4. Publishing & Marketplace Friction
**Gap:** `keystone publish` has a `--register-marketplace` flag, but it currently just fires a POST request into the void. There is no feedback loop providing the user with a direct link to view their listed app on the marketplace.
**Impact:** Developers don't get the immediate gratification of seeing their published app, reducing engagement.
**Resolution:** The CLI should output a direct, clickable URL to the marketplace listing (e.g., `<MARKETPLACE_BASE_URL>/marketplace/app/<appId>`) upon successful publication.

---

## 2. Roadmap: Making Keystone Studio "The Cursor for Web3"

To truly become the "Cursor for Web3", Keystone Studio must move beyond just being a code editor with a preview window. It needs deeply integrated, context-aware AI and Web3 primitives.

### 2.1. AI Architect Contextual Awareness (Cursor-like features)
- **Problem:** The current `PromptChat.tsx` (AI Architect) is a side panel chat. It is not deeply integrated into the editor.
- **Improvement:**
  - **Inline Code Generation:** Allow users to highlight code in the Monaco editor, press `Ctrl/Cmd+K` (or similar), and have the AI Architect generate/edit code inline.
  - **Contextual Web3 Knowledge:** Inject the ABI of uploaded smart contracts (via `ContractEditor.tsx`) directly into the AI Architect's system prompt. If a user uploads a Solana IDL, the AI should auto-generate the frontend integration using `useTurnkey` and `@coral-xyz/anchor` without being asked.
  - **Error Auto-Fixing (Ouroboros Loop Integration):** When `LivePreview.tsx` throws a runtime error or `Gatekeeper` fails, the error stack trace should automatically be fed to the AI Architect with a single-click "Fix this" button.

### 2.2. Visual Blockchain Debugger
- **Problem:** Debugging Web3 transactions in a generic browser console is painful.
- **Improvement:**
  - Enhance the "Console" tab in the Studio to include a "Transaction Inspector".
  - When a transaction is signed via `useTurnkey`, capture the raw transaction, simulate it via Helius RPC, and visualize the state changes (balances, token transfers, log messages) directly in the Studio *before* broadcasting. This builds upon the `useImpactReport` concept but visualizes it natively in the IDE.

### 2.3. Direct Publishing & Monetization (The Web3 App Store)
- **Problem:** Publishing requires CLI context switching.
- **Improvement:**
  - **1-Click Studio Publish:** The "SHIP" button in the Studio should not just compile, it should handle the entire pipeline: Gatekeeper Security Scan → Arweave Cold Storage Upload → Marketplace Registry (Hot Path).
  - **Monetization Built-in:** When publishing via Studio, allow developers to set a `priceUsdc` directly in a modal, integrating with the Marketplace contracts immediately.

### 2.4. Agentic Interoperability (MCP & Handoffs)
- **Problem:** Mini-apps are isolated.
- **Improvement:**
  - **MCP Visualizer:** If an app uses `useMCPClient`, the Studio should visually show which external services (GitHub, Slack, etc.) the app is connected to.
  - **Agent Swarms:** Allow developers to visually drag-and-drop different agents (Triage, Builder, Executor) and configure their `useAgentHandoff` payload schemas within the Studio GUI, generating the boilerplate code automatically.

---

## Conclusion
The foundation of Keystone OS is incredibly strong. By fixing the immediate type/bridge gaps and executing on the "Cursor for Web3" roadmap—specifically deep AI integration, visual debugging, and seamless 1-click publishing—Keystone Studio will become the undisputed standard for Web3 Mini-App development.
