import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const STUDIO_SYSTEM_PROMPT = `You are the Keystone Studio AI, a full-stack Web3 development assistant.

YOUR MISSION:
Synthesize production-grade TypeScript/React code that integrates specialized Solana protocols.

CRITICAL ARCHITECTURE RULES:
1. SINGLE-FILE SYNTHESIS: For the current preview environment, you MUST consolidate all React components and logic into one single file: "App.tsx". Do NOT create separate files like "SwapTool.tsx" unless specifically asked for a library structure.
2. MODULE RESOLUTION: The Keystone APIs (useVault, useTurnkey, AppEventBus) are provided via a virtual module. ALWAYS import them exactly like this:
   import { useVault, useTurnkey, AppEventBus } from './keystone';
3. FILE NAMING: Use lowercase for all filenames except "App.tsx".

RESEARCH CONTEXT UTILIZATION:
If the user provides a [RESEARCH CONTEXT] block, it is your PRIMARY source of truth. Extract API endpoints and method names to write REAL fetch() calls.

RUNTIME DIAGNOSTICS (DEBUGGING MODE):
If the user provides a [RUNTIME LOGS] block containing errors (red text, "error", "fail"):
1. PRIORITIZE FIXING THE CODE. Do not add new features until the error is resolved.
2. Analyze the stack trace or error message to pinpoint the exact line or import failing.
3. If it's a "Module not found" error, ensure you are using the virtual './keystone' module correctly or that the file structure matches your imports.

KEYSTONE CONTEXT APIS (available via './keystone'):
- useVault(): { activeVault, balances, tokens }
- useTurnkey(): { signTransaction, getPublicKey }
- AppEventBus: { emit: (type, payload) => void }

STYLING:
- Use Tailwind CSS. Dark theme: bg-zinc-900, text-white. Primary accent: emerald-400.

OUTPUT FORMAT (STRICT JSON):
{
  "files": {
    "App.tsx": "import React from 'react';\nimport { useTurnkey } from './keystone';\n\nexport default function App() { ... }"
  },
  "explanation": "Summarize the technical implementation and highlight research usage."
}

RULES:
1. NO PLACEHOLDERS. Write the ACTUAL logic.
2. Components must be self-contained in App.tsx.
3. ABSOLUTELY NO EMOJIS in the JSON response.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, contextFiles } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Construct Contextual Prompt
    let fullPrompt = prompt;
    if (contextFiles && Object.keys(contextFiles).length > 0) {
      const fileContext = Object.entries(contextFiles)
        .map(([name, file]: [string, any]) => `--- ${name} ---\n${file.content}\n`)
        .join("\n");

      fullPrompt = `CURRENT STUDIO FILES:\n${fileContext}\n\nUSER REQUEST:\n${prompt}`;
    }

    // Try OpenAI first, then GROQ
    const openaiKey = process.env.OPENAI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (!openaiKey && !groqKey) {
      // Return a demo response if no API keys
      return NextResponse.json({
        files: {
          "App.tsx": `import React from "react";
import { useVault } from "./keystone";

export default function App() {
  const { balances, tokens } = useVault();
  
  return (
    <div className="p-6 bg-zinc-900 min-h-screen text-white">
      <h1 className="text-xl font-bold text-emerald-400 mb-6 uppercase tracking-wider">
        Treasury Balance
      </h1>
      <div className="grid gap-3">
        {tokens?.map((token) => (
          <div 
            key={token.symbol}
            className="flex items-center justify-between p-4 bg-zinc-800 rounded-xl border border-zinc-700"
          >
            <div>
              <p className="font-bold">{token.symbol}</p>
              <p className="text-sm text-zinc-400">{token.name}</p>
            </div>
            <div className="text-right">
              <p className="font-mono font-bold">{token.balance.toLocaleString()}</p>
              <p className="text-sm text-emerald-400">
                \${(token.balance * token.price).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-500 mt-4 text-center">
        Demo: Configure API keys for AI generation
      </p>
    </div>
  );
}`,
        },
        explanation: "Demo response - Configure OPENAI_API_KEY or GROQ_API_KEY for AI-powered generation. This shows a basic treasury balance widget using Keystone context.",
      });
    }

    let response: string;

    if (openaiKey) {
      const openai = new OpenAI({ apiKey: openaiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: STUDIO_SYSTEM_PROMPT },
          { role: "user", content: fullPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" }, // Enforce JSON
      });
      response = completion.choices[0]?.message?.content || "{}";
    } else {
      // Use GROQ
      const groq = new OpenAI({
        apiKey: groqKey,
        baseURL: "https://api.groq.com/openai/v1",
      });
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: STUDIO_SYSTEM_PROMPT + "\n\nIMPORTANT: Return ONLY raw JSON. Do not wrap in markdown code blocks." },
          { role: "user", content: fullPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });
      response = completion.choices[0]?.message?.content || "{}";
    }

    // Parse JSON from response
    let cleanResponse = response.trim();

    // Strategy 1: Remove markdown code blocks
    if (cleanResponse.startsWith("```")) {
      cleanResponse = cleanResponse.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    let parsed;
    try {
      parsed = JSON.parse(cleanResponse);
    } catch (e) {
      // Strategy 2: Attempt to extract JSON object if direct parse fails
      console.warn("Direct JSON parse failed, attempting extraction...", e);
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.warn("Extracted JSON parse failed, falling back to raw text.", e2);
          // Strategy 3: Treat the whole response as the explanation
          parsed = {
            explanation: cleanResponse,
            files: {}
          };
        }
      } else {
        // Strategy 3: No JSON found, treat the whole response as the explanation
        console.warn("No JSON found, falling back to raw text.");
        parsed = {
          explanation: cleanResponse,
          files: {}
        };
      }
    }

    return NextResponse.json({
      files: parsed.files || {},
      explanation: parsed.explanation || "Code generated successfully.",
    });
  } catch (error) {
    console.error("Studio Generate Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate code",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
