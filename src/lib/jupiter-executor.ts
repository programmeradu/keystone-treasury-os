/**
 * Jupiter Swap Executor
 * Handles getting quotes and executing swaps via Jupiter API
 */

export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: any[];
}

export interface JupiterSwapResult {
  success: boolean;
  txSignature?: string;
  inAmount: number;
  outAmount: number;
  price: number;
  slippage: number;
  error?: string;
}

/**
 * Get a quote from Jupiter for a swap
 */
export async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amountInSmallestUnit: number,
  slippageBps: number = 50 // 0.5% default
): Promise<JupiterQuote | null> {
  try {
    const url = new URL('https://quote-api.jup.ag/v6/quote');
    url.searchParams.append('inputMint', inputMint);
    url.searchParams.append('outputMint', outputMint);
    url.searchParams.append('amount', amountInSmallestUnit.toString());
    url.searchParams.append('slippageBps', slippageBps.toString());
    url.searchParams.append('onlyDirectRoutes', 'false');
    url.searchParams.append('asLegacyTransaction', 'false');

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Jupiter quote error:', error);
      return null;
    }

    const quote = await response.json();
    return quote;
  } catch (error) {
    console.error('Failed to get Jupiter quote:', error);
    return null;
  }
}

/**
 * Get current price for a token pair from Jupiter
 */
export async function getTokenPrice(
  inputMint: string,
  outputMint: string = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC
): Promise<number | null> {
  try {
    // Use 1 token as base amount (adjust for decimals)
    const amount = 1_000_000_000; // 1 token with 9 decimals (SOL standard)
    
    const quote = await getJupiterQuote(inputMint, outputMint, amount, 50);
    
    if (!quote || !quote.outAmount) {
      return null;
    }

    // Calculate price: output amount / input amount
    const price = parseFloat(quote.outAmount) / amount;
    return price;
  } catch (error) {
    console.error('Failed to get token price:', error);
    return null;
  }
}

/**
 * Convert USD amount to token amount based on current price
 */
export async function usdToTokenAmount(
  usdAmount: number,
  tokenMint: string,
  tokenDecimals: number = 9
): Promise<{ amount: number; price: number } | null> {
  try {
    const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    
    // Get quote for $1 worth of USDC -> token
    const usdcAmount = usdAmount * 1_000_000; // USDC has 6 decimals
    
    const quote = await getJupiterQuote(USDC_MINT, tokenMint, usdcAmount, 50);
    
    if (!quote || !quote.outAmount) {
      return null;
    }

    const tokenAmount = parseFloat(quote.outAmount);
    const price = usdAmount / (tokenAmount / Math.pow(10, tokenDecimals));

    return {
      amount: tokenAmount,
      price,
    };
  } catch (error) {
    console.error('Failed to convert USD to token amount:', error);
    return null;
  }
}

/**
 * Simulate a swap to check if it would succeed
 * Returns estimated output and slippage
 */
export async function simulateSwap(
  inputMint: string,
  outputMint: string,
  amountInSmallestUnit: number,
  maxSlippageBps: number = 50
): Promise<{
  success: boolean;
  estimatedOutput: number;
  estimatedSlippage: number;
  priceImpact: number;
  error?: string;
} | null> {
  try {
    const quote = await getJupiterQuote(inputMint, outputMint, amountInSmallestUnit, maxSlippageBps);
    
    if (!quote) {
      return {
        success: false,
        estimatedOutput: 0,
        estimatedSlippage: 0,
        priceImpact: 0,
        error: 'Failed to get quote',
      };
    }

    return {
      success: true,
      estimatedOutput: parseFloat(quote.outAmount),
      estimatedSlippage: quote.slippageBps / 100, // Convert bps to percentage
      priceImpact: parseFloat(quote.priceImpactPct || '0'),
    };
  } catch (error: any) {
    return {
      success: false,
      estimatedOutput: 0,
      estimatedSlippage: 0,
      priceImpact: 0,
      error: error.message || 'Simulation failed',
    };
  }
}

/**
 * Get token info from Jupiter's token list
 */
export async function getTokenInfo(mint: string): Promise<{
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
} | null> {
  try {
    // Jupiter maintains a token list
    const response = await fetch('https://token.jup.ag/strict');
    const tokens = await response.json();
    
    const token = tokens.find((t: any) => t.address === mint);
    
    if (!token) {
      return null;
    }

    return {
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoURI,
    };
  } catch (error) {
    console.error('Failed to get token info:', error);
    return null;
  }
}

/**
 * Calculate next execution time based on frequency
 */
export function calculateNextExecution(
  lastExecution: number,
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
): number {
  const now = Date.now();
  const lastDate = new Date(lastExecution);
  
  switch (frequency) {
    case 'daily':
      lastDate.setDate(lastDate.getDate() + 1);
      break;
    case 'weekly':
      lastDate.setDate(lastDate.getDate() + 7);
      break;
    case 'biweekly':
      lastDate.setDate(lastDate.getDate() + 14);
      break;
    case 'monthly':
      lastDate.setMonth(lastDate.getMonth() + 1);
      break;
  }
  
  return lastDate.getTime();
}

/**
 * Validate bot configuration before creation
 */
export async function validateBotConfig(config: {
  buyTokenMint: string;
  paymentTokenMint: string;
  amountUsd: number;
  maxSlippage: number;
}): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check if tokens exist
    const buyToken = await getTokenInfo(config.buyTokenMint);
    const paymentToken = await getTokenInfo(config.paymentTokenMint);
    
    if (!buyToken) {
      return { valid: false, error: 'Buy token not found or not supported' };
    }
    
    if (!paymentToken) {
      return { valid: false, error: 'Payment token not found or not supported' };
    }
    
    // Check if amount is reasonable
    if (config.amountUsd < 1 || config.amountUsd > 100000) {
      return { valid: false, error: 'Amount must be between $1 and $100,000' };
    }
    
    // Check slippage
    if (config.maxSlippage < 0.1 || config.maxSlippage > 10) {
      return { valid: false, error: 'Slippage must be between 0.1% and 10%' };
    }
    
    // Try to get a quote to ensure liquidity exists
    const usdcAmount = config.amountUsd * 1_000_000; // USDC has 6 decimals
    const quote = await getJupiterQuote(
      config.paymentTokenMint,
      config.buyTokenMint,
      usdcAmount,
      config.maxSlippage * 100 // Convert to bps
    );
    
    if (!quote) {
      return { valid: false, error: 'No liquidity available for this trade' };
    }
    
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message || 'Validation failed' };
  }
}
