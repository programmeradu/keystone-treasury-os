# Keystone Generative Foresight Master Specification

**Version:** 1.0  
**Status:** Implementation-Ready (Spec)  
**Domain:** Generative UI (“What-If Engine”) for Treasury Analytics  

---

## 0. Executive Summary

Keystone Generative Foresight turns natural-language risk questions into **ephemeral, interactive dashboards** rendered inside the existing Diamond Merge runtime (Custom iframe + SDK hooks + Proxy Gate). Instead of exporting CSVs to Excel, a Treasury Manager types:

- “How long is our runway if SOL drops 50%?”
- “Show impact of a 10 ETH buyback if price slips 5%.”

…and Keystone renders a UI with sliders, cards, and projection charts that update in real time.

This spec consolidates four tracks into a single build plan:

- **GEMINI (UI Composer):** A high-level component library (“GenUI Atoms”) and an Architect prompt update so the AI composes dashboards safely.
- **OPUS (Simulation Logic):** A server-side simulation engine (`/api/simulation`) that computes projections from a canonical portfolio snapshot and scenario variables; includes “Glass Standard” integrity constraints to prevent misleading outputs.
- **GPT (Runtime Integration):** An ephemeral rendering pipeline that injects temporary code into the existing Studio/LivePreview runtime **without saving to the Mini-App database**.
- **KIMI (Shadow Fork Data):** Optional “Shadow Fork” ingestion to simulate executed actions/trades against mainnet fork state using Helius/Tenderly simulation RPCs.

---

## 1. References (Authoritative Context)

- **KEYSTONE_MASTER_PLAN.md §12:** “Generative Foresight: The What-If Engine”
  - The agent identifies variables, injects parameters into state, and the UI redraws instantly.
- **KEYSTONE_TECHNICAL_BUSINESS_PLAN.md §3.2:** “Risk Radar” as a living calculation + risk visualization pattern.
- **Diamond Merge Runtime:** iframe sandbox (`sandbox="allow-scripts"`), virtual SDK hooks, postMessage bridge, Proxy Gate allowlists.

---

## 2. Core Product Requirements

### 2.1 Ephemeral by Default

Generative foresight UIs are **temporary**:

- They are not “Mini-Apps” in the marketplace sense.
- They should not be saved to `mini_apps` / Arweave.
- They should be reproducible from:
  - the user prompt
  - current portfolio snapshot
  - scenario variables
  - (optionally) a simulation trace

### 2.2 Glass Standard: Transparent, Verifiable, Non-Deceptive

Foresight output must preserve Keystone’s “Trust Less, Verify More” posture:

- **No hidden risk:** the system must not allow omitting liquidation risk, insolvency dates, or negative deltas.
- **Explain assumptions:** burn rate, price shock, slippage, fees, and model window must be explicitly surfaced.
- **Provenance:** each projection point should link to the inputs used to generate it.

### 2.3 Strict IO via the SDK (No Direct Network)

All data access uses SDK hooks routed through the Proxy Gate (no direct `fetch()` from iframe).

---

## 3. Terminology & Data Model

### 3.1 Canonical Portfolio Snapshot

A server-validated, normalized view of the user’s treasury state at time `t0`.

```ts
type PortfolioSnapshot = {
  snapshotId: string;
  timestamp: string; // ISO
  chain: 'solana';

  baseCurrency: 'USD';

  assets: Array<{
    assetId: string;       // e.g. 'SOL', 'USDC', 'JUP', 'mSOL'
    symbol: string;
    decimals: number;
    balance: string;       // decimal string
    priceUsd: string;      // decimal string
    valueUsd: string;      // derived
    tags?: string[];       // e.g. ['volatile', 'stable', 'staked']
  }>;

  liabilities?: Array<{
    liabilityId: string;
    label: string;
    valueUsd: string;
    riskType: 'liquidation' | 'debt' | 'streaming' | 'unknown';
    metadata?: Record<string, unknown>;
  }>;

  flows?: {
    monthlyBurnUsd?: string;
    monthlyRevenueUsd?: string;
    streams?: Array<{ label: string; monthlyUsd: string; direction: 'in' | 'out' }>;
  };

  invariants: {
    totalValueUsd: string;
    stableValueUsd: string;
    volatileValueUsd: string;
  };
};
```

**Key rule:** The client (ephemeral UI) never crafts this; it requests it from the OS.

### 3.2 Scenario / Variables

A scenario is a typed object with human-readable labels and machine-readable variable constraints.

```ts
type SimulationScenario = {
  kind:
    | 'runway'
    | 'asset_price_shock'
    | 'buyback_trade'
    | 'rebalance'
    | 'custom';

  timeframe: {
    unit: 'day' | 'week' | 'month';
    count: number; // e.g. 12 months
  };

  variables: Record<string, SimulationVariable>;

  // Optional: requested KPIs (defaults applied server-side)
  metrics?: Array<'runway_months' | 'depletion_date' | 'max_drawdown' | 'risk_flags'>;
};

type SimulationVariable = {
  label: string; // UI label
  kind: 'number' | 'percent' | 'boolean' | 'enum';

  default: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;

  // Percent is normalized as -1..+1
  unit?: 'usd' | 'asset' | 'percent' | 'bps';

  // For enum
  options?: Array<{ label: string; value: string }>;
};
```

---

## 4. The “What-If Protocol” (SDK + Bridge)

### 4.1 The Hook: `useSimulation(scenario)`

The central contract: a reactive hook that binds scenario variables to server-side projections.

```ts
type UseSimulationResult = {
  state: {
    snapshotId: string;
    scenarioId: string;
    status: 'idle' | 'running' | 'error' | 'ready';
    lastRunAt?: string;
    assumptions: Array<{ label: string; value: string }>;
    warnings: Array<{ code: string; message: string }>;
  };

  variables: Record<string, {
    spec: SimulationVariable;
    value: number | boolean | string;
    setValue: (v: number | boolean | string) => void;
  }>;

  result: null | {
    series: {
      historical?: Array<{ t: string; valueUsd: string }>;
      projected: Array<{ t: string; valueUsd: string; breakdown?: Record<string, string> }>;
    };

    kpis: Record<string, string>;

    risk: {
      flags: Array<{ severity: 'info' | 'warn' | 'block'; code: string; message: string }>;
      requiredDisclosures: Array<{ code: string; message: string }>;
    };

    traceId: string;
  };

  run: () => Promise<void>;
};

declare function useSimulation(scenario: SimulationScenario): UseSimulationResult;
```

#### Required behavior

- Updates to any `variables[...].value` must trigger a **debounced** recomputation.
- The hook must publish explicit `assumptions` and `requiredDisclosures` to prevent “pretty lies.”
- The hook must be server-backed by default (no heavy math in iframe).

### 4.2 Transport

Requests must route through the existing IO model:

- Ephemeral UI calls `useSimulation()`
- `useSimulation()` calls `useFetch()` (or a simulation-specific transport) which routes:
  - iframe → bridge (JSON-RPC over `postMessage`) → OS → `/api/proxy` → `/api/simulation`

**Bridge protocol:** JSON-RPC 2.0.

```json
{ "jsonrpc": "2.0", "method": "SIMULATION_RUN", "params": { ... }, "id": "...", "nonce": "..." }
```

The OS must enforce:

- `event.source === iframe.contentWindow`
- nonce replay protection
- per-method allowlist (only SIMULATION_* + TURNKEY_* + PROXY_* methods)

---

## 5. GEMINI Track — Generative Component Library (GenUI Atoms)

### 5.1 Principle: AI Should Compose, Not Engineer

The Architect should not write fragile chart primitives (raw D3). Instead it composes **stable, semantically meaningful atoms**.

### 5.2 Required Components

All components live in `@keystone-os/sdk` (virtual module for iframe runtime).

#### 5.2.1 `<ScenarioContainer />`

```tsx
type ScenarioContainerProps = {
  title: string;
  subtitle?: string;
  scenario: SimulationScenario;
  children: (ctx: UseSimulationResult) => React.ReactNode;

  // Enforces disclosure rendering and prevents hiding risk
  disclosureMode?: 'required' | 'all';
};

declare function ScenarioContainer(props: ScenarioContainerProps): JSX.Element;
```

**Hard rule:** `ScenarioContainer` must always render:

- assumptions
- warnings
- risk flags

…regardless of what the AI writes inside `children`.

#### 5.2.2 `<VariableControl />`

A unified control that renders slider/toggle/select based on variable spec.

```tsx
type VariableControlProps = {
  variableKey: string;
  label?: string;
  helperText?: string;

  ctx: UseSimulationResult;

  formatValue?: (v: any) => string;
};

declare function VariableControl(props: VariableControlProps): JSX.Element;
```

**Hard rule:** It must bind to `ctx.variables[variableKey].setValue`.

#### 5.2.3 `<ParameterSlider />`

A specialized, high-density slider.

```tsx
type ParameterSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  unit?: 'usd' | 'percent' | 'bps' | 'asset';
};

declare function ParameterSlider(props: ParameterSliderProps): JSX.Element;
```

#### 5.2.4 `<ProjectionChart />`

```tsx
type ProjectionChartProps = {
  title: string;
  historicalData?: Array<{ t: string; valueUsd: string }>;
  projectedData: Array<{ t: string; valueUsd: string }>;
  annotations?: Array<{ t: string; label: string }>;

  // Guardrails
  showDepletionNode?: boolean;
  showDrawdown?: boolean;
};

declare function ProjectionChart(props: ProjectionChartProps): JSX.Element;
```

#### 5.2.5 `<ImpactCard />`

```tsx
type ImpactCardProps = {
  label: string;
  value: string;
  delta?: string;
  tone?: 'neutral' | 'good' | 'bad' | 'warn';
};

declare function ImpactCard(props: ImpactCardProps): JSX.Element;
```

### 5.3 Canonical Example (Runway + SOL Shock)

The Architect should generate a component like:

- `ScenarioContainer` + `VariableControl`s for burn rate, SOL shock
- `ImpactCard` for runway months + depletion date
- `ProjectionChart` bound to `ctx.result.series.projected`

(No database writes, no file system, no raw fetch.)

### 5.4 System Prompt Update (Architect Constraints)

Add the following to the Architect system prompt:

- The UI must be composed using only SDK atoms (`ScenarioContainer`, `VariableControl`, `ProjectionChart`, `ImpactCard`).
- All scenarios must use `useSimulation()`; the AI may not implement simulation math in the iframe.
- The output must include at least:
  - KPI cards
  - a chart
  - variable controls
  - visible assumptions/warnings
- The AI must not hide risk; disclosure is mandatory and enforced by `ScenarioContainer`.

---

## 6. OPUS Track — Simulation Math Engine (`/api/simulation`)

### 6.1 Why Server-Side

- 12+ month runway projections can involve:
  - normalized portfolio valuation
  - cashflow modeling
  - protocol-specific risk (liquidation thresholds)
  - trade slippage and fees
- These are heavy and must be computed server-side.

### 6.2 Endpoint Contract

`POST /api/simulation/run`

Request:

```ts
type SimulationRunRequest = {
  snapshotId: string;

  scenario: SimulationScenario;

  variableValues: Record<string, number | boolean | string>;

  // Optional: include a “model version” for deterministic playback
  modelVersion?: string;
};
```

Response:

```ts
type SimulationRunResponse = {
  scenarioId: string;
  snapshotId: string;
  traceId: string;

  assumptions: Array<{ label: string; value: string }>;
  warnings: Array<{ code: string; message: string }>;

  series: {
    historical?: Array<{ t: string; valueUsd: string }>;
    projected: Array<{ t: string; valueUsd: string; breakdown?: Record<string, string> }>;
  };

  kpis: Record<string, string>;

  risk: {
    flags: Array<{ severity: 'info' | 'warn' | 'block'; code: string; message: string }>;
    requiredDisclosures: Array<{ code: string; message: string }>;
  };
};
```

### 6.3 Simulation Core Algorithm (Runway)

Baseline runway projection is a deterministic cashflow roll-forward:

- `portfolioValueUsd[t] = portfolioValueUsd[t-1] + inflows[t] - outflows[t] + priceShockDelta[t]`
- Depletion node occurs when `portfolioValueUsd[t] <= 0` OR stable runway buffer threshold triggers.

**Required outputs:**

- Depletion date (if any)
- Runway months
- Max drawdown across horizon

### 6.4 Security & Anti-Misleading Controls

The Simulation Engine must enforce **integrity constraints** so the AI cannot “paint over” risk.

#### 6.4.1 Mandatory Risk Flags

Server generates risk flags; client must render them.

Examples:

- `LIQUIDATION_RISK_PRESENT`
- `CONCENTRATION_GT_50`
- `RUNWAY_LT_6_MONTHS`
- `PRICE_SHOCK_GT_40`

#### 6.4.2 Disclosure Enforcement

Server returns `requiredDisclosures`. The UI must show them.

Examples:

- “Assumes constant burn rate.”
- “Assumes SOL price shock is instantaneous and persistent.”
- “Does not model governance revenue changes.”

#### 6.4.3 Traceability

Every response includes `traceId`. The server must log (internal-only):

- snapshot hash
- scenario + variables
- computed KPIs
- risk flags

This enables audits and prevents “black box charts.”

---

## 7. GPT Track — Ephemeral Rendering Pipeline

### 7.1 Requirement

Foresight UIs must render in the existing LivePreview runtime **without polluting user project files**.

### 7.2 Ephemeral Code Injection Model

Introduce an ephemeral “overlay file set” applied only at runtime:

- Base files: user’s current Studio project files (`files`)
- Overlay files: generated foresight UI (`Foresight.tsx`, `App.tsx` wrapper)

Resolution order:

- if overlay contains `App.tsx`, it takes precedence
- otherwise fall back to project `App.tsx`

The overlay is held in memory (React state) and cleared when the user exits Foresight mode.

### 7.3 Isolation Rules

- Ephemeral UI can read portfolio data via SDK hooks only.
- It cannot write to DB.
- It cannot import arbitrary external code beyond the allowlisted import map.

### 7.4 UX: Mode Switching

Add a Studio mode:

- `Studio` (saved project)
- `Foresight` (ephemeral)

When in Foresight:

- The editor shows generated files in a separate tab group (read-only by default)
- A “Pin to Mini-App” action (future) could promote ephemeral into a saved project

---

## 8. KIMI Track — “Shadow Fork” Data Layer

### 8.1 When to Use Shadow Fork

Shadow fork is required for scenarios like:

- “What if we execute this trade?”
- “Simulate this buyback with slippage and route fees.”
- “What if we unwind this LP position?”

### 8.2 Data Sources

- **Helius** for RPC + parsing
- **Tenderly** (or equivalent) for forked state simulation and diffing

### 8.3 Shadow Simulation API

`POST /api/simulation/shadow`

Request:

```ts
type ShadowSimulationRequest = {
  snapshotId: string;

  // A proposed action plan or transaction bundle
  action: {
    kind: 'trade' | 'deposit' | 'withdraw' | 'custom_tx';
    // For trade-like intents
    inputs?: Record<string, string>;
    // Raw tx support
    unsignedTxBase64?: string;
  };

  // Risk controls
  maxLossUsd?: string;
  requireStateDiff?: boolean;
};
```

Response:

```ts
type ShadowSimulationResponse = {
  traceId: string;

  stateDiff: {
    balanceChanges: Array<{ assetId: string; delta: string; deltaUsd: string }>;
    accountsTouched: Array<{ address: string; program?: string }>;
  };

  executionPreview: {
    estimatedFeesUsd?: string;
    slippageBps?: number;
    routeLabel?: string;
  };

  risk: {
    flags: Array<{ severity: 'warn' | 'block'; code: string; message: string }>;
  };
};
```

### 8.4 Binding Shadow Data into GenUI

Shadow simulation results can be displayed via:

- `ImpactCard` for deltas
- `ProjectionChart` to compare “baseline vs post-action” over time

---

## 9. Implementation Milestones (Build Order)

### Week 1: SDK GenUI Atoms + `useSimulation()` Client

- Add `useSimulation()` hook in SDK runtime
- Implement `ScenarioContainer`, `VariableControl`, `ImpactCard`, `ProjectionChart`

### Week 2: `/api/simulation/run` Server + Integrity Layer

- Portfolio snapshot retrieval
- Runway projection engine
- Risk flags + required disclosures + trace logging

### Week 3: Ephemeral Runtime Integration

- Overlay file injection
- Foresight mode UI
- Architect prompt routing: “compose GenUI atoms only”

### Week 4: Shadow Fork Simulation (optional v1.1)

- `/api/simulation/shadow` using Helius/Tenderly
- State diff + risk blocks

---

## 10. Non-Goals (v1)

- Full protocol-specific liquidation modeling across every DeFi position.
- Saving/publishing foresight UIs to marketplace.
- Fully autonomous execution from foresight mode.

---

## 11. Appendix: Required Invariants

- **Client is untrusted.** All risk flags and disclosures are server-originated.
- **UI cannot hide risk.** `ScenarioContainer` renders disclosures and flags.
- **Reproducibility.** Any chart must be reproducible from `snapshotId + scenario + variables + modelVersion`.
- **IO locked.** No direct network from iframe; Proxy Gate only.

---

*GENERATIVE FORESIGHT MASTER SPEC — v1.0*
