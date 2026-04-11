import { NextRequest } from "next/server";
import { buildProviderChain, streamProvider, parseLLMResponse } from "@/lib/studio/ai-provider";
import { STUDIO_SYSTEM_PROMPT } from "@/lib/studio/system-prompt";
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

  // Inject Web3 context
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
          for await (const token of streamProvider(entry.provider, entry.key, entry.model, STUDIO_SYSTEM_PROMPT, fullPrompt)) {
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
      const parsed = parseLLMResponse(fullResponse) || { files: {}, explanation: fullResponse };

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
