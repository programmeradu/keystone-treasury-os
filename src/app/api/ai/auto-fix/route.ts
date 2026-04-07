import { NextRequest, NextResponse } from "next/server";
import { buildProviderChain, callWithFallback, parseLLMResponse } from "@/lib/studio/ai-provider";
import { AUTO_FIX_SYSTEM_PROMPT } from "@/lib/studio/system-prompt";
import { checkRouteLimit } from "@/lib/rate-limit-middleware";

/**
 * POST /api/ai/auto-fix
 *
 * Receives a runtime error + current code + console logs from ErrorAutoFix.tsx.
 * Returns { fixedCode, explanation } using the shared multi-provider cascade.
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

    const { error, code, logs, sdkHooks, aiConfig } = await req.json();

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

    const chain = buildProviderChain(aiConfig);
    if (chain.length === 0) {
      return NextResponse.json({ error: "No AI provider configured" }, { status: 500 });
    }

    const { response } = await callWithFallback(chain, AUTO_FIX_SYSTEM_PROMPT, prompt, {
      temperature: 0.3,
      maxTokens: 8000,
    });

    const parsed = parseLLMResponse(response) || { fixedCode: code, explanation: "Could not parse AI response" };

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
