import { NextRequest, NextResponse } from "next/server";
import { buildProviderChain, callWithFallback, parseLLMResponse } from "@/lib/studio/ai-provider";
import { STUDIO_SYSTEM_PROMPT } from "@/lib/studio/system-prompt";
import { buildWeb3Context } from "@/lib/studio/web3-context";
import { checkRouteLimit } from "@/lib/rate-limit-middleware";

export async function POST(req: NextRequest) {
  try {
    const rateLimit = await checkRouteLimit(req, 'ai_architect_runs');
    if (!rateLimit.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        tier: rateLimit.tier,
        remaining: 0,
        resetAt: rateLimit.resetAt.toISOString(),
        message: `You've reached your ${rateLimit.tier} tier limit for AI Architect. Upgrade for more.`,
      }, { status: 429 });
    }

    const body = await req.json();
    const { prompt, contextFiles, aiConfig } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Construct contextual prompt
    let fullPrompt = prompt;
    if (contextFiles && Object.keys(contextFiles).length > 0) {
      const fileContext = Object.entries(contextFiles)
        .map(([name, file]: [string, any]) => `--- ${name} ---\n${file.content}\n`)
        .join("\n");
      fullPrompt = `CURRENT STUDIO FILES:\n${fileContext}\n\nUSER REQUEST:\n${prompt}`;
    }

    // Inject Web3 context when relevant
    const appCode = contextFiles?.["App.tsx"]?.content || "";
    const web3Ctx = buildWeb3Context({ code: appCode, prompt });
    if (web3Ctx.trim()) {
      fullPrompt += `\n\n[WEB3 CONTEXT]\n${web3Ctx}`;
    }

    const chain = buildProviderChain(aiConfig);
    if (chain.length === 0) {
      return NextResponse.json({
        error: "no_api_key",
        details: "No AI API key configured. Open Settings (gear icon) to add your own OpenAI, Google Gemini, Anthropic, or Groq key.",
        files: {},
        explanation: "",
      }, { status: 200 });
    }

    const { response, provider, model } = await callWithFallback(chain, STUDIO_SYSTEM_PROMPT, fullPrompt);

    const parsed = parseLLMResponse(response) || { files: {}, explanation: response };

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

    return NextResponse.json({
      files: isPatches ? {} : (parsed.files || {}),
      explanation: parsed.explanation || "Code generated successfully.",
      provider,
      model,
      ...(isPatches && { isPatches: true, patches }),
    });
  } catch (error) {
    console.error("Studio Generate Error:", error);
    return NextResponse.json({
      error: "Failed to generate code",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
