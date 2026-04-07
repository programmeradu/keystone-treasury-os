/**
 * @keystone-os/sdk — Sovereign OS SDK for Keystone Studio Mini-Apps
 *
 * Policy-as-Code + Agentic Interoperability.
 * Use in Mini-Apps that run inside the Keystone Studio sandbox.
 * Requires: host injects keystoneBridge (or call setBridge() for tests).
 */

export {
  useVault,
  useTurnkey,
  useFetch,
  AppEventBus,
  useEncryptedSecret,
  useACEReport,
  useAgentHandoff,
  useMCPClient,
  useMCPServer,
  useSIWS,
  useJupiterSwap,
  useImpactReport,
  useTaxForensics,
  useYieldOptimizer,
  useGaslessTx,
  // Extended SDK — v1.1
  usePortfolio,
  useTheme,
  useTokenPrice,
  useNotification,
  useStorage,
} from "./hooks";
export { setBridge } from "./bridge-context";
export { BridgeMethods, type KeystoneBridge } from "./bridge";
export { toBlink } from "./utils/toBlink";
export { verifyZKSP } from "./utils/zksp";
export type {
  Token,
  VaultState,
  TurnkeyState,
  FetchOptions,
  FetchResult,
  EventBus,
  ObservabilityConfig,
  SIWSState,
  ImpactReport,
  JupiterSwapParams,
  JupiterSwapResult,
  YieldPath,
  AgentHandoffPayload,
} from "./types";
