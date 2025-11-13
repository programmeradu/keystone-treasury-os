# Visual Architecture Diagrams

## 1. Agentic Execution Flow

### Complete Transaction Lifecycle

```
┌────────────────────────────────────────────────────────────────────────┐
│                          USER INITIATES ACTION                         │
│                       (Clicks Tool Button/Card)                        │
└────────────────────────┬───────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      EXECUTION COORDINATOR                             │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ • Create ExecutionContext (ID, strategy, wallet)              │   │
│  │ • Parse input parameters                                       │   │
│  │ • Determine required agents                                    │   │
│  │ • Initialize progress tracking                                │   │
│  └────────────────────────────────────────────────────────────────┘   │
└────────────────────────┬───────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────┬──────────────┬──────────────┬──────────────┐
│              │              │              │              │
▼              ▼              ▼              ▼              ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Lookup   │ │ Builder  │ │ Analysis │ │ Custom   │ │ Parallel │
│ Agent    │ │ Agent    │ │ Agent    │ │ Logic    │ │ Exec     │
│          │ │          │ │          │ │          │ │          │
│ • Fetch  │ │ • Routes │ │ • Detect │ │ • Compute│ │ (if      │
│   data   │ │ • Build  │ │ • Score  │ │ • Validate
 │ • Prices│ │   instr  │ │ • Risk   │ │ • Format │ │ needed)  │
│ • Balances
 │ • Asm   │ │ • Optimize
 │ • Check │ │          │ │ • Format │ │          │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
     │              │              │              │              │
     └──────────────┴──────────────┴──────────────┴──────────────┘
                         │
                    ┌────▼─────────┐
                    │  AGGREGATION │
                    │ (combine all │
                    │  agent data) │
                    └────┬─────────┘
                         │
                         ▼
         ┌───────────────────────────────────┐
         │  SIMULATION PHASE                 │
         │  ┌─────────────────────────────┐  │
         │  │ • Build tx without signers  │  │
         │  │ • Execute in simulation     │  │
         │  │ • Check result              │  │
         │  │ • Report if failed          │  │
         │  └─────────────────────────────┘  │
         │  Status: Success? Continue ◄──┐   │
         │          Failed?  Error UI   │   │
         └───────────────────────────────┘   │
                         │                   │
                    SUCCESS                  │
                         │                   │
                         ▼                   │
         ┌───────────────────────────────┐   │
         │  APPROVAL PHASE               │   │
         │  ┌─────────────────────────┐  │   │
         │  │ Auto-approve? (low risk)│  │   │
         │  │ YES ────► Skip          │  │   │
         │  │ NO  ────► Show dialog   │  │   │
         │  │           Wait for sign │  │   │
         │  └─────────────────────────┘  │   │
         │  Status: Approved/Rejected    │   │
         └───────────────────────────────┘   │
                         │                   │
                    APPROVED                 │
                         │                   │
                         ▼                   │
         ┌───────────────────────────────┐   │
         │  EXECUTION PHASE              │   │
         │  ┌─────────────────────────┐  │   │
         │  │ • Sign transaction      │  │   │
         │  │ • Send to network       │  │   │
         │  │ • Get signature         │  │   │
         │  │ • Track on-chain        │  │   │
         │  └─────────────────────────┘  │   │
         │  Status: Sent/Confirmed       │   │
         └───────────────────────────────┘   │
                         │                   │
                         ▼                   │
         ┌───────────────────────────────┐   │
         │  CONFIRMATION PHASE           │   │
         │  ┌─────────────────────────┐  │   │
         │  │ • Poll for status       │  │   │
         │  │ • Wait for confirmation │  │   │
         │  │ • Verify finalization   │  │   │
         │  │ • Store result          │  │   │
         │  └─────────────────────────┘  │   │
         │  Status: Confirmed/Finalized  │   │
         └───────────────────────────────┘   │
                         │                   │
                         ▼                   │
         ┌───────────────────────────────┐   │
         │  RESULT REPORTING             │   │
         │  ┌─────────────────────────┐  │   │
         │  │ • Format result data    │  │   │
         │  │ • Create user message   │  │   │
         │  │ • Log execution        │  │   │
         │  │ • Prepare UI display   │  │   │
         │  └─────────────────────────┘  │   │
         │  Status: Success/Error/Partial│   │
         └───────────────────────────────┘   │
                         │                   │
                         ▼                   │
                ┌─────────────────────┐      │
                │   UI DISPLAY        │      │
                │ ┌─────────────────┐ │      │
                │ │ • Show results  │ │      │
                │ │ • Display errors│◄┼──────┘
                │ │ • Update balance│ │
                │ │ • Offer actions │ │
                │ └─────────────────┘ │
                └─────────────────────┘
```

---

## 2. Agent Collaboration Patterns

### Pattern 1: Sequential (Dependencies)

```
Portfolio Rebalance Flow:
┌─────────────────┐
│  Lookup Agent   │
│ • Get holdings  │
│ • Get prices    │
│ • Calc USD vals │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Analysis Agent  │
│ • Risk scoring  │
│ • Current ratio │
│ • Rebalance gap │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Builder Agent   │
│ • Calc routes   │
│ • Build swaps   │
│ • Sequence tx   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Tax Agent*      │
│ • Wash sales    │
│ • Loss harvest  │
│ • Timing opts   │
└────────┬────────┘
         │
         ▼
  READY FOR SIGN
```

### Pattern 2: Parallel (Independent)

```
Token Analysis Flow:
┌──────────────────────────────────────────┐
│ Coordinator sends to 3 agents in parallel │
└──────────────────────────────────────────┘
    │                  │                  │
    ▼                  ▼                  ▼
┌─────────┐      ┌─────────┐      ┌─────────┐
│ Lookup  │      │Analysis │      │ Builder │
│ Agent   │      │ Agent   │      │ Agent   │
│         │      │         │      │         │
│ • Meta  │      │ • Rug   │      │ • Route │
│ • Holders
 │ • MEV  │      │ • Liq   │
│ • Prices
 │ • Supply
 │ • Check │      │ • Risk  │      │         │
└────┬────┘      └────┬────┘      └────┬────┘
     │                │                │
     └────────────────┼────────────────┘
                      │
                      ▼
          AGGREGATED RESULTS
```

### Pattern 3: Conditional (Branch Logic)

```
DCA Execution Flow:

Is it time to execute?
├─ YES → Schedule Agent
│        └─ Get SOL balance
│           ├─ Sufficient? → Builder (create swap)
│           └─ Low? → Error (notify user)
│
└─ NO  → Coordinator (reschedule)
         └─ Wait until next interval
```

---

## 3. State Management Model

```
┌──────────────────────────────────────────────────────────────────┐
│                    EXECUTION CONTEXT                             │
│                    (Single Source of Truth)                      │
├──────────────────────────────────────────────────────────────────┤
│ executionId: UUID                                                │
│ strategy: StrategyType                                           │
│ state: "pending" | "running" | "paused" | "completed" | "failed"│
│ userWallet: string                                               │
│ approvalRequired: boolean                                        │
│ progress: 0-100                                                  │
├──────────────────────────────────────────────────────────────────┤
│ STEPS: ExecutionStep[]                                           │
│ ├─ id: string                                                    │
│ ├─ name: string                                                  │
│ ├─ status: "pending"|"running"|"completed"|"failed"             │
│ ├─ progress: 0-100                                               │
│ ├─ result: unknown (agent output)                                │
│ ├─ error?: string                                                │
│ └─ timestamp: number                                             │
├──────────────────────────────────────────────────────────────────┤
│ ERRORS: AgentError[]                                             │
│ ├─ code: string                                                  │
│ ├─ message: string                                               │
│ ├─ severity: "info"|"warning"|"error"                            │
│ ├─ recoverable: boolean                                          │
│ ├─ step?: string                                                 │
│ └─ timestamp: number                                             │
├──────────────────────────────────────────────────────────────────┤
│ METADATA: Record<string, unknown>                                │
│ └─ Custom data for specific strategies                           │
└──────────────────────────────────────────────────────────────────┘
         ▲                                        │
         │                                        │
    Agents Read                              Agents Write
    (immutable)                              (append steps/errors)
```

---

## 4. Error Recovery Flowchart

```
Error Occurs
    │
    ▼
Is Recoverable?
    │
    ├─ NO → Log Error
    │       └─ Report to UI
    │          └─ Stop execution
    │
    └─ YES → Retry Allowed?
             │
             ├─ NO → Log Error
             │       └─ Report to UI
             │          └─ Stop execution
             │
             └─ YES → Calculate Backoff
                      └─ Wait (1s × retry_count)
                         └─ Retry Operation
                            │
                            ├─ SUCCESS → Continue
                            └─ FAIL → Check retry_count
                                      │
                                      ├─ < 3 → Loop back
                                      └─ ≥ 3 → Fatal error
                                               └─ Report & stop
```

---

## 5. Icon System Organization

### Icon Categories

```
All Icons (12)
│
├─ Data & Analytics (4)
│  ├─ IconMarketPulse       (trend data)
│  ├─ IconHolderAnalytics   (distribution)
│  ├─ IconMEVDetector       (anomalies)
│  └─ IconTokenAuditor      (verification)
│
├─ Operations & Actions (4)
│  ├─ IconTokenSwap         (exchange)
│  ├─ IconFeeOptimizer      (optimization)
│  ├─ IconPortfolioBalancer (rebalancing)
│  └─ IconDCAScheduler      (automation)
│
├─ Discovery & Navigation (2)
│  ├─ IconAirDropScout      (scanning)
│  └─ IconTxExplorer        (historical)
│
├─ Tools & Utilities (2)
│  ├─ IconWalletCopy        (duplication)
│  └─ IconStrategyLab       (experimentation)
│
└─ Special (1)
   └─ IconAtlas             (branding)
```

### Icon Visual Hierarchy

```
DETAIL LEVEL
High    ╱─ MEVDetector, HolderAnalytics (complex patterns)
        │
        ├─ TokenAuditor, PortfolioBalancer (layered)
        │
        ├─ TokenSwap, TxExplorer (moderate)
        │
        ├─ MarketPulse, DCAScheduler (simple + accent)
        │
Low     ╲─ AirDropScout, WalletCopy, FeeOptimizer (minimal)

        Simpler ←──────────→ More Complex
```

---

## 6. Component Integration Map

```
┌──────────────────────────────────────────────────────────────┐
│                    AtlasClient (Main)                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐        ┌──────────────────────┐  │
│  │  Quests Tab          │        │  Lab Tab             │  │
│  ├──────────────────────┤        ├──────────────────────┤  │
│  │                      │        │                      │  │
│  │ ┌──────────────────┐ │        │ ┌──────────────────┐ │  │
│  │ │ AirDrop Scout    │ │        │ │ Strategy Lab    │ │  │
│  │ │ (with icon)      │ │        │ │ (with icon)     │ │  │
│  │ └──────────────────┘ │        │ └──────────────────┘ │  │
│  │                      │        │                      │  │
│  │ ┌──────────────────┐ │        └──────────────────────┘  │
│  │ │ Market Pulse     │ │                                  │
│  │ │ (with icon)      │ │        Advanced Tools:           │
│  │ └──────────────────┘ │        ┌──────────────────────┐  │
│  │                      │        │ • Portfolio Balancer │  │
│  │ ┌──────────────────┐ │        │ • Token Auditor      │  │
│  │ │ Holder Analytics │ │        │ • DCA Scheduler      │  │
│  │ │ (with icon)      │ │        └──────────────────────┘  │
│  │ └──────────────────┘ │                                  │
│  │                      │        Trading:                  │
│  │ ┌──────────────────┐ │        ┌──────────────────────┐  │
│  │ │ MEV Detector     │ │        │ • Token Swap        │  │
│  │ │ (with icon)      │ │        │ • Fee Optimizer     │  │
│  │ └──────────────────┘ │        └──────────────────────┘  │
│  │                      │                                  │
│  │ ┌──────────────────┐ │        Utilities:               │
│  │ │ Speculative Opps │ │        ┌──────────────────────┐  │
│  │ │ (with icon)      │ │        │ • Wallet Copy       │  │
│  │ └──────────────────┘ │        │ • Tx Explorer       │  │
│  │                      │        └──────────────────────┘  │
│  └──────────────────────┘                                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
      ┌──────────┐  ┌──────────┐  ┌──────────┐
      │Agentic   │  │Approval  │  │Execution │
      │Monitor   │  │Dialog    │  │Monitor   │
      │(shows    │  │(user     │  │(tracks   │
      │progress) │  │signs)    │  │status)   │
      └──────────┘  └──────────┘  └──────────┘
```

---

## 7. Data Flow Across Agents

```
Input:
{ wallet: "...", mint: "..." }
        │
        ▼
    ┌─────────────────────┐
    │ LOOKUP AGENT        │
    │ ┌─────────────────┐ │
    │ │ fetch:          │ │
    │ │ • Token metadata│ │
    │ │ • Holdings      │ │
    │ │ • Price (spot)  │ │
    │ └─────────────────┘ │
    │ Output: TokenData   │
    └──────┬──────────────┘
           │
           ▼
    ┌─────────────────────┐
    │ ANALYSIS AGENT      │
    │ ┌─────────────────┐ │
    │ │ analyze:        │ │
    │ │ • Supply check  │ │
    │ │ • Owner status  │ │
    │ │ • Freezable     │ │
    │ │ • Risk score    │ │
    │ └─────────────────┘ │
    │ Output: SafetyScore │
    └──────┬──────────────┘
           │
           ▼
    ┌─────────────────────┐
    │ BUILDER AGENT       │
    │ ┌─────────────────┐ │
    │ │ calculate:      │ │
    │ │ • Market impact │ │
    │ │ • Swap route    │ │
    │ │ • Price impact  │ │
    │ └─────────────────┘ │
    │ Output: TradeRoute  │
    └──────┬──────────────┘
           │
           ▼
    ┌─────────────────────┐
    │ Aggregated Result   │
    │ {                   │
    │   token: {...},     │
    │   safety: {...},    │
    │   route: {...}      │
    │ }                   │
    └─────────────────────┘
```

---

## 8. Approval Workflow States

```
┌─────────────────────────────────────────┐
│  PENDING                                │
│  Operation ready, awaiting approval     │
└──────────────────┬──────────────────────┘
                   │
           ┌───────┴────────┐
           │                │
           ▼                ▼
    ┌────────────┐    ┌────────────┐
    │ AUTO-      │    │ MANUAL     │
    │ APPROVE    │    │ APPROVAL   │
    │ (if allowed)
    │ (low risk) │    │ (high risk)│
    └──┬─────────┘    └──┬─────────┘
       │                 │
       ├─ Approved ◄────┬┴ User clicks OK
       │            (after reading details)
       │
       ├─ Rejected ◄─── User clicks Cancel
       │
       └─ Timeout  ◄─── User ignores
          (auto-reject)

           │
           ▼
    ┌──────────────┐
    │ WALLET       │
    │ INTERACTION  │
    │ (signing)    │
    └──┬───────────┘
       │
       ├─ Signed ─┐
       │          ├─► Send to network
       ├─ Rejected┤
       │          └─► Error UI
       └─ Timeout─┘
```

---

## 9. Complete System Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Tool Cards | Icons | Progress Monitor | Approval Dialog    │ │
│ └─────────────────────────────────────────────────────────────┘ │
└────────────┬────────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────────┐
│                     REACT COMPONENT LAYER                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ AtlasClient | ExecutionMonitor | ApprovalDialog | StatusUI │ │
│ └─────────────────────────────────────────────────────────────┘ │
└────────────┬────────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────────┐
│                      API LAYER (/api/agentic)                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ POST /execute | GET /status | POST /cancel                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
└────────────┬────────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────────┐
│                  AGENT COORDINATION LAYER                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ExecutionCoordinator | StrategyExecutor | ApprovalManager  │ │
│ └─────────────────────────────────────────────────────────────┘ │
└────────────┬────────────────────────────────────────────────────┘
             │
      ┌──────┴──────┬─────────┬─────────┬──────────┐
      │             │         │         │          │
      ▼             ▼         ▼         ▼          ▼
   ┌────┐      ┌────────┐  ┌──────┐  ┌────┐   ┌─────────┐
   │Lookup
   │Transaction
   │Builder│Analysis
   │Custom │
   │(if needed)
   │
   │Agent│ Agent  │  │ Agent │Agent │   │ Logic    │
   └────┘      └────────┘  └──────┘  └────┘   └─────────┘
      │             │         │         │          │
      └──────┬──────┴─────────┴─────────┴──────────┘
             │
┌────────────▼────────────────────────────────────────────────────┐
│                  BLOCKCHAIN SERVICES LAYER                      │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Solana RPC │ Jupiter Routes │ Helius DAS │ External APIs  │ │
│ └─────────────────────────────────────────────────────────────┘ │
└────────────┬────────────────────────────────────────────────────┘
             │
      ┌──────┴──────────┐
      ▼                 ▼
   Solana              External
   Blockchain          Services
   • Mainnet          • CoinGecko
   • Devnet           • Birdeye
   • Testnet          • Magic Eden
                      • etc.
```

---

## 10. Deployment & Feature Rollout

```
Week 1: Icons
├─ Deploy icon components
├─ Feature flag: SHOW_NEW_ICONS=false
└─ Gradual rollout (10% → 50% → 100%)

Week 2-3: Agents
├─ Deploy agent infrastructure
├─ Feature flag: USE_AGENTS=false
├─ Testing in dev environment
└─ Ready for rollout

Week 4: Full Integration
├─ Enable new icons (100%)
├─ Enable agents (10%)
├─ Monitor error rates
└─ Gradual ramp to 100%

Week 5+: Optimization
├─ Performance tuning
├─ Error analytics
├─ User feedback integration
└─ Full production readiness
```

---

## Legend

```
┌─────┐     = Component/Module
│     │
└─────┘

   │     = Data flow direction
   ▼

───┬───  = Decision point
   │

 ( )    = External service
```

---

**Generated**: November 13, 2024
**Status**: Architecture & Planning Complete ✅
**Next Phase**: Implementation (Week 1 starting)
