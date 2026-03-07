Top 20 Keystone OS Commands Checklist

Click-Ops is dead. Manual multi-tab fragmentation is a legacy risk vector that Keystone OS eliminates through a deterministic Linguistic Command Layer. This checklist leverages the Federated Agent System — coordinated by the central State Machine — to move intents from PENDING through PLANNING to SIMULATING with mathematical certainty.

> **Legend:** `[x]` = working end-to-end | `[ ]` = stub / mock / not wired | Status notes follow each item.

---

## 1. Treasury Execution & Strategic Operations

These commands utilize the Execution Coordinator to replace imperative clicking with declarative intent.

* [x] **Multi-Step Swap:** "Swap 500 SOL to USDC…" — *Jupiter integration via ExecutionCoordinator.executeSwap with SimulationFirewall pre-flight. Real quotes, risk levels, and approval flow.*
* [x] **Bridge:** "…bridge 50% to Base, and return the remainder to the main treasury vault." — *Bridge tool queries Rango Exchange API with Solana + EVM chain support. Returns real quotes: provider, estimated output, fees, route steps, estimated time.*
* [x] **High-Yield Liquidity Deployment:** "Execute yield-discovery via Knowledge Engine for USDC on Kamino or Meteora…" — *yield_deposit fetches real-time APY/TVL from Kamino and Meteora public APIs. Returns actual vault names, addresses, and live rates.*
* [x] **Mass Dispatch (Payroll):** "Execute a Mass Dispatch to the contributor list…" — *mass_dispatch builds real Solana transactions: SystemProgram.transfer for SOL, createTransferInstruction for SPL tokens. Batches into multiple txs respecting size limits. Returns unsigned base64 transactions for client signing.*
* [x] **Portfolio Rebalancing:** "Maintain a 50/50 SOL-USDC asset split…" — *ExecutionCoordinator.executeRebalance fetches real portfolio via Helius DAS, computes deltas, gets Jupiter quotes, builds serialized swap transactions via Jupiter swap API. Returns unsigned txs for client signing.*
* [x] **Multisig Quorum Execution:** "Initiate a treasury proposal in the War Room…" — *multisig_proposal reads real Squads v4 multisig config via @sqds/multisig SDK: threshold, members, transaction index. Returns live quorum requirements.*

## 2. Generative Foresight & Predictive Analytics

Utilize the "What If" Engine to trigger Generative UI responses that render hypothetical financial futures.

* [x] **Predictive Runway Projection:** "Visualize the treasury Depletion Node…" — *PredictiveRunway.tsx renders depletion chart with real vault data. foresight_simulation tool routes correctly.*
* [x] **Market Shock Simulation:** "Redraw the equity curve to show runway impact if SOL drops 30%…" — *foresight_simulation tool applies real SOL/USDC price shocks to vault token data, computes drawdown and shocked runway. Returns chartType "equity_curve".*
* [x] **Variable Impact Analysis:** "Simulate the impact on the Depletion Node if overhead increases…" — *foresight_simulation computes new burn rate and runway based on newHires and costPerHire variables against real vault balance.*
* [x] **Concentration Risk Assessment:** "Trigger the Risk Radar visualization…" — *RiskRadar.tsx renders radar with live vault data. risk_assessment tool computes real concentration percentages from vaultState.*
* [x] **Yield Performance Forecast:** "Project ending balances and APY for a leveraged staking strategy…" — *foresight_simulation computes compound yield projection with monthly granularity from real vault principal.*

## 3. Zero-Day Protocol Learning & Knowledge Retrieval

Commands for autonomous documentation ingestion via the Knowledge Engine (Tavily, Jina, and Firecrawl).

* [x] **New Protocol Deep-Dive:** "Study the new Meteora dynamic vault documentation…" — *browser_research tool chains Cloudflare scraping + Knowledge Engine. Results stored to Neon Postgres memory.*
* [x] **Solana IDL Extraction:** "Fetch and parse the IDL for the program at [Contract Address]…" — *idl_extraction derives Anchor IDL PDA, fetches account via getAccountInfo, validates header, decompresses zlib payload, and parses full IDL JSON with instruction/account/type counts.*
* [x] **Technical Synthesis:** "Consolidate technical documentation…" — *browser_research handles multi-source aggregation and storage.*
* [x] **On-Chain Sentiment Analysis:** "Fetch the composite health score and 'Whale Flow' metrics…" — *sentiment_analysis uses Solana RPC getSignaturesForAddress + Helius enhanced transaction parsing. Computes compositeScore, whaleFlow, breakdown from real on-chain data.*
* [x] **Protocol SDK Integration:** "Analyze the raw documentation for the provided SDK and prepare a transaction payload…" — *protocol_sdk_analyze fetches SDK docs via Cloudflare browser, extracts on-chain Anchor IDL, matches intent to instructions, and returns structured payload with required accounts and args. Persists analysis to Knowledge Memory.*

## 4. Keystone Studio & IDE Orchestration

Architect Agent commands for the Zero-Build Runtime, utilizing ESM Modules and the JSON-RPC 2.0 Virtual Bridge.

* [x] **Mini-App Project Initialization:** "Initialize a new React-based Mini-App using the Zero-Build Runtime and esm.sh Import Maps…" — *studio_init_miniapp scaffolds multi-file projects (App.tsx + index.html with esm.sh import maps) for react, dashboard, and defi templates. Templates include useVault/useTurnkey SDK hooks.*
* [x] **Architect Self-Correction Loop:** "Analyze Monaco editor diagnostics for App.tsx and apply patches via the Architect Ghost-Cursor." — *ArchitectEngine has 3-attempt correction loop with replace_range patching. Ghost Cursor uses Monaco deltaDecorations API: line-reveal animations with glowing green cursor tracking, auto-scroll to edit position. Matrix Rain canvas overlay during generation.*
* [x] **Security Firewall Simulation:** "Run a Pre-Flight simulation on a mainnet fork…" — *security_firewall tool uses real SimulationFirewall: simulates base64 transactions via connection.simulateTransaction, verifies account existence, computes risk scores from balance changes, and returns state diffs.*
* [x] **Marketplace Publication:** "Bundle the Mini-App code, compute the SHA-256 integrity hash…" — *80/20 revenue split enforced in publish API (creatorShare: 0.8). SHA-256 uses real crypto.createHash("sha256") for integrity hashing.*
* [x] **SDK Hook Implementation:** "Inject @keystone-os/sdk hooks — useVault, useTurnkey, useFetch…" — *sdk_hooks tool generates typed imports. SDK type definitions exist in generated/keystone-sdk-types.ts.*

---

## 5. Implementation Summary Table

| Command Intent | Core Agent/Engine | Status | Blocker |
|---|---|---|---|
| Multi-Step Swap | ExecutionCoordinator | **Working** | — |
| Bridge | Rango Exchange API | **Working** | — |
| Yield Deposit | Kamino/Meteora APIs | **Working** | — |
| Mass Dispatch | @solana/web3.js + spl-token | **Working** | — |
| Portfolio Rebalance | ExecutionCoordinator + Jupiter | **Working** | — |
| Multisig Quorum | @sqds/multisig SDK | **Working** | — |
| Runway Projection | PredictiveRunway.tsx | **Working** | — |
| Market Shock | foresight_simulation | **Working** | — |
| Variable Impact | foresight_simulation | **Working** | — |
| Risk Assessment | RiskRadar.tsx + tool | **Working** | — |
| Yield Forecast | foresight_simulation | **Working** | — |
| Protocol Research | browser_research | **Working** | — |
| IDL Extraction | idl_extraction | **Working** | — |
| Technical Synthesis | browser_research | **Working** | — |
| Sentiment Analysis | sentiment_analysis | **Working** | — |
| Protocol SDK | protocol_sdk_analyze | **Working** | — |
| Mini-App Init | studio_init_miniapp | **Working** | — |
| Self-Correction | ArchitectEngine + Ghost Cursor | **Working** | — |
| Security Firewall | SimulationFirewall | **Working** | — |
| Marketplace Publish | publish API | **Working** | — |
| SDK Hooks | sdk_hooks tool | **Working** | — |

---

## 6. Additional Infrastructure (Beyond Top 20)

| Capability | Status | Notes |
|---|---|---|
| Transfer Tool | **Working** | Builds real SOL/SPL transactions with ATA creation, returns unsigned base64 |
| Stake Tool | **Working** | Marinade SDK direct deposit + Jupiter SOL→LST swap for Jito/BlazeStake |
| DCA Tool | **Working** | Jupiter DCA API integration with quote + order creation |
| Client-Side Signing | **Working** | CommandBar "Approve & Sign" button → wallet.signAllTransactions → sendRawTransaction |
| Navigate Tool | **Working** | Wired to router.push in CommandBar onFinish handler |
| Set Monitor | **Working** | Persists to DB monitors table, fetches current price, evaluation cron at /api/monitors/evaluate |

---

Architect's Note: This checklist is the definitive standard for Keystone OS. All 20 top commands are now working end-to-end. Every command upholds the "Glass Safety Standard" — verify everything, trust nothing. The client-side signing pipeline ensures no blind signing: all transactions are deserialized, presented to the user, and signed only with explicit wallet approval.
