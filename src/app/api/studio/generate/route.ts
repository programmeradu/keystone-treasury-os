import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { generateFullSystemPromptAddendum } from "@/lib/studio/framework-spec";

// ─── Provider Helpers ───────────────────────────────────────────────

function getDefaultModel(provider: string): string {
  switch (provider) {
    case "openai": return "gpt-4o";
    case "groq": return "llama-3.3-70b-versatile";
    case "google": return "gemini-2.0-flash";
    case "anthropic": return "claude-sonnet-4-20250514";
    case "cloudflare": return "@cf/qwen/qwen3-30b-a3b-fp8";
    case "ollama": return "qwen2.5-coder:7b";
    default: return "gpt-4o";
  }
}

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

${generateFullSystemPromptAddendum()}

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
- NO emojis in code or JSON. NO placeholder comments like "// TODO". Write REAL logic.

═══════════════════════════════════════════════════════════════
§8. ANTI-PATTERNS (NEVER DO THESE)
═══════════════════════════════════════════════════════════════

- NEVER use useWallet(), useConnection(), useSolana() — these do NOT exist
- NEVER import @solana/web3.js, ethers, axios, or any npm package not listed
- NEVER write Node.js code (no fs, path, process, require, __dirname)
- NEVER use class components — always use functional components with hooks
- NEVER generate server-side code — this is a client-side React app in an iframe
- NEVER use 'export const App' — MUST use 'export default function App()'
- If unsure whether a hook exists, ONLY use hooks listed in §3 above`;


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, contextFiles, aiConfig } = body;

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

    // ─── Provider Resolution ────────────────────────────────────────
    // Priority: BYOK (user's key) → env OpenAI → env/fallback Groq
    // Groq serves as the always-on free tier so the Architect always works.

    const byokProvider = aiConfig?.provider;
    const byokKey = aiConfig?.apiKey;
    const byokModel = aiConfig?.model;

    // Determine which provider + key + model to use
    let provider: "openai" | "groq" | "google" | "anthropic" | "cloudflare" | "ollama";
    let activeKey: string;
    let activeModel: string;

    if (byokKey && byokProvider) {
      // 1. User's BYOK key takes top priority (any provider incl. OpenAI)
      provider = byokProvider as typeof provider;
      activeKey = byokKey;
      activeModel = byokModel || getDefaultModel(byokProvider);
    } else if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_TOKEN) {
      // 2. Cloudflare Workers AI — primary free tier (10K neurons/day, your own account)
      provider = "cloudflare";
      activeKey = process.env.CLOUDFLARE_AI_TOKEN;
      activeModel = process.env.CLOUDFLARE_AI_MODEL || "@cf/qwen/qwen3-30b-a3b-fp8";
    } else if (process.env.GROQ_API_KEY) {
      // 3. Groq — secondary free fallback (1,000 req/day, fastest inference)
      provider = "groq";
      activeKey = process.env.GROQ_API_KEY;
      activeModel = "llama-3.3-70b-versatile";
    } else if (process.env.OLLAMA_HOST || process.env.OLLAMA_ENABLED === "true") {
      // 4. Ollama — local self-hosted (no API key needed, unlimited)
      provider = "ollama";
      activeKey = "ollama";
      activeModel = process.env.OLLAMA_MODEL || "qwen2.5-coder:7b";
    } else {
      // No keys at all
      return NextResponse.json(
        {
          error: "no_api_key",
          details: "No AI API key configured. Open Settings (gear icon) to add your own OpenAI, Google Gemini, Anthropic, or Groq key.",
          files: {},
          explanation: "",
        },
        { status: 200 }
      );
    }

    // ─── LLM Call ───────────────────────────────────────────────────
    let response: string;

    if (provider === "openai" || provider === "groq") {
      // Both OpenAI and Groq use the OpenAI-compatible SDK
      const client = new OpenAI({
        apiKey: activeKey,
        ...(provider === "groq" && { baseURL: "https://api.groq.com/openai/v1" }),
      });

      const isOpenAI = provider === "openai";
      const completion = await client.chat.completions.create({
        model: activeModel,
        messages: [
          {
            role: "system",
            content: isOpenAI
              ? STUDIO_SYSTEM_PROMPT
              : STUDIO_SYSTEM_PROMPT + "\n\nIMPORTANT: Return ONLY raw JSON. Do not wrap in markdown code blocks.",
          },
          { role: "user", content: fullPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
        ...(isOpenAI && { response_format: { type: "json_object" as const } }),
      });
      response = completion.choices[0]?.message?.content || "{}";

    } else if (provider === "google") {
      // Google Gemini — REST API
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${activeKey}`;
      const geminiRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: STUDIO_SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000,
            responseMimeType: "application/json",
          },
        }),
      });
      if (!geminiRes.ok) {
        const err = await geminiRes.json().catch(() => ({}));
        throw new Error(err.error?.message || `Google API error ${geminiRes.status}`);
      }
      const geminiData = await geminiRes.json();
      response = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    } else if (provider === "anthropic") {
      // Anthropic Claude — Messages API
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": activeKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: activeModel,
          max_tokens: 4000,
          system: STUDIO_SYSTEM_PROMPT + "\n\nIMPORTANT: Return ONLY raw JSON. Do not wrap in markdown code blocks.",
          messages: [{ role: "user", content: fullPrompt }],
        }),
      });
      if (!claudeRes.ok) {
        const err = await claudeRes.json().catch(() => ({}));
        throw new Error(err.error?.message || `Anthropic API error ${claudeRes.status}`);
      }
      const claudeData = await claudeRes.json();
      response = claudeData.content?.[0]?.text || "{}";

    } else if (provider === "cloudflare") {
      // Cloudflare Workers AI — OpenAI-compatible endpoint
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || byokKey?.split(":")[0];
      const cfToken = activeKey.includes(":") ? activeKey.split(":")[1] : activeKey;

      const client = new OpenAI({
        apiKey: cfToken,
        baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`,
      });
      const completion = await client.chat.completions.create({
        model: activeModel,
        messages: [
          {
            role: "system",
            content: STUDIO_SYSTEM_PROMPT + "\n\nIMPORTANT: Return ONLY raw JSON. Do not wrap in markdown code blocks.",
          },
          { role: "user", content: fullPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });
      response = completion.choices[0]?.message?.content || "{}";

    } else if (provider === "ollama") {
      // Ollama — local self-hosted, OpenAI-compatible API
      const ollamaHost = process.env.OLLAMA_HOST || "http://localhost:11434";
      const client = new OpenAI({
        apiKey: "ollama", // Ollama ignores the key
        baseURL: `${ollamaHost}/v1`,
      });
      const completion = await client.chat.completions.create({
        model: activeModel,
        messages: [
          {
            role: "system",
            content: STUDIO_SYSTEM_PROMPT + "\n\nIMPORTANT: Return ONLY raw JSON. Do not wrap in markdown code blocks.",
          },
          { role: "user", content: fullPrompt },
        ],
        temperature: 0.7,
      });
      response = completion.choices[0]?.message?.content || "{}";

    } else {
      throw new Error(`Unsupported provider: ${provider}`);
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
