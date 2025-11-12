import { NextRequest, NextResponse } from "next/server";
import { ATLAS_TOOL_MANIFEST } from "@/lib/atlas-tool-manifest";

// Helper function to call the underlying AI provider and handle responses
async function callLLM(origin: string, prompt: string, provider: "groq" | "github") {
  try {
    console.log(`[callLLM] Calling provider: ${provider}`);
    const requestBody = {
      prompt,
      provider,
      model: provider === 'github' ? 'gpt-4' : 'llama-3.3-70b-versatile',
      json: true,
    };
    console.log(`[callLLM] Request body:`, JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${origin}/api/ai/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    console.log(`[callLLM] Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[callLLM] ${provider} API failed with status ${response.status}`);
      console.error(`[callLLM] Error body:`, errorBody);
      return null;
    }

    const aiJson = await response.json();
    console.log(`[callLLM] Raw AI response:`, JSON.stringify(aiJson, null, 2));

    if (typeof aiJson.text === 'string') {
      try {
        const cleanedText = aiJson.text.replace(/```json\n?/g, "").replace(/\n?```/g, "").trim();
        console.log(`[callLLM] Cleaned text:`, cleanedText);
        const parsed = JSON.parse(cleanedText);
        console.log(`[callLLM] Successfully parsed:`, JSON.stringify(parsed, null, 2));
        return parsed;
      } catch (e) {
        console.error(`[callLLM] Failed to parse JSON from ${provider}:`, e);
        console.error(`[callLLM] Raw text:`, aiJson.text);
        return { tool_id: "unknown", reason: "Could not parse LLM response" };
      }
    }

    return aiJson;
  } catch (error) {
    console.error(`[callLLM] Exception while calling ${provider}:`, error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    const origin = new URL(req.url).origin;

    if (!text) {
      return NextResponse.json({ error: "Input text is required" }, { status: 400 });
    }

    const prompt = `
You are an expert AI assistant for the Solana Atlas dashboard. Your task is to parse the user's natural language command and convert it into a structured JSON object that corresponds to one of the available tools.

You must respond with a single, valid JSON object and nothing else. The JSON object should have a "tool_id" and a "parameters" object.

The user's command is: "${text}"

Here is the list of available tools (the tool manifest):
${ATLAS_TOOL_MANIFEST}

Analyze the user's command and determine the most appropriate tool.
- For financial actions like "swap", "stake", "airdrop scan", use the corresponding tool.
- For navigation commands like "go to the lab" or "show me the tools", use the "navigate_to_tab" tool. "The lab" or "strategy lab" corresponds to the 'lab' tab_id. "The tools" or "quests" corresponds to the 'quests' tab_id.
- Be intelligent. "show me jup" could imply swapping to JUP. "put 5 sol into marinade" means staking.
- If the command is ambiguous or doesn't match any tool, return an object with "tool_id": "unknown".
`;

    // First, try the primary provider (Groq)
    let parsedCommand = await callLLM(origin, prompt, "groq");

    // If Groq fails (returns null) or returns an 'unknown' command, fall back to the secondary provider (GitHub)
    if (!parsedCommand || parsedCommand.tool_id === "unknown") {
      console.log("Groq failed or returned 'unknown', falling back to GitHub model.");
      parsedCommand = await callLLM(origin, prompt, "github");
    }

    // If the fallback also fails or returns 'unknown', then we respond with the final result.
    if (!parsedCommand) {
        return NextResponse.json({ tool_id: "unknown", reason: "All AI providers failed." });
    }

    return NextResponse.json(parsedCommand);

  } catch (error: any) {
    console.error("Error in parse-atlas-command endpoint:", error);
    return NextResponse.json({ error: "Failed to parse command", details: error.message }, { status: 500 });
  }
}
