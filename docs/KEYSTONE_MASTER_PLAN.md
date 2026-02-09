# Keystone Technical Business Master Plan

**Version 9.0 (The Omniscient Edition)**
**Date:** January 2025
**Status:** Implementation Ready
**Scope:** Exhaustive (Visuals + Logic + "God Mode")

---

# Table of Contents
1. [The Vision: The CLI for the Blockchain](#section-1-vision)
2. [The Architecture: The "Body" and "Brain"](#section-2-architecture)
3. [The Keystone App: The Sovereign Operating System](#section-3-app)
4. [The ChainFlow Oracle: The Data Backbone](#section-4-oracle)
5. [Solana Atlas: The Public Intelligence Layer](#section-5-atlas)
6. [Keystone Studio: The Infinite Canvas](#section-6-studio)
7. [The Hidden API Layer: Infrastructure & Connectivity](#section-7-api)
8. [The AI Learning Loop: Continuous Improvement](#section-8-ai)
9. [Governance & Delegation: The Political Layer](#section-9-gov)
10. [Visual Intelligence: The Dashboard Metrics](#section-10-visual)
11. [The Knowledge Engine: Multi-Vector Research](#section-11-knowledge)
12. [Generative Foresight: The "What If" Engine](#section-12-foresight)
13. [Server-Side Architecture: The Studio Backend](#section-13-server)
14. [The App Catalog: Power Tools](#section-14-catalog)
15. [Operations Command: The Dispatch Core](#section-15-operations)
16. [Market Strategy: The "Trojan Horse" Funnel](#section-16-market)
17. [Roadmap: 2026 and Beyond](#section-17-roadmap)

---

<a name="section-1-vision"></a>
## 1. The Vision: The CLI for the Blockchain

### The "Treasury Nightmare"
The modern decentralized treasury faces a crisis of complexity—a "Death by Fragmentation." Managing a DAO or a fund on Solana today requires a patchwork of disconnected tools:
*   **Execution**: A multisig interface (Squads/Realms) for signing transactions.
*   **Intelligence**: A charting platform (Birdeye/DexScreener) for price action.
*   **Operations**: A yield dashboard (Kamino/Marinade) to check positions.
*   **Coordination**: Discord or Telegram to debate the trade.
*   **Analytics**: Dune Dashboards to track historical performance.

This fragmentation creates **High Operational Risk**:
*   **Context Switching**: Every jump between a tab is a potential error vector. Did you paste the right address? Is this the right window?
*   **Blind Signing**: Users frequently approve hex strings they don't understand because the interface separates the *intelligence* (why we are doing this) from the *execution* (the button we click).
*   **Latency**: Opportunities in MEV or arbitrage are lost in the hours it takes to coordinate a multisig vote across three time zones manually.

### The Keystone Solution
Keystone is not just a dashboard; it is the **Sovereign Operating System** for the on-chain enterprise. It replaces "Click-Ops" with a **Linguistic Command Layer**.

At its heart is the "Command Bar"—effectively a **"CLI for the Blockchain."**
*   **Intent-Driven**: Instead of navigating through five menus to swap tokens, a user simply types: *"Swap 500 SOL to USDC, bridge half to Base, and deposit the rest into Kamino."*
*   **Agentic Execution**: The system parses this natural language into a rigorous, multi-step transaction plan, simulates it for safety, and presents it for a single signature.
*   **High-Density**: The UI mimics a Bloomberg Terminal for Web3—dense, keyboard-driven, and designed for professional speed.

Keystone unifies **Execution**, **Intelligence**, and **Collaboration** into one "Glass" screen.

---

<a name="section-2-architecture"></a>
## 2. The Architecture: The "Body" and "Brain"

Keystone is built on a clear separation of concerns: The "Body" (Infrastructure) handles the heavy lifting of security and execution, while The "Brain" (Agents) handles the logic, planning, and risk assessment.

### The Agent Hierarchy (The Brain)
The intelligence layer is not a single LLM but a **Federated Agent System** coordinated by a central State Machine (`ExecutionCoordinator`). This ensures that complex tasks are broken down into atomic, verifyable steps.

#### Level 1: The Coordinator (`coordinator.ts`)
The "Brain Stem." It is the central state machine.
*   **Responsibility**: Maintains the `ExecutionContext`—a living state object that tracks every step of a request (Status: `PENDING` -> `PLANNING` -> `SIMULATING` -> `EXECUTING`).
*   **Rollback Capability**: If a complex 5-step plan fails at step 3, the Coordinator knows exactly where it stopped and can either retry or rollback. It ensures the system is never left in an undefined state.

#### Level 2: The Universal Operator (The "God Mode" Agent)
Unlike rigid bots, the Keystone Agent is a general-purpose **Universal Operator**.
*   **Zero-Day Protocol Support**: It does not need to be hardcoded for a specific protocol (like Jupiter or Kamino).
*   **The Learning Loop**: If a user commands *"Deposit into the new Meteora dynamic vault"*, and the Agent doesn't know the SDK, it triggers the **Knowledge Engine**. It reads the docs, learns the ABI, constructs the transaction, and executes it.
*   **Omniscience**: It can perform **ANY** action, learn **ANYTHING** from the web, and execute **ANY** command on-chain, provided it passes the security simulation.

#### Level 3: The Executors (Hands)
*   **Transaction Agent** (`transaction-agent.ts`): The "Gatekeeper."
    *   **Simulation-First**: It takes the transaction payload built by the Builder and runs it against the Solana `simulateTransaction` RPC method. If the simulation fails (e.g., insufficient funds, slippage exceeded), the transaction is **rejected** before the user even sees the wallet popup.
    *   **Signing**: It prepares the final `VersionedTransaction` for the user's signature.

### The Security Model (The "Glass" Safety Standard)
Keystone operates on a **"Trust Less, Verify More"** philosophy.
1.  **Pre-Flight Simulation**: Every single action is simulated on a fork of the mainnet state before execution.
2.  **Human-in-the-Loop Thresholds**: The Coordinator implements heuristic checks. For example, any transaction value >10 SOL triggers a mandatory "Approval Required" state, preventing the AI from auto-executing high-value transfers.
3.  **Non-Custodial Sovereignty**: Keystone never touches a private key. All signing happens client-side via standard Solana Wallet Adapters. We provide the brain; the user provides the hand.

---

<a name="section-3-app"></a>
## 3. The Keystone App: The Sovereign Operating System

The Keystone App is the gated, enterprise-grade Command Center. It is where funds, DAOs, and power users live.

### The Team Workspace (`src/app/app/team/page.tsx`)
The multiplayer heart of the OS, powered by **Liveblocks**.
*   **The War Room**: A live governance interface that connects to `useSquadsMultisig`. It visualizes active proposals and allows for "Collaborative Simulation"—where one user simulates a proposal and the result is broadcast instantly to all other online members.
*   **Quorum Core**: A visual reactor core that tracks "Signer Presence." It calculates the percentage of the multisig threshold currently online (e.g., 2/3 signers active = "Ready to Execute") and glows green when the quorum is met.
*   **Active Operatives**: Shows who is online. It also features **"Neural Agent 01"**, an automated auditor bot that monitors the `Tactical Log` for risk signals (currently mocked for UI density but planned for real ingestion).

### The Treasury Hub
The financial core, powered by `VaultContext.tsx`.
*   **Universal Asset Table** (`VaultTable.tsx`): A unified view of all assets—Tokens, LPs, and Yield Positions—normalized into USD. It handles the complexity of merging native SOL with Wrapped SOL and fetching metadata in parallel.
*   **Risk Radar** (`RiskRadar.tsx`): A localized visualization of portfolio health. It tracks:
    *   **Concentration Risk**: Is >50% of the treasury in one asset?
    *   **Multisig Health**: Are we 2/3 or 3/5? Is a signer inactive?
*   **Yield Optimizer**: A dashboard that scans current holdings against market rates (e.g., "You hold 1000 idle SOL; staking with Marinade yields 7.5%").

### Payroll Streams (`PayrollStreams.tsx`)
A visualization engine for mass payouts.
*   **Visual Logic**: Uses SVG Bezier curves to draw dynamic flow lines from the Treasury to individual Payee nodes. The thickness of the line represents the volume of the flow.
*   **Animation**: Dash-offset animations simulate the liquid movement of funds, giving instant visual feedback on "Money Out."
*   **Dispatch Mode** (`OperationsNexus.tsx`): A drag-and-drop zone ("Initiate Dispatch") that accepts JSON/CSV files. It parses airdrop lists and broadcasts the "Simulation Result" to all connected team members via the `OperationsNexus`.

### The Data Nexus
The Compliance & Audit layer.
*   **Immutable Ledger**: A persistent log of every `AGENT_COMMAND` and executed transaction.
*   **Export Command Station**: One-click generation of CSV/PDF reports for tax and audit purposes.

---

<a name="section-4-oracle"></a>
## 4. The ChainFlow Oracle: The Data Backbone

The "ChainFlow Oracle" is the invisible infrastructure layer that powers Keystone. It solves the problem of "API Fatigue" by aggregating multiple fragmented data sources into a single, clean GraphQL/REST interface.

### The Data Sources
1.  **Helius (The Microscope)**:
    *   Used for: Transaction parsing (`/api/helius/das`), NFT metadata, and highly reliable RPC access.
    *   Role: The "Source of Truth" for on-chain state.
2.  **Jupiter (The Ticker)**:
    *   Used for: Real-time Pricing (`/api/jupiter/price`) and Liquidity Routes (`/api/jupiter/quote`).
    *   Role: The market data feed.
3.  **BitQuery (The Stream)**:
    *   Used for: Live OHLCV (Open-High-Low-Close-Volume) candlestick data via Server-Sent Events (SSE).
    *   Role: Powering the live charts in the terminal.
4.  **Moralis (The Graph)**:
    *   Used for: Holder analytics and "Whale Watching" (who holds this token?).

### The Aggregation Logic
The Oracle resides in `src/app/api` and acts as a caching proxy. It normalizes the wildly different response shapes of Helius, Jupiter, and BitQuery into standardized Keystone interfaces (`TokenMetadata`, `PriceFeed`). This isolates the frontend from upstream API changes and rate limits.

---

<a name="section-5-atlas"></a>
## 5. Solana Atlas: The Public Intelligence Layer

Solana Atlas is the "Trojan Horse"—a suite of high-value tools offered (mostly) for free to the public. Its goal is to build brand trust and capture the long tail of users.

### The Tool Suite
*   **Rug Pull Detector**: A forensic tool that scans token contracts. It checks for:
    *   Mint Authority (Can they print more?)
    *   Freeze Authority (Can they stop you selling?)
    *   LP Burn Status (Is liquidity locked?)
*   **MEV Scanner**: A real-time mempool scanner that visualizes sandwich attacks and arbitrage bots operating on a specific pool.
*   **Airdrop Compass**: A "Geolocation-style" discovery tool. It scans a user's wallet history and "Points" them toward unclaimed airdrops or eligible protocols they have interacted with.
*   **Strategy Lab (The Simulation Engine)**:
    *   Allows users to "Test Drive" DeFi.
    *   Logic: The user inputs a scenario ("Stake 1000 SOL"). The `TransactionAgent` runs a simulation in "fork mode" and returns the *projected* outcome (APY, Fees, ending balance) without spending a cent.

---

<a name="section-6-studio"></a>
## 6. Keystone Studio: The Infinite Canvas

Keystone is designed to be the "VS Code" of Web3 execution—a platform where developers can build, verify, and sell "Mini-Apps" that run safely inside the Keystone OS.

### I. The Architecture
The Studio is not just a form builder; it is a full **Integrated Development Environment (IDE)** embedded in the browser.

#### The Code Editor (`CodeEditor.tsx`)
*   **Engine**: Powered by Microsoft's **Monaco Editor** (the core of VS Code).
*   **IntelliSense**: Configured with custom TypeScript definitions (`monaco.languages.typescript.typescriptDefaults`).
*   **Keystone Stubs**: We inject a virtual `keystone.ts` file (`file:///keystone.ts`) into the compiler context. This gives developers auto-complete for proprietary hooks like:
    *   `useVault()`: Access the user's treasury balance.
    *   `useTurnkey()`: Request signatures via the policy engine.
    *   `AppEventBus`: Subscribe to system events.

#### The Live Preview Engine (`LivePreview.tsx`)
This is the crown jewel of the Studio. It allows developers to run their React code *instantly* without a build server.
*   **ESM Sandbox**: The Preview uses an `iframe` with `sandbox="allow-scripts"` to isolate the code.
*   **Babel Transpilation**: We fetch `@babel/standalone` from a CDN to transpile JSX -> JS in real-time within the browser.
*   **Import Maps**: We technically "fake" a module system using HTML5 Import Maps (`<script type="importmap">`). This allows `import React from 'react'` to map dynamically to `https://esm.sh/react`, bypassing the need for `npm install`.

#### The Virtual Bridge (`window.postMessage`)
Because the Mini-App runs in a sandboxed iframe, it cannot access the main window's `window.solana` object directly (security feature).
*   **The Bridge**: `LivePreview` sets up a two-way message bus.
*   **Flow**:
    1.  Mini-App calls `useTurnkey().signTransaction(tx)`.
    2.  Virtual Module posts a message: `{ type: 'TURNKEY_SIGN', tx }`.
    3.  Keystone OS (Parent) receives the message, validates the app's permissions, and prompts the user/wallet to sign.
    4.  Keystone OS posts back: `{ type: 'TURNKEY_SIGN_RESPONSE', signature }`.
    5.  Mini-App resolves the promise.

### II. The Marketplace Model (`PurchaseModal.tsx`)
Keystone is an App Store.
*   **Monetization**: Developers can list their plugins for a fee (USDC).
*   **Revenue Split**: Smart contracts enforce an automatic **80/20 Split** (80% to Developer, 20% to Keystone Protocol).
*   **Verification**: All apps must pass a "Security Scan" (automated static analysis) before being listed.

---

<a name="section-7-api"></a>
## 7. The Hidden API Layer: Infrastructure & Connectivity

Keystone's power lies in its hidden connectivity layer found in `src/app/api`.

### The Bridge (`/api/bridge`)
*   **Function**: Enables cross-chain liquidity movement.
*   **Logic**: Aggregates quotes from providers (Jumper, deBridge) to allow users to move assets from Base/Arbitrum into their Solana Treasury without leaving the dashboard.

### Turnkey Integration (`/api/turnkey`)
*   **Function**: Enterprise-grade Wallet-as-a-Service.
*   **Logic**: Provides programmatic, policy-based signing for institutional clients who need API-driven treasury management (e.g., auto-signing payroll < $5k).

### The Notification System (`/api/alerts`)
*   **Function**: Real-time alerting.
*   **Logic**: A Pub/Sub model (`subscribe`) that listens for on-chain events (Price targets, Liquidation warnings) and pushes them to the user via Webhoosk or Discord (configured via `cron` jobs).

---

<a name="section-8-ai"></a>
## 8. The AI Learning Loop: Continuous Improvement

Keystone gets smarter the more you use it. This logic is encapsulated in `src/app/api/learn`.

### The Feedback Cycle
1.  **Log Input** (`/api/learn/log-input`): Every natural language query ("Swap 5 SOL") is anonymized and logged.
2.  **Suggestion Engine** (`/api/learn/suggestions`): The system analyzes patterns to suggest auto-completions.
3.  **Retraining** (`/api/learn/retrain`): Failed queries (where the user corrected the agent) are flagged as "High Value Samples" for fine-tuning the next routed model.

---

<a name="section-9-gov"></a>
## 9. Governance & Delegation: The Political Layer

Found in `src/app/api/delegation`, this layer transforms Keystone from a financial tool into a political one.
*   **Vote Delegation**: Allows the treasury to delegate its voting power (e.g., JUP, BONK logs) to sub-agents or third-party delegates.
*   **Proposal Watcher**: Scans multiple governance forums (Realms, Snapshot) and aggregates "Actionable Proposals" into the Dashboard feed.

---

<a name="section-10-visual"></a>
## 10. Visual Intelligence: The Dashboard Metrics

The Keystone Dashboard is not just a display; it is a calculation engine (`src/app/app/analytics/page.tsx`).

### Predictive Runway (`PredictiveRunway.tsx`)
*   **The Problem**: Treasuries don't know when they will die.
*   **The Logic**: `generateRunwayData()` takes the current Treasury Balance and projects it forward using `Monthly Burn Rate + (New Hires * $8k) - Revenue Impact`.
*   **Outcome**: A dynamic curve that calculates the exact "Depletion Node" (e.g., "Jun 2027"), allowing DAOs to see the impact of hiring before they sign the contract.

### Keystone Intelligence (`MarketSentiment.tsx`)
*   **Composite Score**: An aggregated health metric (0-100) combining Sentiment, Volatility, and On-Chain Activity.
    *   **Logic**: Currently a simulation shell (`score: 72`, `label: "Greed"`), but structured to ingest RAG data.
    *   **Whale Flow**: Measures "Net Accumulation" to detect if smart money is entering or exiting the treasury's core assets.
*   **Growth Stream**: Visualizes `TreasuryPerformance` over time. It merges real-time `useVault()` data with historical snapshots to create a continuous equity curve.

---

<a name="section-11-knowledge"></a>
## 11. The Knowledge Engine: Multi-Vector Research

Keystone possesses a rigorous "Study" mode found in `src/lib/knowledge.ts`. This allows the agent to perform deep-dive research before executing unknown protocols.

### The Research Pipeline (`KnowledgeBase.study()`)
When a user asks: *"How does Kamino's new vault work?"*, the system triggers a **Multi-Vector Search**.

1.  **Vector 1: Tavily (The Searcher)**
    *   **Logic**: Queries `TavilyClient.search()` with advanced context (`search_depth: "advanced"`).
    *   **Goal**: Find high-authority technical documentation and SDK references.
2.  **Vector 2: Jina (The Reader)**
    *   **Logic**: Passes the top URLs to `JinaClient.readUrl()` to extract clean, LLM-friendly markdown content, stripping away navigation bars and ads.
3.  **Vector 3: Firecrawl (The Scraper)**
    *   **Logic**: Uses `FirecrawlClient` to scrape secondary sources, ensuring redundancy and cross-verification of facts.
4.  **Synthesis**: The `KnowledgeBase` class consolidates these streams into a single `KnowledgeResult` object, which is then fed into the `Context` of the Agent for informed decision making.

---

<a name="section-12-foresight"></a>
## 12. Generative Foresight: The "What If" Engine

Keystone introduces **"Generative UI"**—the ability to render visual answers to natural language questions.

### The "What If" Visualizer
Instead of just parsing text, the agent can manipulate the frontend state to show hypothetical futures.
*   **Input**: *"Show me the runway if we hire 5 engineers and ETH drops 30%."*
*   **Execution**:
    1.  The Agent identifies variables in the query (`hires = 5`, `market_shock = -0.30`).
    2.  It injects these parameters into the `PredictiveRunway` component's state.
    3.  **Visual Output**: The chart *visually* redraws instantly (Generative UI) to show the new "Depletion Node," moving from June 2027 to March 2026.
*   **The Power**: This turns the dashboard into a "flight simulator" for financial decision-making, not just a static report.

---

<a name="section-13-server"></a>
## 13. Server-Side Architecture: The Studio Backend

The Keystone Studio is not just a frontend toy; it is backed by a robust Server Action infrastructure found in `src/actions/studio-actions.ts`.

### Project Persistence (`saveProject`)
*   **Database**: Uses **Drizzle ORM** with a SQLite/Postgres backend.
*   **Schema**: Projects are stored in the `miniApps` table.
*   **Conflict Resolution**: Uses `.onConflictDoUpdate` to handle rapid auto-saves without creating duplicate entries.
*   **Security**: Enforces strict ownership checks (`creatorWallet === userId`) before allowing updates.

### App Distribution (`getInstalledApps`)
*   **Aggregated View**: A complex query that joins `miniApps` (Created by User) with `purchases` (Bought by User).
*   **De-Duplication**: Logic ensures that if a user buys their own app (for testing), it doesn't appear twice.
*   **Sorting**: Returns apps sorted by `updatedAt`, ensuring the most relevant tools appear first in the dock.

---

<a name="section-14-catalog"></a>
## 14. The App Catalog: Power Tools

The Keystone Marketplace is branded as **"Power Tools"**—a curated ecosystem of "audited mini-apps" allowing users to "supercharge treasury operations."

### Marketplace Features
*   **Trust Signals**: Explicit "Audited" badge and "Built by the community, secured by Keystone" guarantee.
*   **Search**: Fully functional filtering ("Search strategies, bots, automation...").
*   **Publishing**: A dedicated `+ PUBLISH APP` flow for developers to onboard new tools.

### Confirmed App Listings
1.  **Solana Token Sniper** ($50 USDC): DeFi automation for raydium launches.
2.  **NFT Portfolio Visualizer** (FREE): 3D gallery for floor price tracking.
3.  **Yield Farming Auto-Compounder** ($100 USDC): Optimizer for Kamino/Meteora.
4.  **DAO Voter Bot** ($10 USDC): Governance automation.

This ecosystem proves the **80/20 Revenue Split** model is live and populated with diverse asset classes (DeFi, NFT, Gov).

---

<a name="section-15-operations"></a>
## 15. Operations Command: The Dispatch Core

The Command Hub is the "Action Layer" (`src/app/app/operations/page.tsx` & `TreasuryRightPanel.tsx`).

### The Vector History
*   **Function**: A persistent sidebar tracking high-level "Vectors" (Bulk Operations).
*   **Data Structure**: Shows operation type (`CONTRIBUTOR_AIRDROP`, `SECURITY_BOUNTY`), volume (`50,000 USDC`), and recipient count (`124`).
*   **Visual Check**: Includes status indicators (Green/Orange) to instantly signal success or pending states.

### Network Throughput
*   **Logic**: A live TPS meter ("2.4K TPS") for the Solana Mainnet.
*   **Purpose**: Advises the user on congestion levels before they initiate a large batch dispatch, potentially saving on failed fees or slippage.

---

<a name="section-16-market"></a>
## 16. Market Strategy: The "Trojan Horse" Funnel

Keystone's business model relies on a specific funnel to convert casual users into enterprise clients.

### Top of Funnel: Public Utility (Solana Atlas)
*   **Audience**: Retail users, degens, small DAO contributors.
*   **Value Prop**: "The best free Rug Checker and MEV Scanner in the ecosystem."
*   **Goal**: Traffic, Brand Authority, and Data Collection (identifying active wallets).

### Mid Funnel: The Operating System (Keystone App)
*   **Audience**: Pro Traders, NFT Projects, Mid-sized DAOs.
*   **Value Prop**: "Stop using 10 different tabs. Manage your Multisig, Yield, and Analytics in one Bloomberg-like terminal."
*   **Monetization**: Freemium (Advanced features gated).

### Bottom of Funnel: Enterprise (The Treasury Hub)
*   **Audience**: VC Funds, Protocol Treasuries, Large DAOs ($10M+ AUM).
*   **Value Prop**: "Sovereignty, Compliance, and Automation."
*   **Features**: Payroll Streams, Data Nexus (Audit), White-glove Squads integration.
*   **Monetization**: SaaS subscription + Volume tiers.

---

<a name="section-17-roadmap"></a>
## 17. Roadmap: 2026 and Beyond

### Q1 2026: "Scale & Secure" (Building the Body)
*   **Theme**: Infrastructure & Trust.
*   **Focus**:
    *   Perfecting the `TransactionAgent` simulation accuracy.
    *   Deepening the Squads v4 integration (Proprietary "Keystone Pro" multisig features).
    *   Mainnet reliability hardening.
*   **Deliverable**: A bulletproof "Bloomberg Terminal" for manual operations.

### Q2 2026: "The Ecosystem" (Studio Launch)
*   **Theme**: Extensibility.
*   **Focus**:
    *   Opening `Keystone Studio` to third-party developers.
    *   Launching the Plugin Marketplace.
    *   Hackathons to populate the store.

### Q3 2026: "The Intelligence Layer" (Awakening the Brain)
*   **Theme**: Automation & Prediction.
*   **Focus**:
    *   **Predictive Runway**: AI agents that forecast cash flow and burn rates based on on-chain history.
    *   **Autonomous Rebalancing**: The "Holy Grail." Agents that don't just *suggest* trades but *execute* them within pre-defined "Guardrails" (e.g., "Keep ETH between 40-60%; if it drops to 39%, buy back up to 45%").
    *   **Mobile Approver**: FaceID signing for on-the-go treasury management.
