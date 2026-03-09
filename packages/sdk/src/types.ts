/**
 * @keystone-os/sdk — Type definitions for Keystone Studio Mini-Apps
 */

export interface Token {
  symbol: string;
  name: string;
  balance: number;
  price: number;
  mint?: string;
  decimals?: number;
  logoURI?: string;
}

export interface VaultState {
  activeVault: string;
  balances: Record<string, number>;
  tokens: Token[];
}

export interface TurnkeyState {
  getPublicKey: () => Promise<string>;
  signTransaction: (
    transaction: unknown,
    description?: string
  ) => Promise<{ signature: string }>;
  wallets?: { id: string; name: string; address: string }[];
  activeWallet?: string;
  createWallet?: (opts: { name: string }) => Promise<{ address: string }>;
}

export interface ObservabilityConfig {
  provider?: "langfuse" | "helicone";
  traceId?: string;
}

export interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  observability?: ObservabilityConfig;
}

export interface FetchResult<T = unknown> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export interface EventBus {
  emit: (type: string, payload?: unknown) => void;
}

// ─── Sovereign OS 2026 Types ───────────────────────────────────────

export interface SIWSState {
  signIn: () => Promise<{ message: string; signature: string }>;
  verify: (message: string, signature: string) => Promise<boolean>;
  session: { address: string; chainId: number } | null;
}

export interface ImpactReport {
  before: VaultState;
  after: VaultState;
  diff: { symbol: string; delta: number; percentChange: number }[];
  simulationHash?: string;
  zkspProof?: string;
  carbonKg?: number;
  greenScore?: number;
  socialScore?: number;
  breakdown?: { symbol: string; protocol?: string; carbonKg?: number; score?: number }[];
  recommendations?: string[];
}

export interface JupiterSwapParams {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
}

export interface JupiterSwapResult {
  swapTransaction: string;
  lastValidBlockHeight: number;
  prioritizationFeeLamports?: number;
  txid?: string;
}

export interface YieldPath {
  protocol: string;
  apy: number;
  riskScore: number;
  tvl: number;
  instructions: unknown[];
}

export interface AgentHandoffPayload {
  fromAgent: string;
  toAgent: string;
  context: Record<string, unknown>;
}
