import { AppEventBus } from "@/lib/events";
import { YIELD_MINTS } from "@/lib/yield-registry";

export interface StrategyOption {
    name: string;
    mint: string;
    projectedApy: number;
    riskScore: number; // 1-10 (Lower is safer)
    description: string;
}

// Build initial strategies from the yield registry (top 3 by fallback APY, lowest risk)
const CORE_STRATEGIES: StrategyOption[] = [
    {
        name: "JitoSOL",
        mint: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
        projectedApy: YIELD_MINTS["J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn"]?.fallbackApy ?? 6.3,
        riskScore: 2,
        description: YIELD_MINTS["J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn"]?.description ?? "MEV-enhanced liquid staking via Jito",
    },
    {
        name: "mSOL",
        mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
        projectedApy: YIELD_MINTS["mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"]?.fallbackApy ?? 6.1,
        riskScore: 1,
        description: YIELD_MINTS["mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"]?.description ?? "Marinade decentralized stake pool",
    },
    {
        name: "bSOL",
        mint: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
        projectedApy: YIELD_MINTS["bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1"]?.fallbackApy ?? 6.0,
        riskScore: 3,
        description: YIELD_MINTS["bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1"]?.description ?? "BlazeStake delegated staking",
    },
];

// The "Brain" of the Yield Optimizer
export const YieldEngine = {
    strategies: [...CORE_STRATEGIES],

    /**
     * Fetches live APY rates from /api/yield/rates and overlays them
     * onto the strategies array so subsequent analysis uses real numbers.
     */
    async refreshLiveRates(signal?: AbortSignal): Promise<void> {
        try {
            const res = await fetch("/api/yield/rates", { signal });
            if (!res.ok) return;
            const data = await res.json();
            if (!data.rates) return;

            for (const strategy of this.strategies) {
                const rate = data.rates[strategy.mint];
                if (rate?.apy && typeof rate.apy === "number") {
                    strategy.projectedApy = rate.apy;
                }
            }

            AppEventBus.emit("AGENT_LOG", {
                message: `📡 Live rates loaded: ${this.strategies.map(s => `${s.name} ${s.projectedApy}%`).join(", ")}`,
                level: "INFO",
            });
        } catch {
            AppEventBus.emit("AGENT_LOG", {
                message: `⚠️ Could not fetch live rates — using conservative estimates`,
                level: "WARNING",
            });
        }
    },

    /**
     * The Decision Function:
     * 1. Refreshes live APY rates
     * 2. Checks Jupiter liquidity for each strategy
     * 3. Scores and recommends the best option
     */
    async determineBestStrategy(amountLamports: number, signal?: AbortSignal) {
        // 0. Refresh live rates first
        await this.refreshLiveRates(signal);

        // 1. "THINKING"
        AppEventBus.emit("AGENT_LOG", {
            message: `🤔 Reasoning: Analyzing ${this.strategies.length} yield strategies for ${(amountLamports / 1e9).toFixed(2)} SOL...`,
            level: "INFO",
        });

        // Attempt AI reasoning
        try {
            await this.generateAIReasoning(amountLamports, signal);
        } catch (e) {
            if (signal?.aborted) throw e;
            AppEventBus.emit("AGENT_LOG", {
                message: `⚠️ AI Intelligence Offline (Missing Key?). Using quantitative fallback.`,
                level: "WARNING",
            });
        }

        let bestOption: StrategyOption | null = null;
        let bestScore = -1;
        let bestQuote: any = null;

        // 2. "ANALYZING" — check real market conditions
        for (const strategy of this.strategies) {
            if (signal?.aborted) break;

            try {
                AppEventBus.emit("AGENT_LOG", {
                    message: `🛠️ MarketScanner: Fetching live quotes for ${strategy.name} (${strategy.projectedApy}% APY)...`,
                    level: "SYSTEM",
                });

                const quoteUrl = `/api/jupiter/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${strategy.mint}&amount=${amountLamports}&slippageBps=50`;
                const response = await fetch(quoteUrl, { signal });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`Proxy Error: ${response.status} - ${errText}`);
                }

                const quote = await response.json();

                if (!quote.outAmount) {
                    AppEventBus.emit("AGENT_LOG", {
                        message: `❌ ${strategy.name}: Insufficient liquidity on Jupiter.`,
                        level: "WARNING",
                    });
                    continue;
                }

                // Score = APY weighted down by risk (higher is better)
                const score = strategy.projectedApy - (strategy.riskScore * 0.1);

                AppEventBus.emit("AGENT_LOG", {
                    message: `✅ ${strategy.name}: Quote valid. APY: ${strategy.projectedApy}% | Score: ${score.toFixed(2)}`,
                    level: "INFO",
                });

                if (score > bestScore) {
                    bestScore = score;
                    bestOption = strategy;
                    bestQuote = quote;
                }

                // Brief pause so users can follow agent logs
                await new Promise(r => setTimeout(r, 250));

            } catch (e: any) {
                if (signal?.aborted) break;
                console.error(`Failed to analyze ${strategy.name}`, e);
                AppEventBus.emit("AGENT_LOG", {
                    message: `❌ Error analyzing ${strategy.name}: ${e.message}`,
                    level: "ERROR",
                });
            }
        }

        // 3. "DECIDING"
        if (bestOption) {
            AppEventBus.emit("AGENT_LOG", {
                message: `💡 Decision: Recommending ${bestOption.name} at ${bestOption.projectedApy}% APY (Score: ${bestScore.toFixed(2)})`,
                level: "SUCCESS",
            });
        }

        return {
            recommendation: bestOption || this.strategies[0],
            quote: bestQuote,
        };
    },

    /**
     * Calls /api/command for AI-generated reasoning logs
     */
    async generateAIReasoning(amountLamports: number, signal?: AbortSignal) {
        const strategyList = this.strategies
            .map(s => `- ${s.name} (${s.projectedApy}% APY, Risk: ${s.riskScore}/10)`)
            .join("\n");

        const response = await fetch("/api/command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal,
            body: JSON.stringify({
                prompt: `I am analyzing yield strategies for ${amountLamports / 1e9} SOL.
                Options:
                ${strategyList}

                Act as the Agent. Provide 1 sentence of "Thought Process" analyzing the trade-offs.
                Do not output JSON. Just the thought sentence.`
            }),
        });

        if (!response.ok) throw new Error("AI Endpoint Failed");

        const data = await response.json();

        if (data.plan && data.plan.reasoning) {
            AppEventBus.emit("AGENT_LOG", {
                message: `🧠 AI Thought: "${data.plan.reasoning}"`,
                level: "INFO",
            });
        }
    }
};
