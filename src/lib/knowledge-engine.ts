import { TavilyClient } from "@/lib/tavily";
import { JinaClient } from "@/lib/jina";
import { FirecrawlClient } from "@/lib/firecrawl";

export interface KnowledgeResult {
    query: string;
    summary: string;
    sources: Array<{ title: string; url: string }>;
    rawContent: string;
}

export class KnowledgeBase {
    private tavily: TavilyClient;
    private jina: JinaClient;
    private firecrawl: FirecrawlClient;

    constructor() {
        const tavilyKey = process.env.TAVILY_API_KEY || "";
        const jinaKey = process.env.JINA_API_KEY || "";
        const firecrawlKey = process.env.FIRECRAWL_API_KEY || "";

        if (!tavilyKey) console.warn("KnowledgeBase: Missing TAVILY_API_KEY");
        if (!jinaKey) console.warn("KnowledgeBase: Missing JINA_API_KEY");
        if (!firecrawlKey) console.warn("KnowledgeBase: Missing FIRECRAWL_API_KEY");

        this.tavily = new TavilyClient(tavilyKey);
        this.jina = new JinaClient(jinaKey);
        this.firecrawl = new FirecrawlClient(firecrawlKey);
    }

    /**
     * Conducts deep research on a topic:
     * 1. Searches for documentation via Tavily
     * 2. Reads the top source via Jina
     * 3. Reads the secondary source via Firecrawl for multi-vector accuracy
     * 4. Returns consolidated intelligence
     */
    async study(topic: string): Promise<KnowledgeResult> {
        console.log(`[KnowledgeBase] Initiating Multi-Vector Research: ${topic}`);

        // 1. Search for deep documentation
        const searchResults = await this.tavily.search(`${topic} technical documentation SDK code examples`, "advanced");

        if (!searchResults.length) {
            return { query: topic, summary: "No intelligence found in current sector.", sources: [], rawContent: "" };
        }

        const topSources = searchResults.slice(0, 3);
        console.log(`[KnowledgeBase] Targeting Sources: ${topSources.map(s => s.url).join(", ")}`);

        // 2. Multi-Vector Scraping
        // We use Jina for the primary and Firecrawl for the secondary to cross-reference
        const [primaryContent, secondaryContent] = await Promise.all([
            this.jina.readUrl(topSources[0].url),
            topSources[1] ? this.firecrawl.scrape(topSources[1].url) : Promise.resolve("")
        ]);

        const consolidatedIntelligence = `
SOURCE_A (JINA): ${topSources[0].url}
---
${primaryContent}

${topSources[1] ? `
SOURCE_B (FIRECRAWL): ${topSources[1].url}
---
${secondaryContent}
` : ""}
        `.trim();

        return {
            query: topic,
            summary: searchResults[0].content, // Executive summary from Tavily
            sources: topSources.map(s => ({ title: s.title, url: s.url })),
            rawContent: consolidatedIntelligence.slice(0, 15000) // Support larger context for multi-source
        };
    }
}

export const knowledgeBase = new KnowledgeBase();
