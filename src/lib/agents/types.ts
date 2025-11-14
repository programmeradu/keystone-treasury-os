import type { PublicKey, VersionedTransaction, Transaction, SimulatedTransactionResponse } from "@solana/web3.js";

/**
 * Execution Status Types
 */
export enum ExecutionStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  SIMULATION = "SIMULATION",
  APPROVAL_REQUIRED = "APPROVAL_REQUIRED",
  APPROVED = "APPROVED",
  EXECUTING = "EXECUTING",
  CONFIRMING = "CONFIRMING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED"
}

/**
 * Error Severity Levels
 */
export enum ErrorSeverity {
  INFO = "INFO",
  WARNING = "WARNING",
  ERROR = "ERROR",
  CRITICAL = "CRITICAL"
}

/**
 * Execution Step for progress tracking
 */
export interface ExecutionStep {
  id: string;
  name: string;
  status: ExecutionStatus;
  timestamp: number;
  duration?: number;
  result?: any;
  error?: AgentError;
}

/**
 * Agent Error with context
 */
export interface AgentError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  timestamp: number;
  context?: Record<string, any>;
  retryable: boolean;
  retryCount?: number;
  maxRetries?: number;
}

/**
 * Main Execution Context - holds all state for an execution
 */
export interface ExecutionContext {
  executionId: string;
  strategy: StrategyType;
  state: ExecutionStatus;
  userPublicKey: PublicKey | null;
  startTime: number;
  approvalRequired: boolean;
  approvalTimestamp?: number;
  progress: number; // 0-100
  steps: ExecutionStep[];
  errors: AgentError[];
  data: Record<string, any>; // Shared data between agents
  simulationResult?: SimulatedTransactionResponse;
  transactionSignature?: string;
  confirmationStatus?: "processed" | "confirmed" | "finalized";
  metadata?: Record<string, any>;
}

/**
 * Strategy Types for different operations
 */
export enum StrategyType {
  // Swap strategies
  SWAP_TOKEN = "swap_token",
  
  // Portfolio strategies
  REBALANCE_PORTFOLIO = "rebalance_portfolio",
  STAKE_SOL = "stake_sol",
  
  // Analysis strategies
  ANALYZE_TOKEN_SAFETY = "analyze_token_safety",
  DETECT_MEV = "detect_mev",
  ANALYZE_HOLDER_DISTRIBUTION = "analyze_holder_distribution",
  
  // DCA strategies
  EXECUTE_DCA = "execute_dca",
  
  // Fee optimization
  OPTIMIZE_FEES = "optimize_fees",
  
  // Custom
  CUSTOM = "custom"
}

/**
 * Strategy Input/Output Types
 */
export interface SwapTokenInput {
  inMint: string;
  outMint: string;
  amount: number;
  slippage?: number;
  useSharedAccountsFeature?: boolean;
}

export interface RebalancePortfolioInput {
  wallet: string;
  targets: Record<string, number>; // { SOL: 50, USDC: 30, JUP: 20 }
  tolerance?: number;
}

export interface StakeSolInput {
  amount: number;
  validator?: string;
}

export interface AnalyzeTokenSafetyInput {
  mint: string;
}

export interface ExecuteDCAInput {
  inMint: string;
  outMint: string;
  amount: number;
  frequency: "hourly" | "daily" | "weekly" | "monthly";
  iterations?: number;
}

/**
 * Agent Base Interface
 */
export interface IAgent {
  name: string;
  execute(context: ExecutionContext, input: any): Promise<ExecutionContext>;
  validate(context: ExecutionContext, input: any): Promise<boolean>;
}

/**
 * Approval Requirement
 */
export interface ApprovalRequirement {
  required: boolean;
  reason: string;
  riskLevel: "low" | "medium" | "high";
  amount?: number;
  recipient?: string;
  fee?: number;
  slippage?: number;
}

/**
 * Token Metadata
 */
export interface TokenMetadata {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  verified?: boolean;
  source?: string;
}

/**
 * Token Price Information
 */
export interface TokenPrice {
  mint: string;
  price: number;
  source: string;
  timestamp: number;
  change24h?: number;
}

/**
 * Holder Distribution
 */
export interface HolderDistribution {
  mint: string;
  totalHolders: number;
  topHolder: {
    address: string;
    percent: number;
  };
  concentration: "high" | "medium" | "low";
  riskScore: number;
}

/**
 * Token Safety Analysis Result
 */
export interface TokenSafetyAnalysis {
  mint: string;
  riskScore: number; // 0-100
  verdict: "safe" | "warning" | "high_risk";
  checks: Record<string, CheckResult>;
  flags: SafetyFlag[];
  metadata?: TokenMetadata;
}

export interface CheckResult {
  status: "pass" | "fail" | "warning";
  message: string;
}

export interface SafetyFlag {
  severity: "low" | "medium" | "high";
  message: string;
}

/**
 * Route Quote from Jupiter
 */
export interface RouteQuote {
  inAmount: string;
  outAmount: string;
  outAmountWithSlippage: string;
  priceImpactPct: string;
  marketInfos: any[];
  routePlan: any[];
}

/**
 * MEV Opportunity
 */
export interface MEVOpportunity {
  type: "arbitrage" | "sandwich" | "liquidation";
  tokens: string[];
  profitPotential: number;
  risk: "low" | "medium" | "high";
  details: Record<string, any>;
}

/**
 * Execution Result
 */
export interface ExecutionResult {
  executionId: string;
  strategy: StrategyType;
  status: ExecutionStatus;
  success: boolean;
  result?: any;
  errors: AgentError[];
  transactionSignature?: string;
  duration: number;
  timestamp: number;
}

/**
 * Callback for progress updates
 */
export type ProgressCallback = (context: ExecutionContext) => void;

/**
 * Retry Configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Agent Configuration
 */
export interface AgentConfig {
  name: string;
  timeout: number;
  retryConfig: RetryConfig;
  endpoints?: {
    rpc?: string[];
    jupiter?: string;
    moralis?: string;
    helius?: string;
  };
}
