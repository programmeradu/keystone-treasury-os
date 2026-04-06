import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { generateFullSystemPromptAddendum } from "@/lib/studio/framework-spec";

/**
 * POST /api/ai/inline-gen
 *
 * Cursor-style Ctrl+K inline code generation. Receives cursor context,
 * optional selected text, and an instruction. Returns generated code snippet.
 */

const INLINE_GEN_SYSTEM_PROMPT = `You are the Keystone AI Architect — Inline Code Generation mode.

You generate FOCUSED code snippets for insertion at a specific cursor position in a Keystone Mini-App.

RULES:
1. Return ONLY valid JSON: { "code": "<generated code snippet>" }
2. Generate ONLY the requested code — no boilerplate, no imports unless needed
3. If transforming a selection, return the TRANSFORMED version of that selection only
4. If inserting new code, return ONLY the new lines to insert
5. Match the existing code style (indentation, naming conventions)
6. All code must be valid in the Keystone sandbox:

${generateFullSystemPromptAddendum()}

IMPORTANT:
- Do NOT return the full file — only the snippet to insert/replace
- Do NOT include markdown formatting or code fences
- Do NOT include explanations in the output — just the code JSON`;

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
        { role: "system", content: INLINE_GEN_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 4000,
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
        max_tokens: 4000,
        system: INLINE_GEN_SYSTEM_PROMPT + "\n\nReturn ONLY raw JSON.",
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
        systemInstruction: { parts: [{ text: INLINE_GEN_SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 4000, responseMimeType: "application/json" },
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
        { role: "system", content: INLINE_GEN_SYSTEM_PROMPT + "\n\nReturn ONLY raw JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 4000,
    });
    return completion.choices[0]?.message?.content || "{}";
  } else if (provider === "ollama") {
    const host = process.env.OLLAMA_HOST || "http://localhost:11434";
    const client = new OpenAI({ apiKey: "ollama", baseURL: `${host}/v1` });
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: INLINE_GEN_SYSTEM_PROMPT + "\n\nReturn ONLY raw JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
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
    const { prompt, context, selectedText, cursorLine, fullCode, sdkHooks } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    let userPrompt = `[INSTRUCTION]\n${prompt}\n`;

    if (selectedText) {
      userPrompt += `\n[SELECTED TEXT to transform]\n${selectedText}\n`;
    }

    if (context) {
      userPrompt += `\n[SURROUNDING CODE CONTEXT (around line ${cursorLine})]\n${context}\n`;
    }

    if (fullCode) {
      userPrompt += `\n[FULL FILE]\n${fullCode}\n`;
    }

    if (sdkHooks?.length) {
      userPrompt += `\n[AVAILABLE SDK HOOKS]\n${sdkHooks.join(", ")}\n`;
    }

    userPrompt += `\nReturn ONLY JSON: { "code": "<snippet>" }`;

    const chain = buildProviderChain();
    if (chain.length === 0) {
      return NextResponse.json({ error: "No AI provider configured" }, { status: 500 });
    }

    let response = "{}";
    let lastError: Error | null = null;

    for (const entry of chain) {
      try {
        response = await callProvider(entry.provider, entry.key, entry.model, userPrompt);
        lastError = null;
        break;
      } catch (err: any) {
        lastError = err;
      }
    }

    if (lastError) throw lastError;

    // Parse
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
        try { parsed = JSON.parse(match[0]); } catch { parsed = { code: clean }; }
      } else {
        parsed = { code: clean };
      }
    }

    return NextResponse.json({ code: parsed.code || "" });
  } catch (err) {
    console.error("[inline-gen]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Inline generation failed" },
      { status: 500 }
    );
  }
}
