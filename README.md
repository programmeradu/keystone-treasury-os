# KeyStone: The Command Layer for Web3 Treasury Management

## Venturethon 8 Submission

### 1) The Vision
While competitors build better dashboards, we're eliminating the need for them entirely. KeyStone's Command Layer lets Web3 leaders manage their treasury through natural language, transforming complex, multi-step operations into simple, declarative prompts.

### 2) What We Built (Prototype Suite)
- The Solana Atlas (Live Prototype)
  - A free, public-good dashboard for the Solana ecosystem. It's our acquisition flywheel and includes the Airdrop Compass and a DeFi Strategy Simulator.
  - Live: https://keystone.stauniverse.tech/atlas
- The ChainFlow Oracle (Core Tech Demo)
  - A focused demo of our AI-powered engine, showing how natural language can simulate complex treasury flows.
  - Oracle Link: https://keystone.stauniverse.tech/oracle
- The KeyStone Landing Page
  - The enterprise vision for our core product, targeting DAOs, protocols, and VCs.
  - Website: https://keystone.stauniverse.tech

### 3) Tech Stack
- Frontend: Next.js 15 (App Router), React, TypeScript, Shadcn/UI, Tailwind CSS
- Backend: Next.js API Routes (RSC + edge/server handlers)
- Web3: Ethers.js, viem, @solana/web3.js
- Core APIs: Helius (Solana Infra), Bitquery (Multi-Chain Analytics), Jupiter (Solana Swaps)

### 4) The Pitch
- Pitch Deck:(https://app.foundance.org/projects/12619?cid=20634)
- Video Demo: 

---

## Quickstart (Local Development)

### Prerequisites
- Node.js 18+ (recommend 20+)
- npm (or pnpm/bun)

### Setup
1) Install dependencies
```
npm install
```
2) Copy environment template and fill in keys
```
cp .env.example .env
# edit .env with your keys
```
3) Run the dev server
```
npm run dev
```
- Open http://localhost:3000

### Build & Start
```
npm run build && npm start
```

---

## Environment Variables
Create a `.env` from `.env.example`.

Required/Primary:
- HELIUS_API_KEY=           # Solana infra (transactions, balances, DAS)
- BITQUERY_API_KEY=         # Multi-chain analytics
- NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta  # or devnet

Optional/Feature-gated:
- JUPITER_REFERRAL_ACCOUNT= # If referral routing is enabled for swaps
- MORALIS_API_KEY=          # If Moralis endpoints are used
- ETH_RPC_URL=              # For EVM examples (fallbacks may exist)
- OPENAI_API_KEY=           # If AI routes use OpenAI in your environment
- NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID= # If WalletConnect is used by wallet adapters
- NEXT_PUBLIC_SITE_URL=https://keystone.stauniverse.tech

Notes:
- Atlas runs with degraded functionality if specific provider keys are missing.
- Transactions are always signed client-side; no private keys are stored server-side.

---

## How to Use (Per Prototype)

### Solana Atlas
- Connect wallet → Scan Wallet → Choose task → Execute/Simulate
- Airdrop Compass: Scans for eligible airdrops by wallet activity/signals
- DeFi Strategy Simulator: Explore outcomes and trade-offs before executing
- Supported: Solana wallets (via adapters); Network: mainnet-beta (devnet partially supported)

Tips: In the bottom command bar, try typing: "scan my wallet for airdrops". It will navigate and trigger the Airdrop Compass scan.

### ChainFlow Oracle
- Type a natural language command (e.g., "Rebalance 20% SOL to staked SOL, ladder into a DCA over 7 days").
- Engine returns a plan (steps, costs, routes) → you select & execute.

### Landing Page
- Tailored to DAOs, protocols, VCs. Clear CTAs to request access/contact and explore prototypes.

---

## Architecture Overview
- App Router (Next.js 15):
  - Server Components for static/data fetching, Client Components for interactivity
  - API routes under `src/app/api/*` integrate with Helius, Bitquery, Jupiter, Marinade, and more
- Oracle Command Engine: NLP → plan → step execution (simulation first, then optional execution)
- Security Model: Non-custodial; signing happens client-side via wallet adapters. Server never stores private keys.

---

## Known Limitations
- Prototype scope: Use at your own risk; non-custodial; educational purposes
- Coverage: Limited protocol coverage beyond showcased integrations
- Networks: Primarily Solana mainnet-beta; partial devnet support; limited EVM demos

---

## Roadmap
- Multi-chain expansion (EVM, L2s) and deeper analytics
- More DeFi integrations (lending, perps, structured products)
- Automated policy/threshold controls and approvals
- Role-based permissions, audit logs, and compliance workflows

---

## Submission Checklist
- [ ] Live URLs verified (Atlas, Oracle, Landing)
- [ ] Video demo link added and public
- [ ] Pitch deck link added and public
- [ ] .env.example present and accurate
- [ ] Quickstart works on a clean machine

---

## Team & Contact
- Team: KeyStone
- Contact: founder@stauniverse.tech
- Why us: Deep experience across DeFi infra, risk, and product. We're building the command layer so teams can focus on intent—not interfaces.

---

## Acknowledgments
- Thanks to Helius, Bitquery, Jupiter, Marinade, and the Solana ecosystem for infrastructure and tooling.
