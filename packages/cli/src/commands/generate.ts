/**
 * keystone generate — AI-powered Mini-App code generation from the CLI.
 *
 * Calls the /api/studio/generate endpoint (or Cloudflare/Groq directly)
 * to turn a natural language prompt into a working App.tsx file.
 *
 * No login required — uses server env keys or user-provided BYOK key.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export interface GenerateOptions {
    prompt: string;
    dir?: string;
    apiUrl?: string;
    /** Direct provider for CLI-only mode (no server needed) */
    provider?: "groq" | "cloudflare" | "openai" | "ollama";
    apiKey?: string;
    model?: string;
    /** If true, overwrite existing App.tsx */
    force?: boolean;
}

export interface GenerateResult {
    ok: boolean;
    files?: Record<string, string>;
    explanation?: string;
    error?: string;
    provider?: string;
}

/**
 * Direct LLM call (no server needed) — supports Groq, Cloudflare, OpenAI, Ollama.
 */
async function callLLMDirect(
    prompt: string,
    provider: string,
    apiKey: string,
    model: string
): Promise<{ files: Record<string, string>; explanation: string }> {
    let endpoint: string;
    let headers: Record<string, string>;
    let body: string;

    const systemPrompt = `You are "The Architect" — a Keystone OS Mini-App code generator.

RULES:
- Generate a SINGLE App.tsx file using React + TypeScript
- Import ONLY from '@keystone-os/sdk' and 'react'
- Available SDK hooks: useVault, useJupiterSwap, useImpactReport, useTurnkey,
  useNotifications, useGovernance, useFetch, useTheme, useKeystoneEvent,
  useYieldRouter, useTaxEngine, useAnalytics, useSovereignAuth,
  useMultiSig, usePortfolio, useAlerts
- NO fetch(), axios, ethers, @solana/web3.js, localStorage, or Node.js APIs
- Use Tailwind CSS classes for styling (dark theme: bg-zinc-950, text-white)

OUTPUT: Return ONLY raw JSON (no markdown blocks) in this format:
{
  "files": { "App.tsx": "...full code..." },
  "explanation": "Brief description of what was built"
}`;

    if (provider === "groq") {
        endpoint = "https://api.groq.com/openai/v1/chat/completions";
        headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        };
        body = JSON.stringify({
            model: model || "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 4000,
        });
    } else if (provider === "cloudflare") {
        // apiKey format: "accountId:token"
        const parts = apiKey.split(":");
        const accountId = parts[0];
        const cfToken = parts.slice(1).join(":");
        endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
        headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cfToken}`,
        };
        body = JSON.stringify({
            model: model || "@cf/qwen/qwen3-30b-a3b-fp8",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 4000,
        });
    } else if (provider === "openai") {
        endpoint = "https://api.openai.com/v1/chat/completions";
        headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        };
        body = JSON.stringify({
            model: model || "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 4000,
            response_format: { type: "json_object" },
        });
    } else if (provider === "ollama") {
        const host = apiKey || "http://localhost:11434";
        endpoint = `${host}/v1/chat/completions`;
        headers = { "Content-Type": "application/json" };
        body = JSON.stringify({
            model: model || "qwen2.5-coder:7b",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt },
            ],
            temperature: 0.7,
        });
    } else {
        throw new Error(`Unsupported provider: ${provider}`);
    }

    const res = await fetch(endpoint, { method: "POST", headers, body });
    if (!res.ok) {
        const err = await res.text().catch(() => "");
        throw new Error(`${provider} API error (${res.status}): ${err.slice(0, 200)}`);
    }

    const json = await res.json();
    let content = json.choices?.[0]?.message?.content || "{}";

    // Strip markdown code fences if present
    content = content.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();

    const parsed = JSON.parse(content);
    return {
        files: parsed.files || {},
        explanation: parsed.explanation || "",
    };
}

/**
 * Server-mode: call /api/studio/generate on a running Keystone instance.
 */
async function callServerGenerate(
    prompt: string,
    apiUrl: string,
    aiConfig?: { provider: string; apiKey: string; model: string }
): Promise<{ files: Record<string, string>; explanation: string }> {
    const res = await fetch(`${apiUrl.replace(/\/$/, "")}/api/studio/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            prompt,
            ...(aiConfig && { aiConfig }),
        }),
    });

    if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${await res.text()}`);
    }

    const json = await res.json();
    if (json.error) {
        throw new Error(json.error === "no_api_key" ? json.details : json.error);
    }

    return { files: json.files || {}, explanation: json.explanation || "" };
}

export async function runGenerate(options: GenerateOptions): Promise<GenerateResult> {
    const targetDir = path.resolve(process.cwd(), options.dir ?? ".");
    const appPath = path.join(targetDir, "App.tsx");

    // Safety check: don't overwrite existing code without --force
    if (fs.existsSync(appPath) && !options.force) {
        return {
            ok: false,
            error: "App.tsx already exists. Use --force to overwrite, or delete it first.",
        };
    }

    let result: { files: Record<string, string>; explanation: string };
    let usedProvider = "server";

    try {
        if (options.provider && options.apiKey) {
            // Direct mode: call LLM directly (no server needed)
            usedProvider = options.provider;
            result = await callLLMDirect(
                options.prompt,
                options.provider,
                options.apiKey,
                options.model || ""
            );
        } else if (options.apiUrl) {
            // Server mode: call running Keystone instance
            result = await callServerGenerate(
                options.prompt,
                options.apiUrl,
                options.apiKey
                    ? { provider: options.provider || "groq", apiKey: options.apiKey, model: options.model || "" }
                    : undefined
            );
        } else if (process.env.GROQ_API_KEY) {
            // Auto-detect: use Groq from env
            usedProvider = "groq";
            result = await callLLMDirect(
                options.prompt,
                "groq",
                process.env.GROQ_API_KEY,
                options.model || "llama-3.3-70b-versatile"
            );
        } else if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_TOKEN) {
            // Auto-detect: use Cloudflare from env
            usedProvider = "cloudflare";
            result = await callLLMDirect(
                options.prompt,
                "cloudflare",
                `${process.env.CLOUDFLARE_ACCOUNT_ID}:${process.env.CLOUDFLARE_AI_TOKEN}`,
                options.model || "@cf/qwen/qwen3-30b-a3b-fp8"
            );
        } else {
            return {
                ok: false,
                error:
                    "No AI provider configured. Options:\n" +
                    "  --provider groq --api-key gsk_...     (direct)\n" +
                    "  --provider cloudflare --api-key id:token (direct)\n" +
                    "  --api-url http://localhost:3000        (server mode)\n" +
                    "  Set GROQ_API_KEY or CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_AI_TOKEN env vars",
            };
        }

        // Write generated files
        for (const [fileName, content] of Object.entries(result.files)) {
            const filePath = path.join(targetDir, fileName);
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, typeof content === "string" ? content : (content as any).content || "", "utf-8");
        }

        return {
            ok: true,
            files: result.files,
            explanation: result.explanation,
            provider: usedProvider,
        };
    } catch (err) {
        return {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
            provider: usedProvider,
        };
    }
}
