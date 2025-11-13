# Implementation Roadmap: Agentic Capabilities & Icon Redesign

## Executive Summary

This document outlines the phased implementation of:
1. **Agentic Capabilities** - Autonomous agents handling transactions, lookups, and executions
2. **Icon System Redesign** - 12 custom professional icons replacing emojis
3. **UI/UX Consolidation** - Unified naming and visual language

---

## PHASE 1: Icon System Implementation (Week 1)

### Objective
Replace all emoji-based tool icons with custom, semantic SVG icons.

### Tasks

#### 1.1 Icon Library Scaffolding ✅ DONE
- [x] Create `/src/components/ui/icons/` directory structure
- [x] Create icon base types (`IconProps` interface)
- [x] Create mapping constants:
  - `TOOL_ICON_MAP` (tool ID → icon component)
  - `TOOL_DISPLAY_NAMES` (emoji-free names)
  - `TOOL_DESCRIPTIONS` (tooltips/help text)

#### 1.2 Icon Component Creation ✅ DONE
- [x] `IconAirDropScout.tsx` - Radial scanner/target
- [x] `IconStrategyLab.tsx` - Laboratory flask
- [x] `IconWalletCopy.tsx` - Overlapping wallet cards
- [x] `IconFeeOptimizer.tsx` - Currency with downward arrow
- [x] `IconTokenSwap.tsx` - Bidirectional exchange
- [x] `IconMarketPulse.tsx` - Trending line chart
- [x] `IconHolderAnalytics.tsx` - Connected nodes
- [x] `IconMEVDetector.tsx` - Grid with spotlight
- [x] `IconPortfolioBalancer.tsx` - Mechanical scale
- [x] `IconTokenAuditor.tsx` - Shield with checkmark
- [x] `IconTxExplorer.tsx` - Timeline with blocks
- [x] `IconDCAScheduler.tsx` - Gear with calendar

#### 1.3 Icon Integration in Atlas UI
**File**: `src/components/atlas/atlas-client.tsx`

Replace all occurrences:
- `GlyphCompass` → `IconAirDropScout` (Airdrop Compass)
- `GlyphLab` → `IconStrategyLab` (Strategy Lab)
- `GlyphMarket` → `IconMarketPulse` (Market Snapshot)
- Remove emoji prefixes from all CardTitle components

**Specific locations to update:**
```tsx
// Line ~1212: Header glyph
- <GlyphAtlas className="h-4 w-4" />
+ Keep as-is (distinct Atlas branding)

// Line ~1303: Tab triggers
- <span className="flex items-center gap-1.5"><GlyphCompass /><span>Quests</span></span>
+ <span className="flex items-center gap-1.5"><IconAirDropScout /><span>Quests</span></span>

// Line ~1316: Airdrop Compass card
- <span className="flex items-center gap-2"><GlyphCompass /><span>Airdrop Compass</span></span>
+ <span className="flex items-center gap-2"><IconAirDropScout /><span>Airdrop Scout</span></span>

// Line ~1442: Speculative Opportunities
- <span className="flex items-center gap-2"><GlyphCompass /><span>Speculative Opportunities</span></span>
+ <span className="flex items-center gap-2"><IconAirDropScout /><span>Speculative Opportunities</span></span>

// Line ~1584: Market Snapshot
- <span className="flex items-center gap-2"><GlyphMarket /><span>Market Snapshot</span></span>
+ <span className="flex items-center gap-2"><IconMarketPulse /><span>Market Pulse</span></span>

// Line ~1773: Copy My Wallet (remove 📋)
- {/* 📋 Copy My Wallet */}
+ {/* Copy My Wallet */}

// Line ~1776: Fee Saver (remove ⚡)
- {/* ⚡ Fee Saver */}
+ {/* Fee Saver */}
```

#### 1.4 Tool Card Updates
**For each card component:**
1. Update CardTitle to use new icon
2. Remove emoji from title
3. Update display name if needed

**Components to update:**
- `CopyMyWallet.tsx` - add icon import
- `FeeSaver.tsx` - add icon import
- `CreateDCABotModal.tsx` - add icon import
- `TransactionTimeMachine.tsx` - add icon import
- `MEVScanner.tsx` - add icon import
- `RugPullDetector.tsx` - add icon import
- `PortfolioRebalancer.tsx` - add icon import
- `JupiterSwapCard.tsx` - add icon import
- `DCABotCard.tsx` - add icon import
- `HolderInsights` (within atlas-client.tsx) - add icon

### Deliverables
- [ ] All 12 icon components created and tested
- [ ] Icon index with exports and mappings
- [ ] Atlas client updated with new icons
- [ ] All tool cards using new naming
- [ ] No emojis in tool names/titles
- [ ] TypeScript compilation: 0 errors

### Testing Checklist
- [ ] Icons render at various sizes (16px, 24px, 32px)
- [ ] Icons respond to currentColor (theme changes)
- [ ] Icons display correctly on light/dark backgrounds
- [ ] No layout shifts when icons load
- [ ] Accessibility: aria-labels present where needed

---

## PHASE 2: Tool Naming Standardization (Week 1-2)

### Objective
Consolidate and standardize all tool names, removing duplicates and emoji.

### Tasks

#### 2.1 Master Naming Reference
Create standardized names for all tools:

| Tool ID | Old Name | New Name | Component |
|---------|----------|----------|-----------|
| airdrop-compass | Airdrop Compass | Airdrop Scout | AtlasClient |
| strategy-lab | Strategy Lab | Strategy Lab | AtlasClient |
| swap-jupiter | 🔄 Jupiter Swap | Token Swap | JupiterSwapCard |
| wallet-copy | 📋 Copy My Wallet | Wallet Copy | CopyMyWallet |
| fee-saver | ⚡ Fee Saver | Fee Optimizer | FeeSaver |
| market-snapshot | 📊 Market Snapshot | Market Pulse | AtlasClient |
| holder-insights | 👥 Holder Insights | Holder Analytics | AtlasClient |
| mev-scanner | 🔍 MEV Scanner | MEV Detector | MEVScanner |
| portfolio-rebalancer | ⚖️ Portfolio Rebalancer | Portfolio Balancer | PortfolioRebalancer |
| rug-pull-detector | 🚩 Rug Pull Detector | Token Auditor | RugPullDetector |
| transaction-time-machine | ⏱️ Transaction Time Machine | Tx Explorer | TransactionTimeMachine |
| create-dca-bot | 🤖 Create DCA Bot | DCA Scheduler | CreateDCABotModal |

#### 2.2 Update `atlas-tool-manifest.ts`
File: `src/lib/atlas-tool-manifest.ts`

```typescript
// Change tool display names while keeping tool_id stable
{
  "tool_id": "swap_tokens",  // Keep stable for backend
  "display_name": "Token Swap",  // Add new field
  "description": "Swap one cryptocurrency for another using Jupiter Swap.",
  "icon": "IconTokenSwap",  // Reference icon
  // ... rest unchanged
}
```

#### 2.3 Update All Card Headers
Replace all CardTitle instances with new names.

**Priority files:**
1. `src/components/atlas/atlas-client.tsx` (5 instances)
2. `src/components/atlas/JupiterSwapCard.tsx` (1)
3. `src/components/atlas/FeeSaver.tsx` (1)
4. `src/components/atlas/MEVScanner.tsx` (1)
5. `src/components/atlas/PortfolioRebalancer.tsx` (1)
6. `src/components/atlas/RugPullDetector.tsx` (1)
7. `src/components/atlas/TransactionTimeMachine.tsx` (1)
8. `src/components/atlas/CreateDCABotModal.tsx` (1)
9. `src/components/atlas/CopyMyWallet.tsx` (1)

#### 2.4 Update All Modals/Dialogs
Search for and update modal titles:
- `CreateDCABotModal` title
- Any tool selection dropdowns
- Help text and tooltips

#### 2.5 Update Tab Triggers
File: `src/components/atlas/atlas-client.tsx` (~line 1303-1305)

```tsx
// Before
<TabsTrigger value="quests">
  <span className="flex items-center gap-1.5"><GlyphCompass /><span>Quests</span></span>
</TabsTrigger>

// After
<TabsTrigger value="quests">
  <span className="flex items-center gap-1.5"><IconAirDropScout /><span>Quests</span></span>
</TabsTrigger>
```

### Deliverables
- [ ] `atlas-tool-manifest.ts` updated with new names and icon references
- [ ] All card headers use new emoji-free names
- [ ] All icons properly imported in component files
- [ ] Tab and menu items updated
- [ ] TypeScript compilation: 0 errors
- [ ] Visual verification: all names display correctly

---

## PHASE 3: Agentic Capabilities Architecture (Weeks 2-4)

### Objective
Implement autonomous agent system for transaction execution, data lookups, and complex operations.

### 3.1 Core Types & Interfaces

**File**: `src/lib/agents/types.ts`

```typescript
// Execution context shared by all agents
export interface ExecutionContext {
  executionId: string;
  strategy: StrategyType;
  state: ExecutionState;
  userWallet: string;
  approvalRequired: boolean;
  progress: number; // 0-100
  steps: ExecutionStep[];
  errors: AgentError[];
  metadata: Record<string, unknown>;
}

export type ExecutionState = "pending" | "running" | "paused" | "completed" | "failed";

export interface ExecutionStep {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  result?: unknown;
  error?: string;
  timestamp: number;
}

export interface AgentError {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  recoverable: boolean;
  step?: string;
  timestamp: number;
}

// Agent base interface
export interface Agent {
  readonly id: string;
  readonly name: string;
  execute(context: ExecutionContext, input: unknown): Promise<unknown>;
  validate(input: unknown): boolean;
  canHandle(strategy: StrategyType): boolean;
}

export type StrategyType =
  | "swap_tokens"
  | "stake_sol"
  | "rebalance_portfolio"
  | "scan_airdrops"
  | "execute_dca"
  | "analyze_rug_pull"
  | "estimate_mev";
```

### 3.2 Base Agent Class

**File**: `src/lib/agents/base-agent.ts`

```typescript
import type { Agent, ExecutionContext, AgentError } from "./types";

export abstract class BaseAgent implements Agent {
  abstract readonly id: string;
  abstract readonly name: string;

  protected logger = (msg: string, data?: unknown) => {
    console.log(`[${this.name}] ${msg}`, data);
  };

  protected addError(context: ExecutionContext, error: AgentError) {
    context.errors.push(error);
  }

  protected updateProgress(context: ExecutionContext, progress: number) {
    context.progress = Math.min(100, Math.max(0, progress));
  }

  abstract execute(
    context: ExecutionContext,
    input: unknown
  ): Promise<unknown>;

  abstract validate(input: unknown): boolean;

  abstract canHandle(strategy: string): boolean;

  protected async retry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    backoff = 1000
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, backoff * (i + 1)));
      }
    }
    throw new Error("Max retries exceeded");
  }
}
```

### 3.3 Transaction Agent

**File**: `src/lib/agents/transaction-agent.ts`

Handles:
- Transaction simulation (no signers)
- Fee estimation
- Signing via wallet adapter
- Confirmation tracking

### 3.4 Builder Agent

**File**: `src/lib/agents/builder-agent.ts`

Handles:
- Route calculation (Jupiter)
- Instruction assembly
- Multi-leg transaction building
- Tax optimization

### 3.5 Lookup Agent

**File**: `src/lib/agents/lookup-agent.ts`

Handles:
- Token metadata fetching
- Price data aggregation
- Liquidity checking
- Historical data retrieval

### 3.6 Analysis Agent

**File**: `src/lib/agents/analysis-agent.ts`

Handles:
- Rug pull detection
- MEV identification
- Trend analysis
- Risk scoring

### 3.7 Execution Coordinator

**File**: `src/lib/agents/coordinator.ts`

Handles:
- Agent orchestration
- State management
- Error recovery
- Progress tracking
- User approval workflows

### 3.8 API Endpoint

**File**: `src/app/api/agentic/route.ts`

```typescript
export async function POST(req: Request) {
  const { strategy, input, executionId } = await req.json();

  const coordinator = new ExecutionCoordinator();
  const result = await coordinator.execute(strategy, input, executionId);

  return Response.json(result);
}
```

### 3.9 UI Components

**File**: `src/components/agentic/ExecutionMonitor.tsx`
- Real-time progress tracking
- Step-by-step status display
- Error reporting
- Execution controls (pause/resume/cancel)

**File**: `src/components/agentic/ApprovalDialog.tsx`
- Transaction details display
- Fee breakdown
- Approve/Reject buttons
- Remember preference checkbox

**File**: `src/components/agentic/AgentStatusPanel.tsx`
- Current execution status
- Agent activity log
- Performance metrics

### Deliverables (Phase 3)
- [ ] Core types and interfaces defined
- [ ] Base agent class implemented
- [ ] All 5 agent types implemented
- [ ] Coordinator orchestration logic
- [ ] API endpoint for execution
- [ ] UI components for monitoring
- [ ] Error handling and retry logic
- [ ] State persistence (optional)
- [ ] Unit tests for each agent
- [ ] Integration tests for coordinator

---

## PHASE 4: Integration & Testing (Weeks 4-5)

### 4.1 Tool Card Integration

Update each tool card to use agentic execution:

**Pattern:**
```tsx
const handleExecute = async () => {
  const executionId = crypto.randomUUID();
  const result = await fetch("/api/agentic", {
    method: "POST",
    body: JSON.stringify({
      strategy: "swap_tokens",
      input: { from: "SOL", to: "USDC", amount: 1 },
      executionId,
    }),
  });
  
  // Monitor execution via ExecutionMonitor component
  setExecutionId(executionId);
};
```

### 4.2 End-to-End Testing

- [ ] Portfolio Rebalancer → Builder + Transaction agents
- [ ] DCA Scheduler → Builder + Transaction agents (recurring)
- [ ] Token Auditor → Analysis agent
- [ ] Holder Analytics → Lookup agent
- [ ] Token Swap → Builder + Transaction agents

### 4.3 Performance Optimization

- [ ] Agent response times < 2s for lookups
- [ ] Transaction simulation < 5s
- [ ] Execution coordinator handles parallel agents
- [ ] No memory leaks on long-running executions

### 4.4 Documentation

- [ ] Agent API documentation
- [ ] Integration guide for tool developers
- [ ] Error codes and recovery strategies
- [ ] User approval workflow docs

---

## Success Criteria

### Icon System
✅ **Target Metrics:**
- 0 emojis in tool names
- 12 custom semantic icons
- 100% component coverage
- <100ms icon render time
- Accessible (aria-labels)

### Agentic Capabilities
✅ **Target Metrics:**
- >95% transaction success rate
- <5s execution time for most operations
- 90% automatic error recovery
- User approval workflows <3s
- <5% data loss on failures

### Overall Quality
✅ **Target Metrics:**
- TypeScript: 0 compilation errors
- All tools functional
- Responsive design maintained
- No performance regressions
- Full user testing completed

---

## Next Steps

1. **Immediate (This Week)**
   - [x] Create icon components
   - [x] Update atlas-client.tsx with new icons
   - [ ] Update tool card headers
   - [ ] Verify icon rendering in browser

2. **Short Term (Week 2)**
   - [ ] Finalize naming standardization
   - [ ] Update all tool manifest files
   - [ ] Create agent base classes
   - [ ] Start transaction agent

3. **Medium Term (Weeks 3-4)**
   - [ ] Complete all agents
   - [ ] Implement coordinator
   - [ ] Create UI monitoring components
   - [ ] Integration testing

4. **Long Term (Week 5+)**
   - [ ] Performance optimization
   - [ ] Documentation
   - [ ] User testing
   - [ ] Production deployment

---

## Questions & Considerations

1. **Wallet Integration**: Should we support multiple wallet types (Web3.js, NFT, Mobile)?
   - Recommendation: Start with Web3.js/Wallet Adapter, add others later

2. **State Persistence**: Should execution state survive page refreshes?
   - Recommendation: Use localStorage for execution history, IndexedDB for state

3. **Real-time Updates**: How should we handle long-running operations?
   - Recommendation: WebSocket for real-time progress, polling as fallback

4. **Error Analytics**: Should we track agent failures for insights?
   - Recommendation: Send to monitoring service, exclude user wallets for privacy

5. **Approvals**: Should users be able to skip approval for repeated operations?
   - Recommendation: Yes, with opt-in and risk scoring per operation
