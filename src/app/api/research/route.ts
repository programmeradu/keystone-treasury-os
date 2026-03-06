import { streamText, tool } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";
import { markdown as cfMarkdown } from "@/lib/cloudflare/cf-browser";
import { knowledgeBase } from "@/lib/knowledge";
import { knowledgeMemory } from "@/lib/knowledge-memory";

// Initialize Groq provider
const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    const { messages, walletState, walletAddress } = await req.json();

    // ─── AI SDK v5 Format Fix ─────────────────────────────────────────────
    // AI SDK v5 `useChat` sends `{ role: 'user', content: [{ type: 'text', text: '...' }] }`
    // Groq expects `{ role: 'user', content: '...' }` string formats.
    // We map the incoming messages to ensure they are strings.
    const formattedMessages = messages.map((m: any) => {
      if (Array.isArray(m.content)) {
        return {
          ...m,
          content: m.content.map((c: any) => c.text || JSON.stringify(c)).join("\n")
        };
      }
      return m;
    });

    const systemPrompt = `You are Keystone AI, an intelligent crypto OS research assistant.
You specialize in retrieving, synthesizing, and summarizing intelligence using your deep research tools.
Always use the browser_research tool when asked about external information, protocols, prices, or documentation.

User Context:
Wallet Address: ${walletAddress || "Not connected"}
Wallet State: ${JSON.stringify(walletState || {})}
`;

    // @ts-ignore - maxSteps might not be in the current type definition but is supported in newer AI SDK runtimes
    const result = await streamText({
      model: groq("llama-3.3-70b-versatile"),
      system: systemPrompt,
      messages: formattedMessages,
      // @ts-ignore
      maxSteps: 10, // Allow tool calling + synthesis
      tools: {
        browser_research: tool({
          description: "Perform deep research using the browser and knowledge base.",
          parameters: z.object({
            query: z.string().describe("The search query or topic to research."),
            url: z.string().optional().describe("A specific URL to read from if provided."),
          }),
          execute: async ({ query, url }: any) => {
            console.log(`[Deep Research] Initiating parallel research for: "${query}"${url ? ` (Target: ${url})` : ""}`);

            const tasks: Promise<any>[] = [];

            // 1. Direct Browser Scrape (if URL provided)
            let browserPromise: Promise<any> | null = null;
            if (url) {
              browserPromise = cfMarkdown({ url }).then(markdown => ({
                source: "cloudflare-browser",
                markdown
              }));
              tasks.push(browserPromise);
            }

            // 2. Knowledge Base Multi-Agent Study (Tavily + Jina + Firecrawl)
            const kbPromise = knowledgeBase.study(query).then(res => ({
              source: "knowledge-base",
              data: res
            }));
            tasks.push(kbPromise);

            // Wait for both execution flows to finish
            const results = await Promise.allSettled(tasks);

            let synthesized = "";
            let urlResearch = "";
            let kbResearch = "";

            // Map results
            if (browserPromise && results[0].status === "fulfilled") {
              urlResearch = results[0].value.markdown;
              synthesized += `### 🌐 Direct Browser Scrape (${url})\n${urlResearch}\n\n`;
            } else if (browserPromise && results[0].status === "rejected") {
              console.warn("[Deep Research] CF Browser failed:", results[0].reason);
            }

            const kbResultIndex = browserPromise ? 1 : 0;
            if (results[kbResultIndex].status === "fulfilled") {
              const kbData = (results[kbResultIndex] as any).value.data;
              kbResearch = kbData.rawContent || kbData.summary || "No KB results found.";
              synthesized += `### 🔍 Knowledge Base Intelligence\n${kbResearch}\n\n`;
            } else if (results[kbResultIndex].status === "rejected") {
              console.warn("[Deep Research] Knowledge Base failed:", results[kbResultIndex].reason);
            }

            // Store intelligence in Neon Postgres Memory
            if (synthesized) {
              try {
                await knowledgeMemory.store({
                  source: "deep-research-tool",
                  sourceUrl: url || "multi-source",
                  content: synthesized,
                  title: query,
                  summary: `${query}\n${synthesized.slice(0, 1000)}`,
                  contentType: "markdown",
                });
                console.log("[Deep Research] Intelligence successfully saved to memory database.");
              } catch (dbErr) {
                console.error("[Deep Research] Failed to save to memory:", dbErr);
              }
            }

            return {
              status: "completed",
              query,
              url,
              synthesized_intelligence: synthesized || "Research returned no usable data."
            };
          }
        } as any),
      },
    });

    return (result as any).toDataStreamResponse?.() || (result as any).toTextStreamResponse();
  } catch (error) {
    console.error("[Research API] Error:", error);
    return new Response(JSON.stringify({ error: "Failed to process research request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
