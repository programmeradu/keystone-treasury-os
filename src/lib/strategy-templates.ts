/**
 * Pre-configured strategy templates
 * One-click templates for common agent execution patterns
 */

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  strategy: string;
  icon: string;
  color: string;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedTime: string;
  defaultInput: Record<string, any>;
  formFields: TemplateFormField[];
}

export interface TemplateFormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'percentage';
  placeholder?: string;
  required: boolean;
  default?: any;
  min?: number;
  max?: number;
  options?: { label: string; value: any }[];
  help?: string;
}

/**
 * Pre-configured templates for quick execution
 */
export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    id: 'quick-swap',
    name: 'Quick Swap',
    description: 'Swap SOL to USDC with default settings',
    strategy: 'swap_token',
    icon: '🔄',
    color: 'from-blue-600 to-blue-400',
    riskLevel: 'low',
    estimatedTime: '15-30s',
    defaultInput: {
      tokenA: 'SOL',
      tokenB: 'USDC',
      amount: 1,
      slippage: 0.5,
      useDirectRoute: true,
    },
    formFields: [
      {
        name: 'amount',
        label: 'Amount to Swap',
        type: 'number',
        placeholder: '1.0',
        required: true,
        default: 1,
        min: 0.01,
        help: 'Amount of SOL to swap',
      },
      {
        name: 'outputToken',
        label: 'Output Token',
        type: 'select',
        required: true,
        default: 'USDC',
        options: [
          { label: 'USDC', value: 'USDC' },
          { label: 'USDT', value: 'USDT' },
          { label: 'JUP', value: 'JUP' },
          { label: 'mSOL', value: 'mSOL' },
        ],
      },
      {
        name: 'slippage',
        label: 'Max Slippage %',
        type: 'number',
        required: false,
        default: 0.5,
        min: 0.1,
        max: 5,
        help: 'Maximum acceptable price slippage',
      },
    ],
  },

  {
    id: 'safety-scan',
    name: 'Safety Scan',
    description: 'Quick token safety analysis with risk scoring',
    strategy: 'analyze_token_safety',
    icon: '🛡️',
    color: 'from-green-600 to-green-400',
    riskLevel: 'low',
    estimatedTime: '5-8s',
    defaultInput: {
      detailLevel: 'comprehensive',
      checkMEV: true,
      checkLiquidity: true,
    },
    formFields: [
      {
        name: 'tokenAddress',
        label: 'Token Address',
        type: 'text',
        placeholder: 'EPjFWdd5Au...',
        required: true,
        help: 'Contract address of token to analyze',
      },
      {
        name: 'detailLevel',
        label: 'Analysis Detail',
        type: 'select',
        required: false,
        default: 'comprehensive',
        options: [
          { label: 'Quick', value: 'quick' },
          { label: 'Standard', value: 'standard' },
          { label: 'Comprehensive', value: 'comprehensive' },
        ],
        help: 'Level of safety analysis depth',
      },
    ],
  },

  {
    id: 'mev-protect',
    name: 'MEV Protect',
    description: 'Detect MEV threats and get protection recommendations',
    strategy: 'detect_mev',
    icon: '⚠️',
    color: 'from-orange-600 to-orange-400',
    riskLevel: 'medium',
    estimatedTime: '5-7s',
    defaultInput: {
      lookbackMinutes: 60,
      checkSandwich: true,
      checkFrontrun: true,
      recommendedSlippage: 'auto',
    },
    formFields: [
      {
        name: 'lookbackMinutes',
        label: 'Analysis Window (minutes)',
        type: 'number',
        required: false,
        default: 60,
        min: 5,
        max: 240,
        help: 'How far back to scan for MEV activity',
      },
      {
        name: 'tokenPair',
        label: 'Token Pair',
        type: 'text',
        placeholder: 'SOL/USDC',
        required: false,
        help: 'Optional: analyze specific pair',
      },
    ],
  },

  {
    id: 'auto-rebalance',
    name: 'Auto Rebalance',
    description: 'Rebalance portfolio to target allocation automatically',
    strategy: 'rebalance_portfolio',
    icon: '⚙️',
    color: 'from-purple-600 to-purple-400',
    riskLevel: 'medium',
    estimatedTime: '15-30s',
    defaultInput: {
      rebalanceType: 'equal-weight',
      targetAllocation: { SOL: 0.35, USDC: 0.4, JUP: 0.25 },
      allowPartial: true,
      driftThreshold: 0.05,
    },
    formFields: [
      {
        name: 'rebalanceType',
        label: 'Rebalance Strategy',
        type: 'select',
        required: false,
        default: 'equal-weight',
        options: [
          { label: 'Equal Weight', value: 'equal-weight' },
          { label: 'Custom Allocation', value: 'custom' },
          { label: 'Dollar Weighted', value: 'dollar-weighted' },
        ],
        help: 'How to allocate funds across holdings',
      },
      {
        name: 'driftThreshold',
        label: 'Drift Threshold %',
        type: 'percentage',
        required: false,
        default: 5,
        min: 1,
        max: 20,
        help: 'Only rebalance if allocation drifts by this amount',
      },
    ],
  },

  {
    id: 'dca-weekly',
    name: 'Weekly DCA',
    description: 'Dollar-cost average $100 into SOL every week',
    strategy: 'execute_dca',
    icon: '📅',
    color: 'from-indigo-600 to-indigo-400',
    riskLevel: 'low',
    estimatedTime: 'Recurring weekly',
    defaultInput: {
      amount: 100,
      frequency: 'weekly',
      targetToken: 'SOL',
      fromToken: 'USDC',
      maxSlippage: 0.5,
      autoRenew: true,
    },
    formFields: [
      {
        name: 'amount',
        label: 'Amount per Purchase',
        type: 'number',
        placeholder: '100',
        required: true,
        default: 100,
        min: 10,
        help: 'Amount to invest in each DCA purchase',
      },
      {
        name: 'frequency',
        label: 'Frequency',
        type: 'select',
        required: false,
        default: 'weekly',
        options: [
          { label: 'Daily', value: 'daily' },
          { label: 'Weekly', value: 'weekly' },
          { label: 'Bi-weekly', value: 'biweekly' },
          { label: 'Monthly', value: 'monthly' },
        ],
      },
      {
        name: 'duration',
        label: 'Duration (months)',
        type: 'number',
        required: false,
        default: 12,
        min: 1,
        max: 60,
        help: 'How long to continue DCA strategy',
      },
    ],
  },

  {
    id: 'optimize-taxes',
    name: 'Tax Optimize',
    description: 'Harvest losses and optimize tax position',
    strategy: 'optimize_fees',
    icon: '📊',
    color: 'from-cyan-600 to-cyan-400',
    riskLevel: 'low',
    estimatedTime: '10-15s',
    defaultInput: {
      harvestLosses: true,
      minLossThreshold: 50,
      ignoreSmallPositions: true,
      smallPositionThreshold: 100,
    },
    formFields: [
      {
        name: 'minLossThreshold',
        label: 'Minimum Loss to Harvest ($)',
        type: 'number',
        required: false,
        default: 50,
        min: 1,
        help: 'Only harvest losses larger than this',
      },
      {
        name: 'reestablishDelay',
        label: 'Wash Sale Delay (days)',
        type: 'number',
        required: false,
        default: 31,
        min: 30,
        max: 60,
        help: 'Days before repurchasing (for tax compliance)',
      },
    ],
  },
];

/**
 * Get template by ID
 */
export function getTemplate(templateId: string): StrategyTemplate | undefined {
  return STRATEGY_TEMPLATES.find(t => t.id === templateId);
}

/**
 * Group templates by category
 */
export function getTemplatesByCategory(): Record<string, StrategyTemplate[]> {
  return {
    'Trading': STRATEGY_TEMPLATES.filter(t => ['quick-swap', 'mev-protect'].includes(t.id)),
    'Analysis': STRATEGY_TEMPLATES.filter(t => ['safety-scan', 'optimize-taxes'].includes(t.id)),
    'Automation': STRATEGY_TEMPLATES.filter(t => ['auto-rebalance', 'dca-weekly'].includes(t.id)),
  };
}

/**
 * Get templates by risk level
 */
export function getTemplatesByRisk(level: 'low' | 'medium' | 'high'): StrategyTemplate[] {
  return STRATEGY_TEMPLATES.filter(t => t.riskLevel === level);
}
