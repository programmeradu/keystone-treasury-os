// Utility class for Jina Reader functionality

export class JinaClient {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Converts a URL to clean, LLM-friendly Markdown.
     */
    async readUrl(url: string): Promise<string> {
        console.log(`[JinaClient] Reading URL: ${url}`);
        try {
            const response = await fetch(`https://r.jina.ai/${url}`, {
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "X-Return-Format": "markdown"
                }
            });
            if (!response.ok) throw new Error(`Jina Reader Error: ${response.statusText}`);
            return await response.text();
        } catch (err) {
            console.error(`[JinaClient] Failed to read URL:`, err);
            return "";
        }
    }

    /**
     * Searches the web and returns results as LLM-friendly text.
     */
    async search(query: string): Promise<string> {
        console.log(`[JinaClient] Searching: ${query}`);
        try {
            const response = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`
                }
            });
            if (!response.ok) throw new Error(`Jina Search Error: ${response.statusText}`);
            return await response.text();
        } catch (err) {
            console.error(`[JinaClient] Failed to search:`, err);
            return "";
        }
    }
}
