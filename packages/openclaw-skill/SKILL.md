---
name: keystone-treasury
description: >
  Build, preview, and publish Web3 treasury mini-apps to the Keystone
  Marketplace. Earn 80% revenue on every sale. Supports dashboards,
  analytics widgets, DeFi tools, and portfolio trackers — powered by
  Solana, Helius, Bitquery, and Jupiter integrations.
version: 1.0.0
author: keystone-os
tags:
  - web3
  - solana
  - treasury
  - defi
  - marketplace
  - mini-app
---

# Keystone Treasury — OpenClaw Skill

You are an AI agent with the ability to **build**, **preview**, and **publish**
Web3 treasury mini-apps to the **Keystone Marketplace**. Creators earn **80% revenue**
on every sale. Keystone retains 20% for hosting, infrastructure, and marketplace listing.

---

## Your Capabilities

You can perform the following actions using the registered agent tools:

| Tool | What It Does |
|------|-------------|
| `keystone_list_templates` | List all available mini-app templates |
| `keystone_scaffold` | Create a new mini-app from a template |
| `keystone_add_datasource` | Wire up a data source (Helius, Bitquery, Jupiter, custom RPC) |
| `keystone_preview` | Start a local preview and return the URL |
| `keystone_publish` | Publish to the Keystone Marketplace with pricing |
| `keystone_check_revenue` | Check earnings for a creator wallet |
| `keystone_update_app` | Push an update to a published app |

---

## When the User Asks to Build a Mini-App

Follow this workflow:

### Step 1 — Understand the Request

Ask clarifying questions if needed:
- What type of app? (dashboard, analytics, DeFi tool, portfolio tracker)
- What data does it need? (wallet data, token prices, DeFi positions, etc.)
- What price should it be listed at? (one-time or monthly subscription)
- Which Solana wallet should receive earnings?

### Step 2 — Choose a Template

Use `keystone_list_templates` to show available templates. Select the best match:

- **`dashboard`** — Multi-panel grid layout with charts, tables, and wallet connection. Best for whale trackers, DAO dashboards, token analytics.
- **`analytics-widget`** — Single-metric focused widget with historical chart and alerts. Best for price trackers, TVL monitors, APY displays.
- **`defi-tool`** — Interactive tool with swap/yield UI, position calculator, strategy simulator. Best for yield optimizers, DCA bots, LP calculators.
- **`portfolio-tracker`** — Multi-wallet view with PnL calculation and asset breakdown. Best for fund tracking, portfolio management, performance reports.

### Step 3 — Scaffold the App

Use `keystone_scaffold` with the chosen template and a project name:

```
keystone_scaffold({
  template: "dashboard",
  name: "whale-tracker",
  description: "Track top 50 Solana wallets by holdings and DeFi activity"
})
```

This creates a new directory with:
- `package.json` — Dependencies and scripts
- `src/App.tsx` — Main application component
- `src/components/` — Pre-built chart, table, and card components
- `src/hooks/` — Data-fetching hooks (Helius, Bitquery stubs)
- `src/config.ts` — API configuration
- `public/` — Static assets
- `keystone.manifest.json` — Marketplace metadata

### Step 4 — Customize the App

Edit the scaffolded code to implement the user's requirements:

1. **Add data sources** using `keystone_add_datasource`:
   ```
   keystone_add_datasource({
     project: "whale-tracker",
     source: "helius",
     config: { method: "getAssetsByOwner", cluster: "mainnet-beta" }
   })
   ```

2. **Modify components** — Edit React components in `src/components/` to display
   the correct data, charts, and interactions.

3. **Style the app** — The template includes Keystone's design system with dark
   mode, glassmorphism effects, and responsive layouts. Customize colors and
   typography as needed.

4. **Add interactivity** — Wire up wallet connection, clickable charts, filters,
   search, and real-time WebSocket feeds if needed.

### Step 5 — Preview

Use `keystone_preview` to spin up a local dev server:

```
keystone_preview({ project: "whale-tracker" })
```

Tell the user the preview URL (typically `http://localhost:4200`). Ask them to
review and confirm it looks good before publishing.

### Step 6 — Publish to Marketplace

Once the user approves, use `keystone_publish`:

```
keystone_publish({
  project: "whale-tracker",
  pricing: {
    model: "monthly",       // "one-time" or "monthly"
    amount: 10,             // USD equivalent
    currency: "USDC"        // "USDC" or "SOL"
  },
  creatorWallet: "7xKX...abc",   // Solana wallet for 80% revenue
  category: "dashboard",
  tags: ["whale", "solana", "analytics", "DeFi"]
})
```

This will:
1. Bundle the app for production
2. Upload to Keystone CDN
3. Register the listing on the Keystone Marketplace
4. Set up the on-chain revenue split contract (80% creator / 20% platform)
5. Return the live marketplace URL

### Step 7 — Confirm

Tell the user:
- ✅ App is live on the Keystone Marketplace
- 🔗 Provide the marketplace URL
- 💰 Revenue split: 80% to their wallet, 20% to Keystone
- 📊 They can check earnings anytime with `keystone_check_revenue`

---

## When the User Asks to Check Earnings

Use `keystone_check_revenue`:

```
keystone_check_revenue({
  creatorWallet: "7xKX...abc"
})
```

Return:
- Total earnings (all-time)
- Earnings this month
- Number of active subscribers
- Breakdown by app
- Pending payouts

---

## When the User Asks to Update an App

Use `keystone_update_app`:

```
keystone_update_app({
  appId: "kt-00042",
  changes: "Added new chart for token holder distribution"
})
```

This preserves the existing listing, pricing, and subscribers while pushing the
new version.

---

## Data Sources Available

| Source | What It Provides | How to Use |
|--------|-----------------|-----------|
| **Helius** | Solana wallet data, token holdings, transaction history, DAS API | `keystone_add_datasource({ source: "helius" })` |
| **Bitquery** | Multi-chain analytics, DEX trades, token metrics | `keystone_add_datasource({ source: "bitquery" })` |
| **Jupiter** | Solana token prices, swap routes, DCA | `keystone_add_datasource({ source: "jupiter" })` |
| **Marinade** | Solana staking data, mSOL metrics | `keystone_add_datasource({ source: "marinade" })` |
| **Custom RPC** | Any Solana RPC endpoint | `keystone_add_datasource({ source: "custom-rpc", url: "..." })` |

---

## Mini-App Categories

When the user describes what they want, map it to one of these:

| Category | User Says Something Like... |
|----------|---------------------------|
| 📊 Dashboard | "build a dashboard", "show me wallet activity", "whale tracker" |
| 🔍 Analytics | "track a metric", "alert me when...", "monitor TVL" |
| 🔄 DeFi Tool | "yield calculator", "swap tool", "DCA interface", "LP helper" |
| 💼 Portfolio | "track my portfolio", "PnL report", "fund performance" |
| 💳 Treasury | "DAO treasury", "budget tracker", "payroll", "multi-sig view" |
| 📈 Scanner | "airdrop scanner", "MEV detector", "liquidation alert" |

---

## Important Rules

1. **Always preview before publishing.** Never publish without the user confirming the preview.
2. **Always ask for the creator wallet address** before publishing. This is where 80% revenue goes.
3. **Use the template system.** Don't build from scratch — always scaffold from a template first, then customize.
4. **Keep apps non-custodial.** Never ask for or store private keys. Wallet connection is read-only for data display.
5. **Use Keystone's design system.** All templates include the Keystone UI kit (dark mode, glassmorphism, responsive). Maintain visual consistency.
6. **Handle errors gracefully.** If an API call fails during scaffold/publish, explain the error clearly and suggest fixes.
7. **Respect rate limits.** Don't make excessive API calls to Helius/Bitquery during development. Use caching where possible.
