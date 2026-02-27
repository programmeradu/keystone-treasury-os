# Venturethon Day 1 Master Baseline Report

**Date:** June 30, 2024
**Auditor:** Jules (AI Software Engineer)
**Target:** Keystone Treasury OS Repository
**Status:** READ-ONLY AUDIT COMPLETE

---

## 1. Executive Summary

This report establishes the **architectural ground truth** for the Keystone Treasury OS as we begin the 10-day Soonami Venturethon sprint. The audit confirms a sophisticated, agentic architecture built on Next.js 15, but reveals critical discrepancies between the documentation and the codebase—most notably the **"Phantom Sandpack"** dependency and the custom-built **Studio Runtime**.

**Key Findings:**
1.  **Architecture:** The "Diamond Merge" security layer is functionally implemented and active, enforcing a hard-block on failed simulations.
2.  **Runtime:** The "Keystone Studio" uses a custom `iframe` + `Babel` + `Monaco` implementation, *not* Sandpack as suggested by `package.json` dependencies.
3.  **Security:** The `SimulationFirewall` provides a robust pre-flight check, but the `iframe` sandbox relies on `allow-same-origin` with `srcDoc`, which requires careful handling of secrets (though none are currently injected into the frame's storage).
4.  **Dependencies:** `package.json` contains unused bloat (`@codesandbox/sandpack-react`) that should be removed to reduce install time and confusion.

---

## 2. Architectural Overview

### 2.1 Build System & Configuration
*   **Framework:** Next.js 15.5.3 (App Router) with Turbopack enabled (`next dev --turbopack`).
*   **Language:** TypeScript 5.8.3.
*   **Transpilation:**
    *   **Build Time:** Standard Next.js SWC/Turbopack pipeline.
    *   **Runtime (Studio):** `@babel/standalone` v7.28.5 injected into the browser to transpile user TSX on-the-fly.
*   **Module Resolution:** `tsconfig.json` uses `moduleResolution: bundler` and `module: esnext`, aligning with modern web standards.

### 2.2 Dependency Analysis
*   **Critical Circular Dependencies:** The `src/lib/agents/index.ts` re-exports all agents. While convenient, `ExecutionCoordinator` imports specific agents (`TransactionAgent`, `BuilderAgent`) which in turn import types from `index.ts`. This is a fragile pattern that may cause runtime initialization errors if `index.ts` is imported before the classes are defined.
*   **Phantom Dependencies:**
    *   `@codesandbox/sandpack-react`
    *   `@codesandbox/sandpack-themes`
    *   **Status:** Installed in `package.json` but **zero usages** in the codebase. The Studio implementation is 100% custom.

---

## 3. Deep Dive: Studio Runtime (`src/components/studio`)

The Studio is the "IDE" component of Keystone, allowing users to write and run Solana mini-apps.

### 3.1 The "Custom Iframe" Architecture
Contrary to the documentation implying a Sandpack integration, the codebase (`LivePreview.tsx`) implements a raw `<iframe>` solution:
*   **Injection:** User code is stringified and injected into a `srcDoc` template.
*   **Transpilation:** `Babel.transform` is called *inside* the iframe to convert TSX -> JS.
*   **Module System:** A custom `window.__ks_require` shim mimics CommonJS `require()`, mapping imports like `react` and `@keystone-os/sdk` to global variables exposed on `window`.

### 3.2 Security Analysis (The Bridge Protocol)
*   **Communication:** `src/lib/studio/bridge-protocol.ts` defines a JSON-RPC 2.0 protocol over `window.postMessage`.
*   **Sandbox Attributes:** `<iframe sandbox="allow-scripts allow-same-origin" ... />`
    *   **Risk:** `allow-same-origin` is necessary for `srcDoc` to work in some contexts but technically allows the iframe to access the parent's origin *if* the browser treats `about:srcdoc` as inheriting the parent's origin (which most do).
    *   **Mitigation:** The `BridgeController` enforces a `NonceTracker` to prevent replay attacks and checks `event.source` to ensure messages come from the expected iframe.
*   **Capabilities:**
    *   The iframe *cannot* access the main wallet directly.
    *   It *must* request signatures via `turnkey.signTransaction` (JSON-RPC method).
    *   This request flows through the **Diamond Merge** layer before execution.

### 3.3 The "Architect" Gap
The current implementation injects the *entire* code string at once. There is no streaming interface for "The Architect" (AI) to incrementally build the app. This confirms the need for the "Monaco + Stream" refactor mentioned in the prompt.

---

## 4. Deep Dive: Diamond Merge Security Layer (`src/lib/agents`)

The "Diamond Merge" is the convergence of AI planning, execution, and security verification.

### 4.1 Data Flow & Hard-Blocking Logic
Trace of `ExecutionCoordinator.executeSwap` (`src/lib/agents/coordinator.ts`):

1.  **Planning:** `BuilderAgent` fetches a route and builds a quote.
2.  **Pre-Flight (Firewall):**
    *   Calls `SimulationFirewall.getInstance().protect(quote)`.
    *   **Blocking:** If `report.passed === false`, the coordinator throws `SIMULATION_FIREWALL_BLOCKED` and sets state to `FAILED`. **This is a functional hard-block.**
3.  **Simulation (On-Chain):**
    *   Calls `TransactionAgent.executeAgent({ simulateOnly: true })`.
    *   **Blocking:** If simulation throws (e.g., revert), the coordinator catches it and throws `TX_SIMULATION_FAILED`.
4.  **Approval:**
    *   Only *after* both checks pass does the state move to `APPROVAL_REQUIRED`.

### 4.2 Simulation Firewall Implementation
Located in `src/lib/studio/simulation-firewall.ts`:
*   **`protect(quote)`:** Heuristic checks (Price Impact > 5%, Output > 0). It is strictly rule-based.
*   **`simulate(tx)`:** Uses `connection.simulateTransaction`.
    *   **Mock Fallback:** It contains a `mockSimulation` method used if `transactionData` cannot be deserialized.
    *   **Risk:** If the production environment fails to parse a transaction, it might silently fall back to the mock, giving a false sense of security. **This mock fallback should be removed for production.**

---

## 5. Risk Assessment & Recommendations

| Severity | Component | Issue | Recommendation |
| :--- | :--- | :--- | :--- |
| **High** | Studio | Phantom Sandpack Dependency | Remove `@codesandbox/*` from `package.json` immediately to clear 180MB+ of node_modules. |
| **Medium** | Security | `allow-same-origin` in Studio Iframe | Investigate moving the iframe runner to a separate subdomain (e.g., `usercontent.keystone.os`) to isolate origin completely. |
| **Medium** | Security | `mockSimulation` Fallback | Disable `mockSimulation` in production builds to prevent "blind" signing. |
| **Low** | Architecture | Circular Imports in Agents | Refactor `index.ts` exports or use dependency injection patterns to break cycles. |

---

**Signed:** Jules
**Venturethon Day 1 Baseline**
