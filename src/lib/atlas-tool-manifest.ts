export const ATLAS_TOOL_MANIFEST = `
[
  {
    "tool_id": "swap_tokens",
    "description": "Swap one cryptocurrency for another using Jupiter Swap. Common examples: 'swap 10 SOL to USDC', 'buy 100 JUP with SOL', 'sell 5 SOL for BONK'. Use token symbols like SOL, USDC, JUP, BONK, PYTH, RAY, ORCA, WIF, JTO, DRIFT, etc.",
    "parameters": {
      "input_token": "The symbol of the token to sell (e.g. 'SOL', 'USDC', 'JUP'). NOT a mint address.",
      "output_token": "The symbol of the token to buy (e.g. 'USDC', 'SOL', 'BONK'). NOT a mint address.",
      "amount": "The numeric amount of the input token to sell (e.g. 5, 10.5, 100). A plain number, NOT in lamports."
    }
  },
  {
    "tool_id": "stake_sol",
    "description": "Liquid-stake SOL to earn yield. Supports Marinade (mSOL), Jito (jitoSOL), and BlazeStake (bSOL). Examples: 'stake 5 SOL', 'stake 10 SOL with Jito', 'stake SOL via BlazeStake'.",
    "parameters": {
      "provider": "The staking provider: 'marinade', 'jito', or 'blazestake'. Default: 'marinade'.",
      "amount": "The numeric amount of SOL to stake (e.g. 5, 10.5)."
    }
  },
  {
    "tool_id": "provide_liquidity",
    "description": "Provide liquidity to a SOL/USDC pool via Orca or Raydium. Examples: 'LP 5 SOL', 'provide liquidity 10 SOL', 'add liquidity'.",
    "parameters": {
      "amount": "The numeric amount of SOL to provide as liquidity."
    }
  },
  {
    "tool_id": "scan_airdrops",
    "description": "Scan the connected wallet for potential airdrops and quest opportunities.",
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
    "description": "Create a Dollar-Cost Averaging (DCA) bot to automate recurring token purchases.",
    "parameters": {
      "in_mint": "The symbol of the token to spend (e.g. 'SOL', 'USDC')",
      "out_mint": "The symbol of the token to buy (e.g. 'JUP', 'BONK')",
      "amount": "The total amount to spend",
      "frequency": "How often the DCA should execute (e.g., 'daily', 'weekly')"
    }
  },
  {
    "tool_id": "rug_pull_detector",
    "description": "Analyze a token to assess its risk of being a rug pull or scam. Examples: 'is this token safe?', 'check rug risk for [mint]'.",
    "parameters": {
      "mint_address": "The mint address of the token to analyze."
    }
  },
  {
    "tool_id": "portfolio_rebalancer",
    "description": "Open the portfolio rebalancer tool to rebalance holdings with optimal swap routing.",
    "parameters": {}
  },
  {
    "tool_id": "transaction_time_machine",
    "description": "Look up and analyze a past transaction. Examples: 'look up transaction [signature]', 'show me tx [sig]'.",
    "parameters": {
      "signature": "The transaction signature to look up."
    }
  },
  {
    "tool_id": "fee_saver_insights",
    "description": "Open the fee saver tool to get insights on saving transaction fees.",
    "parameters": {}
  },
  {
    "tool_id": "copy_trader",
    "description": "Open the copy-wallet tool to mirror trades from another wallet address.",
    "parameters": {
      "target_wallet": "The address of the wallet to copy."
    }
  },
  {
    "tool_id": "navigate_to_tab",
    "description": "Navigate to a specific tab or section. 'lab' or 'strategy lab' = Strategy Lab tab. 'quests' or 'tools' = Quests tab.",
    "parameters": {
      "tab_id": "The ID of the tab: 'lab' or 'quests'."
    }
  },
  {
    "tool_id": "price_check",
    "description": "Check the current price of a token. Examples: 'what is the price of SOL?', 'how much is JUP?', 'SOL price'.",
    "parameters": {
      "token": "The symbol of the token to check (e.g. 'SOL', 'JUP', 'BONK')."
    }
  },
  {
    "tool_id": "show_portfolio",
    "description": "Show the connected wallet's balance and portfolio overview. Examples: 'show my balance', 'what do I have?', 'my portfolio'.",
    "parameters": {}
  },
  {
    "tool_id": "market_overview",
    "description": "Show the market overview with current prices and trends. Examples: 'how is the market?', 'show market pulse', 'market overview'.",
    "parameters": {}
  }
]
`;
