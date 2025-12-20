"use client";

export class BirdeyeClient {
    private apiKey: string;
    private baseUrl = "https://public-api.birdeye.so";

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Fetches token metadata from Birdeye.
     */
    async getTokenMetadata(mint: string): Promise<any> {
        console.log(`[BirdeyeClient] Fetching metadata for ${mint}...`);
        try {
            const response = await fetch(`${this.baseUrl}/public/token_metadata?address=${mint}`, {
                headers: {
                    "X-API-KEY": this.apiKey,
                    "x-chain": "solana"
                }
            });
            const data = await response.json();
            return data.data;
        } catch (err) {
            console.error(`[BirdeyeClient] Failed to fetch metadata:`, err);
            return null;
        }
    }

    /**
     * Fetches price for a specific token.
     */
    async getPrice(mint: string): Promise<number> {
        try {
            const response = await fetch(`${this.baseUrl}/public/price?address=${mint}`, {
                headers: {
                    "X-API-KEY": this.apiKey,
                    "x-chain": "solana"
                }
            });
            const data = await response.json();
            return data.data?.value || 0;
        } catch (err) {
            console.error(`[BirdeyeClient] Failed to fetch price:`, err);
            return 0;
        }
    }
}
