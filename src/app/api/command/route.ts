import { streamText, tool } from "ai";

import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";

// Initialize Groq provider
const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    const { messages, walletState, walletAddress } = await req.json();

    const systemPrompt = `You are Keystone AI, an intelligent crypto OS assistant.
You help users manage their Solana portfolio, execute trades, and perform research.
When the user asks to perform an action (like swap, transfer, stake, search, research), you MUST use the provided tools.
If you are just answering a question without needing to perform an action, you can reply with text.

User Context:
Wallet Address: ${walletAddress || "Not connected"}
Wallet State: ${JSON.stringify(walletState || {})}
`;

    const result = streamText({
      model: groq("llama-3.3-70b-versatile"),
      system: systemPrompt,
      messages,
      tools: {
        swap: tool({
          description: "Prepare a swap transaction between two tokens on Solana.",
          parameters: z.object({
            inputToken: z.string().describe("The token to sell (e.g., SOL, USDC, BONK)."),
            outputToken: z.string().describe("The token to buy (e.g., SOL, USDC, BONK)."),
            amount: z.number().describe("The amount of the input token to sell."),
            slippage: z.number().optional().describe("Allowed slippage percentage (default: 0.5%)."),
          }),
        } as any),
        transfer: tool({
          description: "Prepare a transfer of tokens to another Solana address.",
          parameters: z.object({
            token: z.string().describe("The token to transfer (e.g., SOL, USDC)."),
            amount: z.number().describe("The amount to transfer."),
            destination: z.string().describe("The recipient Solana address."),
          }),
        } as any),
        browser_research: tool({
          description: "Perform deep research using the browser and knowledge base.",
          parameters: z.object({
            query: z.string().describe("The search query or topic to research."),
            url: z.string().optional().describe("A specific URL to read from if provided."),
          }),
          execute: async ({ query, url }: any) => {
            // In a real scenario we could call the KB or scraping tool here.
            // For now we just return instructions for the client to handle or display.
            return { query, url, status: "completed", result: "Research initiated..." };
          }
        } as any),
        rebalance: tool({
          description: "Prepare a transaction to rebalance the user's portfolio to target allocations.",
          parameters: z.object({
            targetAllocations: z.array(z.object({
              token: z.string(),
              percentage: z.number()
            })).describe("The target percentages for each token, summing to 100."),
          }),
        } as any),
      },
    });

    return (result as any).toTextStreamResponse();
  } catch (error) {
    console.error("[Command API] Error:", error);
    return new Response(JSON.stringify({ error: "Failed to process command" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
