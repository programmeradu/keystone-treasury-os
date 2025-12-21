# Keystone Agent Engine: The Neural Core 🧠

> **"The UI is the skin. The Agent is the brain."**

## 1. The Vision
The **Keystone Agent Engine** is not a chatbot. It is the central operating system of the entire platform. 
It is designed to be the single "intelligence layer" through which all complex actions, decisions, and interactions must pass.

**Our Edge:**
Most dApps are static interfaces interacting with smart contracts. Keystone is an **Active Intelligence Engine** that:
1.  Interacts with *all* Web3 tools (RPCs, Docs, Repos, Libraries).
2.  Parses disparate data sources (Price feeds, Risk metrics, Governance proposals).
3.  Orchestrates complex workflows (Rebalancing, Payroll, Capital Deployment) autonomously or semi-autonomously.

## 2. Core Architecture: "Everything Through The Engine"

To maintain this advantage, we must strictly adhere to the **Agent-First Architecture**.

### ❌ The Old Way (Standard dApp)
*   **User clicks "Deploy"** -> UI Component calls Smart Contract directly.
*   *Result:* Dumb execution. No checks, no optimization, no strategic insight.

### ✅ The Keystone Way (Agentic)
*   **User clicks "Deploy"** -> UI Component emits an `AGENT_COMMAND`.
*   **Agent Engine Intercepts**:
    *   Logs the directive.
    *   Performs analysis (e.g., "Scanning 12 liquidity pools...", "Checking risk scores...").
    *   Formulates a "Tactical Plan".
*   **Agent Signals Back**: The Agent tells the UI what to show (`SHOW_STRATEGY_MODAL`) or executes the transaction proposal itself.

## 3. The Event Loop Protocol

All components must communicate via the `AppEventBus` to ensure the Agent is aware of every significant action.

### Step A: The Trigger (UI -> Agent)
Components do not execute logic. They request intent.
```typescript
// Good
AppEventBus.emit("AGENT_COMMAND", { 
    command: "Analyze treasury for yield optimization", 
    source: "YieldOptimizer" 
});
```

### Step B: The Processing (Agent Core)
The Agent (currently visualized in `AgentCommandCenter`) picks up the command:
1.  **Ingest**: "Received external directive..."
2.  **Reason**: "Fetching JitoSOL APY...", "Verifying Slippage..."
3.  **Decide**: "Optimization Strategy Generated."

### Step C: The Execution (Agent -> UI/Chain)
The Agent drives the outcome:
```typescript
// Agent requesting UI to show results
AppEventBus.emit("SHOW_STRATEGY_MODAL");

// OR Agent constructing a transaction
squadsClient.createProposal({...});
```

## 4. Future Capabilities (The Roadmap)
We are building this engine to eventually:
*   **Read Documentation**: Autonomously parse new protocol docs to learn how to integrate them.
*   **Write Code**: Self-patch or generate new strategy adapters.
*   **Interact with Repos**: Pull the latest ABIs or SDKs from GitHub.
*   **Full Autonomy**: Run background "Cron Jobs" that rebalance the portfolio without user initiation (once approved/trusted).

## 5. The Dynamic Brain (True AI Integration) 🧠✨
To achieve the vision of a "super dynamic and intelligent" engine, we are moving beyond hardcoded logic to a **Reasoning Loop** (ReAct Pattern).

**The Future Flow:**
1.  **Input**: Natural Language or UI Trigger ("Optimize my treasury").
2.  **Reasoning (The "Think" Step)**:
    *   *AI:* "The user wants to optimize. First, I need to see what they have."
    *   *AI:* "I will use the `VaultScanner` tool."
3.  **Tool Execution**:
    *   Agent calls: `squadsClient.getHoldings()` -> Returns `$50k Native SOL`.
    *   Agent determines: "High idle balance detected. I should check yield rates."
    *   Agent calls: `yieldAggregator.getRates('SOL')` -> Returns `JitoSOL: 8.4%`.
4.  **Decision**:
    *   *AI:* "I should recommend a staking strategy."
5.  **Output**:
    *   Agent triggers `SHOW_STRATEGY_MODAL` with the specific context it found.

**Why this is powerful:**
*   **Not Rigid**: If a new protocol launches tomorrow, we just add a "Tool Definition". The Agent figures out *when* to use it.
*   **Context Aware**: The Agent knows if the market is crashing (via price tools) and might advise *against* deployment, automatically.
*   **Self-Healing**: If a transaction fails, the Agent can "read" the error and suggest a fix (e.g., "Slippage too low, increasing to 0.5%").

---
**Rule of Thumb:** If a button does something smart, **Route it through the Engine.**

