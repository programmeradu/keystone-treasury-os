/**
 * /api/studio/test-key — Test an API key against the selected provider.
 *
 * Used by the BYOK settings modal to verify keys before saving.
 * Makes a minimal API call (list models or a trivial completion) to
 * confirm the key is valid. Never stores or logs the key.
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
    try {
        const { provider, apiKey, model } = await req.json();

        if (!provider || !apiKey) {
            return NextResponse.json(
                { error: "Provider and API key are required" },
                { status: 400 }
            );
        }

        // Test the key by making a minimal completion request
        switch (provider) {
            case "openai": {
                const openai = new OpenAI({ apiKey });
                await openai.chat.completions.create({
                    model: model || "gpt-4o-mini",
                    messages: [{ role: "user", content: "ping" }],
                    max_tokens: 5,
                });
                break;
            }

            case "google": {
                // Google Gemini — test via generateContent REST API
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-2.0-flash"}:generateContent?key=${apiKey}`;
                const res = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: "ping" }] }],
                        generationConfig: { maxOutputTokens: 5 },
                    }),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error?.message || `Google API returned ${res.status}`);
                }
                break;
            }

            case "anthropic": {
                const res = await fetch("https://api.anthropic.com/v1/messages", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": apiKey,
                        "anthropic-version": "2023-06-01",
                    },
                    body: JSON.stringify({
                        model: model || "claude-3-5-haiku-20241022",
                        max_tokens: 5,
                        messages: [{ role: "user", content: "ping" }],
                    }),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error?.message || `Anthropic API returned ${res.status}`);
                }
                break;
            }

            case "groq": {
                const groq = new OpenAI({
                    apiKey,
                    baseURL: "https://api.groq.com/openai/v1",
                });
                await groq.chat.completions.create({
                    model: model || "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: "ping" }],
                    max_tokens: 5,
                });
                break;
            }

            case "cloudflare": {
                // For Cloudflare, the apiKey is in format "accountId:token"
                const parts = apiKey.split(":");
                const accountId = parts.length > 1 ? parts[0] : "";
                const cfToken = parts.length > 1 ? parts.slice(1).join(":") : apiKey;

                if (!accountId) {
                    throw new Error("Cloudflare key must be in format: accountId:apiToken");
                }

                const cf = new OpenAI({
                    apiKey: cfToken,
                    baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`,
                });
                await cf.chat.completions.create({
                    model: model || "@cf/qwen/qwen3-30b-a3b-fp8",
                    messages: [{ role: "user", content: "ping" }],
                    max_tokens: 5,
                });
                break;
            }

            default:
                return NextResponse.json(
                    { error: `Unknown provider: ${provider}` },
                    { status: 400 }
                );
        }

        return NextResponse.json({ ok: true, provider, model });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Connection failed",
                details: "Check that your API key is valid and has the correct permissions.",
            },
            { status: 401 }
        );
    }
}
