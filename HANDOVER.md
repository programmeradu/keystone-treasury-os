# Keystone Project Handover Documentation

## Table of Contents
- [Introduction](#introduction)
- [Project Overview](#project-overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Setup and Running the Project](#setup-and-running-the-project)
- [Development History](#development-history)
- [Current Implementation Details](#current-implementation-details)
- [API Endpoints and Integrations](#api-endpoints-and-integrations)
- [Components and UI](#components-and-ui)
- [Known Limitations and Mocks](#known-limitations-and-mocks)
- [Best Practices and Guidelines](#best-practices-and-guidelines)
- [Next Steps and Roadmap](#next-steps-and-roadmap)
- [Troubleshooting](#troubleshooting)
- [Contact and Further Resources](#contact-and-further-resources)

## Introduction
This document serves as a comprehensive handover guide for the Keystone project, a modern Web3 treasury management application. It covers the project's inception, current state, technical details, and guidance for continuing development. The project has evolved through iterative feature additions, focusing on a natural language interface for complex treasury operations like swaps, bridges, staking, and simulations.

The development was guided by user requests to build an engaging landing page, interactive demos, and specialized tools like the ChainFlow Oracle. All code adheres to Next.js 15 best practices, with a emphasis on server/client component separation, TypeScript safety, and Shadcn/UI for consistent styling.

**Current Date:** September 24, 2025  
**Project Status:** Demo/Prototype stage – Functional frontend with live blockchain API integrations (e.g., RPC, prices, yields). No authentication or database yet; all operations are read-only simulations.

## Project Overview
### What is Keystone?
Keystone is "The Command Layer for Treasury Management" in Web3. It eliminates traditional dashboards by allowing users to manage treasuries via natural language prompts (e.g., "Swap 250k USDC to ETH on the cheapest route"). Key capabilities:
- **Natural Language Processing:** Parses commands into actionable steps (swaps, bridges, staking).
- **Live Data Integration:** Fetches real-time gas prices, token prices, yield opportunities, and route quotes from blockchain APIs.
- **Simulations and Projections:** Visualizes risks, yields, vesting schedules, and costs using charts (Recharts).
- **Security Focus:** Demo-only policy checks, validations, and risk scoring.
- **Target Users:** Web3 treasury managers, DAOs, and operations teams handling multi-chain assets.

### Core Narrative
From the investor pitch: "While competitors build better dashboards, Keystone eliminates them entirely. Transform multi-step operations into declarative prompts – the fusion of power and simplicity."

### High-Level Architecture
- **Frontend:** Next.js App Router with React 19, TypeScript, Tailwind CSS v4, Shadcn/UI components.
- **Backend:** Serverless API routes (`src/app/api/`) proxying external services (e.g., 1inch for swaps, LI.FI for bridges, DefiLlama for yields).
- **Integrations:** Ethereum RPC (via proxy), CoinGecko prices, Puter.js/Pollinations for AI insights (optional, falls back gracefully).
- **Styling:** Custom OKLCH color palette (light/dark modes), no purple tones. Unified 4K realistic background image for immersion.
- **Assets:** AI-generated images/videos via tools (e.g., backgrounds, thumbnails). Icons from Lucide React.
- **No Database/Auth Yet:** All state is client-side or fetched live. Simulations are mock/computed.

## Technology Stack
### Core Frameworks
- **Next.js 15:** App Router, Server Components for data fetching, Turbopack for dev speed.
- **React 19:** Hooks (useState, useEffect, useMemo), Client Components for interactivity.
- **TypeScript 5.6:** Strict typing for props, APIs, and state.

### UI and Styling
- **Shadcn/UI:** Pre-built components (Button, Card, Input, etc.) with Tailwind variants.
- **Tailwind CSS v4:** Utility-first, with custom theme in `globals.css` (OKLCH colors, radius 0.625rem, dark mode via `.dark` class).
- **Recharts:** For charts (LineChart, AreaChart) in simulations.
- **Framer Motion/Lucide React:** Subtle animations/icons (already installed, no reinstall needed).
- **Sonner:** Toast notifications (integrated in layout if needed).

### Dependencies (from package.json)
- **Blockchain/Web3:** Wagmi 2.x, @coinbase/onchainkit, no wallet connect yet.
- **Forms/State:** React Hook Form, @tanstack/react-query (unused so far), Zod for validation.
- **Charts/UI Extras:** Recharts, date-fns, embla-carousel (unused).
- **AI/External:** No heavy deps; APIs handle this.
- **Dev Tools:** ESLint 9, Tailwind 4, PostCSS.

Full package.json dependencies:
```
"dependencies": {
  // Core
  "next": "^15.0.0",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "typescript": "^5.6.3",
  // UI
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.6.0",
  "lucide-react": "^0.512.0",
  "framer-motion": "^11.5.4",
  // Shadcn Components (Radix primitives)
  "@radix-ui/react-*": various versions,
  // Charts
  "recharts": "^3.2.1",
  // Forms
  "react-hook-form": "^7.53.0",
  "@hookform/resolvers": "^3.10.0",
  "zod": "^3.23.8",
  // Web3
  "wagmi": "^2.17.2",
  "@coinbase/onchainkit": "^1.0.3",
  // Utils
  "date-fns": "^4.1.0",
  "sonner": "^1.5.0",
  "next-themes": "^0.4.6"
}
```
Dev deps include ESLint, Tailwind, etc. No npm install needed for lucide/framer – pre-installed.

### Environment Variables
- `.env` (minimal): No secrets yet. APIs are public/proxied.
- For production: Add RPC endpoints if proxying changes.

## Project Structure
Based on `src/` convention (App Router).

### Root Files
- **package.json:** Scripts (`dev`, `build`, `start`), deps.
- **next.config.ts:** Images (remote patterns for any hostname), Turbopack rules for visual edits loader.
- **tsconfig.json:** Standard Next.js TS setup.
- **tailwind.config.ts:** Not shown, but uses Shadcn defaults + custom theme.
- **globals.css:** Tailwind imports, @theme for colors (OKLCH: light bg `oklch(1 0 0)`, dark `oklch(0.145 0 0)`; primary `oklch(0.205 0 0)` light / `oklch(0.922 0 0)` dark). No styled-jsx – Tailwind only. Google Fonts for Material Symbols.
- **.env:** Empty/minimal.
- **README.md:** Basic project info (update this with this doc).
- **HANDOVER.md:** This file.

### src/app/
- **globals.css:** As above.
- **layout.tsx:** Root layout with metadata, ErrorReporter, Scripts (Puter.js SDK, route messenger for iframes), Web3Providers.
- **page.tsx:** Landing page (`/` route) – Hero, features, interactive showcase with command input, TreasurySimulator.
- **oracle/page.tsx:** ChainFlow Oracle page – Advanced simulation tool with toggles, charts, agent tools.
- **global-error.tsx:** Error boundary (basic).

### src/app/api/ (Serverless API Routes)
Proxies external services to avoid CORS/blockchain load:
- **/api/ai/text/route.ts:** AI summarization (Puter.js or Pollinations fallback).
- **/api/bridge/quote/route.ts:** LI.FI bridge quotes.
- **/api/chain/eth/block-number/route.ts:** Ethereum RPC proxy (eth_blockNumber).
- **/api/ens/resolve/route.ts:** ENS name resolution.
- **/api/planner/route.ts:** AI step planning (mock/deduped).
- **/api/price/route.ts:** CoinGecko prices (e.g., ETH/USD).
- **/api/rpc/route.ts:** Generic Ethereum RPC (eth_gasPrice, etc.).
- **/api/swap/quote/route.ts:** 1inch swap quotes.
- **/api/tools/execute/route.ts:** Unified agent tools (gas, yield, bridge, swap).
- **/api/yields/route.ts:** DefiLlama yields by asset/chain.

All routes use async fetch, error handling, and JSON responses.

### src/components/
- **TreasurySimulator.tsx:** Renders charts/simulations based on command (vesting, yield, risk, rebalance). Uses Recharts, parses keywords.
- **LifiRouteCard.tsx:** Unused? (Bridge route display).
- **DynamicExamples.tsx:** Unused.
- **ErrorReporter.tsx:** Logs errors (console + potential Sentry).
- **providers/web3-provider.tsx:** Wagmi setup (Ethereum/Base/Arbitrum/Polygon chains, no connectors yet).

### src/components/ui/
Shadcn primitives (60+ files): Button, Card, Input, Badge, Alert, Switch, DropdownMenu, Charts, etc. All Tailwind-styled.

### src/lib/ and src/hooks/
- Minimal: use-mobile.tsx (media queries).

### src/visual-edits/
- VisualEditsMessenger.tsx: Iframe communication for route changes/debug.

### public/
- No custom assets; all images via URLs (Supabase storage for backgrounds).

### Other
- **postcss.config.mjs:** Tailwind plugin.
- **eslint.config.mjs:** Next.js ESLint.
- No tests (Vitest/Playwright ready).

## Key Features
### 1. Landing Page (`/`)
- **Hero Section:** Tagline, stats (20+ chains, 60+ integrations), CTAs.
- **Features:** Cards for Natural Language Ops, Security, Workflows, Execution.
- **Interactive Showcase:** Command input with AI planner, validations (gas, ENS, routes, yields), policy pass. Integrates TreasurySimulator for visuals.
- **Use Cases/Testimonials/CTA:** Static sections with cards, footer nav.
- **Background:** Unified 4K realistic photo (tech/finance theme, no purple).
- **Accessibility:** ARIA labels, skip links, semantic HTML.

### 2. ChainFlow Oracle (`/oracle`)
- **Advanced Simulator:** Natural language prompts → Simulations (bridge/swap/stake/vest).
- **Toggles:** Simulation mode, Include Yields, Project Vesting, AI Provider (Puter/Pollinations).
- **Agent Tools:** Quick-select (Gas, Yield, Bridge, Swap) with hotkeys (Alt+1-4, Esc clear). Runs via /api/tools/execute.
- **Outputs:** Summary cards, Recharts (yield/vesting projections), Risk breakdown, Live data (gas, prices).
- **Dynamic Examples:** AI-generated on load.

### 3. TreasurySimulator Component
- Parses commands (e.g., "vest 20% over 6 months" → vesting chart).
- Supports: Vesting (linear), Yield (compounding APY), Risk scores, Rebalance (mock costs).
- Mock data generation; ready for real API swaps.

### 4. Live Integrations
- **Blockchain Data:** Real-time via proxies (e.g., eth_gasPrice → USD est using CoinGecko).
- **AI Insights:** Typewriter effect for summaries, markdown-to-HTML.
- **Routes/Yields:** LI.FI (bridges), 1inch (swaps), DefiLlama (yields on Base/Eth/Polygon/Arbitrum).
- **ENS:** Resolves .eth names in prompts.

### 5. UI/UX
- **Responsive:** Mobile nav, grid layouts (sm:grid-cols-2, lg:3/4).
- **Dark/Light Mode:** Via next-themes (class-based).
- **Animations:** Subtle (hover shadows, typewriter, loading spinners). No overkill.
- **Error Handling:** Toasts (Sonner), alerts for failures.
- **Performance:** Server Components for static, client for interactive. No blocking I/O.

## Setup and Running the Project
1. **Prerequisites:**
   - Node.js 20+ (Bun optional for lockfile).
   - Git clone the repo.

2. **Install Dependencies:**
   ```
   npm install
   ```
   (Or `bun install` if using Bun. No extras needed – Wagmi, Recharts, etc., are installed.)

3. **Environment Setup:**
   - Copy `.env.example` to `.env` (if exists; currently minimal).
   - No API keys required – all public endpoints.

4. **Run Development Server:**
   ```
   npm run dev
   ```
   - Opens http://localhost:3000.
   - Turbopack enabled for fast HMR.

5. **Build and Start Production:**
   ```
   npm run build
   npm start
   ```
   - Optimizes images, bundles.

6. **Linting/Type Check:**
   ```
   npm run lint
   ```

7. **Visual Edits/Debug (Iframe Mode):**
   - Scripts enable route messaging for embedded previews.
   - Check console for Puter.js AI logs.

**Notes:** No database setup (Drizzle/Turso unused). For Web3, MetaMask connects via Wagmi (testnet default).

## Development History
Development followed user queries, starting from a blank Next.js + Shadcn setup. Key milestones from conversation history (least recent to most):

1. **Initial Landing Page (Core Build):**
   - Built modern landing with hero, features, use cases, testimonials, CTA.
   - Generated 4K backgrounds (ultra-realistic, wide, no purple).
   - Added unified background, responsive nav, footer.
   - Interactive showcase: Command input with planner, validations (gas, ETH price, ENS, routes, yields).
   - Integrated TreasurySimulator for charts (vesting/yield/risk/rebalance).

2. **API Integrations:**
   - Proxies: RPC (gas/block), prices (CoinGecko), yields (DefiLlama), swaps (1inch), bridges (LI.FI), ENS.
   - AI: /api/ai/text for insights (Puter.js primary, Pollinations fallback).
   - Planner: Dedupes steps, simulates ops.
   - Tools: Unified /api/tools/execute for gas/yield/bridge/swap.

3. **Oracle Page Refinements (`/oracle`):**
   - Added ChainFlow Oracle: Advanced simulations with toggles (yields, vesting).
   - Dynamic AI examples on load.
   - Agent tools tray: Inline with toggles (compact: px-1 py-0.5), hotkeys (Alt+1-4).
   - Charts: Yield projections (AreaChart), vesting timelines (LineChart), risks grid.
   - Layout tweaks: Slim toggles for space, one-line flow (input → tools/toggles → examples).

4. **UI Polish:**
   - Compact components (small sizes, no huge elements).
   - Typewriter AI output, policy pass badges.
   - Error mapping (e.g., LI.FI errors → user-friendly).
   - Accessibility: ARIA, focus rings.

5. **Recent Iterations:**
   - Tool selection: Same line as toggles (tightened padding: gap-0.5, icons h-2.5).
   - Simulations: Parallel fetches (gas + prices), conditional yields/vesting.
   - No auth/payments/database – pure demo.

Total: ~5-10 iterations, focusing on UX flow (input → execute → visualize).

## Current Implementation Details
### Landing Page (`src/app/page.tsx`)
- **Client Component:** "use client" for state/effects (IntersectionObserver for nav highlight).
- **Sections:** Hero (stats), Features (4 cards), Showcase (form + simulator), Use Cases (3 cards), Testimonials (3 quotes), CTA.
- **Showcase Logic:**
  - Input: Command + tool select (gas/yield/bridge/swap) + AI toggle.
  - On submit: Planner steps (deduped), live fetches (block/gas/price/ENS/route/yield), AI insight (typewriter).
  - Outputs: Steps list, validations (progressive reveal), route preview, yields list, policy badge.
- **TreasurySimulator:** Conditional render post-submit; keyword parse → mock charts.
- **Styles:** Backdrop-blur cards, hover transitions, small text (xs/sm).

### Oracle Page (`src/app/oracle/page.tsx`)
- **Client:** Full interactivity (prompt, toggles, tools).
- **Flow:** Prompt → Simulate (parse + live data) or Tool (execute).
- **Toggles:** Simulation/Live, Yields, Vesting, AI Provider switch.
- **Tools:** Buttons with icons, hotkeys; results in card (summary + details + refs).
- **Outputs:** Summary (amount/token/route), Yield Chart (Area), Vesting Chart (Line, if enabled), Risks grid.
- **Dynamic Examples:** AI-generated on mount (3 varied commands).

### API Routes (Examples)
- **/api/rpc (POST):** Ethereum JSON-RPC proxy.
  ```ts
  // In route.ts
  export async function POST(req: Request) {
    const { chain, jsonrpc, method, params, id } = await req.json();
    const res = await fetch(`https://mainnet.infura.io/v3/...`, { // Or public RPC
      method: 'POST', body: JSON.stringify({ jsonrpc, method, params, id })
    });
    return res;
  }
  ```
- **/api/swap/quote (GET):** 1inch API.
  - Params: sellToken, buyToken, sellAmount, chainId.
  - Returns: { data: { toAmount, priceImpact, ... } } or error.
- **Similar for others:** Error handling, caching ("no-store" for live).

### Data Flow
1. User prompt → Client state.
2. Submit → Fetch APIs in parallel (Promise.all).
3. Compute: Projections (e.g., vesting linear, yield compound: `amount * (1 + monthlyRate)**i`).
4. Render: Charts with custom tooltips, safe HTML for AI text.

### Custom Hooks/Utils
- Minimal: IntersectionObserver for sticky nav.
- Sanitize AI: Dedupe paragraphs, markdown to HTML (bold/italic/linebreaks).

## API Endpoints and Integrations
All under `/api/` – Server Actions/Components for security.

### External Services (Proxied)
- **RPC:** Infura/Alchemy (eth_gasPrice, eth_blockNumber).
- **Prices:** CoinGecko (`/simple/price?ids=ethereum&vs_currencies=usd`).
- **Swaps:** 1inch (`/v5.0/1/quote`).
- **Bridges:** LI.FI (`/v1/quote` – fromChain, toChain, fromAmount).
- **Yields:** DefiLlama (`/v1/yields?asset=USDC&chain=base` – top 3 APYs).
- **ENS:** Public resolver (`/resolve?name=example.eth`).
- **AI:** Puter.js (`/api/ai/text`) or Pollinations image gen fallback.

### Error Handling
- Fallbacks: Mock data if API fails (e.g., gas 20gwei, ETH $2500).
- User-Friendly: Map errors (e.g., "Best route temporarily unavailable").

### Testing APIs
- Use `curl` tool (e.g., `curl /api/price?ids=ethereum` → {ethereum: {usd: 2600}}).
- All tested in dev: Parallel fetches ensure speed (<2s).

## Components and UI
- **Shadcn/UI:** All primitives customized (e.g., Button variant="secondary", Card backdrop-blur).
- **Custom:**
  - **TreasurySimulator:** 4 modes (vesting/yield/risk/rebalance) with Recharts.
  - **Header/Nav:** Sticky, active section highlight (IntersectionObserver, rootMargin "-40% 0px -55% 0px").
- **Design System:** From `globals.css` – Semantic tokens (var(--primary)), radius-md (0.5625rem), no huge elements (text-xs/sm, icons h-4).
- **Assets:** 
  - Background: Supabase URL (4K realistic: "ultra-realistic-4k-wide-background-photo-...").
  - Thumbs: Pollinations AI (`/prompt/${prompt}` – e.g., operation storyboard).
  - No videos/icons generated – Lucide only.
- **Responsive:** Mobile: Stacked grids, horizontal scroll nav. Desktop: 6xl max-w, lg:grid-cols-4.

## Known Limitations and Mocks
- **Mocks:**
  - Projections: Simple math (linear vesting, compound yield); no real TVL/IL sim.
  - Policy: Always "PASS" (demo).
  - Steps: Infer from keywords or AI (deduped for brevity).
  - Risks: Random/static (vol 10%, slippage 0.5-2%).
- **No Persist:** Client-only; refresh loses state.
- **No Auth/Wallet:** Read-only; no tx signing (Wagmi ready).
- **AI Variability:** Puter.js may fail → Pollinations image only.
- **Chains:** Ethereum/Base focus; extend params for Polygon/Arbitrum.
- **Edge Cases:** Invalid prompts → Empty/infer steps. No amounts → Default 100.
- **Build Issues:** No styled-jsx (banned). Ensure NEXT_PUBLIC_ for env in client.

## Best Practices and Guidelines
From project principles:
- **Server vs Client:** Server for fetch (page.tsx static parts), Client ("use client") for state/effects.
- **No Browser Built-ins:** No alert/confirm/prompt (use Dialog/Toast). No window.reload/open (router.push).
- **Exports:** Components named (export const), Pages default (export default).
- **Dynamic Routes:** Consistent params (e.g., [id] not [slug]).
- **Styling:** Tailwind only, preserve globals.css directives (@import tailwindcss, @theme, @layer base).
- **Assets:** Reuse existing; generate via tools post-code (e.g., batch generate_image).
- **Errors:** Fix root cause (read files, search). No over-engineering.
- **Todos:** Use todo_write for complex tasks (not here).
- **Database/Auth:** Unused; call use_database_agent/use_auth_agent if adding.
- **Navigation:** Update nav for new pages (e.g., /oracle in header).
- **Preservation:** Keep existing functionality; minimal changes.

**CRITICAL:** Never use styled-jsx (build fail). Tailwind classes only.

## Next Steps and Roadmap
- **Immediate:**
  - Add auth (use_auth_agent: login/register, protect /oracle).
  - Database: Tables for users/treasuries (use_database_agent: schema + CRUD APIs).
  - Real Execution: Wallet connect (Wagmi), sign/relay txs.
- **Features:**
  - Full Planner: LLM chain (parse → plan → validate → execute).
  - Multi-Chain: More RPCs (Optimism, Polygon).
  - Playbooks: Save/reuse commands.
  - Analytics: Track usage (no DB yet).
- **Polish:**
  - Tests: Vitest units, Playwright E2E.
  - SEO: Metadata per page.
  - Payments: Subscriptions (use_payments_agent if monetizing).
- **Deployment:** Vercel (Next.js optimized). Add env for RPC keys.

Explore codebase_search for "how auth works" once added.

## Troubleshooting
- **Build Fail:** Check styled-jsx imports (remove). Turbopack: `next dev --no-turbo` fallback.
- **API Errors:** CORS? Proxy via /api/. Rate limits: Public APIs may throttle.
- **Charts Blank:** Recharts data array empty? Check parseCommand.
- **AI Fails:** Fallback to mocks; Puter.js needs SDK script.
- **Mobile Nav:** Overflow-x-auto for links.
- **Dark Mode:** Toggle via next-themes (class="dark").
- **Web3:** No providers? Add connectors in web3-provider.tsx.

Logs: Console + ErrorReporter.

## Contact and Further Resources
- **Original Developer:** [Your details or repo owner].
- **Repo:** [GitHub link].
- **Design System:** globals.css (colors: --primary oklch(0.205 0 0) light).
- **Docs:** Next.js App Router, Shadcn/UI, Wagmi, 1inch/LI.FI APIs.
- **Community:** Web3 dev forums for RPC tweaks.
- **Questions:** Start with codebase_search/grep_search tools in your env.

This doc is exhaustive – dive into code for specifics. Happy developing!