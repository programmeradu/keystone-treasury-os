# KeyStone: The Command Layer for Web3 Treasury Management

## Venturethon 8 Submission

### 1) The Vision
While competitors build better dashboards, we're eliminating the need for them entirely. KeyStone's Command Layer lets Web3 leaders manage their treasury through natural language, transforming complex, multi-step operations into simple, declarative prompts.

### 2) What We Built (Prototype Suite)
- The Solana Atlas (Live Prototype)
  - A free, public-good dashboard for the Solana ecosystem. It's our acquisition flywheel and includes the Airdrop Compass and a DeFi Strategy Simulator.
  - Live: https://keystone.stauniverse.tech/atlas
  - **NEW Features:**
    - 🎯 Demo Mode - Explore airdrop opportunities without wallet connection
    - 🛡️ Unified Risk Dashboard - Aggregates security signals from multiple sources
    - 💰 Gas & Slippage Warnings - Smart transaction cost estimates
    - 🧠 Enhanced Command Layer - Natural language support for arbitrage, MEV, governance
    - 🔔 Notification Settings - Configurable alerts for opportunities
    - ⭐ Persistent Watchlist - Track favorite tokens across sessions
    - 🔄 Auto-Refresh - Market data updates every 60 seconds
    - ⏰ **Transaction Time Machine** - Historical "what-if" analysis for strategies
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
- HELIUS_API_KEY — Solana infra (DAS, balances, txns). **Recommended**: improves RPC reliability and prevents 403 errors
- BITQUERY_API_KEY — Multi-chain analytics
- NEXT_PUBLIC_SOLANA_CLUSTER — e.g., mainnet-beta

Other optional keys (enable features if present):
- MORALIS_API_KEY — Solana holders routes
- ZERO_EX_API_KEY — EVM swap quotes
- RANGO_API_KEY — Bridge quotes
- NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID — WalletConnect in client UI
- OPENAI_API_KEY, GROQ_API_KEY, NLPCLOUD_API_KEY — AI routes
- NEXT_PUBLIC_SOLANA_RPC — custom Solana endpoint for client (optional; defaults to `/api/solana/rpc` proxy)
- NOWNODES_API_KEY, ETH_RPC_URL — EVM RPC examples

Client-exposed variables must start with `NEXT_PUBLIC_`. Server-only secrets must not.

Production hosting (e.g., Netlify): Do not rely on `.env` in the repo. Set the required environment variables in your hosting provider dashboard. This repository’s build is configured to proceed even with ESLint/TS errors for rapid prototyping, but you should still provide API keys so features work at runtime.

**Note on Solana RPC**: The client automatically uses the `/api/solana/rpc` proxy endpoint to avoid rate limits and 403 errors from public RPC nodes. The proxy uses `HELIUS_API_KEY` if available, otherwise falls back to the public Solana RPC. You can override this by setting `NEXT_PUBLIC_SOLANA_RPC` to a custom authenticated endpoint.

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

### Verifying the RPC Fix

After deploying, verify that the RPC 403 errors are resolved:

```bash
# Test all production endpoints including RPC proxy
npm run test:production https://keystone.stauniverse.tech
```

This will verify:
- API routes are deployed correctly (no 404s)
- Solana RPC proxy is working (no 403s)
- Client will use the proxy instead of public RPC

You can also manually test the RPC proxy:

```bash
curl -X POST https://keystone.stauniverse.tech/api/solana/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```

Expected: 200 status with JSON-RPC response (or 500 if upstream is down, but not 404).

### Testing API Endpoints After Deployment

Use the included test script to verify API endpoints are working:

```bash
# Test local development server
npm run test:api-endpoints

# Test production deployment
npm run test:api-endpoints https://your-site.netlify.app
```

### Deployment Troubleshooting

If API routes return 404 on Netlify:

1. **Check plugin installation**: Ensure `@netlify/plugin-nextjs` is in both `package.json` dependencies and `netlify.toml`
2. **Verify build logs**: Check that API routes are built as serverless functions (look for ƒ symbol in build output)
3. **Environment variables**: Set required API keys in Netlify Site Settings → Environment Variables
4. **No publish directory**: Don't set a `publish` directory in `netlify.toml` - the plugin manages this
5. **No manual redirects**: Avoid manual `/api/*` redirects in `netlify.toml` - the plugin handles routing

### Common Issues

- **500 errors**: Usually missing API keys (expected for external APIs)
- **404 errors**: Configuration issue with netlify.toml or missing plugin
- **Build failures**: Check Node.js version (requires Node 20+)
- **403 RPC errors**: The app uses `/api/solana/rpc` proxy by default to avoid rate limits and auth issues with public Solana RPC endpoints. If you see 403 errors:
  - Ensure `HELIUS_API_KEY` is set in Netlify environment variables (recommended)
  - Or set `NEXT_PUBLIC_SOLANA_RPC` to a custom RPC endpoint with proper authentication
  - The client automatically uses `window.location.origin/api/solana/rpc` instead of calling `https://api.mainnet-beta.solana.com` directly

---

Thanks to Helius, Bitquery, Jupiter, Marinade, and the Solana ecosystem for infrastructure and tooling.