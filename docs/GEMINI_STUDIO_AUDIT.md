# GEMINI_STUDIO_AUDIT.md

**Date:** February 6, 2026
**Auditor:** Gemini (Senior Solutions Architect)
**Target:** Keystone Studio Architecture (Diamond Merge)
**Status:** CRITICAL REVIEW

---

## Section 1: The Audit & Gap Analysis

### 1.1 The Conflict: Sandpack vs. Custom Runtime
**Verdict:** We must **ABANDON Sandpack** and fully commit to the **Custom Iframe (Monaco + esm.sh)** architecture.

**Evidence:**
1.  **Security (The Firewall):** Sandpack is a "black box" designed for CodeSandbox's convenience, often using Service Workers that complicate the strict isolation we need. We need a raw `<iframe>` where we control the `window.postMessage` bridge explicitly to enforce the **Simulation Firewall**. We cannot risk Sandpack's internal message bus leaking privs or bypassing our `transaction-agent` checks.
2.  **"The Architect" Performance:** Sandpack spins up a heavy container. For the "Architect" mode (AI streaming code), we need instant updates. Injecting text into a Monaco buffer is O(1). Waiting for Sandpack to re-bundle on every token stream is UX suicide.
3.  **Bundle Size:** `package.json` currently includes both `@monaco-editor/react` AND `@codesandbox/sandpack-react`. This is bloat. Dropping Sandpack saves ~1MB parsed size.

**Recommendation:** Remove `@codesandbox/sandpack-react`. Build the `LivePreview` component using a raw `<iframe>` with `srcDoc` generated dynamically.

### 1.2 The Dependency Hell (Import Maps)
**Gap:** How do we prevent version clashes (e.g., `framer-motion` importing a different `react` than our host)?
**Resolution:** **Pinned Import Maps with "External" Flags.**
We cannot rely on implicit resolution. The Runtime must inject a strictly governed Import Map:

```html
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@19.0.0?dev",
    "react-dom": "https://esm.sh/react-dom@19.0.0?dev",
    "@keystone-os/sdk": "blob:...", 
    "framer-motion": "https://esm.sh/framer-motion@11.5.4?external=react,react-dom",
    "recharts": "https://esm.sh/recharts@2.12.7?external=react,react-dom",
    "lucide-react": "https://esm.sh/lucide-react@0.400.0?external=react,react-dom"
  }
}
</script>
```
*Crucial Detail:* The `?external=react,react-dom` query param is mandatory for all 3rd party libs on `esm.sh`. This forces them to use the *browser's* mapped React instance (ours) rather than downloading their own copy, preventing the "Two Instances of React" crash.

### 1.3 The UI/UX Gap ("Cyberpunk Bloomberg")
**Gap:** The current Monaco default theme looks like VS Code. It breaks immersion.
**Fix: The "Neon-Noir" Theme.**
1.  **Glow Effects:** Use `monaco.editor.defineTheme` to add text-shadows to tokens.
    *   *Keywords (`import`, `const`)*: Cyan Glow.
    *   *Strings*: Amber Glow.
2.  **The Matrix Stream:** When the "Architect" is writing, we shouldn't just append text. We should render a "Ghost Cursor" (a block caret) that flickers at the insertion point.
3.  **Scanlines:** Overlay a faint CSS pointer-events-none scanline grid over the editor to sell the CRT aesthetic.

---

## Section 2: "The Architect" (Prompt-to-App Engine)

### 2.1 The Streaming Pipeline
**Challenge:** How to stream code without breaking the syntax highlighter every 10ms.
**Design:**
1.  **Stream Buffer:** The LLM (Groq) streams text into a hidden buffer.
2.  **Throttled Flush:** We flush updates to the Monaco Model every ~100ms (debounced) or on newline characters.
3.  **Visual Feedback:** While waiting for the flush, show a "Thinking..." or "Coding..." pulsing indicator in the Chat UI.

### 2.2 Self-Correction (The Ouroboros Loop)
If the AI writes buggy code, the user shouldn't have to fix it.
**Mechanism:**
1.  **Listen:** `monaco.editor.onDidChangeMarkers(() => { ... })`
2.  **Detect:** If `markers.length > 0` and `severity === Error`.
3.  **Feedback:** Capture the error message + line number.
4.  **Auto-Prompt:** Send hidden message to Architect Agent: *"Your code threw TS Error: [Error] at Line [X]. Fix it immediately."*
5.  **Rewrite:** Architect streams the patch.

### 2.3 System Prompt (The Constraints)
```text
You are The Architect, an AI coding engine for Keystone OS.
TARGET ENVIRONMENT:
- React 19 (Functional Components Only)
- Tailwind CSS (Standard classes)
- NO external npm installs. ONLY use available Import Map libraries:
  - framer-motion, recharts, lucide-react, date-fns, @solana/web3.js
- SDK USAGE:
  - Import { useVault, useTurnkey } from '@keystone-os/sdk'
  - useTurnkey().signTransaction(tx) returns Promise<signature>
SECURITY RULES:
- NEVER ask for private keys.
- NEVER access window.solana directly.
- ALWAYS handle errors for failed simulations.
```

---

## Section 3: Tooling & Stack Recommendations

### 3.1 Editor Engine: Monaco Wins
**Decision:** **Monaco Editor.**
*   *Why?* We are building a "Terminal", not a mobile app. The density and IntelliSense features of Monaco are superior. CodeMirror 6 is great, but Monaco's TypeScript language server integration (which we need for the SDK types) is best-in-class.
*   *Mobile?* Hide Monaco on mobile. Show only the Chat and the Live Preview. Mobile users are "Commanders" (Chat/Approve), not "Builders".

### 3.2 Language: TypeScript Enforced
**Decision:** **TypeScript Only.**
*   *Reasoning:* Financial software requires type safety. We cannot allow `any` types to cause runtime errors when handling millions in treasury assets.
*   *Implementation:* The `LivePreview` uses `@babel/preset-typescript` to strip types before execution, so the browser runs JS, but the Editor enforces TS.

### 3.3 Top 5 Starter Templates
1.  **The Sniper:** `RaydiumPoolWatcher`. Uses `useVault` to check balance + `useEffect` polling a dedicated RPC endpoint for new pool logs.
2.  **The Yield Radar:** `AaveVsKaminoHeatmap`. Uses `recharts` to plot APY diffs.
3.  **The Payroll Stream:** `VestingFlowChart`. Uses `framer-motion` layout animations to visualize token unlocking.
4.  **The Governor:** `DaoProposalVoting`. Simple Yes/No interface for Squads proposals.
5.  **The Sweeper:** `DustConverter`. Finds small balances and swaps them to SOL.

---

## Section 4: The UI/UX Blueprint

### 4.1 Layout: The "Split Brain"
*   **Left Pane (The Brain / Logic):**
    *   **Top:** "The Architect" Chat (Glassmorphism, blurred backdrop).
    *   **Bottom:** Monaco Editor (Neon-Noir theme).
*   **Right Pane (The Body / Execution):**
    *   **Main:** Live Preview Iframe (16:9 aspect ratio container).
    *   **Overlay:** "Simulation Console". When a transaction is requested, this slides up *over* the app.

### 4.2 Feedback Loops: The Firewall Visualization
We need to visualize the *invisible* security layer.
1.  **Action:** App calls `signTransaction`.
2.  **Reaction:**
    *   Editor/Chat dims (Focus mode).
    *   **Firewall HUD** appears (Holographic overlay).
    *   **Phase 1 (Scanning):** Progress bar "Simulating Transaction...".
    *   **Phase 2 (Result):**
        *   *Success:* "Green Shield" icon. Shows "Asset Delta": ` -100 SOL (Vault) | +14,500 USDC (Vault)`.
        *   *Block:* "Red Lock" icon. "Simulation Failed: Slippage > 1%".
3.  **User Choice:** "EXECUTE" (Enter key) or "ABORT" (Esc key).

---

## Conclusion
The "Diamond Merge" is viable **IF AND ONLY IF** we strip out Sandpack and rigorously enforce the Import Map strategy. The "Architect" feature transforms Keystone from a tool into a platform, but it requires the "Self-Correction" loop to be reliable, or users will abandon it for ChatGPT copy-pasting.

**Immediate Next Step:** Implementation of `src/components/studio/Runtime.tsx` (The Custom Iframe Engine).
