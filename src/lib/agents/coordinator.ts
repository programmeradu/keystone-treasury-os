import { v4 as uuidv4 } from "uuid";
import type {
  ExecutionContext,
  StrategyType,
  ExecutionResult,
  ProgressCallback,
  AgentConfig
} from "./types";
import { ExecutionStatus, ErrorSeverity } from "./types";
import { TransactionAgent } from "./transaction-agent";
import { LookupAgent } from "./lookup-agent";
import { AnalysisAgent } from "./analysis-agent";
import { BuilderAgent } from "./builder-agent";
import { SimulationFirewall } from "@/lib/studio/simulation-firewall";
import type { FirewallReport } from "@/lib/studio/simulation-firewall";
import { getJupiterQuote } from "@/lib/jupiter-executor";
import type { PortfolioAsset } from "@/lib/helius";

// Well-known Solana token mint addresses for symbol resolution
const COMMON_MINTS: Record<string, string> = {
  SOL: "So11111111111111111111111111111111111111112",
  WSOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  RAY: "4k3Dyjzvzp8eMZxHZCGCRaeLJZoFpK6XNbRIo5jZbGT5",
  ORCA: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
  MSOL: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
  JITOSOL: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
  JITO: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
  JTO: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
  BSOL: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
  WIF: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
  PYTH: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
};

/**
 * Execution Coordinator - Orchestrates all agents and manages execution state
 * Responsibilities:
 * - State machine management
 * - Inter-agent communication
 * - Error recovery and rollback
 * - Progress tracking and reporting
 * - User approval workflows
 */
export class ExecutionCoordinator {
  private rpcEndpoint: string;
  private executionContexts: Map<string, ExecutionContext> = new Map();
  private transactionAgent: TransactionAgent;
  private lookupAgent: LookupAgent;
  private analysisAgent: AnalysisAgent;
  private builderAgent: BuilderAgent;
  private progressCallbacks: Map<string, ProgressCallback> = new Map();

  constructor(rpcEndpoint: string, agentConfigs?: Record<string, Partial<AgentConfig>>) {
    this.rpcEndpoint = rpcEndpoint;
    this.transactionAgent = new TransactionAgent(
      rpcEndpoint,
      agentConfigs?.transactionAgent
    );
    this.lookupAgent = new LookupAgent(agentConfigs?.lookupAgent);
    this.analysisAgent = new AnalysisAgent(agentConfigs?.analysisAgent);
    this.builderAgent = new BuilderAgent(agentConfigs?.builderAgent);
  }

  /**
   * Execute a strategy with full coordination
   */
  async executeStrategy(
    strategy: StrategyType,
    input: any,
    userPublicKey: any,
    progressCallback?: ProgressCallback
  ): Promise<ExecutionResult> {
    const executionId = uuidv4();
    const startTime = Date.now();

    try {
      // Create execution context
      const context: ExecutionContext = {
        executionId,
        strategy,
        state: ExecutionStatus.PENDING,
        userPublicKey,
        startTime,
        approvalRequired: false,
        progress: 0,
        steps: [],
        errors: [],
        data: {}
      };

      // Store context
      this.executionContexts.set(executionId, context);

      if (progressCallback) {
        this.progressCallbacks.set(executionId, progressCallback);
      }

      // Log start
      this.log(executionId, `Executing strategy: ${strategy}`);

      // Route to strategy handler
      await this.routeStrategy(context, strategy, input);

      // Return result
      return this.createResult(context, startTime);
    } catch (error: any) {
      const context = this.executionContexts.get(executionId);
      if (context) {
        context.state = ExecutionStatus.FAILED;
        context.errors.push({
          code: "STRATEGY_FAILED",
          message: error.message || String(error),
          severity: ErrorSeverity.ERROR,
          timestamp: Date.now(),
          retryable: false,
        });
        this.updateProgress(context);
      }

      this.log(executionId, `Strategy execution failed: ${error.message}`);

      return {
        executionId,
        strategy,
        status: ExecutionStatus.FAILED,
        success: false,
        errors: context?.errors || [{ code: "UNKNOWN", message: error.message, severity: ErrorSeverity.ERROR, timestamp: Date.now(), retryable: false }],
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Route strategy to appropriate agent(s)
   */
  private async routeStrategy(
    context: ExecutionContext,
    strategy: StrategyType,
    input: any
  ): Promise<void> {
    switch (strategy) {
      case "swap_token":
        await this.executeSwap(context, input);
        break;

      case "rebalance_portfolio":
        await this.executeRebalance(context, input);
        break;

      case "stake_sol":
        await this.executeStake(context, input);
        break;

      case "analyze_token_safety":
        await this.analyzeTokenSafety(context, input);
        break;

      case "detect_mev":
        await this.detectMEVOpportunities(context, input);
        break;

      case "execute_dca":
        await this.executeDCA(context, input);
        break;

      case "optimize_fees":
        await this.optimizeFees(context, input);
        break;

      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }
  }

  /**
   * Execute swap strategy - REAL Jupiter integration
   * State machine: PLANNING → SIMULATING → APPROVAL_REQUIRED (or FAILED)
   */
  private async executeSwap(
    context: ExecutionContext,
    input: any
  ): Promise<void> {
    // ═══════════════════════════════════════════════════════════════════
    // Phase 1: PLANNING — Fetch data and build route
    // ═══════════════════════════════════════════════════════════════════
    context.state = ExecutionStatus.PLANNING;
    this.updateProgress(context);

    try {
      // Step 1: Get token metadata
      this.log(context.executionId, "Fetching token metadata...");
      const inMetadata = await this.lookupAgent.executeAgent(context, {
        action: "resolve_token_metadata",
        params: { mint: input.inputMint || input.inMint }
      });
      const outMetadata = await this.lookupAgent.executeAgent(context, {
        action: "resolve_token_metadata",
        params: { mint: input.outputMint || input.outMint }
      });

      context.progress = 15;
      this.updateProgress(context);

      // Step 2: Get real prices from Jupiter
      this.log(context.executionId, "Fetching real prices...");
      const prices = await this.lookupAgent.executeAgent(context, {
        action: "fetch_token_prices",
        params: { mints: [input.inputMint || input.inMint, input.outputMint || input.outMint] }
      });

      context.progress = 30;
      this.updateProgress(context);

      // Step 3: Get real quote from Jupiter
      this.log(context.executionId, "Getting Jupiter quote...");
      const quote = await this.builderAgent.executeAgent(context, {
        action: "calculate_swap_route",
        params: {
          inMint: input.inputMint || input.inMint,
          outMint: input.outputMint || input.outMint,
          amount: input.amount,
          slippage: input.slippage || 0.5
        }
      });

      context.progress = 50;
      this.updateProgress(context);
      context.data.swap_quote = quote;

      // Step 4: Build swap instructions
      this.log(context.executionId, "Building swap instructions...");
      const swapInstructions = await this.builderAgent.executeAgent(context, {
        action: "build_swap_instructions",
        params: { quote }
      });

      context.progress = 65;
      this.updateProgress(context);

      // ═══════════════════════════════════════════════════════════════════
      // Phase 2: SIMULATING — The "Missing Link"
      // SimulationFirewall.protect() for pre-flight + TransactionAgent for tx sim
      // ═══════════════════════════════════════════════════════════════════
      context.state = ExecutionStatus.SIMULATING;
      this.updateProgress(context);
      this.log(context.executionId, "Entering SIMULATING state — running Simulation Firewall...");

      // 5a. Pre-flight protection via SimulationFirewall singleton
      const firewall = SimulationFirewall.getInstance();
      const firewallReport: FirewallReport = firewall.protect(quote);

      context.progress = 75;
      this.updateProgress(context);

      // 5b. HARD BLOCK — if firewall fails, execution stops here
      if (!firewallReport.passed) {
        context.state = ExecutionStatus.FAILED;
        context.errors.push({
          code: "SIMULATION_FIREWALL_BLOCKED",
          message: firewallReport.blockedReason || "Simulation Firewall blocked this transaction",
          severity: ErrorSeverity.CRITICAL,
          timestamp: Date.now(),
          retryable: false,
          context: {
            checks: firewallReport.checks,
            priceImpact: firewallReport.priceImpact,
            riskLevel: firewallReport.riskLevel,
          },
        });
        this.updateProgress(context);
        this.log(context.executionId, `BLOCKED by Simulation Firewall: ${firewallReport.blockedReason}`);

        // Store the firewall report for the API response
        context.data.simulation = {
          passed: false,
          firewallReport,
        };
        context.data.swap_result = {
          inputMint: input.inputMint || input.inMint,
          outputMint: input.outputMint || input.outMint,
          inAmount: quote.inAmount,
          outAmount: quote.outAmount,
          priceImpact: quote.priceImpactPct,
          riskLevel: firewallReport.riskLevel,
          simulationPassed: false,
          ready: false,
          requiresApproval: false,
        };

        throw new Error(`Simulation Firewall BLOCKED: ${firewallReport.blockedReason}`);
      }

      // 5c. On-chain simulation via TransactionAgent (if tx bytes are available)
      let txSimulationResult = null;
      const txData = context.data.transaction_prepared;
      if (txData) {
        this.log(context.executionId, "Running on-chain transaction simulation via TransactionAgent...");
        try {
          txSimulationResult = await this.transactionAgent.executeAgent(context, {
            transaction: txData,
            simulateOnly: true,
            feeLimitSol: 0.1,
          });
          this.log(context.executionId, `TransactionAgent simulation: ${txSimulationResult.simulated ? "PASSED" : "FAILED"}`);
        } catch (txSimErr: any) {
          // TransactionAgent simulation failed — hard block
          context.state = ExecutionStatus.FAILED;
          context.errors.push({
            code: "TX_SIMULATION_FAILED",
            message: txSimErr.message,
            severity: ErrorSeverity.CRITICAL,
            timestamp: Date.now(),
            retryable: false,
          });
          this.updateProgress(context);
          context.data.simulation = { passed: false, firewallReport, txSimError: txSimErr.message };
          throw new Error(`Transaction simulation FAILED: ${txSimErr.message}`);
        }
      } else {
        this.log(context.executionId, "No raw tx bytes yet — pre-flight checks passed, deferring on-chain sim to wallet signing");
      }

      context.progress = 85;
      this.updateProgress(context);
      this.log(context.executionId, `Simulation Firewall PASSED: risk=${firewallReport.riskLevel}, priceImpact=${firewallReport.priceImpact}%`);

      // Store the full simulation report (the "Green Shield" data for the UI)
      context.data.simulation = {
        passed: true,
        firewallReport,
        txSimulation: txSimulationResult,
      };

      // ═══════════════════════════════════════════════════════════════════
      // Phase 3: APPROVAL — Only reachable if simulation passed
      // ═══════════════════════════════════════════════════════════════════
      context.approvalRequired = true;
      context.state = ExecutionStatus.APPROVAL_REQUIRED;
      this.updateProgress(context);

      this.log(context.executionId, `Swap prepared: ${quote.outAmountWithSlippage} output with ${quote.priceImpactPct}% price impact`);
      
      context.data.swap_result = {
        inputMint: input.inputMint || input.inMint,
        outputMint: input.outputMint || input.outMint,
        inAmount: quote.inAmount,
        outAmount: quote.outAmount,
        outAmountWithSlippage: quote.outAmountWithSlippage,
        priceImpact: quote.priceImpactPct,
        riskLevel: firewallReport.riskLevel,
        simulationPassed: true,
        firewallChecks: firewallReport.checks,
        humanSummary: firewallReport.humanSummary,
        instructions: swapInstructions.instructions,
        ready: true,
        requiresApproval: true,
      };

      // Build serialized transaction for client signing (after simulation firewall approval)
      const wallet = context.userPublicKey ? String(context.userPublicKey) : (input.wallet || null);
      const rawQuote = context.data["BuilderAgent:jupiter_quote_raw"];
      if (wallet && rawQuote) {
        try {
          this.log(context.executionId, "Building serialized swap transaction via Jupiter Swap API...");
          const jupiterApiKey = process.env.NEXT_PUBLIC_JUPITER_API_KEY || "";
          const swapHeaders: Record<string, string> = { "Content-Type": "application/json" };
          if (jupiterApiKey) swapHeaders["x-api-key"] = jupiterApiKey;
          const swapRes = await fetch("https://lite-api.jup.ag/swap/v1/swap", {
            method: "POST",
            headers: swapHeaders,
            body: JSON.stringify({
              quoteResponse: rawQuote,
              userPublicKey: wallet,
              wrapAndUnwrapSol: true,
              dynamicComputeUnitLimit: true,
              prioritizationFeeLamports: "auto",
            }),
          });
          if (swapRes.ok) {
            const { swapTransaction } = await swapRes.json();
            if (swapTransaction) {
              context.data.serializedTransactions = [swapTransaction];
              this.log(context.executionId, "Swap transaction built; ready for wallet signature.");
            }
          } else {
            const errText = await swapRes.text();
            this.log(context.executionId, `Jupiter swap build failed: ${errText}`);
          }
        } catch (swapErr: any) {
          this.log(context.executionId, `Swap tx build error: ${swapErr.message}`);
        }
      } else {
        this.log(context.executionId, "No wallet or raw quote — connect wallet to get signable transaction.");
      }
    } catch (error: any) {
      this.log(context.executionId, `Swap failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch portfolio via Helius DAS API (getAssetsByOwner).
   * Uses the same endpoint and logic as HeliusClient but avoids
   * importing the "use client" module in server-side coordinator code.
   */
  private async fetchPortfolio(wallet: string): Promise<PortfolioAsset[]> {
    const response = await fetch(this.rpcEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "rebalance-portfolio",
        method: "getAssetsByOwner",
        params: {
          ownerAddress: wallet,
          displayOptions: { showFungible: true, showNativeBalance: true },
        },
      }),
    });

    const data = await response.json();
    const items = data.result?.items || [];

    return items
      .filter((item: any) => item.interface === "FungibleToken" || item.interface === "FungibleAsset")
      .map((item: any) => ({
        mint: item.id,
        symbol: item.content?.metadata?.symbol || "SPL",
        name: item.content?.metadata?.name || "Unknown",
        amount: item.token_info?.balance
          ? item.token_info.balance / Math.pow(10, item.token_info.decimals || 0)
          : 0,
        decimals: item.token_info?.decimals || 0,
        pricePerToken: item.token_info?.price_info?.price_per_token || 0,
        totalUsdValue: item.token_info?.price_info?.total_price || 0,
      }));
  }

  /**
   * Execute rebalance strategy using Helius DAS + Jupiter quotes
   */
  private async executeRebalance(
    context: ExecutionContext,
    input: any
  ): Promise<void> {
    context.state = ExecutionStatus.PLANNING;
    this.updateProgress(context);

    try {
      const wallet = input.wallet || (context.userPublicKey ? String(context.userPublicKey) : null);
      if (!wallet) {
        throw new Error("Wallet address is required for portfolio rebalance");
      }

      // ── Phase 1: Get real portfolio snapshot via Helius DAS ──
      this.log(context.executionId, "Fetching portfolio via Helius DAS API...");
      const portfolio = await this.fetchPortfolio(wallet);

      if (portfolio.length === 0) {
        throw new Error("No fungible token holdings found for this wallet");
      }

      const totalValue = portfolio.reduce((sum, a) => sum + a.totalUsdValue, 0);
      if (totalValue <= 0) {
        throw new Error("Portfolio USD value could not be determined (Helius DAS returned $0)");
      }

      // Build lookup: mint → current allocation + asset data
      const assetByMint: Record<string, PortfolioAsset & { percent: number }> = {};
      for (const asset of portfolio) {
        assetByMint[asset.mint] = { ...asset, percent: (asset.totalUsdValue / totalValue) * 100 };
      }

      context.progress = 25;
      this.updateProgress(context);

      // ── Phase 2: Compute rebalance deltas ──
      this.log(context.executionId, "Computing rebalance deltas...");
      const tolerance = input.tolerance || 5;
      const USDC_MINT = COMMON_MINTS.USDC;

      // Resolve target allocations: [{ token, percentage }] → { mint: percent }
      const targets: Record<string, number> = {};
      if (Array.isArray(input.targetAllocations)) {
        for (const alloc of input.targetAllocations) {
          const symbol = (alloc.token || "").toUpperCase();
          targets[COMMON_MINTS[symbol] || alloc.token] = alloc.percentage;
        }
      } else if (input.targets) {
        Object.assign(targets, input.targets);
      }

      interface RebalanceOp {
        mint: string;
        symbol: string;
        action: "buy" | "sell";
        targetPercent: number;
        currentPercent: number;
        delta: number;
        usdValue: number;
        asset: PortfolioAsset | null;
      }

      const operations: RebalanceOp[] = [];
      for (const [mint, targetPercent] of Object.entries(targets)) {
        const current = assetByMint[mint]?.percent ?? 0;
        const delta = targetPercent - current;
        if (Math.abs(delta) > tolerance) {
          operations.push({
            mint,
            symbol: assetByMint[mint]?.symbol || "???",
            action: delta > 0 ? "buy" : "sell",
            targetPercent,
            currentPercent: current,
            delta,
            usdValue: (totalValue * Math.abs(delta)) / 100,
            asset: assetByMint[mint] || null,
          });
        }
      }

      context.progress = 40;
      this.updateProgress(context);

      // ── Phase 3: Get real Jupiter quotes for each trade ──
      this.log(context.executionId, `Fetching Jupiter quotes for ${operations.length} trades...`);
      const trades: any[] = [];

      for (const op of operations) {
        try {
          let inMint: string;
          let outMint: string;
          let amountSmallestUnit: number;

          if (op.action === "sell" && op.asset) {
            // Sell: we know the exact token amount from the DAS portfolio
            inMint = op.mint;
            outMint = USDC_MINT;
            const fractionToSell = op.usdValue / op.asset.totalUsdValue;
            amountSmallestUnit = Math.floor(
              fractionToSell * op.asset.amount * Math.pow(10, op.asset.decimals)
            );
          } else {
            // Buy: spend USDC (6 decimals, $1 parity)
            inMint = USDC_MINT;
            outMint = op.mint;
            amountSmallestUnit = Math.floor(op.usdValue * 1e6);
          }

          if (amountSmallestUnit <= 0) continue;

          const quote = await getJupiterQuote(inMint, outMint, amountSmallestUnit);
          if (!quote) {
            trades.push({ ...this.formatTradeBase(op), quoteError: "No Jupiter route available" });
            continue;
          }

          trades.push({
            ...this.formatTradeBase(op),
            inputAmount: amountSmallestUnit,
            quote: {
              inputMint: quote.inputMint,
              outputMint: quote.outputMint,
              inAmount: quote.inAmount,
              outAmount: quote.outAmount,
              priceImpactPct: quote.priceImpactPct,
              routePlan: quote.routePlan,
              slippageBps: quote.slippageBps,
            },
          });
        } catch (err: any) {
          this.log(context.executionId, `Quote failed for ${op.symbol}: ${err.message}`);
          trades.push({ ...this.formatTradeBase(op), quoteError: err.message });
        }
      }

      context.progress = 65;
      this.updateProgress(context);

      // ── Phase 4: Build serialized swap transactions via Jupiter Swap API ──
      this.log(context.executionId, `Building swap transactions for ${trades.filter((t: any) => t.quote).length} quoted trades...`);
      const serializedTransactions: string[] = [];
      const jupiterApiKey = process.env.NEXT_PUBLIC_JUPITER_API_KEY || "";
      const swapHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (jupiterApiKey) swapHeaders["x-api-key"] = jupiterApiKey;

      for (const trade of trades) {
        if (!trade.quote) continue;
        try {
          const swapRes = await fetch("https://lite-api.jup.ag/swap/v1/swap", {
            method: "POST",
            headers: swapHeaders,
            body: JSON.stringify({
              quoteResponse: trade.quote,
              userPublicKey: wallet,
              wrapAndUnwrapSol: true,
              dynamicComputeUnitLimit: true,
              prioritizationFeeLamports: "auto",
            }),
          });

          if (swapRes.ok) {
            const { swapTransaction } = await swapRes.json();
            if (swapTransaction) {
              serializedTransactions.push(swapTransaction);
              trade.serializedTransaction = swapTransaction;
            }
          } else {
            const errText = await swapRes.text();
            this.log(context.executionId, `Swap build failed for ${trade.symbol}: ${errText}`);
            trade.swapBuildError = errText;
          }
        } catch (swapErr: any) {
          this.log(context.executionId, `Swap build error for ${trade.symbol}: ${swapErr.message}`);
          trade.swapBuildError = swapErr.message;
        }
      }

      context.progress = 85;
      this.updateProgress(context);

      // ── Phase 5: Risk assessment ──
      this.log(context.executionId, "Analyzing portfolio risk...");
      await this.analysisAgent.executeAgent(context, {
        action: "assess_portfolio_risk",
        params: { holdings: portfolio, prices: {} }
      });

      context.data.portfolio = portfolio;
      context.data.totalValue = totalValue;
      context.data.trades = trades;
      context.data.operationCount = operations.length;
      context.data.serializedTransactions = serializedTransactions;
      context.approvalRequired = true;
      context.progress = 100;
      context.state = ExecutionStatus.APPROVAL_REQUIRED;
      this.updateProgress(context);

      this.log(context.executionId, `Rebalance: ${trades.length} trades (${serializedTransactions.length} txs built), portfolio $${Math.round(totalValue).toLocaleString()}`);
    } catch (error: any) {
      throw error;
    }
  }

  private formatTradeBase(op: { mint: string; symbol: string; action: string; targetPercent: number; currentPercent: number; delta: number; usdValue: number }) {
    return {
      action: op.action,
      mint: op.mint,
      symbol: op.symbol,
      targetAllocation: op.targetPercent,
      currentAllocation: op.currentPercent,
      delta: op.delta,
      estimatedUsdValue: op.usdValue,
    };
  }

  /**
   * Execute stake strategy — Marinade direct deposit or Jupiter SOL→LST swap
   */
  private async executeStake(
    context: ExecutionContext,
    input: { amount: number; provider: string; wallet?: string }
  ): Promise<void> {
    context.state = ExecutionStatus.PLANNING;
    this.updateProgress(context);

    const wallet = input.wallet || (context.userPublicKey ? String(context.userPublicKey) : null);
    if (!wallet) {
      context.data.message = "Connect wallet to build stake transaction.";
      context.state = ExecutionStatus.APPROVAL_REQUIRED;
      context.approvalRequired = true;
      this.updateProgress(context);
      return;
    }

    const provider = (input.provider || "marinade").toLowerCase();
    const amountLamports = input.amount;

    try {
      this.log(context.executionId, `Building ${provider} stake transaction for ${amountLamports / 1e9} SOL...`);
      context.progress = 20;
      this.updateProgress(context);

      const { Connection, PublicKey, Transaction } = await import("@solana/web3.js");
      const connection = new Connection(this.rpcEndpoint, "confirmed");
      const userPk = new PublicKey(wallet);

      let serializedTx: string;

      if (provider === "marinade") {
        const { Marinade, MarinadeConfig } = await import("@marinade.finance/marinade-ts-sdk");
        const BN = (await import("bn.js")).default;
        const config = new MarinadeConfig({ connection });
        const marinade = new Marinade(config);

        const { transaction } = await marinade.deposit(new BN(amountLamports));
        const { blockhash } = await connection.getLatestBlockhash("confirmed");
        transaction.feePayer = userPk;
        transaction.recentBlockhash = blockhash;

        serializedTx = Buffer.from(
          transaction.serialize({ requireAllSignatures: false, verifySignatures: false })
        ).toString("base64");

        this.log(context.executionId, "Marinade deposit transaction built.");
      } else {
        // Jupiter SOL→LST swap for jito, blazestake, msol, etc.
        const LST_MINTS: Record<string, string> = {
          jito: COMMON_MINTS.JITOSOL,
          jitosol: COMMON_MINTS.JITOSOL,
          blazestake: COMMON_MINTS.BSOL,
          blaze: COMMON_MINTS.BSOL,
          bsol: COMMON_MINTS.BSOL,
          msol: COMMON_MINTS.MSOL,
          stsol: COMMON_MINTS.STSOL || "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj",
        };
        const outputMint = LST_MINTS[provider] || LST_MINTS.msol;

        const quote = await getJupiterQuote(COMMON_MINTS.SOL, outputMint, amountLamports, 50);
        if (!quote) throw new Error(`No Jupiter route for SOL → ${provider} LST`);

        context.progress = 50;
        this.updateProgress(context);

        const jupiterApiKey = process.env.NEXT_PUBLIC_JUPITER_API_KEY || "";
        const swapHeaders: Record<string, string> = { "Content-Type": "application/json" };
        if (jupiterApiKey) swapHeaders["x-api-key"] = jupiterApiKey;

        const swapRes = await fetch("https://lite-api.jup.ag/swap/v1/swap", {
          method: "POST",
          headers: swapHeaders,
          body: JSON.stringify({
            quoteResponse: quote,
            userPublicKey: wallet,
            wrapAndUnwrapSol: true,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: "auto",
          }),
        });

        if (!swapRes.ok) {
          const errText = await swapRes.text();
          throw new Error(`Jupiter swap API failed: ${errText}`);
        }

        const { swapTransaction } = await swapRes.json();
        if (!swapTransaction) throw new Error("Jupiter returned empty swap transaction");
        serializedTx = swapTransaction;

        this.log(context.executionId, `Jupiter SOL→${provider} LST swap transaction built.`);
      }

      context.progress = 80;
      this.updateProgress(context);

      context.data.provider = provider;
      context.data.amountLamports = amountLamports;
      context.data.amountSol = amountLamports / 1e9;
      context.data.serializedTransactions = [serializedTx];
      context.approvalRequired = true;
      context.progress = 100;
      context.state = ExecutionStatus.APPROVAL_REQUIRED;
      this.updateProgress(context);

      this.log(context.executionId, `Stake ${amountLamports / 1e9} SOL via ${provider}: transaction ready for signing.`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.log(context.executionId, `Stake failed: ${msg}`);
      throw error;
    }
  }

  /**
   * Analyze token safety
   */
  private async analyzeTokenSafety(
    context: ExecutionContext,
    input: any
  ): Promise<void> {
    context.state = ExecutionStatus.PLANNING;
    this.updateProgress(context);

    try {
      // Lookup metadata
      const metadata = await this.lookupAgent.executeAgent(context, {
        action: "resolve_token_metadata",
        params: { mint: input.mint }
      });

      context.progress = 33;
      this.updateProgress(context);

      // Get distribution
      const distribution = await this.lookupAgent.executeAgent(context, {
        action: "fetch_holder_distribution",
        params: { mint: input.mint }
      });

      context.progress = 66;
      this.updateProgress(context);

      // Analyze
      await this.analysisAgent.executeAgent(context, {
        action: "analyze_token_safety",
        params: {
          mint: input.mint,
          lookupData: { metadata, distribution }
        }
      });

      context.progress = 100;
      context.state = ExecutionStatus.SUCCESS;
      this.updateProgress(context);

      this.log(context.executionId, "Token safety analysis complete");
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Detect MEV opportunities
   */
  private async detectMEVOpportunities(
    context: ExecutionContext,
    input: any
  ): Promise<void> {
    context.state = ExecutionStatus.PLANNING;
    this.updateProgress(context);

    try {
      await this.analysisAgent.executeAgent(context, {
        action: "detect_mev",
        params: { transactions: input.transactions || [] }
      });

      context.progress = 100;
      context.state = ExecutionStatus.SUCCESS;
      this.updateProgress(context);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Execute DCA
   */
  private async executeDCA(
    context: ExecutionContext,
    input: any
  ): Promise<void> {
    context.state = ExecutionStatus.PLANNING;
    this.updateProgress(context);

    try {
      const schedule = await this.builderAgent.executeAgent(context, {
        action: "build_dca_schedule",
        params: input
      });

      context.progress = 100;
      context.state = ExecutionStatus.SUCCESS;
      this.updateProgress(context);

      this.log(context.executionId, `DCA schedule created: ${schedule.iterations} executions`);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Optimize fees
   */
  private async optimizeFees(
    context: ExecutionContext,
    input: any
  ): Promise<void> {
    context.state = ExecutionStatus.PLANNING;
    this.updateProgress(context);

    try {
      context.progress = 100;
      context.state = ExecutionStatus.SUCCESS;
      this.updateProgress(context);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Get execution status
   */
  getStatus(executionId: string): ExecutionContext | undefined {
    return this.executionContexts.get(executionId);
  }

  /**
   * Cancel execution
   */
  cancelExecution(executionId: string): boolean {
    const context = this.executionContexts.get(executionId);
    if (context) {
      context.state = ExecutionStatus.CANCELLED;
      this.updateProgress(context);
      return true;
    }
    return false;
  }

  /**
   * Get execution history
   */
  getExecutionHistory(): ExecutionContext[] {
    return Array.from(this.executionContexts.values());
  }

  /**
   * Update progress
   */
  private updateProgress(context: ExecutionContext): void {
    const callback = this.progressCallbacks.get(context.executionId);
    if (callback) {
      callback(context);
    }
  }

  /**
   * Log message
   */
  private log(executionId: string, message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${executionId}] ${message}`);
  }

  /**
   * Create execution result
   */
  private createResult(context: ExecutionContext, startTime: number): ExecutionResult {
    return {
      executionId: context.executionId,
      strategy: context.strategy,
      status: context.state,
      success: context.state === ExecutionStatus.SUCCESS || context.state === ExecutionStatus.APPROVAL_REQUIRED,
      result: context.data,
      errors: context.errors,
      transactionSignature: context.transactionSignature,
      duration: Date.now() - startTime,
      timestamp: Date.now()
    };
  }
}
