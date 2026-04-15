# Dreyv — AI-powered, non-custodial treasury operations

[![soonami Venturethon](https://img.shields.io/badge/soonami-Venturethon_Submission-36e27b?style=for-the-badge)](https://soonami.io/venturethon)
[![Framework](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

**Dreyv** (from StaUniverse) is an **AI-powered, non-custodial** command layer for Web3 treasuries. Teams move from **tab-hopping and fragmented UIs** to **intent-driven control**: you express intent in natural language; specialized agents **plan**, **simulate**, and help you **execute** with human-readable impact reports before anything is signed.

Canonical product vision: see **`DREYV.md`** in this repo.

---

## Venturethon 9: The 10-Day Before and After

During the 10 days of the Venturethon, we focused the product on being **the command layer for treasuries** — not only a dashboard. Summary of before and after.

**Before the Venturethon:**
* The Studio was disjointed and its iframe used a permissive tag.
* The agent and sub-agents were mocked to produce test data only.
* The "Simulation Firewall" was not fully built; it only checked basic risk scores and gave transactions the green light.
* The marketplace 80/20 revenue split was not implemented. There were no smart contracts deployed, no security scans for mini-apps, and no code storage.
* The platform lacked persistent memory.
* The landing page was vague and didn't explain the vision well.
* Solana Atlas tools (like the DCA bots) used hardcoded user IDs.
* There was no Auth system in place and the database used local storage.

**After the 10-Day Sprint:**
* We added the Execution Coordinator to bring together all sub-agents and tools. Real transactions are now being executed.
* We built Persistent Knowledge Memory and zero-day protocol learning, so the agent can dynamically scrape, read, and remember protocol documentation.
* The command bar streams diagrams, charts, and visuals after a command to give a quick visual overview before action.
* We activated the Simulation Firewall. AI-generated payloads are routed through mainnet-fork simulation first.
* Users see a human-readable impact report before signing with their wallet.
* In Dreyv Studio, the "Architect" reads real-time diagnostics from the code editor and automatically patches its own errors up to three times before the user sees them.
* We upgraded and published the SDK and CLI so developers can build mini-apps from the terminal or IDE, monetize them, and publish to the Marketplace.
* We started building the OpenClaw Skill to make shipping mini-apps easier.
* We deployed the Marketplace anchor smart contract to the Solana devnet.
* We locked down the business model with rate limits for Free, Mini, and Max tiers.
* The Auth system and Postgres database are fully implemented.
* The landing page content was updated to be clearer.
* The Foresight ("what-if") engine supports questions like runway if SOL drops 30% or hiring plans; analytics can reshape to the question.

---

## Live deployments

* **Dreyv (primary):** [dreyv.stauniverse.tech](https://dreyv.stauniverse.tech)
* **Solana Atlas (public intelligence):** [dreyv.stauniverse.tech/atlas](https://dreyv.stauniverse.tech/atlas)

---

## Commands to try

Copy these into the **CommandBar** to exercise end-to-end flows:

### 1. Complex treasury execution

> *"Swap 500 SOL to USDC, bridge half to Base, and deposit the rest into the highest yielding Kamino vault."*

The Execution Coordinator builds a multi-step payload, runs the Simulation Firewall, and shows an impact report *before* you sign.

### 2. Generative Foresight
> *"Show me the runway if we hire 5 engineers and SOL drops 30%"*

Generative UI redraws analytics around the scenario.

### 3. Zero-day protocol learning
> *"Research https://docs.jup.ag"*

The knowledge layer ingests docs into persistent memory for later commands.

### 4. Zero-build IDE (AI Architect)
> *"Build a mini app that visualizes my treasury"*

The Architect streams React/TypeScript into the Studio sandbox.

### 5. Execution mode (background tooling)
> *"Run a sniper bot that watches Raydium for new liquidity pools above $50k and buys instantly with max slippage 0.5%"*

Routes to live execution tools; simulation and wallet approval still apply before transactions.

---

## Local installation & development

Dreyv depends on AI inference (e.g. Groq), Neon Postgres, and other services. For quick evaluation, prefer the **live deployment** above.

### Prerequisites
* Node.js 20+
* pnpm, npm, or yarn

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/programmeradu/keystone-treasury-os.git
   cd keystone-treasury-os
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment variables:**  
   Copy `.env.example` to `.env.local` and fill in required keys.
   ```bash
   cp .env.example .env.local
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

---

*Built during the soonami Venturethon. The future is not only decentralized — it is orchestrated.*
