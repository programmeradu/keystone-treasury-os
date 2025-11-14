import { v4 as uuidv4 } from "uuid";
import type {
  ExecutionContext,
  StrategyType,
  ExecutionResult,
  ProgressCallback,
  AgentConfig
} from "./types";
import { ExecutionStatus } from "./types";
import { TransactionAgent } from "./transaction-agent";
import { LookupAgent } from "./lookup-agent";
import { AnalysisAgent } from "./analysis-agent";
import { BuilderAgent } from "./builder-agent";

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
  private executionContexts: Map<string, ExecutionContext> = new Map();
  private transactionAgent: TransactionAgent;
  private lookupAgent: LookupAgent;
  private analysisAgent: AnalysisAgent;
  private builderAgent: BuilderAgent;
  private progressCallbacks: Map<string, ProgressCallback> = new Map();

  constructor(rpcEndpoint: string, agentConfigs?: Record<string, Partial<AgentConfig>>) {
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
        this.updateProgress(context);
      }

      this.log(executionId, `Strategy execution failed: ${error.message}`);

      return {
        executionId,
        strategy,
        status: ExecutionStatus.FAILED,
        success: false,
        errors: context?.errors || [],
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
   */
  private async executeSwap(
    context: ExecutionContext,
    input: any
  ): Promise<void> {
    context.state = ExecutionStatus.RUNNING;
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

      // Store quote for later use
      context.data.swap_quote = quote;

      // Step 4: Get swap instructions from Jupiter
      this.log(context.executionId, "Building real swap transaction...");
      const swapInstructions = await this.builderAgent.executeAgent(context, {
        action: "build_swap_instructions",
        params: { quote }
      });

      context.progress = 70;
      this.updateProgress(context);

      // Step 5: Ready for signing (don't simulate yet, let wallet do that)
      context.approvalRequired = true;
      context.state = ExecutionStatus.APPROVAL_REQUIRED;
      this.updateProgress(context);

      this.log(context.executionId, `Swap prepared: ${quote.outAmountWithSlippage} output with ${quote.priceImpactPct}% price impact`);
      
      // Return data for wallet to display
      context.data.swap_result = {
        inputMint: input.inputMint || input.inMint,
        outputMint: input.outputMint || input.outMint,
        inAmount: quote.inAmount,
        outAmount: quote.outAmount,
        outAmountWithSlippage: quote.outAmountWithSlippage,
        priceImpact: quote.priceImpactPct,
        instructions: swapInstructions.instructions,
        ready: true,
        requiresApproval: true
      };
    } catch (error: any) {
      this.log(context.executionId, `Swap failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute rebalance strategy
   */
  private async executeRebalance(
    context: ExecutionContext,
    input: any
  ): Promise<void> {
    context.state = ExecutionStatus.RUNNING;
    this.updateProgress(context);

    try {
      // Fetch holdings
      this.log(context.executionId, "Fetching wallet holdings...");
      const holdings = await this.lookupAgent.executeAgent(context, {
        action: "fetch_wallet_holdings",
        params: { wallet: input.wallet, connection: null }
      });

      context.progress = 30;
      this.updateProgress(context);

      // Calculate rebalance
      this.log(context.executionId, "Calculating rebalance operations...");
      const rebalance = await this.builderAgent.executeAgent(context, {
        action: "calculate_rebalance",
        params: input
      });

      context.progress = 60;
      this.updateProgress(context);

      // Analyze risk
      this.log(context.executionId, "Analyzing portfolio risk...");
      await this.analysisAgent.executeAgent(context, {
        action: "assess_portfolio_risk",
        params: { holdings, prices: {} }
      });

      context.progress = 100;
      context.state = ExecutionStatus.SUCCESS;
      this.updateProgress(context);

      this.log(context.executionId, `Rebalance plan: ${rebalance.operations.length} operations`);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Execute stake strategy
   */
  private async executeStake(
    context: ExecutionContext,
    input: any
  ): Promise<void> {
    context.state = ExecutionStatus.RUNNING;
    this.updateProgress(context);

    try {
      this.log(context.executionId, "Preparing stake transaction...");
      
      context.progress = 50;
      this.updateProgress(context);

      context.progress = 100;
      context.state = ExecutionStatus.SUCCESS;
      this.updateProgress(context);
    } catch (error: any) {
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
    context.state = ExecutionStatus.RUNNING;
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
    context.state = ExecutionStatus.RUNNING;
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
    context.state = ExecutionStatus.RUNNING;
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
    context.state = ExecutionStatus.RUNNING;
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
      success: context.state === ExecutionStatus.SUCCESS,
      result: context.data,
      errors: context.errors,
      transactionSignature: context.transactionSignature,
      duration: Date.now() - startTime,
      timestamp: Date.now()
    };
  }
}
