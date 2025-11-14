import type {
  ExecutionContext,
  AgentConfig,
  ProgressCallback,
  TokenMetadata,
  TokenPrice,
  HolderDistribution
} from "./types";
import { BaseAgent } from "./base-agent";

/**
 * Lookup Agent - Fetches data from multiple sources
 * Responsibilities:
 * - Token metadata resolution
 * - Wallet holdings analysis
 * - Price fetching with fallbacks
 * - Liquidity depth checking
 * - Holder distribution analysis
 */
export class LookupAgent extends BaseAgent {
  name = "LookupAgent";
  private jupiterTokensCache: Map<string, TokenMetadata> = new Map();
  private priceCache: Map<string, TokenPrice> = new Map();
  private priceCacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    config?: Partial<AgentConfig>,
    progressCallback?: ProgressCallback
  ) {
    const defaultConfig: AgentConfig = {
      name: "LookupAgent",
      timeout: 15000, // 15 seconds
      retryConfig: {
        maxRetries: 2,
        initialDelayMs: 500,
        maxDelayMs: 5000,
        backoffMultiplier: 2
      },
      endpoints: {
        jupiter: "https://api.jup.ag/price/v2",
        moralis: "https://deep-index.moralis.io/api/v2.2"
      },
      ...config
    };

    super(defaultConfig, progressCallback);
  }

  /**
   * Validate input
   */
  async validate(context: ExecutionContext, input: any): Promise<boolean> {
    return !!input;
  }

  /**
   * Execute - route to specific lookup method based on input
   */
  async executeAgent(context: ExecutionContext, input: any): Promise<any> {
    const { action, params } = input;

    switch (action) {
      case "resolve_token_metadata":
        return this.resolveTokenMetadata(params.mint);

      case "fetch_token_prices":
        return this.fetchTokenPrices(params.mints, context);

      case "fetch_wallet_holdings":
        return this.fetchWalletHoldings(params.wallet, params.connection, context);

      case "fetch_holder_distribution":
        return this.fetchHolderDistribution(params.mint, context);

      case "fetch_liquidity_depth":
        return this.fetchLiquidityDepth(params.mint, context);

      default:
        throw new Error(`Unknown lookup action: ${action}`);
    }
  }

  /**
   * Resolve token metadata from Jupiter
   */
  async resolveTokenMetadata(mint: string): Promise<TokenMetadata> {
    // Check cache first
    if (this.jupiterTokensCache.has(mint)) {
      return this.jupiterTokensCache.get(mint)!;
    }

    try {
      const response = await fetch(
        `https://token.jup.ag/token/${mint}`,
        { cache: "force-cache" }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch metadata for ${mint}`);
      }

      const data = await response.json();

      const metadata: TokenMetadata = {
        mint,
        symbol: data.symbol || "UNKNOWN",
        name: data.name || "Unknown Token",
        decimals: data.decimals || 0,
        logoURI: data.logoURI,
        verified: !!data.verified,
        source: "jupiter"
      };

      // Cache it
      this.jupiterTokensCache.set(mint, metadata);
      return metadata;
    } catch (error: any) {
      // Return minimal metadata if fetch fails
      return {
        mint,
        symbol: "???",
        name: "Unknown Token",
        decimals: 0,
        source: "fallback",
        verified: false
      };
    }
  }

  /**
   * Fetch token prices from Jupiter with fallback
   */
  private async fetchTokenPrices(mints: string[], context: ExecutionContext): Promise<TokenPrice[]> {
    try {
      this.addStep(context, "fetch_prices");

      // Check cache first
      const prices: TokenPrice[] = [];
      const uncachedMints: string[] = [];

      for (const mint of mints) {
        const cached = this.priceCache.get(mint);
        if (cached && Date.now() - cached.timestamp < this.priceCacheTTL) {
          prices.push(cached);
        } else {
          uncachedMints.push(mint);
        }
      }

      // Fetch uncached prices
      if (uncachedMints.length > 0) {
        const mintsParam = uncachedMints.join(",");
        const response = await fetch(
          `${this.config.endpoints?.jupiter || "https://api.jup.ag/price/v2"}?ids=${mintsParam}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch prices from Jupiter");
        }

        const data = await response.json();

        for (const mint of uncachedMints) {
          const priceData = data.data?.[mint];
          if (priceData) {
            const price: TokenPrice = {
              mint,
              price: parseFloat(priceData.price) || 0,
              source: "jupiter",
              timestamp: Date.now(),
              change24h: priceData.percentChange?.h24
            };
            prices.push(price);
            this.priceCache.set(mint, price);
          }
        }
      }

      return prices;
    } catch (error: any) {
      throw new Error(`Failed to fetch token prices: ${error.message}`);
    }
  }

  /**
   * Fetch wallet holdings using connection
   */
  private async fetchWalletHoldings(
    wallet: string,
    connection: any,
    context: ExecutionContext
  ): Promise<any[]> {
    try {
      this.addStep(context, "fetch_holdings");

      const { PublicKey } = await import("@solana/web3.js");
      const walletKey = new PublicKey(wallet);

      // Get all token accounts
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        walletKey,
        { programId: new PublicKey("TokenkegQfeZyiNwAJsyFbPVwwQQfKP6MwGSKef2bnUU") }
      );

      const holdings = tokenAccounts.value.map((account: any) => {
        const parsed = account.account.data.parsed;
        return {
          mint: parsed.info.mint,
          owner: parsed.info.owner,
          amount: parsed.info.tokenAmount.amount,
          decimals: parsed.info.tokenAmount.decimals,
          uiAmount: parsed.info.tokenAmount.uiAmount
        };
      });

      return holdings;
    } catch (error: any) {
      throw new Error(`Failed to fetch wallet holdings: ${error.message}`);
    }
  }

  /**
   * Fetch holder distribution from Jupiter or fallback
   */
  private async fetchHolderDistribution(mint: string, context: ExecutionContext): Promise<HolderDistribution> {
    try {
      this.addStep(context, "fetch_distribution");

      // Try to fetch from an analytics endpoint
      // This is a placeholder - real implementation would use Moralis or similar
      const response = await fetch(
        `https://api.solflare.com/v1/nft/tokens/${mint}/holders`
      ).catch(() => null);

      if (!response || !response.ok) {
        // Return default distribution if fetch fails
        return {
          mint,
          totalHolders: 0,
          topHolder: { address: "", percent: 0 },
          concentration: "unknown" as any,
          riskScore: 50 // Medium risk if unknown
        };
      }

      const data = await response.json();

      return {
        mint,
        totalHolders: data.totalHolders || 0,
        topHolder: {
          address: data.topHolder?.address || "",
          percent: data.topHolder?.percent || 0
        },
        concentration:
          data.topHolder?.percent > 50
            ? "high"
            : data.topHolder?.percent > 20
              ? "medium"
              : "low",
        riskScore: this.calculateHolderRiskScore(data)
      };
    } catch (error: any) {
      throw new Error(
        `Failed to fetch holder distribution: ${error.message}`
      );
    }
  }

  /**
   * Fetch liquidity depth for a token
   */
  private async fetchLiquidityDepth(mint: string, context: ExecutionContext): Promise<any> {
    try {
      this.addStep(context, "fetch_liquidity");

      // Query Jupiter for liquidity info
      const response = await fetch(`https://api.jup.ag/stats/locked-tokens`);

      if (!response.ok) {
        return { mint, liquidity: 0, status: "unknown" };
      }

      const data = await response.json();
      const tokenData = data[mint];

      return {
        mint,
        liquidity: tokenData?.tvl || 0,
        status: tokenData ? "known" : "unknown"
      };
    } catch (error: any) {
      return { mint, liquidity: 0, status: "error", error: error.message };
    }
  }

  /**
   * Calculate holder risk score based on distribution
   */
  private calculateHolderRiskScore(data: any): number {
    let score = 0;

    // High concentration = high risk
    if (data.topHolder?.percent > 50) score += 40;
    else if (data.topHolder?.percent > 30) score += 20;
    else if (data.topHolder?.percent > 10) score += 10;

    // Low holder count = high risk
    if (data.totalHolders < 100) score += 30;
    else if (data.totalHolders < 1000) score += 15;

    return Math.min(100, score);
  }
}
