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
- Pitch Deck: ADD_LINK_HERE
- Video Demo: ADD_LINK_HERE

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
Create a `.env` from `.env.example`. The template includes all keys referenced across the app. Only populate what you need for your local workflows.

Core keys you’ll likely need for Atlas/Oracle:
- HELIUS_API_KEY — Solana infra (DAS, balances, txns)
- BITQUERY_API_KEY — Multi-chain analytics
- NEXT_PUBLIC_SOLANA_CLUSTER — e.g., mainnet-beta

Other optional keys (enable features if present):
- MORALIS_API_KEY — Solana holders routes
- ZERO_EX_API_KEY — EVM swap quotes
- RANGO_API_KEY — Bridge quotes
- NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID — WalletConnect in client UI
- OPENAI_API_KEY, GROQ_API_KEY, NLPCLOUD_API_KEY — AI routes
- NEXT_PUBLIC_SOLANA_RPC — custom Solana endpoint for client
- NOWNODES_API_KEY, ETH_RPC_URL — EVM RPC examples

Client-exposed variables must start with `NEXT_PUBLIC_`. Server-only secrets must not.

Production hosting (e.g., Netlify): Do not rely on `.env` in the repo. Set the required environment variables in your hosting provider dashboard. This repository’s build is configured to proceed even with ESLint/TS errors for rapid prototyping, but you should still provide API keys so features work at runtime.

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
- [x] Live URLs verified (Atlas, Oracle, Landing)
- [ ] Video demo link added and public
- [ ] Pitch deck link added and public
- [x] .env.example present and accurate
- [x] Quickstart works on a clean machine

---

## Deployment on Netlify

This project is configured to deploy on Netlify with the official Next.js runtime plugin so that App Router API routes under `src/app/api/**` are built as serverless functions.

- `netlify.toml` declares the `@netlify/plugin-nextjs` plugin and Node 20 runtime
- `@netlify/plugin-nextjs` is listed in `package.json`

Note: Do not set a `publish` directory in `netlify.toml` for Next.js sites using the plugin; the plugin manages output and functions mapping.

Environment variables: set server-only keys in Netlify → Site settings → Build & deploy → Environment.

Common vars:
- HELIUS_API_KEY — Solana RPC (used by `/api/solana/rpc` proxy)
- BITQUERY_API_KEY — analytics routes
- MORALIS_API_KEY — holders routes
- NEXT_PUBLIC_* — client-side safe values (e.g., NEXT_PUBLIC_SOLANA_RPC, NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID)

After setting envs, trigger a deploy. Verify these endpoints in production (should not be 404):
- POST `/api/solana/rpc`
- GET `/api/jupiter/price`
- Other routes under `src/app/api/**`

If you still see 404s on `/api/*`, ensure the plugin is installed and `netlify.toml` exists at the repo root.

- Thanks to Helius, Bitquery, Jupiter, Marinade, and the Solana ecosystem for infrastructure and tooling.