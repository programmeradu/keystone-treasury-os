/**
 * Shared AI Provider — Single source of truth for LLM calls across all Studio routes.
 *
 * Used by: generate, generate-stream, auto-fix, inline-gen, architect-engine corrections.
 * Eliminates 3x copy-paste of callProvider/buildProviderChain.
 */

import OpenAI from "openai";

export type ProviderType = "openai" | "groq" | "google" | "anthropic" | "cloudflare" | "ollama";

export interface ProviderEntry {
  provider: ProviderType;
  key: string;
  model: string;
}

export interface AIConfig {
  provider?: string;
  apiKey?: string;
  model?: string;
}

export function getDefaultModel(provider: string): string {
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

export function buildProviderChain(aiConfig?: AIConfig | null): ProviderEntry[] {
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

/**
 * Call a single provider (non-streaming). Returns raw text response.
 */
export async function callProvider(
  p: ProviderType,
  key: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const temp = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 16384;

  if (p === "openai" || p === "groq") {
    const client = new OpenAI({
      apiKey: key,
      ...(p === "groq" && { baseURL: "https://api.groq.com/openai/v1" }),
    });
    const isOpenAI = p === "openai";
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: isOpenAI ? systemPrompt : systemPrompt + "\n\nIMPORTANT: Return ONLY raw JSON. Do not wrap in markdown code blocks.",
        },
        { role: "user", content: userPrompt },
      ],
      temperature: temp,
      max_tokens: maxTokens,
      ...(isOpenAI && { response_format: { type: "json_object" as const } }),
    });
    return completion.choices[0]?.message?.content || "{}";

  } else if (p === "google") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: temp,
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json",
        },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Google API error ${res.status}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

  } else if (p === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt + "\n\nIMPORTANT: Return ONLY raw JSON. Do not wrap in markdown code blocks.",
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Anthropic API error ${res.status}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text || "{}";

  } else if (p === "cloudflare") {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || key.split(":")[0];
    const cfToken = key.includes(":") ? key.split(":")[1] : key;
    const client = new OpenAI({
      apiKey: cfToken,
      baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`,
    });
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt + "\n\nIMPORTANT: Return ONLY raw JSON. Do not wrap in markdown code blocks." },
        { role: "user", content: userPrompt },
      ],
      temperature: temp,
      max_tokens: maxTokens,
    });
    return completion.choices[0]?.message?.content || "{}";

  } else if (p === "ollama") {
    const ollamaHost = process.env.OLLAMA_HOST || "http://localhost:11434";
    const client = new OpenAI({
      apiKey: "ollama",
      baseURL: `${ollamaHost}/v1`,
    });
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt + "\n\nIMPORTANT: Return ONLY raw JSON. Do not wrap in markdown code blocks." },
        { role: "user", content: userPrompt },
      ],
      temperature: temp,
    });
    return completion.choices[0]?.message?.content || "{}";
  }

  throw new Error(`Unsupported provider: ${p}`);
}

/**
 * Streaming provider — yields tokens as they arrive.
 */
export async function* streamProvider(
  provider: ProviderType,
  key: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number }
): AsyncGenerator<string> {
  const temp = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 16384;

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
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: temp,
      max_tokens: maxTokens,
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
        max_tokens: maxTokens,
        stream: true,
        system: systemPrompt + "\n\nReturn ONLY raw JSON.",
        messages: [{ role: "user", content: userPrompt }],
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: temp, maxOutputTokens: maxTokens },
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

/**
 * Run a provider chain with cascading fallback. Returns raw response text.
 */
export async function callWithFallback(
  chain: ProviderEntry[],
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<{ response: string; provider: ProviderType; model: string }> {
  let lastError: Error | null = null;

  for (const entry of chain) {
    try {
      console.log(`[AI] Trying provider: ${entry.provider} / ${entry.model}`);
      const response = await callProvider(entry.provider, entry.key, entry.model, systemPrompt, userPrompt, options);
      return { response, provider: entry.provider, model: entry.model };
    } catch (err: any) {
      console.warn(`[AI] ${entry.provider} failed: ${err.message}. Trying next...`);
      lastError = err;
    }
  }

  throw lastError || new Error("No providers available");
}

/**
 * Parse JSON from LLM response — handles markdown code blocks, extraction fallback.
 */
export function parseLLMResponse(response: string): any {
  let clean = response.trim();

  if (clean.startsWith("```")) {
    clean = clean.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    return null;
  }
}
