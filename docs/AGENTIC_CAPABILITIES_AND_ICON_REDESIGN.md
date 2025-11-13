# Agentic Capabilities & Icon Redesign Plan

## Phase 1: Agentic Capabilities Architecture

### 1.1 Core Concepts

**Agent System Overview:**
The Atlas needs autonomous agents that can:
- Execute transactions with proper validation and simulation
- Handle wallet interactions (signing, approvals)
- Execute builds and calculations
- Perform lookups and data fetches
- Manage state and error recovery
- Report execution status and results

### 1.2 Agent Types & Responsibilities

#### **Transaction Agent**
- **Purpose**: Execute on-chain transactions with validation
- **Capabilities**:
  - Pre-flight simulation (no signers)
  - Fee estimation and comparison
  - Transaction building and instruction assembly
  - Wallet signing coordination
  - Retry logic with backoff
  - Confirmation tracking (finalized/confirmed)
- **Tools**:
  - `simulateTransaction(instructions[]): SimulationResult`
  - `estimateFees(transaction): FeeEstimate`
  - `signAndSend(transaction): TransactionSignature`
  - `waitForConfirmation(signature): ConfirmationStatus`

#### **Builder Agent**
- **Purpose**: Assemble complex operations from atomic building blocks
- **Capabilities**:
  - Route calculation (Jupiter)
  - Portfolio rebalancing calculations
  - Tax optimization logic
  - Multi-leg transaction assembly
  - DCA schedule building
- **Tools**:
  - `calculateRoute(swap): RouteQuote`
  - `buildSwapInstructions(quote): Instruction[]`
  - `buildRebalanceSequence(allocations): Transaction[]`
  - `optimizeTaxHarvesting(portfolio): Operation[]`

#### **Lookup Agent**
- **Purpose**: Fetch and aggregate data from multiple sources
- **Capabilities**:
  - Token metadata resolution
  - Wallet holdings analysis
  - Price fetching with fallbacks
  - Liquidity depth checking
  - Holder distribution analysis
  - Historical data retrieval
- **Tools**:
  - `resolveTokenMetadata(mint): TokenInfo`
  - `fetchWalletHoldings(wallet): Holdings[]`
  - `fetchTokenPrices(mints[]): Price[]`
  - `fetchLiquidityDepth(mint): LiquidityInfo`
  - `fetchHistoricalData(mint, timeframe): HistoricalData`

#### **Analysis Agent**
- **Purpose**: Perform complex analysis and detection
- **Capabilities**:
  - Rug pull detection and scoring
  - MEV opportunity identification
  - Trend analysis
  - Risk assessment
  - Pattern matching for fraud
- **Tools**:
  - `analyzeTokenSafety(mint): SafetyReport`
  - `detectMEV(transactions[]): MEVOpportunity[]`
  - `analyzeTrends(tokens[]): TrendAnalysis`
  - `assessPortfolioRisk(holdings): RiskReport`

#### **Execution Coordinator**
- **Purpose**: Orchestrate multi-step operations
- **Capabilities**:
  - State machine management
  - Inter-agent communication
  - Error recovery and rollback
  - Progress tracking and reporting
  - User approval workflows
- **Interface**:
  - `executeStrategy(strategy, context): ExecutionResult`
  - `trackProgress(executionId): ProgressUpdate`
  - `pauseExecution(executionId): void`
  - `resumeExecution(executionId): void`

### 1.3 Request-Response Flow

```
User Request (Tool Card/Button)
    ↓
Execution Coordinator [accepts request, creates execution context]
    ↓
Agent Selection [determines which agent(s) needed]
    ↓
Parallel/Sequential Execution [agents work on their tasks]
    ├─ Lookup Agent [fetch data]
    ├─ Builder Agent [prepare operations]
    └─ Analysis Agent [validate safety]
    ↓
Simulation [try without signing]
    ↓
User Approval/Signing [if needed]
    ↓
Transaction Agent [execute on-chain]
    ↓
Confirmation Tracking [wait for finality]
    ↓
Result Reporting [success/failure/errors]
    ↓
UI Update [display results to user]
```

### 1.4 Data Flow Architecture

```
┌─────────────────────────────────────────┐
│     Agent Execution Context             │
│  ┌─────────────────────────────────┐    │
│  │ executionId: UUID               │    │
│  │ strategy: StrategyType           │    │
│  │ state: PENDING|RUNNING|DONE      │    │
│  │ userContext: WalletAddress       │    │
│  │ approvalRequired: boolean        │    │
│  │ progress: 0-100%                 │    │
│  │ steps: ExecutionStep[]           │    │
│  │ errors: AgentError[]             │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘

Each Agent:
  - Runs in isolation
  - Reads from shared context
  - Writes to execution log
  - Reports status via callback
  - Can retry independently
```

### 1.5 Error Handling & Recovery

**Error Categories:**
1. **Validation Errors** (fail fast, user fixes input)
   - Invalid mint address
   - Insufficient balance
   - Missing wallet connection

2. **Network Errors** (retry with backoff)
   - RPC timeout
   - API rate limit
   - Temporary connectivity issue

3. **Simulation Errors** (detailed feedback)
   - Instruction execution failure
   - State inconsistency
   - Program error

4. **Execution Errors** (transaction failed)
   - Dropped transaction
   - Insufficient SOL for fees
   - Wallet rejected signing

**Recovery Strategies:**
- Exponential backoff (3 retries max)
- Fallback RPC endpoints
- Alternative route selection
- Partial execution with reporting
- State rollback on transaction failure

### 1.6 Approval & Signing Workflow

```
Operation Ready for Signing
    ↓
Check if auto-approve allowed [based on risk level]
    ├─ Low Risk (fee checking) → Auto-sign if permitted
    └─ High Risk (large swap) → Require user approval
    ↓
Show Approval Dialog
    ├─ Display: Amount, recipient, fee, slippage
    ├─ Action: Sign or Reject
    └─ Option: Remember for this app
    ↓
Wallet Connection Interaction
    ├─ For Web3.js: SignerWalletAdapter.signAndSendTransaction()
    ├─ For NFT: wallet.sendTransaction()
    └─ For Mobile: deeplink signing
    ↓
Transaction Submitted
    ↓
Confirmation Tracking
    ├─ Quick (confirmed status)
    └─ Final (finalized status)
```

### 1.7 Key Implementation Files Structure

```
src/
  lib/
    agents/
      ├─ types.ts                  [shared types]
      ├─ base-agent.ts             [abstract base class]
      ├─ transaction-agent.ts      [sign & send]
      ├─ builder-agent.ts          [assemble operations]
      ├─ lookup-agent.ts           [fetch data]
      ├─ analysis-agent.ts         [detect/analyze]
      └─ coordinator.ts            [orchestrate]
    agentic/
      ├─ execution-context.ts      [context management]
      ├─ strategy-executor.ts      [run strategies]
      ├─ approval-manager.ts       [signing workflows]
      └─ error-handler.ts          [error recovery]
  app/api/
    agentic/
      ├─ route.ts                  [agent endpoint]
      ├─ execute.ts                [strategy execution]
      ├─ status.ts                 [execution status]
      └─ cancel.ts                 [cancel execution]
  components/
    agentic/
      ├─ ExecutionMonitor.tsx      [track progress]
      ├─ ApprovalDialog.tsx        [signing workflow]
      └─ AgentStatusPanel.tsx      [real-time updates]
```

---

## Phase 2: Icon System Redesign

### 2.1 Design Principles

✅ **Adoption Criteria:**
- **Unique**: Each tool has a distinctive visual identity
- **Semantic**: Icon communicates tool purpose instantly
- **Consistent**: Unified visual language across all tools
- **Scalable**: Works at 16px, 24px, 32px, and larger
- **Memorable**: Users quickly recognize and recall
- **Professional**: No emojis, polished line work

### 2.2 Tool Icon Specifications

**Naming Convention**: `Icon{ToolName}`
**Base Dimensions**: 24x24 viewBox
**Stroke Details**:
- Default stroke width: 1.6-1.8px
- Stroke linecap: round
- Stroke linejoin: round
- Fill: mostly outline (stroke-based)

### 2.3 Icon Designs & Tool Names

#### **Active Tools (Current)**

| Tool | Current Name | New Emoji-Free Name | Icon Concept |
|------|-------------|-------------------|--------------|
| Airdrop Compass | (none - emojis) | Airdrop Scout | Radial target/scanner |
| Strategy Lab | (none) | Strategy Lab | Laboratory flask or prism |
| Copy My Wallet | 📋 | Wallet Copy | Duplicate wallet cards |
| Fee Saver | ⚡ | Fee Optimizer | Currency with down arrow |
| Jupiter Swap | 🔄 | Token Swap | Bidirectional arrows/exchange |
| Market Snapshot | 📊 | Market Pulse | Trending line chart |
| Holder Insights | 👥 | Holder Analytics | Connected nodes/distribution |
| MEV Scanner | 🔍 | MEV Detector | Network/mesh with highlights |
| Portfolio Rebalancer | ⚖️ | Portfolio Balancer | Scale/balance weights |
| Rug Pull Detector | 🚩 | Token Auditor | Shield with checkmark |
| Transaction Time Machine | ⏱️ | Tx Explorer | Timeline/history icon |
| Create DCA Bot | 🤖 | DCA Scheduler | Gear/automation icon |

#### **Icon Specifications**

**1. Airdrop Scout**
```
Concept: Radial scanner with crosshairs
- Outer circle (compass ring)
- Inner circle with target
- 4 directional markers (N/S/E/W indicators)
- Center dot
Purpose: Represents scanning/discovery
```

**2. Strategy Lab**
```
Concept: Laboratory flask with bubbles
- Flask silhouette (erlenmeyer style)
- 3 ascending bubbles inside
- Small beaker in corner for detail
Purpose: Scientific exploration and experimentation
```

**3. Wallet Copy**
```
Concept: Overlapping wallet cards with arrow
- Primary wallet card (solid outline)
- Secondary wallet card (offset, lighter)
- Bidirectional arrows between them
- Copy indicator
Purpose: Duplication/copying action
```

**4. Fee Optimizer**
```
Concept: Currency symbol with downward trend
- Dollar/currency symbol base
- Downward arrow through it
- Small savings indicator (coin)
Purpose: Reducing costs/fees
```

**5. Token Swap**
```
Concept: Bidirectional exchange arrows
- Left arrow: input token direction
- Right arrow: output token direction
- Small tokens on each side (circle/square)
- Exchange zone in middle with "x2" style crossover
Purpose: Token exchange/swapping
```

**6. Market Pulse**
```
Concept: Heartbeat line chart
- Ascending line (trending up)
- Pulse indicator (small dots along line)
- Grid background (subtle)
- Mountain peak overlay
Purpose: Market activity and momentum
```

**7. Holder Analytics**
```
Concept: Connected nodes representing distribution
- Central hub node
- 6-8 peripheral nodes at varying sizes
- Lines connecting all nodes
- Node sizes show distribution concentration
Purpose: Network/distribution visualization
```

**8. MEV Detector**
```
Concept: Spotlight/scan beam highlighting anomaly
- Network grid background
- Spotlight cone
- Highlighted transaction/block
- Alert indicator
Purpose: Detection and anomaly highlighting
```

**9. Portfolio Balancer**
```
Concept: Mechanical scale/balance
- Fulcrum point center
- Left and right pans
- Tokens as weights on each side
- Equilibrium state visual
Purpose: Balance and optimization
```

**10. Token Auditor**
```
Concept: Shield with checkmark and warning elements
- Shield outline (primary shape)
- Checkmark inside (security positive)
- Small warning indicators in corners
- Lock accent
Purpose: Security verification and risk assessment
```

**11. Tx Explorer**
```
Concept: Timeline with transaction blocks
- Vertical or horizontal timeline
- Multiple block nodes along it
- Timestamp markers
- Forward/backward arrows
Purpose: Historical exploration and time-based lookup
```

**12. DCA Scheduler**
```
Concept: Gear with calendar overlay
- Gear/cog base (automation)
- Calendar grid overlay
- Clock hands or time indicator
- Arrows showing recurring pattern
Purpose: Scheduled automation and recurring actions
```

### 2.4 Implementation Strategy

**Step 1: Create Icon Library**
- File: `src/components/ui/icons/` (new directory)
- Structure:
  ```
  icons/
    ├─ index.ts              [export all]
    ├─ icon-base.tsx         [shared props/styles]
    ├─ AirDropScout.tsx      [individual icons]
    ├─ StrategyLab.tsx
    ├─ WalletCopy.tsx
    ├─ FeeOptimizer.tsx
    ├─ TokenSwap.tsx
    ├─ MarketPulse.tsx
    ├─ HolderAnalytics.tsx
    ├─ MEVDetector.tsx
    ├─ PortfolioBalancer.tsx
    ├─ TokenAuditor.tsx
    ├─ TxExplorer.tsx
    └─ DCAScheduler.tsx
  ```

**Step 2: Update Tool Names & Remove Emojis**
- Update `src/lib/atlas-tool-manifest.ts` (tool_id stays same, display name changes)
- Update all card headers in `src/components/atlas/atlas-client.tsx`
- Update all button labels and tab triggers

**Step 3: Replace All Icon Usages**
- Replace `GlyphCompass`, `GlyphLab`, `GlyphMarket` with new icons
- Remove emoji prefixes from CardTitle components
- Update tool selection UI to use new icons

**Step 4: Style Consistency**
- All icons: base 24x24 viewBox
- Responsive sizing via className
- Color inheritance from currentColor
- Support for disabled/inactive states (opacity change)

### 2.5 Icon Code Template

```tsx
export interface IconProps {
  className?: string;
  "aria-label"?: string;
}

export function IconName({ className = "h-4 w-4", "aria-label": label }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-label={label}
      aria-hidden={!label}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* SVG path content */}
    </svg>
  );
}
```

### 2.6 Naming Conventions Updates

**Old → New:**
- Airdrop Compass → Airdrop Scout
- Strategy Lab → Strategy Lab (keep)
- Copy My Wallet → Wallet Copy Tool
- Fee Saver → Fee Optimizer
- Jupiter Swap → Token Swap
- Market Snapshot → Market Pulse
- Holder Insights → Holder Analytics
- MEV Scanner → MEV Detector
- Portfolio Rebalancer → Portfolio Balancer
- Rug Pull Detector → Token Auditor
- Transaction Time Machine → Transaction Explorer
- Create DCA Bot → DCA Scheduler

---

## Phase 3: Integration & Rollout

### 3.1 Integration Checklist

- [ ] Agent system implementation
- [ ] Icon library creation
- [ ] Tool name updates
- [ ] Card header updates
- [ ] Button label updates
- [ ] Tab trigger updates
- [ ] Testing (all tools functional)
- [ ] E2E workflow testing
- [ ] Performance verification
- [ ] Documentation update

### 3.2 Testing Strategy

**Agent Testing:**
1. Unit tests for each agent type
2. Integration tests for coordinator
3. Simulation tests (no real signing)
4. Error recovery tests
5. State management tests

**Icon Testing:**
1. Visual consistency check across sizes
2. Responsive display verification
3. Color/theme compatibility
4. Accessibility (semantic HTML)
5. Performance (no layout shift)

### 3.3 Rollout Timeline

- **Week 1**: Agentic architecture & APIs
- **Week 2**: Agent implementations & error handling
- **Week 3**: Icon design & integration
- **Week 4**: Tool naming updates & UI refresh
- **Week 5**: Testing & refinement
- **Week 6**: Performance optimization & docs

---

## Success Metrics

✅ **Agentic Capabilities:**
- All tools execute autonomously without manual intervention
- Transaction success rate > 95%
- Error recovery automatic in 90% of cases
- User approval workflows < 5 seconds
- No data loss on failures

✅ **Icon & Naming:**
- 100% of tools use custom icons (no emoji)
- All names semantic and memorable
- Consistent visual language across UI
- No naming conflicts or confusion
- Professional appearance

---

## Phase 1 Implementation Priority

### High Priority (Week 1-2)
1. Base agent architecture and types
2. Transaction agent (sign & send, simulation)
3. Execution coordinator
4. Error handling framework

### Medium Priority (Week 2-3)
1. Lookup agent (data fetching)
2. Builder agent (route calculation)
3. Analysis agent (rug pull, MEV)
4. Approval workflows

### Low Priority (Week 3+)
1. Advanced retry strategies
2. Multi-endpoint failover
3. Performance optimizations
4. Monitoring & analytics

---

## Notes

- **Stateless Design**: Agents should be stateless; execution context holds all state
- **Composability**: Agents should compose together for complex operations
- **Transparency**: All agent actions logged for debugging and user trust
- **Safety First**: Simulation before execution for all tx-related operations
- **User Control**: Always give users visibility and control over execution
