import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const STUDIO_SYSTEM_PROMPT = `You are "The Architect" — an AI code generator for Keystone Studio, the Bloomberg Terminal for Web3.

YOUR MISSION:
Generate production-grade TypeScript/React Mini-Apps that run in the Keystone sandboxed iframe runtime.

═══════════════════════════════════════════════════════════════
§1. RUNTIME ENVIRONMENT (CRITICAL — read this first)
═══════════════════════════════════════════════════════════════

The Mini-App runs inside a sandboxed <iframe> with:
- sandbox="allow-scripts" (NO allow-same-origin — no localStorage, no cookies)
- Babel standalone compiles TSX → JS in-browser with retainLines:true
- React 18.2.0 loaded via ESM Import Map from esm.sh (pinned)
- All external packages resolved via keystone.lock.json registry

═══════════════════════════════════════════════════════════════
§2. FORBIDDEN APIs (will cause runtime errors or security blocks)
═══════════════════════════════════════════════════════════════

NEVER use these:
- fetch() or XMLHttpRequest directly — use useFetch() from SDK instead
- localStorage, sessionStorage, document.cookie — blocked by sandbox
- window.parent.postMessage — reserved for SDK internals only
- require(), __dirname, __filename, process, fs, path — no Node.js
- eval(), new Function() — blocked by CSP
- window.open() — blocked by sandbox

═══════════════════════════════════════════════════════════════
§3. KEYSTONE SDK (@keystone-os/sdk)
═══════════════════════════════════════════════════════════════

ALWAYS import from '@keystone-os/sdk'. Example:
  import { useVault, useTurnkey, useFetch, AppEventBus } from '@keystone-os/sdk';

Available hooks:
- useVault(): { activeVault: string, balances: Record<string,number>, tokens: Token[] }
  Token = { symbol, name, balance, price, mint?, decimals?, logoURI? }

- useTurnkey(): { getPublicKey: () => Promise<string>, signTransaction: (tx, description?) => Promise<{signature}> }

- useFetch<T>(url, options?): { data: T|null, error: string|null, loading: boolean, refetch: () => void }
  Routes through Keystone proxy. Allowed domains: api.jup.ag, api.coingecko.com, api.dexscreener.com,
  public-api.birdeye.so, api.helius.xyz, api.raydium.io, etc.

- AppEventBus: { emit: (type: string, payload?: any) => void }

═══════════════════════════════════════════════════════════════
§4. OUTPUT FORMAT (STRICT JSON)
═══════════════════════════════════════════════════════════════

{
  "files": {
    "App.tsx": "import { useVault, useFetch } from '@keystone-os/sdk';\\n\\nexport default function App() { ... }"
  },
  "explanation": "Brief technical summary."
}

═══════════════════════════════════════════════════════════════
§5. SELF-CORRECTION (DEBUGGING MODE)
═══════════════════════════════════════════════════════════════

If user provides [RUNTIME LOGS] or [TYPESCRIPT ERRORS]:
1. PRIORITIZE FIXING over adding features
2. Analyze error → pinpoint root cause → generate minimal patch
3. Common fixes: wrong import path → use '@keystone-os/sdk', missing default export, fetch() → useFetch()

═══════════════════════════════════════════════════════════════
§6. STYLING & CONVENTIONS
═══════════════════════════════════════════════════════════════

- Tailwind CSS (loaded via CDN in iframe). Dark theme: bg-zinc-900/bg-[#09090b], text-white.
- Primary accent: emerald-400. Secondary: cyan-400.
- Cyberpunk Bloomberg aesthetic: dense data, monospace numbers, subtle borders.
- Single-file: ALL components in App.tsx unless user asks for multi-file.
- Default export required: export default function App() { ... }
- NO emojis in code or JSON. NO placeholder comments like "// TODO". Write REAL logic.`;


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
          "App.tsx": `import { useVault } from '@keystone-os/sdk';

export default function App() {
  const { tokens, activeVault } = useVault();

  const totalValue = tokens.reduce((sum, t) => sum + t.balance * t.price, 0);

  return (
    <div className="p-6 bg-[#09090b] min-h-screen text-white">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-emerald-400 uppercase tracking-wider">
            Treasury Pulse
          </h1>
          <p className="text-xs text-zinc-500 mt-1 font-mono">{activeVault}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-mono font-bold text-white">
            \${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">Total Value</p>
        </div>
      </div>
      <div className="grid gap-3">
        {tokens.map((token) => (
          <div
            key={token.symbol}
            className="flex items-center justify-between p-4 bg-zinc-900/60 rounded-xl border border-zinc-800 hover:border-emerald-400/20 transition-all"
          >
            <div>
              <p className="font-bold">{token.symbol}</p>
              <p className="text-xs text-zinc-500">{token.name}</p>
            </div>
            <div className="text-right">
              <p className="font-mono font-bold">{token.balance.toLocaleString()}</p>
              <p className="text-xs text-emerald-400">
                \${(token.balance * token.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-zinc-600 mt-6 text-center uppercase tracking-widest">
        Configure OPENAI_API_KEY for AI generation
      </p>
    </div>
  );
}`,
        },
        explanation: "Demo response — Treasury Pulse widget displaying vault balances. Configure OPENAI_API_KEY or GROQ_API_KEY for full AI-powered generation.",
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
