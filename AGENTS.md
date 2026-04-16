# [AGENTS.md](http://AGENTS.md)

## Learned User Preferences

- Founder (Samuel Adu) is based in Ghana; payment providers must support Ghana-domiciled sellers — Stripe and Lemon Squeezy are unavailable, Paddle rejected the account; FastSpring is the current active MoR; prefers API-driven automation (e.g. catalog seed scripts) over manual dashboard setup
- Secrets belong in `.env.local` (gitignored), never committed; rotate any credentials exposed in chat immediately
- Billing: use Paddle (fallback/reference) and FastSpring (primary) with the same tier model — Free / Mini ($49/mo) / Max ($199/mo)
- React: use `useEffect` only to interact with external systems (no side-effect-free `useEffect`)
- Documentation: prefers comprehensive strategic Markdown with tables, gap analyses, and phased roadmaps
- Public marketing (home; `/auth` should match) targets Stitch-inspired premium light, purple-forward UI — Manrope, violet tokens, flat primary CTAs, light shells (not a pixel copy of Stitch); `/auth` still largely legacy dark/emerald pending restyle
- Product UX: competitive, innovative, state-of-the-art vs 2026 agentic interfaces — not a traditional dashboard; wants all-in-one implementation passes (complete full todos end-to-end)
- Strategy: wants to be a first mover — invent new protocols/standards others build on (e.g. Treasury MCP Server, Cross-Agent Treasury Protocol), not only integrate existing tools
- Brand: **Dreyv** (pronounced "DRAVE"); **domains owned (org):** dreyv.app, dreyv.finance, and dreyv.com — acquired; previous names rejected — Keystone (hardware wallet), CTRL (ERP), Propel (blockchain company); other registrations (e.g. dreyv.ai, @dreyv, GitHub org, npm `@dreyv`, trademark) still tracked as needed
- Org/deploy + technical SEO: parent StaUniverse (founded 2025); primary production deployment **https://dreyv.stauniverse.tech** (Vercel); set `NEXT_PUBLIC_APP_URL` for SEO; `metadataBase` + OG/Twitter + `app/sitemap.ts` + `app/robots.ts` + `app/manifest.ts` + edge `opengraph-image.tsx`; JSON-LD (`Organization` + `WebSite` + `SoftwareApplication`) via `RootJsonLd`; private routes get `X-Robots-Tag: noindex` in middleware; optional `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
- Analytics: **GTM** (`beforeInteractive` + `noscript`) + **GA4 gtag** (`afterInteractive`) with `NEXT_PUBLIC_GA_MEASUREMENT_ID` (default **G-FYR5RC3HK9** for Dreyv); do **not** also fire the same GA4 Measurement ID from GTM or page views double-count
- Operations: wants CEO-level rigor (monitoring, tests, documentation, design partners before scaling); values honest product assessments with improvement plans over inflated claims

## Learned Workspace Facts

- Monorepo + runtime SEO: root Next.js 15.5 app + `packages/cli` and `packages/sdk`; React 19, Drizzle ORM, Neon Postgres; **production hosting is Vercel only** (e.g. dreyv.stauniverse.tech); **Vercel Analytics** / **Speed Insights** in root layout; Netlify/Cloudflare Workers deploy artifacts and `wrangler.toml` removed; root `layout.tsx` uses `getSiteUrl()` at module scope — `src/lib/seo/site.ts` resolves `NEXT_PUBLIC_APP_URL` / `VERCEL_URL` and malformed env can 500 the site; `/auth` is public in `src/middleware.ts`
- Scale: ~148 API routes under `src/app/api/`, central schema `src/db/schema.ts` (30+ tables), auth via SIWS JWT + Neon/Better Auth middleware
- Billing: Paddle (`src/lib/paddle.ts`, `src/app/api/paddle/*`) reference; FastSpring (`src/lib/fastspring.ts`, `src/app/api/fastspring/*`) active MoR; tier in `users.tier` (free/mini/max); seeds: `npm run fastspring:seed-catalog`, `npm run paddle:seed-catalog`; env template `.env.example`
- Product surface: CommandBar / NL treasury, Foresight Simulator, Solana Atlas (MEV/rug/DCA), Dreyv Studio (browser IDE + AI Architect), Marketplace (80/20 split, Anchor devnet), Simulation Firewall, Persistent Knowledge Memory; Agent Store vision (categories, ACP) and strategic gaps in KEYSTONE-STRATEGIC-FINDINGS.md / CEO–CTO–business findings files
- Wallets: Solana wallet adapter, EVM via RainbowKit/wagmi, Turnkey embedded; multi-sig via Squads (`@sqds/multisig`); audits flag Phantom/Backpack coverage vs market share
- Integrations & deps: Vercel AI SDK, @ai-sdk/groq + @ai-sdk/openai, Jupiter, Helius, Marinade, Streamflow (present/unused), Liveblocks; agentic landscape notes (Phantom MCP, Solana Agent Kit, elizaOS, Cloudflare Agents SDK) in strategy docs
- Marketing/legal routes: `/pricing`, `/legal/refunds`, `/legal/privacy`, `/legal/terms`, `/legal/cookies`; header/footer link pricing and legal
- CommandBar + dashboard: very large `/api/command` with `useChat` streaming (Groq + CF Workers AI) and `DreyvAgentInput` JSON vs stream mismatch; `/dashboard` is a static CSS grid (TreasuryChart, YieldOptimizer, AgentCommandCenter, RiskRadar, vault/payroll/directive widgets); LangGraph / assistant-ui / MCP noted as upgrade direction
- Tooling + SDK/CLI direction: Firecrawl CLI authenticated (key in Firecrawl config); build `cross-env NEXT_TELEMETRY_DISABLED=1 NEXT_PRIVATE_BUILD_WORKER_COUNT=1 NODE_OPTIONS=--max-old-space-size=4096 next build`; dev `next dev --turbopack`; pre-push `scripts/pre-push-scan.mjs`; strategy docs — SDK ~C-tier (v2.0 agent/MCP), CLI ~C-tier (v2.0 bundling/scaffold)
- Shared marketing styling: `src/app/globals.css` (tokens/theme) and `src/components/home/marketing-styles.ts` (e.g. `marketingPrimaryCta`, ghost link, section divider)
- Local dev: persistent 500 on `localhost:3000` while another `next dev` port returns 200 often means a stale/duplicate process on :3000 — confirm active server/port before debugging app code
