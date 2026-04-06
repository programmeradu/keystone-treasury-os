import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { generateFullSystemPromptAddendum } from "@/lib/studio/framework-spec";

/**
 * POST /api/ai/auto-fix
 *
 * Receives a runtime error + current code + console logs from ErrorAutoFix.tsx.
 * Returns { fixedCode, explanation } using the same multi-provider cascade
 * as /api/studio/generate.
 */

const AUTO_FIX_SYSTEM_PROMPT = `You are the Keystone AI Architect — Error Auto-Fix mode.

Your SOLE task: fix the runtime error in the user's Mini-App code.

RULES:
1. Return ONLY valid JSON: { "fixedCode": "<the entire fixed App.tsx>", "explanation": "<brief explanation>" }
2. Return the COMPLETE fixed file, not just a patch
3. Fix ONLY the error — do NOT refactor, restyle, or add features
4. Preserve all existing imports, hooks, and component structure
5. The code runs in a sandboxed iframe with these constraints:

${generateFullSystemPromptAddendum()}

COMMON FIXES:
- "X is not a function" → check hook usage, ensure import from '@keystone-os/sdk'
- "X is not defined" → missing import or variable declaration
- "fetch is not defined" → replace with useFetch() from SDK
- "localStorage is not defined" → blocked by sandbox, use React state
- Missing default export → add \`export default function App()\`
- Cannot read property of undefined → add null checks / optional chaining`;

type ProviderType = "openai" | "groq" | "google" | "anthropic" | "cloudflare" | "ollama";

async function callProvider(
  provider: ProviderType,
  key: string,
  model: string,
  prompt: string
): Promise<string> {
  if (provider === "openai" || provider === "groq") {
    const client = new OpenAI({
      apiKey: key,
      ...(provider === "groq" && { baseURL: "https://api.groq.com/openai/v1" }),
    });
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: AUTO_FIX_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 8000,
      ...(provider === "openai" && { response_format: { type: "json_object" as const } }),
    });
    return completion.choices[0]?.message?.content || "{}";
  } else if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8000,
        system: AUTO_FIX_SYSTEM_PROMPT + "\n\nReturn ONLY raw JSON.",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}`);
    const data = await res.json();
    return data.content?.[0]?.text || "{}";
  } else if (provider === "google") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: AUTO_FIX_SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 8000, responseMimeType: "application/json" },
      }),
    });
    if (!res.ok) throw new Error(`Google API error ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  } else if (provider === "cloudflare") {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || key.split(":")[0];
    const cfToken = key.includes(":") ? key.split(":")[1] : key;
    const client = new OpenAI({
      apiKey: cfToken,
      baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`,
    });
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: AUTO_FIX_SYSTEM_PROMPT + "\n\nReturn ONLY raw JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 8000,
    });
    return completion.choices[0]?.message?.content || "{}";
  } else if (provider === "ollama") {
    const host = process.env.OLLAMA_HOST || "http://localhost:11434";
    const client = new OpenAI({ apiKey: "ollama", baseURL: `${host}/v1` });
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: AUTO_FIX_SYSTEM_PROMPT + "\n\nReturn ONLY raw JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    });
    return completion.choices[0]?.message?.content || "{}";
  }
  throw new Error(`Unsupported provider: ${provider}`);
}

function buildProviderChain(): { provider: ProviderType; key: string; model: string }[] {
  const chain: { provider: ProviderType; key: string; model: string }[] = [];
  if (process.env.GROQ_API_KEY) {
    chain.push({ provider: "groq", key: process.env.GROQ_API_KEY, model: "llama-3.3-70b-versatile" });
  }
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_TOKEN) {
    chain.push({ provider: "cloudflare", key: process.env.CLOUDFLARE_AI_TOKEN, model: process.env.CLOUDFLARE_AI_MODEL || "@cf/qwen/qwen3-30b-a3b-fp8" });
  }
  if (process.env.OLLAMA_HOST || process.env.OLLAMA_ENABLED === "true") {
    chain.push({ provider: "ollama", key: "ollama", model: process.env.OLLAMA_MODEL || "qwen2.5-coder:7b" });
  }
  return chain;
}

export async function POST(req: NextRequest) {
  try {
    const { error, code, logs, sdkHooks } = await req.json();

    if (!error || !code) {
      return NextResponse.json({ error: "error and code fields are required" }, { status: 400 });
    }

    const prompt = `[RUNTIME ERROR]
${error}

[CONSOLE LOGS]
${(logs || []).slice(-20).join("\n")}

[CURRENT CODE — App.tsx]
${code}

[AVAILABLE SDK HOOKS]
${(sdkHooks || []).join(", ")}

Fix the runtime error. Return ONLY JSON: { "fixedCode": "...", "explanation": "..." }`;

    const chain = buildProviderChain();
    if (chain.length === 0) {
      return NextResponse.json({ error: "No AI provider configured" }, { status: 500 });
    }

    let response = "{}";
    let lastError: Error | null = null;

    for (const entry of chain) {
      try {
        response = await callProvider(entry.provider, entry.key, entry.model, prompt);
        lastError = null;
        break;
      } catch (err: any) {
        lastError = err;
      }
    }

    if (lastError) throw lastError;

    // Parse response
    let clean = response.trim();
    if (clean.startsWith("```")) {
      clean = clean.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { parsed = { fixedCode: code, explanation: "Could not parse AI response" }; }
      } else {
        parsed = { fixedCode: code, explanation: "Could not parse AI response" };
      }
    }

    return NextResponse.json({
      fixedCode: parsed.fixedCode || parsed.fixed_code || code,
      explanation: parsed.explanation || "Fix applied.",
    });
  } catch (err) {
    console.error("[auto-fix]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Auto-fix failed" },
      { status: 500 }
    );
  }
}
