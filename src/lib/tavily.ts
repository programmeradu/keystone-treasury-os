// Utility class for Tavily search functionality

export interface TavilySearchResult {
    title: string;
    url: string;
    content: string;
    score: number;
}

export class TavilyClient {
    private apiKey: string;
    private baseUrl = "https://api.tavily.com";

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Performs a semantic search specialized for developers and LLMs.
     */
    async search(query: string, searchDepth: "basic" | "advanced" = "basic"): Promise<TavilySearchResult[]> {
        console.log(`[TavilyClient] Searching: ${query}`);
        try {
            const response = await fetch(`${this.baseUrl}/search`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    api_key: this.apiKey,
                    query: query,
                    search_depth: searchDepth,
                    include_answer: true,
                    max_results: 5
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(`Tavily Error: ${JSON.stringify(data.error)}`);
            return data.results || [];
        } catch (err) {
            console.error(`[TavilyClient] Failed to search:`, err);
            return [];
        }
    }
}
