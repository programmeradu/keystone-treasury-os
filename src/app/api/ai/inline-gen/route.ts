import { NextRequest, NextResponse } from "next/server";
import { buildProviderChain, callWithFallback, parseLLMResponse } from "@/lib/studio/ai-provider";
import { INLINE_GEN_SYSTEM_PROMPT } from "@/lib/studio/system-prompt";
import { checkRouteLimit } from "@/lib/rate-limit-middleware";

/**
 * POST /api/ai/inline-gen
 *
 * Cursor-style Ctrl+K inline code generation. Receives cursor context,
 * optional selected text, and an instruction. Returns generated code snippet.
 */

export async function POST(req: NextRequest) {
  try {
    const rateLimit = await checkRouteLimit(req, 'ai_architect_runs');
    if (!rateLimit.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        tier: rateLimit.tier,
        remaining: 0,
        resetAt: rateLimit.resetAt.toISOString(),
        message: `You've reached your ${rateLimit.tier} tier limit. Upgrade for more.`,
      }, { status: 429 });
    }

    const { prompt, context, selectedText, cursorLine, fullCode, sdkHooks, aiConfig } = await req.json();

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

    const chain = buildProviderChain(aiConfig);
    if (chain.length === 0) {
      return NextResponse.json({ error: "No AI provider configured" }, { status: 500 });
    }

    const { response } = await callWithFallback(chain, INLINE_GEN_SYSTEM_PROMPT, userPrompt, {
      temperature: 0.5,
      maxTokens: 4000,
    });

    const parsed = parseLLMResponse(response) || { code: response };

    return NextResponse.json({ code: parsed.code || "" });
  } catch (err) {
    console.error("[inline-gen]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Inline generation failed" },
      { status: 500 }
    );
  }
}
