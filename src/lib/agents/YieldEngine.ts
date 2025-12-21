export interface StrategyOption {
    name: string;
    mint: string;
    projectedApy: number; // In a full prod app, this would be fetched from Sanctum API
    riskScore: number; // 1-10 (Lower is safer)
    description: string;
}

import { AppEventBus } from "@/lib/events";

// The "Brain" of the Yield Optimizer
export const YieldEngine = {
    // 1. Define the Universe of known safe strategies
    strategies: [
        {
            name: "JitoSOL",
            mint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
            projectedApy: 8.24,
            riskScore: 2,
            description: "MEV-enhanced liquid staking reward pool."
        },
        {
            name: "mSOL",
            mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
            projectedApy: 7.85,
            riskScore: 1,
            description: "Marinade algorithmic stake pool (decentralized)."
        },
        {
            name: "bSOL",
            mint: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
            projectedApy: 8.12,
            riskScore: 3,
            description: "BlazeStake pool with specific SOL delegation."
        }
    ] as StrategyOption[],

    /**
     * The Decision Function:
     * Instead of hardcoding "Buy JitoSOL", the agent evaluates all options.
     * It checks:
     * 1. Projected APY
     * 2. Liquidity (via Jupiter Quote)
     * 3. Risk Profile
     */
    async determineBestStrategy(amountLamports: number) {
        // 1. "THINKING": Use LLM if available to analyze the context
        AppEventBus.emit("AGENT_LOG", { message: `🤔 Reasoning: Analyzing ${this.strategies.length} yield strategies for ${(amountLamports / 1e9).toFixed(2)} SOL...`, level: "INFO" });

        // Attempt to get AI Reasoning Log
        try {
            await this.generateAIReasoning(amountLamports);
        } catch (e) {
            AppEventBus.emit("AGENT_LOG", { message: `⚠️ AI Intelligence Offline (Missing Key?). Using quantitative fallback.`, level: "WARNING" });
        }

        const candidates = this.strategies;

        let bestOption = null;
        let bestScore = -1;
        let bestQuote = null;

        // 2. "ANALYZING": Check real market conditions for each
        for (const strategy of candidates) {
            try {
                AppEventBus.emit("AGENT_LOG", { message: `🛠️ MarketScanner: Fetching live quotes for ${strategy.name}...`, level: "SYSTEM" });

                // Fetch real quote from Jupiter to check slippage/output
                const quoteUrl = `/api/jupiter/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${strategy.mint}&amount=${amountLamports}&slippageBps=50`;
                const response = await fetch(quoteUrl);

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`Proxy Error: ${response.status} - ${errText}`);
                }

                const quote = await response.json();

                if (!quote.outAmount) {
                    AppEventBus.emit("AGENT_LOG", { message: `❌ ${strategy.name}: Insufficient liquidity on Jupiter.`, level: "WARNING" });
                    continue;
                }

                // Internal Score Calculation (simplified for demo)
                // Score = APY * (1 / Risk)
                const score = strategy.projectedApy - (strategy.riskScore * 0.1);

                AppEventBus.emit("AGENT_LOG", { message: `✅ ${strategy.name}: Quote valid. Eff. APY: ${strategy.projectedApy}%`, level: "INFO" });

                if (score > bestScore) {
                    bestScore = score;
                    bestOption = strategy;
                    bestQuote = quote;
                }

                // Artificial delay to allow user to read logs (otherwise it's too fast)
                await new Promise(r => setTimeout(r, 600));

            } catch (e: any) {
                console.error(`Failed to analyze ${strategy.name}`, e);
                AppEventBus.emit("AGENT_LOG", { message: `❌ Error analyzing ${strategy.name}: ${e.message}`, level: "ERROR" });
            }
        }

        // 3. "DECIDING"
        if (bestOption) {
            AppEventBus.emit("AGENT_LOG", { message: `💡 Decision: Recommending ${bestOption.name} (Score: ${bestScore.toFixed(2)})`, level: "SUCCESS" });
        }

        return {
            recommendation: bestOption || this.strategies[0], // Fallback
            quote: bestQuote,
            logs: [] // Deprecated in favor of EventBus
        };
    },

    /**
     * Calls the /api/agent endpoint to generate "Human-like" reasoning logs
     */
    async generateAIReasoning(amountLamports: number) {
        const response = await fetch("/api/agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt: `I am analyzing yield strategies for ${amountLamports / 1e9} SOL. 
                Options: 
                - JitoSOL (8.24% APY, MEV)
                - mSOL (7.85% APY, Decentralized)
                - bSOL (8.12% APY, Specific Delegation)
                
                Act as the Agent. Provide 1 sentence of "Thought Process" analyzing the trade-offs. 
                Do not output JSON. Just the thought sentence.`
            })
        });

        if (!response.ok) throw new Error("AI Endpoint Failed");

        const data = await response.json();
        // The /api/agent returns a "plan", but we interpret the plan.reasoning or just use the raw text if we modified the endpoint.
        // Since /api/agent creates a structured plan, we might need a simpler "chat" endpoint. 
        // For now, let's extract the "reasoning" from the plan if possible.

        if (data.plan && data.plan.reasoning) {
            AppEventBus.emit("AGENT_LOG", { message: `🧠 AI Thought: "${data.plan.reasoning}"`, level: "INFO" });
        }
    }
};
