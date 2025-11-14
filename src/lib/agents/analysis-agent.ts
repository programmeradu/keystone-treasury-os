import type {
  ExecutionContext,
  AgentConfig,
  ProgressCallback,
  TokenSafetyAnalysis,
  MEVOpportunity,
  CheckResult,
  SafetyFlag
} from "./types";
import { BaseAgent } from "./base-agent";

/**
 * Analysis Agent - Performs complex analysis and detection
 * Responsibilities:
 * - Rug pull detection and scoring
 * - MEV opportunity identification
 * - Trend analysis
 * - Risk assessment
 * - Pattern matching for fraud
 */
export class AnalysisAgent extends BaseAgent {
  name = "AnalysisAgent";

  constructor(
    config?: Partial<AgentConfig>,
    progressCallback?: ProgressCallback
  ) {
    const defaultConfig: AgentConfig = {
      name: "AnalysisAgent",
      timeout: 20000, // 20 seconds
      retryConfig: {
        maxRetries: 2,
        initialDelayMs: 500,
        maxDelayMs: 5000,
        backoffMultiplier: 2
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
   * Execute - route to specific analysis method
   */
  async executeAgent(context: ExecutionContext, input: any): Promise<any> {
    const { action, params } = input;

    switch (action) {
      case "analyze_token_safety":
        return this.analyzeTokenSafety(params.mint, params.lookupData);

      case "detect_mev":
        return this.detectMEV(params.transactions);

      case "analyze_trends":
        return this.analyzeTrends(params.tokens, params.historicalData);

      case "assess_portfolio_risk":
        return this.assessPortfolioRisk(params.holdings, params.prices);

      default:
        throw new Error(`Unknown analysis action: ${action}`);
    }
  }

  /**
   * Analyze token safety - comprehensive risk assessment
   */
  private async analyzeTokenSafety(
    mint: string,
    lookupData?: any,
    context?: ExecutionContext
  ): Promise<TokenSafetyAnalysis> {
    if (context) this.addStep(context, "analyze_token_safety");

    try {
      const checks: Record<string, CheckResult> = {};
      const flags: SafetyFlag[] = [];

      // Check 1: Metadata Verification
      checks.metadataVerified = this.checkMetadataVerification(lookupData?.metadata);

      // Check 2: Holder Distribution
      const distributionCheck = this.checkHolderDistribution(
        lookupData?.distribution
      );
      checks.holderDistribution = distributionCheck.check;
      if (distributionCheck.flag) flags.push(distributionCheck.flag);

      // Check 3: Liquidity
      const liquidityCheck = this.checkLiquidity(lookupData?.liquidity);
      checks.liquidity = liquidityCheck.check;
      if (liquidityCheck.flag) flags.push(liquidityCheck.flag);

      // Check 4: Age
      const ageCheck = this.checkTokenAge(lookupData?.ageInDays);
      checks.tokenAge = ageCheck.check;
      if (ageCheck.flag) flags.push(ageCheck.flag);

      // Check 5: Upgrade Authority
      const upgradeCheck = this.checkUpgradeAuthority(
        lookupData?.upgradeable
      );
      checks.upgradeAuthority = upgradeCheck.check;
      if (upgradeCheck.flag) flags.push(upgradeCheck.flag);

      // Check 6: Frozen Accounts
      const frozenCheck = this.checkFrozenAccounts(lookupData?.frozenAccounts);
      checks.frozenAccounts = frozenCheck.check;
      if (frozenCheck.flag) flags.push(frozenCheck.flag);

      // Calculate overall risk score
      const riskScore = this.calculateRiskScore(checks, flags);

      const verdict: "safe" | "warning" | "high_risk" =
        riskScore < 30 ? "safe" : riskScore < 60 ? "warning" : "high_risk";

      return {
        mint,
        riskScore,
        verdict,
        checks,
        flags,
        metadata: lookupData?.metadata
      };
    } catch (error: any) {
      throw new Error(`Token safety analysis failed: ${error.message}`);
    }
  }

  /**
   * Detect MEV opportunities
   */
  private async detectMEV(transactions: any[], context?: ExecutionContext): Promise<MEVOpportunity[]> {
    if (context) this.addStep(context, "detect_mev");

    const opportunities: MEVOpportunity[] = [];

    try {
      for (const tx of transactions) {
        // Check for arbitrage opportunity
        const arbitrage = this.detectArbitrage(tx);
        if (arbitrage) opportunities.push(arbitrage);

        // Check for sandwich opportunity
        const sandwich = this.detectSandwich(tx);
        if (sandwich) opportunities.push(sandwich);

        // Check for liquidation opportunity
        const liquidation = this.detectLiquidation(tx);
        if (liquidation) opportunities.push(liquidation);
      }

      return opportunities;
    } catch (error: any) {
      throw new Error(`MEV detection failed: ${error.message}`);
    }
  }

  /**
   * Analyze price trends
   */
  private async analyzeTrends(tokens: string[], historicalData?: any[], context?: ExecutionContext): Promise<any> {
    if (context) this.addStep(context, "analyze_trends");

    try {
      const trends = tokens.map((token) => {
        const data = historicalData?.find((d) => d.mint === token) || [];

        if (data.length < 2) {
          return {
            mint: token,
            trend: "insufficient_data",
            volatility: 0,
            change24h: 0
          };
        }

        // Calculate simple trend
        const firstPrice = data[0].price;
        const lastPrice = data[data.length - 1].price;
        const change = ((lastPrice - firstPrice) / firstPrice) * 100;

        // Calculate volatility (standard deviation)
        const prices = data.map((d: any) => d.price);
        const volatility = this.calculateVolatility(prices);

        return {
          mint: token,
          trend: change > 5 ? "up" : change < -5 ? "down" : "stable",
          volatility,
          change24h: change
        };
      });

      return trends;
    } catch (error: any) {
      throw new Error(`Trend analysis failed: ${error.message}`);
    }
  }

  /**
   * Assess portfolio risk
   */
  private async assessPortfolioRisk(holdings: any[], prices?: any[], context?: ExecutionContext): Promise<any> {
    if (context) this.addStep(context, "assess_portfolio_risk");

    try {
      let totalValue = 0;
      let riskyValue = 0;
      const riskBreakdown: any = {};

      for (const holding of holdings) {
        const price = prices?.find((p) => p.mint === holding.mint)?.price || 0;
        const value = holding.uiAmount * price;
        totalValue += value;

        // Simple risk categorization
        const holdingRisk = this.categorizeHoldingRisk(holding);
        if (holdingRisk === "high") {
          riskyValue += value;
          riskBreakdown[holding.mint] = { value, risk: "high" };
        } else if (holdingRisk === "medium") {
          riskyValue += value * 0.5;
          riskBreakdown[holding.mint] = { value, risk: "medium" };
        }
      }

      const riskPercentage = totalValue > 0 ? (riskyValue / totalValue) * 100 : 0;

      return {
        totalValue,
        riskyValue,
        riskPercentage,
        riskLevel:
          riskPercentage > 50
            ? "high"
            : riskPercentage > 25
              ? "medium"
              : "low",
        breakdown: riskBreakdown
      };
    } catch (error: any) {
      throw new Error(`Portfolio risk assessment failed: ${error.message}`);
    }
  }

  // ===== Helper Methods =====

  private checkMetadataVerification(metadata?: any): CheckResult {
    if (!metadata) {
      return { status: "warning", message: "Metadata not found" };
    }

    if (!metadata.verified) {
      return { status: "warning", message: "Metadata not verified" };
    }

    if (!metadata.symbol || !metadata.name) {
      return { status: "warning", message: "Incomplete metadata" };
    }

    return { status: "pass", message: "Metadata verified" };
  }

  private checkHolderDistribution(distribution?: any): {
    check: CheckResult;
    flag?: SafetyFlag;
  } {
    if (!distribution) {
      return {
        check: { status: "warning", message: "Distribution data unavailable" }
      };
    }

    if (distribution.concentration === "high") {
      return {
        check: {
          status: "warning",
          message: `High holder concentration: ${distribution.topHolder?.percent}%`
        },
        flag: {
          severity: "high",
          message: `Whale risk: top holder owns ${distribution.topHolder?.percent}%`
        }
      };
    }

    return {
      check: { status: "pass", message: "Holder distribution healthy" }
    };
  }

  private checkLiquidity(liquidity?: any): {
    check: CheckResult;
    flag?: SafetyFlag;
  } {
    if (!liquidity || liquidity.liquidity < 10000) {
      return {
        check: {
          status: "warning",
          message: "Low liquidity"
        },
        flag: {
          severity: "high",
          message: "Token has very low liquidity - high slippage risk"
        }
      };
    }

    return { check: { status: "pass", message: "Liquidity adequate" } };
  }

  private checkTokenAge(ageInDays?: number): {
    check: CheckResult;
    flag?: SafetyFlag;
  } {
    if (!ageInDays || ageInDays < 7) {
      return {
        check: { status: "warning", message: "Token very new" },
        flag: {
          severity: "medium",
          message: "Token launched recently - monitor carefully"
        }
      };
    }

    return { check: { status: "pass", message: "Token age acceptable" } };
  }

  private checkUpgradeAuthority(upgradeable?: boolean): {
    check: CheckResult;
    flag?: SafetyFlag;
  } {
    if (upgradeable) {
      return {
        check: { status: "warning", message: "Token is upgradeable" },
        flag: {
          severity: "high",
          message: "Token contract is upgradeable - dev can change behavior"
        }
      };
    }

    return { check: { status: "pass", message: "Token not upgradeable" } };
  }

  private checkFrozenAccounts(frozenAccounts?: any): {
    check: CheckResult;
    flag?: SafetyFlag;
  } {
    if (frozenAccounts && frozenAccounts.count > 0) {
      return {
        check: {
          status: "warning",
          message: `${frozenAccounts.count} frozen accounts detected`
        },
        flag: {
          severity: "medium",
          message: `Found ${frozenAccounts.count} frozen accounts - potential lock mechanism`
        }
      };
    }

    return { check: { status: "pass", message: "No frozen accounts" } };
  }

  private calculateRiskScore(
    checks: Record<string, CheckResult>,
    flags: SafetyFlag[]
  ): number {
    let score = 0;

    // Each failed check adds points
    Object.values(checks).forEach((check) => {
      if (check.status === "fail") score += 30;
      else if (check.status === "warning") score += 10;
    });

    // Each flag adds points based on severity
    flags.forEach((flag) => {
      if (flag.severity === "high") score += 20;
      else if (flag.severity === "medium") score += 10;
    });

    return Math.min(100, score);
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const mean = prices.reduce((a, b) => a + b) / prices.length;
    const variance =
      prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) /
      prices.length;
    return Math.sqrt(variance) / mean;
  }

  private categorizeHoldingRisk(holding: any): "low" | "medium" | "high" {
    // Known safe tokens
    const safeTokens = [
      "So11111111111111111111111111111111111111112", // SOL
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
      "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenErt" // USDT
    ];

    if (safeTokens.includes(holding.mint)) {
      return "low";
    }

    // Very small positions = lower risk
    if (holding.uiAmount < 100) {
      return "low";
    }

    // Unknown tokens = medium/high risk
    return "medium";
  }

  private detectArbitrage(tx: any): MEVOpportunity | null {
    // Placeholder: would analyze transaction for arbitrage patterns
    if (tx.type === "arbitrage") {
      return {
        type: "arbitrage",
        tokens: tx.tokens || [],
        profitPotential: tx.profit || 0,
        risk: "low",
        details: tx
      };
    }
    return null;
  }

  private detectSandwich(tx: any): MEVOpportunity | null {
    // Placeholder: would analyze transaction for sandwich patterns
    if (tx.type === "sandwich") {
      return {
        type: "sandwich",
        tokens: tx.tokens || [],
        profitPotential: tx.profit || 0,
        risk: "high",
        details: tx
      };
    }
    return null;
  }

  private detectLiquidation(tx: any): MEVOpportunity | null {
    // Placeholder: would analyze transaction for liquidation patterns
    if (tx.type === "liquidation") {
      return {
        type: "liquidation",
        tokens: tx.tokens || [],
        profitPotential: tx.profit || 0,
        risk: "medium",
        details: tx
      };
    }
    return null;
  }
}
