/**
 * Jupiter Swap Service
 * Real integration with Jupiter API for swaps, quotes, and routing
 */

import { Connection, PublicKey, Transaction } from "@solana/web3.js";

export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  outAmountWithSlippage: string;
  priceImpactPct: string;
  marketInfos: any[];
  routePlan: any[];
}

export interface SwapInstructions {
  swapTransaction: string;
  lastValidBlockHeight: number;
}

/**
 * Service for Jupiter DEX integration
 */
export class JupiterService {
  private jupiterQuoteApi: string = "https://quote-api.jup.ag/v6";
  private jupiterSwapApi: string = "https://quote-api.jup.ag/v6";
  private connection: Connection;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL: number = 30 * 1000; // 30 seconds

  constructor(rpcEndpoint: string = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com") {
    this.connection = new Connection(rpcEndpoint, "confirmed");
  }

  /**
   * Get a swap quote from Jupiter
   */
  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippage: number = 0.5,
    onlyDirectRoutes: boolean = false
  ): Promise<JupiterQuote> {
    const cacheKey = `quote-${inputMint}-${outputMint}-${amount}-${slippage}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: String(amount),
        slippageBps: String(Math.round(slippage * 100)),
        onlyDirectRoutes: String(onlyDirectRoutes),
        asLegacyTransaction: "false",
        maxAccounts: "20"
      });

      const response = await fetch(
        `${this.jupiterQuoteApi}/quote?${params.toString()}`,
        {
          headers: {
            Accept: "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status} ${response.statusText}`);
      }

      const data: JupiterQuote = await response.json();

      // Cache the quote
      this.cache.set(cacheKey, { data, timestamp: Date.now() });

      return data;
    } catch (error: any) {
      throw new Error(`Failed to get Jupiter quote: ${error.message}`);
    }
  }

  /**
   * Get swap instructions from Jupiter
   */
  async getSwapInstructions(
    quote: JupiterQuote,
    userPublicKey: PublicKey,
    wrapUnwrapSOL: boolean = true
  ): Promise<SwapInstructions> {
    try {
      const response = await fetch(`${this.jupiterSwapApi}/swap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: userPublicKey.toBase58(),
          wrapUnwrapSOL,
          useSharedAccountsFeature: true
        })
      });

      if (!response.ok) {
        throw new Error(`Jupiter swap API error: ${response.status}`);
      }

      const data: SwapInstructions = await response.json();
      return data;
    } catch (error: any) {
      throw new Error(`Failed to get swap instructions: ${error.message}`);
    }
  }

  /**
   * Get token list and prices
   */
  async getTokenList(): Promise<any[]> {
    const cacheKey = "token-list";
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL * 10) {
      return cached.data;
    }

    try {
      const response = await fetch("https://token.jup.ag/all", {
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Token list error: ${response.status}`);
      }

      const tokens: any[] = await response.json();
      this.cache.set(cacheKey, { data: tokens, timestamp: Date.now() });
      return tokens;
    } catch (error: any) {
      throw new Error(`Failed to get token list: ${error.message}`);
    }
  }

  /**
   * Get token prices from Jupiter
   */
  async getTokenPrices(mints: string[]): Promise<Record<string, number>> {
    try {
      const mintsParam = mints.join(",");
      const response = await fetch(
        `https://api.jup.ag/price/v2?ids=${mintsParam}`,
        {
          headers: {
            Accept: "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Price API error: ${response.status}`);
      }

      const data: any = await response.json();
      const prices: Record<string, number> = {};

      for (const mint of mints) {
        const priceData = data.data?.[mint];
        prices[mint] = priceData?.price ? parseFloat(priceData.price) : 0;
      }

      return prices;
    } catch (error: any) {
      throw new Error(`Failed to get token prices: ${error.message}`);
    }
  }

  /**
   * Parse Jupiter swap transaction
   */
  async parseSwapTransaction(
    swapTransactionBase64: string
  ): Promise<{
    instructions: any[];
    feePayer: PublicKey;
    recentBlockhash: string;
  }> {
    try {
      const swapTransactionBuf = Buffer.from(swapTransactionBase64, "base64");
      const transaction = Transaction.from(swapTransactionBuf);

      return {
        instructions: transaction.instructions,
        feePayer: transaction.feePayer!,
        recentBlockhash: transaction.recentBlockhash!
      };
    } catch (error: any) {
      throw new Error(`Failed to parse swap transaction: ${error.message}`);
    }
  }

  /**
   * Estimate price impact
   */
  calculatePriceImpact(inAmount: string, outAmount: string, priceBefore: number): number {
    const inDecimals = 6; // USDC
    const outDecimals = 9; // SOL
    const inAmountDecimal = parseFloat(inAmount) / Math.pow(10, inDecimals);
    const outAmountDecimal = parseFloat(outAmount) / Math.pow(10, outDecimals);

    const exactOutAmount = inAmountDecimal / priceBefore;
    const priceImpact = ((exactOutAmount - outAmountDecimal) / exactOutAmount) * 100;

    return Math.max(0, priceImpact);
  }

  /**
   * Check if route is available
   */
  async isRouteAvailable(inputMint: string, outputMint: string): Promise<boolean> {
    try {
      const quote = await this.getQuote(inputMint, outputMint, 1000000, 0.5, true);
      return quote.outAmount !== "0";
    } catch {
      return false;
    }
  }

  /**
   * Get best route between two tokens
   */
  async getBestRoute(
    inputMint: string,
    outputMint: string,
    amount: number
  ): Promise<JupiterQuote> {
    // Try direct route first
    try {
      return await this.getQuote(inputMint, outputMint, amount, 0.5, true);
    } catch {
      // Fall back to any route
      return await this.getQuote(inputMint, outputMint, amount, 0.5, false);
    }
  }
}

export default JupiterService;
