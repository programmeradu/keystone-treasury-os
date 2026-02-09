# KEYSTONE FORESIGHT ENGINE — Phase 3: Generative Analytics Master Spec

**Architecture:** Holographic UI Layer  
**Phase:** 3 — Generative Foresight  
**Date:** February 2026  
**Status:** DRAFT — Ready for Implementation  

---

## Executive Summary

**The Vision:** "Generative Foresight" allows a Treasury Manager to ask natural language "What-If" questions (e.g., *"How long is my runway if SOL drops 50%?"*) and receive an interactive, ephemeral dashboard in response.

**The Architecture:** We leverage the existing Diamond Merge infrastructure (Runtime + SDK) but introduce a **"Holographic Layer"** — temporary, non-persistent Mini-Apps generated on-the-fly by the Architect Agent, populated with simulation data from a Shadow Fork.

---

## Part I: GEMINI — The Generative Component Library

**Role:** UI Composer  
**Goal:** Provide "High-Level Atoms" that the AI can assemble reliably without writing fragile D3.js code.

### 1.1 The `@keystone-os/foresight` Package

This is a specialized extension of the SDK, available only in the Foresight context.

```typescript
// @keystone-os/foresight/components

/**
 * The root container for a simulation.
 * Manages the "Scenario State" (variables -> outcome).
 */
export function ScenarioContainer({
  initialVariables,
  simulationFn, // The ID of the server-side simulation to run
  children
}: ScenarioProps) {
  // Logic:
  // 1. Maintains state for all <VariableControl> children.
  // 2. Debounces updates (500ms).
  // 3. Calls useSimulation(variables) hook.
  // 4. Provides { result, isSimulating } context to children.
}

/**
 * A user-adjustable input.
 * The AI binds this to a specific variable key (e.g., 'solPrice').
 */
export function VariableControl({
  label,      // "SOL Price"
  variable,   // "solPrice"
  min, max,   // Range
  format,     // "currency" | "percent"
  defaultValue
}: ControlProps) {
  // Renders a Slider + Input field.
  // Updates the parent ScenarioContainer state.
}

/**
 * A projection chart that compares "Baseline" vs "Simulated".
 */
export function ProjectionChart({
  dataKey,      // "runway_months"
  xAxis,        // "date"
  yAxis,        // "balance_usd"
  baselineColor = "slate",
  simulatedColor = "emerald"
}: ChartProps) {
  // Uses Recharts under the hood.
  // Automatically plots two lines:
  // 1. Current Trajectory (Static)
  // 2. Simulated Trajectory (Dynamic from hook)
}

/**
 * Visualizes the "Delta" or impact of the simulation.
 */
export function ImpactCard({
  label,        // "Net Loss"
  valueKey,     // "net_impact_usd"
  threshold,    // Red/Green threshold (e.g., < 0 is bad)
}: ImpactProps) {
  // Renders a stat card with an arrow (↑/↓).
}
```

### 1.2 System Prompt Update

The Architect Agent's system prompt must be updated to understand these new tools:

```text
You have access to a new library: '@keystone-os/foresight'.
Use this for "What-If" questions.
NEVER write raw charts. ALWAYS use <ProjectionChart>.
ALWAYS wrap the app in <ScenarioContainer>.
Bind <VariableControl> to the variables identified in the user's prompt.
```

---

## Part II: OPUS — The Simulation Math Engine

**Role:** Simulation Logic  
**Goal:** execute heavy financial modeling securely on the server.

### 2.1 The Simulation Endpoint: `/api/simulation`

We cannot run complex Monte Carlo simulations or mainnet forks in the browser.

**Request Schema:**
```json
POST /api/simulation
{
  "portfolioSnapshot": { ... }, // Current holdings
  "variables": {
    "solPrice": 45.50,
    "hiringCount": 5,
    "burnRateIncrease": 0.10
  },
  "modelId": "RUNWAY_PROJECTION_V1"
}
```

**Response Schema:**
```json
{
  "results": [
    { "date": "2026-02-01", "balance": 1500000, "burn": 50000 },
    { "date": "2026-03-01", "balance": 1450000, "burn": 52000 },
    ...
  ],
  "metrics": {
    "depletionDate": "2027-08-15",
    "runwayMonths": 18.5,
    "netImpactUsd": -450000
  }
}
```

### 2.2 Security: The "Hallucination Guard"

The AI might try to generate a chart that says "You have infinite money." To prevent this:

1.  **Strict Typing:** The simulation logic is written in **Rust** or **Strict TypeScript** on the server. The AI *cannot* modify the math logic; it can only choose *which* model to run (e.g., `RUNWAY_MODEL`, `LIQUIDITY_MODEL`).
2.  **Sanity Bounds:** The API rejects variables outside realistic bounds (e.g., `solPrice: -100`).
3.  **No "Eval":** The AI cannot inject code into the simulation engine. It selects a pre-defined model ID.

---

## Part III: GPT — The Ephemeral Runtime

**Role:** Runtime Integration  
**Goal:** Inject temporary code without polluting the user's saved projects.

### 3.1 The "Holographic" Mode

The `LivePreview` component needs a new mode: `mode="ephemeral"`.

**Logic Flow:**
1.  User asks a question.
2.  Architect generates `ForesightApp.tsx`.
3.  **Instead of saving to DB**, the code is held in React State (`ephemeralCode`).
4.  The Runtime compiles and renders this memory-resident string.
5.  **Persistence:** The code is *discarded* when the user closes the Foresight modal or navigates away.

### 3.2 LivePreview Integration

```typescript
// LivePreview.tsx update
export function LivePreview({ mode = 'persistent', ...props }) {
  // ...
  if (mode === 'ephemeral') {
     // Inject a special header indicating this is a Simulation
     // Add "Save as Dashboard" button to persist if the user likes it
  }
}
```

**"Crystallization":** A user can choose to "Save" a Foresight. This effectively promotes the ephemeral code into a permanent Mini-App record in the `mini_apps` table.

---

## Part IV: KIMI — The Shadow Fork Data Layer

**Role:** Data Ingestion  
**Goal:** Feed the simulation with "Real but Hypothetical" data.

### 4.1 The Shadow Fork (Helius / Tenderly)

For trade simulations (e.g., *"What if I sell 10,000 SOL?"*), we need mainnet state.

**Workflow:**
1.  **Fork:** `POST /api/rpc/fork` (Creates a temp fork of mainnet via Helius/Tenderly).
2.  **Override:** Set the user's account state (e.g., unlock tokens, change balance).
3.  **Execute:** Run the hypothetical transaction.
4.  **Capture:** Record the state changes (slippage, fee, ending balance).
5.  **Return:** Send this data to the `<ProjectionChart>`.

### 4.2 The `useSimulation` Hook

```typescript
// @keystone-os/foresight/hooks

export function useSimulation(modelId: string, variables: Record<string, any>) {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Debounce 500ms
    const timer = setTimeout(async () => {
      const result = await fetch('/api/simulation', { ... });
      setData(result);
    }, 500);
    return () => clearTimeout(timer);
  }, [modelId, variables]);

  return data;
}
```

---

## Part V: The "Holographic" Workflow (End-to-End)

1.  **Prompt:** User types: *"Project my runway if I hire 3 devs at $120k/yr."*
2.  **Intent Analysis (Coordinator):**
    *   Detects `intent: "FORESIGHT"`.
    *   Extracts variables: `{ hires: 3, salary: 120000 }`.
    *   Selects Model: `RUNWAY_PROJECTION`.
3.  **Code Generation (Gemini):**
    *   Writes a React component using `<ScenarioContainer>` and `<VariableControl>`.
    *   Binds `hires` slider (1-10) and `salary` slider ($50k-$200k).
4.  **Rendering (GPT):**
    *   LivePreview renders the ephemeral component.
5.  **Simulation (Opus/Kimi):**
    *   The component mounts, calls `/api/simulation`.
    *   Server calculates the burn rate delta.
    *   Chart updates instantly.
6.  **Interaction:** User drags the slider to "5 devs". Chart dips.
7.  **Result:** Immediate financial insight without Excel.

---

*Phase 3 Master Spec — Approved for Development*
