# Keystone Treasury OS - Complete Project Overview

> **The Command Layer for Web3 Treasury Management**

Keystone is a sovereign, agentic operating system designed for modern decentralized treasuries and venture funds. Built for the Solana ecosystem, it transforms blockchain interaction from static dashboards into a high-density, collaborative "Command Center" environment.

---

## 🌐 Live Deployments

| Product | Description | URL |
|---------|-------------|-----|
| **Landing Page** | Enterprise vision for DAOs, protocols, and VCs | [keystone.stauniverse.tech](https://keystone.stauniverse.tech) |
| **Solana Atlas** | Free, public-good intelligence dashboard | [keystone.stauniverse.tech/atlas](https://keystone.stauniverse.tech/atlas) |
| **ChainFlow Oracle** | AI-powered treasury flow simulation | [keystone.stauniverse.tech/oracle](https://keystone.stauniverse.tech/oracle) |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                              │
│   Landing Page │ Treasury Hub │ Solana Atlas │ Keystone Studio       │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│                    LLM PLANNING LAYER                                │
│   Strategy Planner │ Error Explainer │ Analysis Translator           │
│   Providers: Groq (primary) + GitHub Models (fallback)               │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│                 AGENTIC EXECUTION LAYER                              │
│   5 Autonomous Agents │ Execution Coordinator │ Strategy Templates   │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│                    WALLET INTEGRATION                                │
│   Solana Wallet Adapter │ Jupiter DEX │ Transaction Signing          │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────┐
│               BLOCKCHAIN EXECUTION LAYER                             │
│   Solana RPC │ Helius │ Squads Multisig │ Token Programs             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Technology Stack

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.0.0 | App Router, RSC, API routes |
| React | 19.0.0 | UI framework |
| TypeScript | 5.8.3 | Type safety |
| Tailwind CSS | 4.0 | Styling |
| Framer Motion | 11.5.4 | Animations |

### Blockchain & Web3
| Technology | Purpose |
|------------|---------|
| @solana/web3.js | Solana blockchain interaction |
| @solana/wallet-adapter | Multi-wallet support (Phantom, Solflare, etc.) |
| @solana/spl-token | SPL token operations |
| @sqds/multisig | Squads v4 Multisig integration |
| viem + wagmi | EVM chain support |
| @rainbow-me/rainbowkit | EVM wallet connection |
| @coinbase/onchainkit | Coinbase integration |

### Intelligence & APIs
| Service | Purpose |
|---------|---------|
| Helius | Solana RPC, DAS, transaction parsing |
| Bitquery | Multi-chain analytics |
| Jupiter | DEX aggregation, swap routing |
| Marinade | Liquid staking integration |
| Groq + GitHub Models | LLM inference (strategy planning) |
| Turnkey | Secure signing infrastructure |

### Real-Time Collaboration
| Technology | Purpose |
|------------|---------|
| Liveblocks | Multiplayer cursors, presence, collaboration |

### Development Environment
| Technology | Purpose |
|------------|---------|
| Sandpack | In-browser code playground |
| Monaco Editor | Contract/code editing |
| Drizzle ORM | Database interactions |

---

## 🧠 Agent System (Phases 1-5)

### The Five Autonomous Agents

```
src/lib/agents/
├── base-agent.ts              # Abstract base class
├── lookup-agent.ts            # Data fetching & metadata
├── builder-agent.ts           # Transaction construction
├── analysis-agent.ts          # Risk scoring & detection
├── transaction-agent.ts       # Signing & execution
├── enhanced-transaction-agent.ts  # Wallet-integrated execution
├── coordinator.ts             # Orchestration & state
├── YieldEngine.ts             # DeFi yield optimization
└── types.ts                   # Shared interfaces
```

#### 1. Lookup Agent
- Token metadata resolution with fallbacks
- Wallet holdings analysis
- Price aggregation from multiple sources
- Liquidity depth checking

#### 2. Builder Agent
- Jupiter route calculation
- Multi-leg transaction assembly
- Rebalancing sequence construction
- Tax-efficient operation planning

#### 3. Analysis Agent
- Rug pull detection & scoring
- MEV opportunity identification
- Market trend analysis
- Portfolio risk assessment

#### 4. Transaction Agent
- Transaction simulation (no signing)
- Fee estimation
- Signing via wallet adapter
- Confirmation tracking with retry logic

#### 5. Execution Coordinator
- Orchestrates all agent actions
- Manages execution context & state
- Handles error recovery
- Tracks progress reporting

### LLM Integration (Phase 4)

```
src/lib/llm/
├── strategy-planner.ts        # Natural language → execution plans
├── error-explainer.ts         # Technical errors → user language
└── analysis-translator.ts     # Agent results → natural language
```

- **Temperature 0.3** for deterministic planning
- **Multi-provider**: Groq primary, GitHub Models fallback
- **Approval workflow**: LLM plans → User reviews → Deterministic execution

### Wallet Integration (Phase 5)

```
src/lib/wallet/
└── transaction-executor.ts    # Core wallet engine

src/hooks/
└── use-wallet-transaction.ts  # React hook for wallet ops

src/components/
├── WalletSigningDialog.tsx    # Approval dialog UI
└── WalletIntegrationExample.tsx
```

**Capabilities:**
- Real transaction building (swaps, staking, yields, DCA)
- User approval before signing
- Accurate fee estimation via simulation
- Transaction confirmation tracking
- Non-custodial: private keys never exposed to backend

---

## 🏦 Treasury Hub Components

The primary workspace for financial operations:

```
src/components/treasury/
├── VaultAssetsView.tsx        # Dynamic token inventory
├── OperationsNexus.tsx        # Bulk payouts, airdrops
├── StreamingVelocity.tsx      # Payment streams visualization
├── GovernanceOracle.tsx       # Voting & proposal management
├── DataNexus.tsx              # Compliance & audit logs
├── TreasurySidebar.tsx        # Navigation
├── TreasuryRightPanel.tsx     # Context panel
└── VaultSelector.tsx          # Multi-vault support
```

### Dashboard Components

```
src/components/dashboard/
├── KeystoneAgentInput.tsx     # Natural language command interface
├── AgentCommandCenter.tsx     # Agent status & controls
├── DirectiveHub.tsx           # Quick action directives
├── YieldOptimizer.tsx         # DeFi yield strategies
├── RiskRadar.tsx              # Risk monitoring
├── HolographicAssets.tsx      # Visual asset display
├── PayrollStreams.tsx         # Streaming payments
└── VaultAssetsCompact.tsx     # Compact asset view
```

---

## 🛰️ Solana Atlas (Intelligence Layer)

A dedicated forensics and market intelligence dashboard:

```
src/components/atlas/
├── atlas-client.tsx           # Main Atlas application (95KB)
├── JupiterSwapCard.tsx        # Token swap interface
├── MEVScanner.tsx             # MEV detection tool
├── RugPullDetector.tsx        # Token safety analysis
├── PortfolioRebalancer.tsx    # Portfolio optimization
├── CopyMyWallet.tsx           # Wallet cloning tool
├── FeeSaver.tsx               # Fee optimization
├── CreateDCABotModal.tsx      # DCA automation
├── DCABotCard.tsx             # DCA status display
└── TransactionTimeMachine.tsx # Historical analysis
```

### Atlas Tools Inventory

| Tool | Icon | Purpose |
|------|------|---------|
| Airdrop Scout | AirDropScout | Eligible airdrop discovery |
| Strategy Lab | StrategyLab | DeFi strategy simulation |
| Token Swap | TokenSwap | Jupiter DEX integration |
| Market Pulse | MarketPulse | Real-time market snapshot |
| Holder Analytics | HolderAnalytics | Token holder analysis |
| MEV Detector | MEVDetector | Sandwich attack detection |
| Portfolio Balancer | PortfolioBalancer | Allocation rebalancing |
| Token Auditor | TokenAuditor | Rug pull detection |
| Tx Explorer | TxExplorer | Transaction history |
| DCA Scheduler | DCAScheduler | Automated DCA bots |
| Fee Optimizer | FeeOptimizer | Gas optimization |
| Wallet Copy | WalletCopy | Portfolio mirroring |

---

## 🏗️ Keystone Studio (Development Environment)

Low-code, AI-driven development for extending Keystone:

```
src/components/studio/
├── PromptChat.tsx             # AI-powered code generation
├── CodeEditor.tsx             # Monaco-based editor
├── ContractEditor.tsx         # Anchor/Rust programs
├── LivePreview.tsx            # Real-time rendering
├── ProjectBrowser.tsx         # File management
├── MiniAppCard.tsx            # Plugin marketplace
├── WalletManager.tsx          # Wallet configuration
└── PurchaseModal.tsx          # Plugin purchases
```

---

## 🔌 API Routes (36 Categories)

```
src/app/api/
├── agent/                # Agent execution endpoints
├── agentic/              # Agentic strategy execution
│   ├── execute-with-wallet/
│   └── ...
├── ai/                   # AI/LLM endpoints
├── airdrops/             # Airdrop scanning
├── alerts/               # Price/event alerts
├── analytics/            # Portfolio analytics
├── bitquery/             # Multi-chain data
├── bridge/               # Cross-chain bridges
├── chain/                # Chain info
├── delegation/           # Squads delegation
├── defillama/            # DeFi TVL data
├── ens/                  # ENS resolution
├── execute/              # Transaction execution
├── gas/                  # Gas estimation
├── github/               # GitHub integration
├── helius/               # Helius API proxy
├── jupiter/              # Jupiter DEX
│   ├── price/
│   ├── quote/
│   ├── swap/
│   └── ...
├── learn/                # Educational content
├── marinade/             # Liquid staking
├── moralis/              # Solana data
├── planner/              # Strategy planning
├── price/                # Token prices
├── quotes/               # Swap quotes
├── rpc/                  # RPC proxy
├── runs/                 # Execution history
├── simulate/             # Transaction simulation
├── solana/               # Solana utilities
├── studio/               # Studio endpoints
├── swap/                 # Swap execution
├── tools/                # Tool registry
├── turnkey/              # Turnkey signing
└── yields/               # Yield opportunities
```

---

## 🎨 UI Component Library

57 reusable UI components based on Radix UI + shadcn/ui:

```
src/components/ui/
├── accordion.tsx
├── alert-dialog.tsx
├── avatar.tsx
├── badge.tsx
├── button.tsx
├── calendar.tsx
├── card.tsx
├── carousel.tsx
├── chart.tsx
├── checkbox.tsx
├── command.tsx
├── dialog.tsx
├── drawer.tsx
├── dropdown-menu.tsx
├── form.tsx
├── input.tsx
├── navigation-menu.tsx
├── popover.tsx
├── progress.tsx
├── scroll-area.tsx
├── select.tsx
├── sheet.tsx
├── sidebar.tsx
├── slider.tsx
├── switch.tsx
├── table.tsx
├── tabs.tsx
├── textarea.tsx
├── toggle.tsx
├── tooltip.tsx
└── icons/               # 12 custom semantic icons
```

### Custom Icon System

12 professional SVG icons replacing emoji:

| Icon | Component | Usage |
|------|-----------|-------|
| AirDropScout | Radial scanner | Airdrop discovery |
| StrategyLab | Flask | DeFi simulation |
| TokenSwap | Bidirectional arrows | Swaps |
| MarketPulse | Trend line | Market data |
| HolderAnalytics | Network nodes | Holder analysis |
| MEVDetector | Grid spotlight | MEV scanning |
| PortfolioBalancer | Balance scale | Rebalancing |
| TokenAuditor | Shield checkmark | Rug detection |
| TxExplorer | Timeline blocks | Tx history |
| DCAScheduler | Gear calendar | DCA bots |
| FeeOptimizer | Currency arrow | Fee saving |
| WalletCopy | Overlapping wallets | Cloning |

---

## 📊 Development Statistics

### Codebase Size
| Metric | Count |
|--------|-------|
| Total Source Files | ~298 |
| Components | 134 |
| API Routes | 74 endpoints |
| Agent Modules | 11 |
| UI Components | 63 |
| Documentation Files | 40+ |

### Phase Completion
| Phase | Focus | Status | LOC |
|-------|-------|--------|-----|
| 1 | Core Agent System | ✅ Complete | 1,815 |
| 2 | Monitoring & History | ✅ Complete | 1,530 |
| 3 | Templates & Notifications | ✅ Complete | 3,145 |
| 4 | LLM Integration | ✅ Complete | 875 |
| 5 | Wallet Integration | ✅ Complete | 1,510 |
| **Total** | **Full System** | **5/5 Complete** | **~8,875** |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ (required)
- npm, pnpm, or bun

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Run development server
npm run dev

# Open http://localhost:3000
```

### Essential Environment Variables

```env
# Solana Infrastructure (recommended)
HELIUS_API_KEY=your_helius_key
NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta

# Analytics
BITQUERY_API_KEY=your_bitquery_key

# AI (for LLM features)
GROQ_API_KEY=your_groq_key

# Wallet Connect (for EVM)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

---

## 📁 Project Structure

```
keystone-treasury-os/
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── api/           # API routes (36 categories)
│   │   ├── app/           # Main application pages
│   │   ├── atlas/         # Solana Atlas pages
│   │   ├── oracle/        # ChainFlow Oracle
│   │   └── ...
│   ├── components/        # React components
│   │   ├── atlas/         # Atlas tools (10 components)
│   │   ├── dashboard/     # Dashboard widgets (8)
│   │   ├── treasury/      # Treasury views (8)
│   │   ├── studio/        # Studio tools (8)
│   │   ├── ui/            # UI primitives (63)
│   │   └── ...
│   ├── lib/               # Core libraries
│   │   ├── agents/        # Agent system (11 files)
│   │   ├── llm/           # LLM integration (4 files)
│   │   ├── wallet/        # Wallet executor
│   │   └── ...
│   ├── hooks/             # React hooks
│   ├── types/             # TypeScript definitions
│   └── db/                # Database schemas
├── docs/                  # Documentation (40 files)
├── scripts/               # Build & test scripts (18)
├── public/                # Static assets
└── package.json
```

---

## 🔐 Security Model

- **Non-Custodial**: Private keys never stored server-side
- **Client-Side Signing**: All signatures via wallet adapters
- **Transaction Simulation**: All operations simulated before execution
- **User Approval**: Explicit approval required for financial operations
- **Squads Integration**: Multisig support for team treasuries

---

## 📚 Key Documentation

| Document | Purpose |
|----------|---------|
| [KEYSTONE_SYSTEM_MASTER_SPEC.md](./KEYSTONE_SYSTEM_MASTER_SPEC.md) | Core architecture & vision |
| [AGENT_SYSTEM_GUIDE.md](./AGENT_SYSTEM_GUIDE.md) | Agent implementation details |
| [WALLET_INTEGRATION_GUIDE.md](./WALLET_INTEGRATION_GUIDE.md) | Wallet connection guide |
| [PHASE_4_LLM_INTEGRATION.md](./PHASE_4_LLM_INTEGRATION.md) | LLM planning layer |
| [PHASE_5_COMPLETION_REPORT.md](./PHASE_5_COMPLETION_REPORT.md) | Wallet integration completion |
| [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) | Development timeline |

---

## 🎯 Vision

> **Keystone is not just a tool; it is the CLI for the Blockchain.**

Designed to be the single entry point for any serious enterprise or DAO operating on Solana, Keystone transforms complex multi-step treasury operations into simple, natural language commands executed by autonomous agents.

---

## 🏆 Venturethon 8 Submission

This project was built for **Venturethon 8**, demonstrating:

1. **Natural Language Treasury Management** - Describe goals, let AI plan execution
2. **Agent-Based Architecture** - Autonomous, composable, reliable
3. **Production-Grade Infrastructure** - Non-custodial, simulated, approved
4. **Enterprise Aesthetics** - Bloomberg-terminal inspired high-density UI

---

*Built with ❤️ by the stauniverse team*
