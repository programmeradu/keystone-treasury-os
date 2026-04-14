# [AGENTS.md](http://AGENTS.md)

## Learned User Preferences

- Founder (Samuel Adu) is based in Ghana; payment providers must support Ghana-domiciled sellers — Stripe and Lemon Squeezy are unavailable, Paddle rejected the account; FastSpring is the current active MoR integration
- Prefers API-driven automation over manual dashboard setup (e.g. catalog seed scripts for Paddle and FastSpring rather than dashboard clicks)
- Secrets should go in `.env.local` (gitignored), never committed; rotate any credentials exposed in chat immediately
- Wants billing integration to use both Paddle (fallback/reference) and FastSpring (primary) with the same tier model: Free / Mini ($49/mo) / Max ($199/mo)
- Uses `useEffect` only to interact with external systems (no side-effect-free useEffect)
- Prefers comprehensive strategic documentation in structured Markdown with tables, gap analyses, and phased roadmaps
- Dark-mode-first UI aesthetic: high-contrast void backgrounds, neon accents (keystone-green, aurora-violet, amber, sky), uppercase micro-labels, 10px tracking
- Prioritizes competitive, innovative UI/UX — wants the app to feel state-of-the-art vs 2026 agentic interfaces, not a traditional dashboard
- Wants all-in-one implementation passes — complete full todos end-to-end before stopping
- Wants to be a first mover — invent new protocols/standards others build on (e.g. Treasury MCP Server, Cross-Agent Treasury Protocol), not just integrate existing tools
- REBRAND DECIDED: **Dreyv** (pronounced "DRAVE") — invented word, 5 characters, 1 syllable, evokes drive/momentum/force; zero existing companies/tokens/apps using the name
- Domain status: dreyv.com appears available; dreyv.ai appears available; @dreyv on X not claimed by any active account; no GitHub org named "dreyv" — needs immediate registration
- Previous names rejected: "Keystone" (hardware wallet conflict), "CTRL" (ERP software conflict), "Propel" (blockchain company conflict); all real English words and common invented names were taken by existing businesses
- Naming patterns from unicorns: short names (1-2 words) are 4x more likely to raise VC; sweet spot 4-8 characters; abstract/evocative beats descriptive; must pass "crowded bar test" and telephone test
- Next steps: register dreyv.com and/or dreyv.ai, claim @dreyv on X, create GitHub org, reserve npm scope @dreyv, USPTO trademark search (Class 9 software + Class 36 financial services)
- Parent company is StaUniverse (founded 2025); primary deployment domain is **dreyv.stauniverse.tech** (Vercel); set `NEXT_PUBLIC_APP_URL=https://dreyv.stauniverse.tech` in production for SEO
- Technical SEO: `metadataBase` + OG/Twitter + `app/sitemap.ts` + `app/robots.ts` + `app/manifest.ts` + edge `opengraph-image.tsx`; JSON-LD (`Organization` + `WebSite` + `SoftwareApplication`) via `RootJsonLd`; private routes get `X-Robots-Tag: noindex` in middleware; optional `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` for Search Console
- Analytics: **GTM** (`beforeInteractive` + `noscript`) + **GA4 gtag** (`afterInteractive`) with `NEXT_PUBLIC_GA_MEASUREMENT_ID` (default **`G-FYR5RC3HK9`** for Dreyv); do **not** also fire the same GA4 Measurement ID from GTM or page views double-count
- Wants CEO-level operational rigor: monitoring, tests, documentation, and design partners before scaling features
- Values honest assessments of current product state — prefers C-tier ratings with improvement plans over inflated claims

## Learned Workspace Facts

- Monorepo: root Next.js 15.5 app + `packages/cli` and `packages/sdk` workspaces; React 19, Drizzle ORM, Neon Postgres; **production deployment is Vercel only** (dreyv.stauniverse.tech). Repo still includes optional Cloudflare/OpenNext scripts (`cf:*`, `@opennextjs/cloudflare`) for experiments — not the live host.
- 148 API routes under `src/app/api/`, single schema file at `src/db/schema.ts` with 30+ tables, auth via SIWS JWT + Neon/Better Auth middleware
- Billing stack: Paddle (`src/lib/paddle.ts`, `src/app/api/paddle/`*) kept as reference; FastSpring (`src/lib/fastspring.ts`, `src/app/api/fastspring/*`) is the active MoR; tier stored in `users.tier` column (free/mini/max); catalog seed scripts: `npm run fastspring:seed-catalog`, `npm run paddle:seed-catalog`; env vars in `.env.example`
- Core product modules: Command-Ops (NL interface), Foresight Simulator (what-if engine), Solana Atlas (MEV/rug-pull/DCA), Keystone Studio (browser IDE + AI Architect), Marketplace (80/20 revenue split, Anchor devnet contract), Simulation Firewall, Persistent Knowledge Memory
- Wallet integrations: Solana wallet adapter, EVM via RainbowKit/wagmi, Turnkey embedded wallets; multi-sig via Squads (`@sqds/multisig`)
- Key dependencies: ai SDK (Vercel), @ai-sdk/groq + @ai-sdk/openai, Jupiter (swap/quote/price/trending), Helius (DAS/token-accounts/tx-history), Marinade, Streamflow (payroll — present but unused), Liveblocks (collab); evaluated agentic SDKs: Phantom MCP Server (v1.0.4, 29 tools), Solana Agent Kit by SendAI (60+ actions), elizaOS (17.6k stars, 200+ plugins), Cloudflare Agents SDK (AIChatAgent, scheduling, MCP server)
- Marketing/legal pages: `/pricing` (3-tier cards), `/legal/refunds`, `/legal/privacy`, `/legal/terms`, `/legal/cookies`; site header + footer link both pricing and legal
- Strategic gaps per KEYSTONE-STRATEGIC-FINDINGS.md: no B2C consumer layer, no mobile app (React Native planned), ~83% of 40 required integrations missing, "Shadow Mode" viral feature not built; estimated 30-35% toward global leader status; tokenomics/token launch deliberately deferred; five "invention" opportunities identified (§19): Treasury MCP Server, Agent Commerce for Treasuries, Verifiable Treasury Intelligence, Ambient Treasury OS, Cross-Agent Treasury Protocol
- CommandBar (Command-Ops NL interface): single 2500+ line monolithic `/api/command` route using `useChat` from `@ai-sdk/react` with streaming; primary model Groq llama-3.3-70b, fallback Cloudflare Workers AI; `KeystoneAgentInput` component expects JSON responses but the API returns a stream (out of sync)
- Dashboard (`/dashboard`) is a static CSS grid of widgets (TreasuryChart, YieldOptimizer, AgentCommandCenter, RiskRadar, VaultAssetsCompact, PayrollStreams, DirectiveHub); UI/UX audit (§18) and advanced SDK research (§19) added to KEYSTONE-STRATEGIC-FINDINGS.md; key upgrade targets: LangGraph for graph-based agent orchestration (replace linear streamText), assistant-ui (YC-backed) for composable chat UI, MCP ("USB-C of AI") as tool-integration standard
- Firecrawl CLI installed and authenticated for web research; API key stored in Firecrawl's own config (not `.env.local`)
- Build command: `cross-env NEXT_TELEMETRY_DISABLED=1 NEXT_PRIVATE_BUILD_WORKER_COUNT=1 NODE_OPTIONS=--max-old-space-size=4096 next build`; dev uses `next dev --turbopack`; pre-push hook scans for secrets via `scripts/pre-push-scan.mjs`
- CEO findings document at findings-as-ceo.md covers 14 areas: market sizing, regulatory, security, funding, team, partnerships, infrastructure, developer ecosystem, onboarding/growth, risk, enterprise sales, lessons, improvements, and priority stack
- SDK v0.3.0 audit: C-tier — 14/19 hooks bridge-dependent, useVault returns hardcoded data, verifyZKSP is a stub, useMCPServer not a real MCP server, zero tests; planned v2.0 with KeystoneAgent class + native treasury tools + MCP server
- CLI v1.0.0 audit: C-tier — build copies TSX verbatim (no compile), dev uses mock SDK, generate prompt drifted, deploy has path bug; planned v2.0 with real bundling (esbuild/tsup) + agent scaffold + simulate
- Market sizing: Crypto Treasury Management $1.42B (2024) → $6.03B (2033, 19.7% CAGR); DAO treasuries $32B+; SAM ~$28B in manageable assets; SOM Year 1: $500K-$1.5M ARR
- Regulatory posture: non-custodial = biggest advantage; CLARITY Act carves out DeFi; MiCA enforcing (€540M penalties); needs legal opinion ($30K-$80K) and compliance architecture (KYC/AML, sanctions screening, audit trail)
- Security requirements: smart contract audit before mainnet ($50K-$80K with OtterSec or Neodyme); SOC 2 Type I target within 6 months; bug bounty at mainnet; Year 1 security budget ~$150K-$200K
- Funding strategy: pre-seed target $750K-$1.5M at $5M-$8M; priority = grants first (Solana Foundation, Colosseum) then angels then VCs; AI+Crypto is 2026's hottest narrative
- Key person risk: solo founder is red flag; co-founder/CTO recruitment is urgent
- Partnership priority: Helius (RPC) → Jupiter (swaps) → Phantom (MCP) → Solana Foundation grants
- ZERO developer documentation exists — emergency blocker for marketplace/Agent Store vision
- CEO Priority Stack: Tier 1 (week) = Sentry + Posthog + remove demo data + Helius; Tier 2 (month) = tests + onboarding + docs + CommandBar side-panel redesign + monolith decomposition; Tier 3 (quarter) = legal + audit + co-founder + grants + design partners; Tier 4 (6mo) = SDK v2.0 + Agent Store + SOC 2 + pre-seed raise
- Agent Store replaces Mini-App Store with six categories: Risk & Compliance, Yield & DeFi, Governance, Intelligence, Operations, Cross-Chain; plus usage-based pricing and agent-to-agent hiring via ACP
- Business Lead findings at findings-as-business-lead.md covers 16 areas: pitch strategy, brand identity, jargon-free messaging, social media playbook, content marketing/SEO, community building, PR/media, KOL/influencer, events/conferences, landing page, referral/viral growth, demo/video, email/newsletter, founder story, steal-worthy tactics, and priority stack
- Pitch one-liners defined per audience: universal ("AI that manages your crypto money while you sleep"), investor ("OS for $32B DAO treasury market"), developer ("Build treasury agents, ship to Agent Store"), non-crypto ("smart CFO for internet organizations")
- Brand positioning: "Linear for DeFi" — dark, beautiful, minimal, opinionated; every screenshot should be marketing; void + neon palette is strong; subdomain (keystone.stauniverse.tech) = amateur, needs standalone domain (dreyv.com or dreyv.ai)
- Product naming: Dreyv OS (operating system), Dreyv Agents, Dreyv Studio, Dreyv Atlas, Dreyv Protocol; npm scope: @dreyv/sdk, @dreyv/cli
- Social media priority: X/Twitter #1 (1-3x daily, 7 content pillars: product showcase, educational threads, market commentary, builder updates, ecosystem engagement, founder voice, social proof), Discord #2, YouTube #3, LinkedIn #4
- Community: Discord server structure defined (Welcome, Announcements, General, Support, Developers, Design Partners, Governance); first 100 members from design partners + Solana builder community + personal network
- PR strategy: CoinDesk/The Block for Tier 1; story must matter beyond the product; PR-worthy moments = audit completion, design partner results, Agent Store launch, fundraise, original data reports
- KOL strategy: start nano/micro ($2K-$5K budget month 1-3), scale to macro for Agent Store launch; crypto KOL marketing returns $6.50 per $1 spent
- Events: Solana Breakpoint 2026 (Nov 15-17, London) is home event — must present; apply to speak at Consensus/Breakpoint; hackathon track sponsorship for Agent Store developer recruitment
- Newsletter "The Treasury Brief" on Beehiiv — weekly: 1 stat + 1 insight + 1 build update + 1 ecosystem link
- Business priority Tier 1 (this week): 60-second demo video, X setup, Discord setup, newsletter setup — total cost $0; demo video is single highest-impact asset (landing page + pitch deck + social + PR + onboarding)
- Founder story arc defined: Samuel Adu, Ghana → StaUniverse → "building AI CFO for crypto, from Ghana to the world"; the Africa angle is genuinely compelling and differentiating in 2026
- CTO findings at findings-as-cto.md covers 20 areas: codebase architecture audit (211 components, 148 API routes, 30+ DB tables, 3 test files), tech stack assessment, database/data layer, API monolith decomposition plan, AI/LLM architecture (current linear streamText vs LangGraph-like graph orchestrator), Solana integration maturity, testing strategy, CI/CD blueprint, frontend architecture, auth/security, performance, B2C mobile vision, and 5 first-mover technical blueprints
- Tech stack verdict: Next.js 15.5, React 19, Tailwind 4, Drizzle+Neon, Zustand, shadcn/ui are all 2026-current and strong; architecture is where debt lives
- Critical gap: wallet adapter only has Solflare+Torus — NO Phantom (77% market share), NO Backpack; 5-minute fix
- @solana/web3.js 1.x is OUTDATED — @solana/kit (2.x) is 200ms faster tx confirmation, tree-shakeable (26% smaller bundles), type-safe; migration planned
- SIWS auth has in-memory nonce set that doesn't survive serverless instances — must move to Upstash Redis
- Testing blueprint: Vitest (unit/integration) + Bankrun (Solana programs) + Playwright (E2E) + MSW (API mocking); coverage targets: 30% month 1 → 50% month 3 → 70% month 6
- CI/CD blueprint: GitHub Actions with lint + type-check + test + build + bundle-size check + **Vercel** preview/production deploys
- AI architecture migration: linear streamText (current) → graph-based orchestrator with AgentState, specialist nodes (Treasury/Intelligence/Execution), persistent state, human-in-the-loop, observability
- Treasury MCP Server blueprint: @modelcontextprotocol/sdk + Cloudflare Workers + 10 treasury tools + .well-known/mcp.json discovery; estimated 3-4 weeks to world's first
- Ambient Treasury OS blueprint: KeystoneAmbientAgent extends CF Agent class + Durable Objects + scheduled position monitoring + WebSocket to dashboard + human approval; estimated 5-6 weeks to world's first
- B2C mobile blueprint: React Native + Expo + Expo Router + @solana/kit + Mobile Wallet Adapter (MWA); shared packages/core for business logic; features: Treasury at a Glance, one-tap rebalance, AI push alerts, daily digest, biometric auth
- Technical debt register: 15 items tracked (TD-01 through TD-15), top 3: monolith (CRITICAL), zero tests (CRITICAL), no CI (HIGH)
- CTO critical path: fix foundations month 1 → ship MCP Server + Ambient Agent month 2 → migrate Solana + start mobile month 3; by month 3 have two world-firsts live

