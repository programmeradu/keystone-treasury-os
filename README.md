# Keystone: The Sovereign Operating System for Web3 Treasuries

[![soonami Venturethon](https://img.shields.io/badge/soonami-Venturethon_Submission-36e27b?style=for-the-badge)](https://soonami.io/venturethon)
[![Framework](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

Managing a modern Web3 treasury is currently a high-risk nightmare trapped in "Click-Ops Hell." Teams are forced to juggle fragmented tools for execution, intelligence, and coordination, leading to lost opportunities and the dangerous practice of blind-signing

**Keystone is the "CLI for the Blockchain".** We are moving the industry from manual "Click-Ops" to intelligent **"Command-Ops"**. Users simply type their strategic intent in natural language, and our federated autonomous agents plan, simulate, and execute complex treasury operations safely.

---

## Venturethon 9: The 10-Day Before and After

During the 10 days of the Venturethon, we transformed Keystone into what it is supposed to be: not a simple dashboard, not a wrapper, but the literal Command Layer for Web3 treasuries. Here is a summary of the Before and After.

**Before the Venturethon:**
* The Studio was disjointed and its iframe used a permissive tag.
* The Keystone Agent and sub-agents were mocked to produce test data only.
* The "Simulation Firewall" was not fully built; it only checked basic risk scores and gave transactions the green light.
* The marketplace 80/20 revenue split was not implemented. There were no smart contracts deployed, no security scans for mini-apps, and no code storage.
* The platform lacked persistent memory.
* The landing page was vague and didn't explain the vision well.
* Solana Atlas tools (like the DCA bots) used hardcoded user IDs.
* There was no Auth system in place and the database used local storage.

**After the 10-Day Sprint:**
* We added the Execution Coordinator to bring together all sub-agents and tools. Real transactions are now being executed!
* We built the Persistent Knowledge Memory and Zero-day Protocol learning, meaning the Keystone agent can now dynamically scrape, read, and permanently remember protocol documentation.
* The command bar now streams diagrams, charts, and visuals instantly after a command is entered to give users a quick visual overview before the action happens.
* We activated the true Simulation Firewall. Every AI-generated payload is now routed through a mainnet fork simulation first.
* Users now see a human-readable impact report before they are asked to sign anything with their wallet.
* In the Keystone Studio, the "Architect" now reads real-time diagnostics from the code editor and automatically patches its own errors up to 3 times before the user even sees them.
* We upgraded and published the Keystone SDK and CLI so developers can build mini-apps from anywhere using simple commands and AI (right in their terminal or IDE), monetize them, and publish directly to the Marketplace.
* We started building the OpenClaw Skill for Keystone to make shipping mini-apps even easier.
* We deployed the Keystone Marketplace anchor smart contract to the Solana devnet.
* We locked down the business model by building rate limits for our Free, Mini, and Max tiers.
* The Auth system and Postgres database are now fully implemented.
* The landing page content was updated to be much clearer.
* The "What if Engine" (Foresight Simulation) still exists. For example: "Show me what happens to the runway if SOL drops by 30%" or "What if I deposit 100 SOL and hire a developer to be paid 10 SOL per month for 6 months". The analytics dashboard will redraw and regenerate its charts to reflect your specific questions.

---

## Live Deployments (Recommended for Judging)

To experience the full power of the AI Architect, Generative Foresight, and the Simulation Firewall, please use our live production environments. 

*   **Keystone OS (Enterprise Command Center):** [keystone.stauniverse.tech](https://keystone.stauniverse.tech)
*   **Solana Atlas (Public Intelligence Desktop):** [keystone.stauniverse.tech/atlas](https://keystone.stauniverse.tech/atlas)


---

## Commands to Try

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

### 5. Execution Mode (Background Trading Tool)
> *"mode:execute Run a sniper bot that watches Raydium for new liquidity pools above $50k and buys instantly with max slippage 0.5%"*
* **What happens:** Keystone does **not** open Studio or build a mini-app. Instead, it routes the request to live execution tools (monitoring + trading), prepares the background trading workflow, runs simulation/firewall checks, and then asks for wallet approval before any transaction is signed.

---

## Local Installation & Development

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

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open the local OS:**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

*Built with precision during the soonami Venturethon. The future is not just decentralized; it is orchestrated.*