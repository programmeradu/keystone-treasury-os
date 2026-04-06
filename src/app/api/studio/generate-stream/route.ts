import { NextRequest } from "next/server";
import OpenAI from "openai";
import { generateFullSystemPromptAddendum } from "@/lib/studio/framework-spec";
import { buildWeb3Context } from "@/lib/studio/web3-context";
import { checkRouteLimit } from "@/lib/rate-limit-middleware";

/**
 * POST /api/studio/generate-stream
 *
 * SSE streaming version of the Studio code generation endpoint.
 * Streams tokens in real-time for a Claude Code / Cursor-like experience.
 *
 * SSE events:
 *   data: {"type":"token","content":"..."} — partial token
 *   data: {"type":"meta","provider":"...","model":"..."} — provider info
 *   data: {"type":"done","files":{...},"explanation":"..."} — final parsed result
 *   data: {"type":"error","message":"..."} — error
 */

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

const STUDIO_SYSTEM_PROMPT = `You are "The Architect" — an AI code generator for Keystone Studio.

YOUR MISSION:
Build REAL, fully-functioning TypeScript/React Mini-Apps with LIVE data.
NEVER use mock data, hardcoded prices, or placeholder values.
ALWAYS fetch real data from live APIs using useFetch() from the SDK.

RUNTIME: sandboxed <iframe>, React 18.2.0 via UMD, Babel standalone, Tailwind via CDN.
useFetch() is a REAL HTTP proxy to 20+ live API domains — use it for all data fetching.
Blocked: raw fetch(), localStorage, eval(), require(), window.open().

${generateFullSystemPromptAddendum()}

OUTPUT FORMAT (STRICT JSON — no markdown code blocks):
{
  "files": {
    "App.tsx": "import { useFetch, useVault } from '@keystone-os/sdk';\\nimport { useState, useEffect, useRef } from 'react';\\n\\nexport default function App() { ... }"
  },
  "explanation": "Brief technical summary."
}

For MULTI-FILE apps, output each file as a separate key.
Default export required: export default function App() { ... }
Tailwind dark theme: bg-zinc-900, text-white, emerald-400 accent.
NEVER hardcode prices. NEVER write mock data. Use real API endpoints.
NEVER invent hooks not listed above. NEVER import unlisted packages.`;

type ProviderType = "openai" | "groq" | "google" | "anthropic" | "cloudflare" | "ollama";

interface ProviderEntry {
  provider: ProviderType;
  key: string;
  model: string;
}

function buildProviderChain(aiConfig?: { provider?: string; apiKey?: string; model?: string } | null): ProviderEntry[] {
  const chain: ProviderEntry[] = [];

  if (aiConfig?.apiKey && aiConfig?.provider) {
    chain.push({
      provider: aiConfig.provider as ProviderType,
      key: aiConfig.apiKey,
      model: aiConfig.model || getDefaultModel(aiConfig.provider),
    });
  }

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

async function* streamProvider(
  provider: ProviderType,
  key: string,
  model: string,
  prompt: string
): AsyncGenerator<string> {
  if (provider === "openai" || provider === "groq" || provider === "cloudflare" || provider === "ollama") {
    let baseURL: string | undefined;
    let apiKey = key;

    if (provider === "groq") baseURL = "https://api.groq.com/openai/v1";
    else if (provider === "cloudflare") {
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || key.split(":")[0];
      const cfToken = key.includes(":") ? key.split(":")[1] : key;
      apiKey = cfToken;
      baseURL = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`;
    } else if (provider === "ollama") {
      const host = process.env.OLLAMA_HOST || "http://localhost:11434";
      apiKey = "ollama";
      baseURL = `${host}/v1`;
    }

    const client = new OpenAI({ apiKey, ...(baseURL && { baseURL }) });

    const stream = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: STUDIO_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 16384,
      stream: true,
      ...(provider === "openai" && { response_format: { type: "json_object" as const } }),
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
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
        max_tokens: 16384,
        stream: true,
        system: STUDIO_SYSTEM_PROMPT + "\n\nReturn ONLY raw JSON.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic API error ${res.status}`);
    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              yield parsed.delta.text;
            }
          } catch { /* skip unparseable lines */ }
        }
      }
    }
  } else if (provider === "google") {
    // Google Gemini streaming via SSE
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: STUDIO_SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 16384 },
      }),
    });

    if (!res.ok) throw new Error(`Google API error ${res.status}`);
    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(line.slice(6));
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) yield text;
          } catch { /* skip */ }
        }
      }
    }
  }
}

export async function POST(req: NextRequest) {
  // Rate limit
  const rateLimit = await checkRouteLimit(req, "ai_architect_runs");
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded", tier: rateLimit.tier }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await req.json();
  const { prompt, contextFiles, aiConfig } = body;

  if (!prompt) {
    return new Response(JSON.stringify({ error: "Prompt is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Build full prompt with context
  let fullPrompt = prompt;
  if (contextFiles && Object.keys(contextFiles).length > 0) {
    const manifest = Object.entries(contextFiles).map(([name, file]: [string, any]) => {
      const lines = (file.content || "").split("\n").length;
      return `  ${name}: ${lines} lines`;
    }).join("\n");

    const fileContext = Object.entries(contextFiles)
      .map(([name, file]: [string, any]) => `--- ${name} ---\n${file.content}\n`)
      .join("\n");

    fullPrompt = `PROJECT MANIFEST:\n${manifest}\n\nCURRENT FILES:\n${fileContext}\n\nUSER REQUEST:\n${prompt}`;
  }

  // Inject Web3 context (token metadata, protocol docs) when relevant
  const appCode = contextFiles?.["App.tsx"]?.content || "";
  const web3Ctx = buildWeb3Context({ code: appCode, prompt });
  if (web3Ctx.trim()) {
    fullPrompt += `\n\n[WEB3 CONTEXT]\n${web3Ctx}`;
  }

  const chain = buildProviderChain(aiConfig);
  if (chain.length === 0) {
    return new Response(
      JSON.stringify({ error: "no_api_key", details: "No AI API key configured." }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // SSE response
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      let fullResponse = "";
      let succeeded = false;

      for (const entry of chain) {
        try {
          send({ type: "meta", provider: entry.provider, model: entry.model });

          fullResponse = "";
          for await (const token of streamProvider(entry.provider, entry.key, entry.model, fullPrompt)) {
            fullResponse += token;
            send({ type: "token", content: token });
          }

          succeeded = true;
          break;
        } catch (err: any) {
          console.warn(`[stream] ${entry.provider} failed: ${err.message}`);
          send({ type: "error", message: `${entry.provider} failed, trying next...`, recoverable: true });
        }
      }

      if (!succeeded) {
        send({ type: "error", message: "All providers failed" });
        controller.close();
        return;
      }

      // Parse the accumulated response
      let clean = fullResponse.trim();
      if (clean.startsWith("```")) {
        clean = clean.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      let parsed: any = {};
      try {
        parsed = JSON.parse(clean);
      } catch {
        const match = clean.match(/\{[\s\S]*\}/);
        if (match) {
          try { parsed = JSON.parse(match[0]); } catch { parsed = { files: {}, explanation: clean }; }
        } else {
          parsed = { files: {}, explanation: clean };
        }
      }

      // Detect patch arrays
      let isPatches = false;
      let patches: any[] | null = null;
      if (Array.isArray(parsed)) {
        isPatches = true;
        patches = parsed;
      } else if (Array.isArray(parsed.patches)) {
        isPatches = true;
        patches = parsed.patches;
      }

      send({
        type: "done",
        files: isPatches ? {} : (parsed.files || {}),
        explanation: parsed.explanation || "Code generated.",
        ...(isPatches && { isPatches: true, patches }),
      });

      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
