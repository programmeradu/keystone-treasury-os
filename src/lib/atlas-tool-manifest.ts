export const ATLAS_TOOL_MANIFEST = `
[
  {
    "tool_id": "swap_tokens",
    "description": "Swap one cryptocurrency for another using Jupiter Swap.",
    "parameters": {
      "input_mint": "The mint address of the token to sell.",
      "output_mint": "The mint address of the token to buy.",
      "amount": "The amount of the input token to sell (in the smallest unit, e.g., lamports)."
    }
  },
  {
    "tool_id": "stake_sol",
    "description": "Stake SOL with a provider like Marinade or Lido.",
    "parameters": {
      "provider": "The staking provider (e.g., 'marinade', 'lido').",
      "amount": "The amount of SOL to stake."
    }
  },
  {
    "tool_id": "scan_airdrops",
    "description": "Scan the connected wallet for potential airdrops.",
    "parameters": {}
  },
  {
    "tool_id": "view_holder_insights",
    "description": "View holder insights and distribution for a specific token.",
    "parameters": {
      "mint_address": "The mint address of the token to analyze."
    }
  },
  {
    "tool_id": "scan_mev",
    "description": "Scan recent transactions for Maximal Extractable Value (MEV) opportunities or incidents.",
    "parameters": {}
  },
  {
    "tool_id": "create_dca_bot",
    "description": "Create a Dollar-Cost Averaging (DCA) bot to automate token purchases.",
    "parameters": {
        "in_mint": "The mint address of the token to spend (e.g. SOL or USDC)",
        "out_mint": "The mint address of the token to buy",
        "amount": "The total amount of 'in_mint' to spend",
        "frequency": "How often the DCA should execute (e.g., 'daily', 'weekly')"
    }
  },
  {
    "tool_id": "rug_pull_detector",
    "description": "Analyze a token to assess its risk of being a 'rug pull' scam.",
    "parameters": {
        "mint_address": "The mint address of the token to analyze."
    }
  },
  {
    "tool_id": "portfolio_rebalancer",
    "description": "Rebalance your portfolio to target allocations with minimal fees using optimal swap routing.",
    "parameters": {
        "wallet_address": "Your Solana wallet address.",
        "target_allocations": "Target allocation percentages for each token (e.g., {SOL: 50, USDC: 30, JUP: 20})"
    }
  },
  {
    "tool_id": "transaction_time_machine",
    "description": "Look up and analyze a past transaction.",
    "parameters": {
        "signature": "The transaction signature to look up."
    }
  },
  {
    "tool_id": "fee_saver_insights",
    "description": "Get insights on how to save on transaction fees.",
    "parameters": {}
  },
  {
    "tool_id": "copy_trader",
    "description": "Copy the trades of another wallet.",
    "parameters": {
        "target_wallet": "The address of the wallet to copy."
    }
  },
  {
    "tool_id": "navigate_to_tab",
    "description": "Navigate to a specific tab or section within the Atlas page.",
    "parameters": {
        "tab_id": "The ID of the tab to navigate to. Can be 'tools' or 'lab'."
    }
  }
]
`;
