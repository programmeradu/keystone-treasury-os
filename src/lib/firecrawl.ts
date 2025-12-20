"use client";

export class FirecrawlClient {
    private apiKey: string;
    private baseUrl = "https://api.firecrawl.dev/v1";

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Scrapes a single URL and returns clean Markdown.
     */
    async scrape(url: string): Promise<string> {
        console.log(`[FirecrawlClient] Scraping URL: ${url}`);
        try {
            const response = await fetch(`${this.baseUrl}/scrape`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ url })
            });
            const data = await response.json();
            if (!data.success) throw new Error(`Firecrawl Scrape Error: ${data.error}`);
            return data.data.markdown || "";
        } catch (err) {
            console.error(`[FirecrawlClient] Failed to scrape:`, err);
            return "";
        }
    }

    /**
     * Initiates a recursive crawl of a website.
     * Note: This is an async operation that returns a crawlId.
     */
    async crawl(url: string): Promise<string> {
        console.log(`[FirecrawlClient] Initiating Crawl: ${url}`);
        try {
            const response = await fetch(`${this.baseUrl}/crawl`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ url })
            });
            const data = await response.json();
            if (!data.success) throw new Error(`Firecrawl Crawl Error: ${data.error}`);
            return data.crawlId;
        } catch (err) {
            console.error(`[FirecrawlClient] Failed to start crawl:`, err);
            return "";
        }
    }
}
