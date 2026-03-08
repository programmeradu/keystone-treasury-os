# 🏛️ Keystone: The Sovereign Operating System for Web3 Treasuries

[![soonami Venturethon](https://img.shields.io/badge/soonami-Venturethon_Submission-36e27b?style=for-the-badge)](https://soonami.io/venturethon)
[![Framework](https://img.shields.io/badge/Next.js-15.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

Managing a modern Web3 treasury is currently a high-risk nightmare trapped in "Click-Ops Hell." Teams are forced to juggle fragmented tools for execution, intelligence, and coordination, leading to lost opportunities and the dangerous practice of blind-signing. 

**Keystone is the "CLI for the Blockchain".** We are moving the industry from manual "Click-Ops" to intelligent **"Command-Ops"**. Users simply type their strategic intent in natural language, and our federated autonomous agents plan, simulate, and execute complex treasury operations safely.

---

## 🚀 Live Deployments (Recommended for Judging)

To experience the full power of the AI Architect, Generative Foresight, and the Simulation Firewall, please use our live production environments. 

*   **Keystone OS (Enterprise Command Center):** [keystone.stauniverse.tech](https://keystone.stauniverse.tech)
*   **Solana Atlas (Public Intelligence Desktop):** [keystone.stauniverse.tech/atlas](https://keystone.stauniverse.tech/atlas)
*   **ChainFlow Oracle (Simulation Engine):** [keystone.stauniverse.tech/oracle](https://keystone.stauniverse.tech/oracle)

---

## 💬 The "Golden Path": Commands to Try

Keystone replaces UI clicks with a **Linguistic Command Layer**. Copy and paste these exact commands into the Keystone CommandBar to test the system's end-to-end capabilities:

### 1. Complex Treasury Execution (The Transaction Agent)
> *"Swap 500 SOL to USDC, bridge half to Base, and deposit the rest into the highest yielding Kamino vault."*
* **What happens:** The Execution Coordinator builds a multi-step transaction payload, routes it through the Simulation Firewall, and presents a visual Impact Report (verifying balances and risk) *before* you are asked to sign.

### 2. Generative Foresight (The "What-If" Engine)
> *"Show me the runway if we hire 5 engineers and SOL drops 30%"*
* **What happens:** The system uses Generative UI to physically redraw your analytics dashboard, calculating the new "Depletion Node" based on simulated price shocks and variable impacts.

### 3. Zero-Day Protocol Learning (Persistent Memory)
> *"Research https://docs.jup.ag"*
* **What happens:** The Knowledge Engine dynamically scrapes and reads the documentation, storing the insights in our native Postgres persistent memory so the Universal Operator learns how to use the protocol for future commands.

### 4. Zero-Build IDE (The AI Architect)
> *"Build a Sniper Bot that watches Raydium for new liquidity pools > $50k and buys instantly"*
* **What happens:** Opens the Keystone Studio. The AI Architect streams custom React/TypeScript code character-by-character into the Monaco editor, running an "Ouroboros" loop to autonomously fix any compiler errors before rendering a live, sandboxed DeFi mini-app.

---

## 🏗️ Core Architecture (The "Diamond Merge")

Built during the 10-day soonami Venturethon sprint, Keystone is a production-ready ecosystem:

*   **Native Federated Agent System:** Orchestrated by a central State Machine, our 5 specialized agents (Lookup, Builder, Analysis, Transaction, Coordinator) handle logic natively within Next.js, backed by Neon Postgres persistent memory.
*   **The Simulation Firewall:** Eradicates "blind signing". Every AI-generated payload is simulated on a mainnet fork via `connection.simulateTransaction`, outputting a human-readable visual diff.
*   **Zero-Build Custom Runtime:** A highly secure `iframe` + Monaco + `esm.sh` sandbox that compiles TSX in the browser without local build steps.
*   **Decentralized Marketplace:** Our `KeystoneMarket` Anchor smart contract (live on Solana devnet) mints License NFTs and trustlessly routes an 80/20 revenue split to mini-app developers. Code bundles are anchored immutably to Arweave via Irys.

---

## 🛠️ Local Installation & Development

*Note: Because Keystone relies on a complex web of specific AI inference engines (Groq), database branching (Neon Postgres), and headless browser endpoints (Cloudflare), we highly recommend using the Live Deployments above for evaluation. If you wish to run it locally, follow these steps:*

### Prerequisites
* Node.js 20+
* pnpm, npm, or yarn
* Supabase CLI (for local auth/storage emulation)

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

3. **Environment Variables:**
   Copy the `.env.example` file to `.env.local` and populate the required API keys.
   ```bash
   cp .env.example .env.local
   ```
   *Required keys include: `NEXT_PUBLIC_RPC_URL` (Helius/Solana), `GROQ_API_KEY` (AI Inference), `DATABASE_URL` (Neon Postgres).*

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open the local OS:**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

*Built with precision during the soonami Venturethon. The future is not just decentralized; it is orchestrated.*