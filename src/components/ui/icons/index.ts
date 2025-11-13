// Icon system types and utilities
// src/components/ui/icons/index.ts

export interface IconProps {
  className?: string;
  "aria-label"?: string;
}

// ============================================================================
// ICON LIBRARY EXPORTS
// ============================================================================

export { IconAirDropScout } from "./AirDropScout";
export { IconStrategyLab } from "./StrategyLab";
export { IconWalletCopy } from "./WalletCopy";
export { IconFeeOptimizer } from "./FeeOptimizer";
export { IconTokenSwap } from "./TokenSwap";
export { IconMarketPulse } from "./MarketPulse";
export { IconHolderAnalytics } from "./HolderAnalytics";
export { IconMEVDetector } from "./MEVDetector";
export { IconPortfolioBalancer } from "./PortfolioBalancer";
export { IconTokenAuditor } from "./TokenAuditor";
export { IconTxExplorer } from "./TxExplorer";
export { IconDCAScheduler } from "./DCAScheduler";

// ============================================================================
// TOOL ID TO ICON MAPPING
// ============================================================================

export const TOOL_ICON_MAP = {
  "airdrop-scout": "IconAirDropScout",
  "strategy-lab": "IconStrategyLab",
  "wallet-copy": "IconWalletCopy",
  "fee-optimizer": "IconFeeOptimizer",
  "token-swap": "IconTokenSwap",
  "market-pulse": "IconMarketPulse",
  "holder-analytics": "IconHolderAnalytics",
  "mev-detector": "IconMEVDetector",
  "portfolio-balancer": "IconPortfolioBalancer",
  "token-auditor": "IconTokenAuditor",
  "tx-explorer": "IconTxExplorer",
  "dca-scheduler": "IconDCAScheduler",
} as const;

// ============================================================================
// TOOL DISPLAY NAMES (EMOJI-FREE)
// ============================================================================

export const TOOL_DISPLAY_NAMES = {
  "airdrop-scout": "Airdrop Scout",
  "strategy-lab": "Strategy Lab",
  "wallet-copy": "Wallet Copy",
  "fee-optimizer": "Fee Optimizer",
  "token-swap": "Token Swap",
  "market-pulse": "Market Pulse",
  "holder-analytics": "Holder Analytics",
  "mev-detector": "MEV Detector",
  "portfolio-balancer": "Portfolio Balancer",
  "token-auditor": "Token Auditor",
  "tx-explorer": "Tx Explorer",
  "dca-scheduler": "DCA Scheduler",
} as const;

// ============================================================================
// TOOL DESCRIPTIONS (FOR TOOLTIPS/HELP)
// ============================================================================

export const TOOL_DESCRIPTIONS = {
  "airdrop-scout": "Scan and discover eligible airdrops for your connected wallet",
  "strategy-lab": "Experimental trading strategies and advanced portfolio tools",
  "wallet-copy": "Clone wallet configurations and trading strategies",
  "fee-optimizer": "Analyze and minimize transaction fees on your operations",
  "token-swap": "Exchange tokens on Jupiter with optimal routing",
  "market-pulse": "Real-time market trends and price momentum",
  "holder-analytics": "Analyze token holder distribution and concentration",
  "mev-detector": "Detect and identify MEV opportunities in transactions",
  "portfolio-balancer": "Rebalance your portfolio to target allocations",
  "token-auditor": "Comprehensive token safety and rug pull analysis",
  "tx-explorer": "Historical transaction lookup and analysis",
  "dca-scheduler": "Automate recurring purchases with dollar-cost averaging",
} as const;
