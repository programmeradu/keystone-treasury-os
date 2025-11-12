import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

// For local development, you can set the API key and base URL from environment variables.
// For production, it's recommended to use a more secure way to manage API keys.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy",
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
});

// This is the "Tool Manifest" that describes the capabilities of the Atlas UI to the LLM.
// It's crucial for the LLM to know what actions it can perform.
const ATLAS_TOOL_MANIFEST = `
[
  {
    "tool_id": "navigate_to_tab",
    "description": "Navigates to a specific tab in the Atlas UI.",
    "parameters": {
      "tab": "'quests' or 'lab'"
    }
  },
  {
    "tool_id": "scan_airdrops",
    "description": "Scans the user's connected wallet for potential and eligible airdrops. This is the default action for any airdrop-related query.",
    "parameters": {}
  },
  {
    "tool_id": "swap_tokens",
    "description": "Initiates a token swap. Pre-fills the Jupiter swap form with the specified parameters.",
    "parameters": {
      "amount": "number (optional)",
      "input_token": "string (e.g., 'SOL', 'USDC', 'BONK')",
      "output_token": "string (e.g., 'USDC', 'JUP', 'WIF')"
    }
  },
  {
    "tool_id": "stake_sol",
    "description": "Initiates a SOL staking action with Marinade Finance.",
    "parameters": {
      "amount": "number (optional)"
    }
  },
  {
    "tool_id": "provide_liquidity",
    "description": "Initiates a liquidity provision action for a SOL/USDC pair.",
    "parameters": {
      "amount": "number (optional)"
    }
  },
  {
    "tool_id": "view_holder_insights",
    "description": "Fetches and displays holder statistics for a given token mint address.",
    "parameters": {
      "mint_address": "string (required)"
    }
  },
  {
    "tool_id": "scan_mev",
    "description": "Activates the MEV (Maximal Extractable Value) opportunity scanner.",
    "parameters": {}
  },
  {
    "tool_id": "create_dca_bot",
    "description": "Opens the modal to create a new Dollar-Cost Averaging (DCA) bot.",
    "parameters": {}
  },
  {
    "tool_id": "open_time_machine",
    "description": "Opens the Transaction Time Machine tool to inspect a past transaction.",
    "parameters": {
        "signature": "string (optional, the transaction signature)"
    }
  },
  {
    "tool_id": "copy_my_wallet",
    "description": "Opens the 'Copy My Wallet' tool to simulate another wallet's trades.",
    "parameters": {
        "address": "string (optional, the wallet address to copy)"
    }
  }
]
`;

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Input text is required" }, { status: 400 });
    }

    const systemPrompt = `
You are an expert AI assistant for the Solana Atlas dashboard. Your task is to parse the user's natural language command and convert it into a structured JSON object that corresponds to one of the available tools.

You must respond with a single JSON object and nothing else. The JSON object should have a "tool_id" and a "parameters" object.

The user's command is: "${text}"

Here is the list of available tools (the tool manifest):
${ATLAS_TOOL_MANIFEST}

Analyze the user's command and determine which tool is the most appropriate.
- If the user mentions swapping tokens, use "swap_tokens".
- If the user mentions staking, use "stake_sol".
- If the user mentions airdrops, use "scan_airdrops".
- If the user wants to see holder data for a token, use "view_holder_insights" and extract the mint address.
- If the user mentions "MEV", use "scan_mev".
- If the user mentions "DCA", use "create_dca_bot".
- Be intelligent. "show me jup" could imply swapping to JUP. "put 5 sol into marinade" means staking.
- If the command is ambiguous or doesn't match any tool, you can return an object with "tool_id": "unknown".
- Your response MUST be a valid JSON object. Do not add any commentary or extra text.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", // Or another suitable model
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Parse this command: "${text}"`,
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 500,
    });

    const parsedCommand = JSON.parse(response.choices[0].message.content || "{}");

    return NextResponse.json(parsedCommand);

  } catch (error: any) {
    console.error("Error parsing Atlas command:", error);
    return NextResponse.json({ error: "Failed to parse command", details: error.message }, { status: 500 });
  }
}
