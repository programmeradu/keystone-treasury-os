import type {
  ExecutionContext,
  AgentConfig,
  ProgressCallback,
  RouteQuote,
  SwapTokenInput,
  RebalancePortfolioInput
} from "./types";
import { BaseAgent } from "./base-agent";

/**
 * Builder Agent - Assembles complex operations from building blocks
 * Responsibilities:
 * - Route calculation (Jupiter)
 * - Portfolio rebalancing calculations
 * - Tax optimization logic
 * - Multi-leg transaction assembly
 * - DCA schedule building
 */
export class BuilderAgent extends BaseAgent {
  name = "BuilderAgent";
  private routeQuoteCache: Map<string, RouteQuote> = new Map();
  private routeCacheTTL = 30 * 1000; // 30 seconds

  constructor(
    config?: Partial<AgentConfig>,
    progressCallback?: ProgressCallback
  ) {
    const defaultConfig: AgentConfig = {
      name: "BuilderAgent",
      timeout: 15000, // 15 seconds
      retryConfig: {
        maxRetries: 3,
        initialDelayMs: 500,
        maxDelayMs: 8000,
        backoffMultiplier: 2
      },
      endpoints: {
        jupiter: "https://quote-api.jup.ag/v6"
      },
      ...config
    };

    super(defaultConfig, progressCallback);
  }

  /**
   * Validate input
   */
  async validate(context: ExecutionContext, input: any): Promise<boolean> {
    return !!input;
  }

  /**
   * Execute - route to specific building method
   */
  async executeAgent(context: ExecutionContext, input: any): Promise<any> {
    const { action, params } = input;

    switch (action) {
      case "calculate_swap_route":
        return this.calculateSwapRoute(params, context);

      case "build_swap_instructions":
        return this.buildSwapInstructions(params.quote, context);

      case "calculate_rebalance":
        return this.calculateRebalance(params, context);

      case "build_dca_schedule":
        return this.buildDCASchedule(params, context);

      case "optimize_tax_harvesting":
        return this.optimizeTaxHarvesting(params, context);

      default:
        throw new Error(`Unknown builder action: ${action}`);
    }
  }

  /**
   * Calculate swap route from Jupiter
   */
  private async calculateSwapRoute(params: SwapTokenInput, context: ExecutionContext): Promise<RouteQuote> {
    this.addStep(context, "calculate_route");

    try {
      const {
        inMint,
        outMint,
        amount,
        slippage = 0.5,
        useSharedAccountsFeature = true
      } = params;

      // Check cache
      const cacheKey = `${inMint}-${outMint}-${amount}-${slippage}`;
      const cached = this.routeQuoteCache.get(cacheKey);
      if (cached) {
        this.setContextData(context, "route_quote", cached);
        return cached;
      }

      // Call Jupiter API
      const response = await fetch(
        `${this.config.endpoints?.jupiter || "https://quote-api.jup.ag/v6"}/quote?` +
          new URLSearchParams({
            inputMint: inMint,
            outputMint: outMint,
            amount: String(amount),
            slippageBps: String(Math.round(slippage * 100)),
            onlyDirectRoutes: "false",
            asLegacyTransaction: "false"
          })
      );

      if (!response.ok) {
        throw new Error(`Failed to get Jupiter quote: ${response.status}`);
      }

      const data = await response.json();

      const quote: RouteQuote = {
        inAmount: data.inAmount,
        outAmount: data.outAmount,
        outAmountWithSlippage: data.outAmountWithSlippage,
        priceImpactPct: data.priceImpactPct,
        marketInfos: data.marketInfos || [],
        routePlan: data.routePlan || []
      };

      // Cache it
      this.routeQuoteCache.set(cacheKey, quote);
      setTimeout(() => this.routeQuoteCache.delete(cacheKey), this.routeCacheTTL);

      this.setContextData(context, "route_quote", quote);
      return quote;
    } catch (error: any) {
      throw new Error(
        `Route calculation failed: ${error.message || String(error)}`
      );
    }
  }

  /**
   * Build swap instructions from Jupiter quote
   */
  private async buildSwapInstructions(quote: RouteQuote, context: ExecutionContext): Promise<any> {
    this.addStep(context, "build_swap_instructions");

    try {
      // In a real implementation, this would use Jupiter's swap instruction builder
      // For now, return a representation of the instructions

      return {
        instructions: quote.routePlan.map((route: any, idx: number) => ({
          type: "swap",
          sequence: idx,
          pool: route.swapInfo?.label || "Unknown Pool",
          inAmount: route.inAmount,
          outAmount: route.outAmount
        })),
        priceImpact: quote.priceImpactPct,
        outputAmount: quote.outAmountWithSlippage
      };
    } catch (error: any) {
      throw new Error(
        `Failed to build swap instructions: ${error.message}`
      );
    }
  }

  /**
   * Calculate portfolio rebalancing operations
   */
  private async calculateRebalance(params: RebalancePortfolioInput, context: ExecutionContext): Promise<any> {
    this.addStep(context, "calculate_rebalance");

    try {
      const { targets, tolerance = 2 } = params;

      // Get current portfolio from context (should be fetched by LookupAgent)
      const currentHoldings = this.getContextData(
        context,
        "wallet_holdings"
      ) || {};

      // Calculate allocations needed
      const operations: any[] = [];
      let totalValue = 0;

      // Sum up current value
      for (const [mint, holding] of Object.entries(currentHoldings)) {
        const price =
          this.getContextData(context, `price_${mint}`) || 0;
        totalValue += (holding as any).uiAmount * price;
      }

      // Generate rebalancing operations
      for (const [targetMint, targetPercent] of Object.entries(targets)) {
        const currentAllocation = currentHoldings[targetMint]
          ? ((currentHoldings[targetMint] as any).uiAmount /
              totalValue) *
            100
          : 0;
        const delta = (targetPercent as number) - currentAllocation;

        if (Math.abs(delta) > tolerance) {
          operations.push({
            mint: targetMint,
            action: delta > 0 ? "buy" : "sell",
            targetAllocation: targetPercent,
            currentAllocation,
            delta,
            value: (totalValue * Math.abs(delta)) / 100
          });
        }
      }

      this.setContextData(context, "rebalance_operations", operations);
      return {
        operations,
        totalPortfolioValue: totalValue,
        rebalancingNeeded: operations.length > 0
      };
    } catch (error: any) {
      throw new Error(
        `Rebalance calculation failed: ${error.message}`
      );
    }
  }

  /**
   * Build DCA schedule
   */
  private async buildDCASchedule(params: any, context: ExecutionContext): Promise<any> {
    this.addStep(context, "build_dca_schedule");

    try {
      const {
        inMint,
        outMint,
        amount,
        frequency = "daily",
        iterations = 12
      } = params;

      // Calculate interval in milliseconds
      const intervalMap: Record<string, number> = {
        hourly: 60 * 60 * 1000,
        daily: 24 * 60 * 60 * 1000,
        weekly: 7 * 24 * 60 * 60 * 1000,
        monthly: 30 * 24 * 60 * 60 * 1000
      };

      const interval = intervalMap[frequency] || intervalMap.daily;
      const perExecutionAmount = amount / iterations;

      // Generate schedule
      const schedule = [];
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        schedule.push({
          executionNumber: i + 1,
          timestamp: startTime + i * interval,
          amount: perExecutionAmount,
          inMint,
          outMint,
          status: "pending"
        });
      }

      this.setContextData(context, "dca_schedule", schedule);
      return {
        schedule,
        frequency,
        totalAmount: amount,
        perExecution: perExecutionAmount,
        iterations,
        totalDuration: (iterations - 1) * interval
      };
    } catch (error: any) {
      throw new Error(`DCA schedule building failed: ${error.message}`);
    }
  }

  /**
   * Optimize tax harvesting
   */
  private async optimizeTaxHarvesting(params: any, context: ExecutionContext): Promise<any> {
    this.addStep(context, "optimize_tax_harvesting");

    try {
      const { holdings, prices = {}, targetAllocation } = params;

      // Identify losing positions for tax loss harvesting
      const opportunities: any[] = [];

      for (const holding of holdings) {
        const currentPrice = prices[holding.mint] || 0;
        const costBasis = holding.costBasis || 0;
        const unrealizedLoss = (currentPrice - costBasis) * holding.amount;

        if (unrealizedLoss < 0) {
          opportunities.push({
            mint: holding.mint,
            unrealizedLoss: Math.abs(unrealizedLoss),
            sellAmount: holding.amount,
            recommendation: "harvest_loss"
          });
        }
      }

      return {
        opportunities,
        estimatedTaxSavings: opportunities.reduce(
          (sum, o) => sum + o.unrealizedLoss * 0.25,
          0
        ), // Assume 25% tax rate
        strategy: "loss_harvesting"
      };
    } catch (error: any) {
      throw new Error(
        `Tax harvesting optimization failed: ${error.message}`
      );
    }
  }
}
