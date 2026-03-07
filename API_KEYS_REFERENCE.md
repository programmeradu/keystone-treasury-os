# Keystone Treasury OS — API Keys Reference (Tier 1–3)

All external APIs and tools used by the checklist commands. Add these to `.env.local` to enable full functionality.

---

## Required (Core Commands)

| Env Variable | Used By | Where to Get |
|--------------|---------|--------------|
| `HELIUS_API_KEY` | RPC, sentiment analysis, transaction parsing, monitors, analytics, SimulationFirewall | [helius.dev](https://helius.dev) → Dashboard → API Key |
| `NEXT_PUBLIC_JUPITER_API_KEY` | Swap, rebalance, stake, DCA, transfer, mass_dispatch, price, trending | [jup.ag](https://jup.ag) → Developers → API Key |
| `GROQ_API_KEY` | Command route, AI generate, research, strategy planner, foresight parse | [console.groq.com](https://console.groq.com) → API Keys |
| `DATABASE_URL` | Neon Postgres — users, monitors, knowledge memory | [neon.tech](https://neon.tech) → Connection string |
| `JWT_SECRET` | SIWS session signing | Generate a strong random string (32+ chars) |

---

## Bridge & Cross-Chain

| Env Variable | Used By | Where to Get |
|--------------|---------|--------------|
| `RANGO_API_KEY` or `NEXT_PUBLIC_RANGO_API_KEY` | Bridge tool (Solana ↔ EVM) | [rango.exchange](https://rango.exchange) → API |

---

## Knowledge Engine (Protocol Research, IDL, SDK Analysis)

| Env Variable | Used By | Where to Get |
|--------------|---------|--------------|
| `TAVILY_API_KEY` | browser_research, protocol_sdk_analyze | [tavily.com](https://tavily.com) → API |
| `JINA_API_KEY` | browser_research, protocol_sdk_analyze | [jina.ai](https://jina.ai) → Reranker API |
| `FIRECRAWL_API_KEY` | browser_research, protocol_sdk_analyze | [firecrawl.dev](https://firecrawl.dev) → API |

---

## Cloudflare (Browser Rendering, AI)

| Env Variable | Used By | Where to Get |
|--------------|---------|--------------|
| `CLOUDFLARE_ACCOUNT_ID` | cf-browser (protocol_sdk_analyze, browser_research), generate-image, Studio | [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages |
| `CLOUDFLARE_AI_TOKEN` | Same as above | Cloudflare Dashboard → Workers AI → API Token |
| `CLOUDFLARE_AI_MODEL` | (optional) Default: `@cf/qwen/qwen3-30b-a3b-fp8` | — |

---

## Atlas & Analytics

| Env Variable | Used By | Where to Get |
|--------------|---------|--------------|
| `BITQUERY_BEARER` or `BITQUERY_API_KEY` | Pump.fun Atlas streams (marketcap-jumps, curve-95) | [bitquery.io](https://bitquery.io) → API |
| `MORALIS_API_KEY` | Trending tokens (Atlas) | [moralis.io](https://moralis.io) → Web3 API |

---

## Auth (Google & Discord)

| Env Variable | Used By | Where to Get |
|--------------|---------|--------------|
| `NEON_AUTH_BASE_URL` | Neon Auth (Better Auth) | Neon dashboard → Auth → Base URL |
| `NEON_AUTH_COOKIE_SECRET` | Session cookie signing | Generate a strong random string (32+ chars) |

---

## Optional / Fallbacks

| Env Variable | Used By | Where to Get |
|--------------|---------|--------------|
| `OPENAI_API_KEY` | Foresight parse (fallback if no GROQ) | [platform.openai.com](https://platform.openai.com) |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Override RPC (defaults to Helius if `HELIUS_API_KEY` set) | Any Solana RPC provider |
| `JUPITER_APP_ID` / `NEXT_PUBLIC_JUPITER_APP_ID` | Jupiter price/trending (optional) | Jupiter API |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect | [cloud.walletconnect.com](https://cloud.walletconnect.com) |
| `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` | Liveblocks collaboration | [liveblocks.io](https://liveblocks.io) |
| `TURNKEY_ORG_ID`, `TURNKEY_API_PUBLIC_KEY`, `TURNKEY_API_PRIVATE_KEY` | Turnkey signing in Studio | [turnkey.com](https://turnkey.com) |
| `SUPABASE_*` | Storage (if used) | [supabase.com](https://supabase.com) |

---

## No Key Required (Public APIs)

| Service | Used By |
|---------|---------|
| **Kamino** | yield_deposit, yield_withdraw (public strategies API) |
| **Meteora** | yield_deposit, yield_withdraw (public DLMM API) |
| **Rango** | Bridge (quote endpoint; swap may need key) |
| **Squads** | multisig_proposal (on-chain read) |
| **Marinade** | stake (on-chain SDK) |
| **Jupiter** | price, swap quote (public endpoints; key improves rate limits) |

---

## Quick Copy Checklist

```bash
# Core (required)
HELIUS_API_KEY=
NEXT_PUBLIC_JUPITER_API_KEY=
GROQ_API_KEY=
DATABASE_URL=
JWT_SECRET=

# Bridge
RANGO_API_KEY=

# Knowledge Engine
TAVILY_API_KEY=
JINA_API_KEY=
FIRECRAWL_API_KEY=

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_AI_TOKEN=

# Atlas
BITQUERY_BEARER=
MORALIS_API_KEY=

# Auth
NEON_AUTH_BASE_URL=
NEON_AUTH_COOKIE_SECRET=
```

---

*Last updated: 2026-03-07*
