#!/usr/bin/env tsx
/**
 * Test each model in the /api/command fallback chain: Groq + 4 Cloudflare Workers AI.
 * Verifies each produces an output. Run: npx tsx scripts/test-command-models.ts
 *
 * Groq: uses AI SDK generateText. Cloudflare: uses raw OpenAI client (same as Studio)
 * because the AI SDK's createOpenAI + CF returns v1-style responses that SDK 5+ rejects.
 */
import { config } from "dotenv";
import { resolve } from "path";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import OpenAI from "openai";

config({ path: resolve(process.cwd(), ".env.local") });

const CLOUDFLARE_FALLBACK_MODELS = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/qwen/qwen3-30b-a3b-fp8",
  "@cf/qwen/qwen2.5-coder-32b-instruct",
  "@cf/meta/llama-3.1-8b-instruct",
];

const TEST_PROMPT = "Reply with exactly the word OK and nothing else.";

async function testGroq(name: string, model: ReturnType<ReturnType<typeof createGroq>>): Promise<{ ok: boolean; output?: string; error?: string }> {
  try {
    const result = await generateText({
      model,
      system: "You are a test assistant. Follow the user instruction precisely.",
      messages: [{ role: "user" as const, content: TEST_PROMPT }],
      maxTokens: 50,
    });
    const text = (result.text || "").trim();
    return { ok: text.length > 0, output: text };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function testCloudflare(modelId: string, client: OpenAI): Promise<{ ok: boolean; output?: string; error?: string }> {
  try {
    const completion = await client.chat.completions.create({
      model: modelId,
      messages: [
        { role: "system", content: "You are a test assistant. Follow the user instruction precisely." },
        { role: "user", content: TEST_PROMPT },
      ],
      max_tokens: 100,
    });
    const text = (completion.choices?.[0]?.message?.content || "").trim();
    if (text.length > 0) return { ok: true, output: text };
    const finishReason = completion.choices?.[0]?.finish_reason;
    return { ok: false, error: `Empty response (finish_reason: ${finishReason ?? "unknown"})` };
  } catch (err: unknown) {
    if (err instanceof Error) {
      const msg = err.message || "";
      const cause = err.cause != null ? ` (cause: ${String(err.cause)})` : "";
      return { ok: false, error: msg + cause };
    }
    return { ok: false, error: String(err) };
  }
}

async function main() {
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cfToken = process.env.CLOUDFLARE_AI_TOKEN;
  const cfClient =
    cfAccountId && cfToken
      ? new OpenAI({
          apiKey: cfToken,
          baseURL: `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/v1`,
        })
      : null;

  const tests: { name: string; run: () => Promise<{ ok: boolean; output?: string; error?: string }> }[] = [];

  if (process.env.GROQ_API_KEY) {
    tests.push({
      name: "groq/llama-3.3-70b-versatile",
      run: () => testGroq("groq", groq("llama-3.3-70b-versatile")),
    });
  }
  if (cfClient) {
    for (const id of CLOUDFLARE_FALLBACK_MODELS) {
      tests.push({ name: `cloudflare/${id}`, run: () => testCloudflare(id, cfClient) });
    }
  }

  if (tests.length === 0) {
    console.error("No models configured. Set GROQ_API_KEY or CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_AI_TOKEN.");
    process.exit(1);
  }

  console.log("Testing command API model chain (each model must produce output):\n");

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < tests.length; i++) {
    const { name, run } = tests[i];
    const num = i + 1;
    process.stdout.write(`  ${num}. ${name} ... `);
    const result = await run();
    if (result.ok) {
      const snippet = (result.output || "").length > 60 ? (result.output || "").slice(0, 57) + "..." : result.output || "";
      console.log("OK");
      console.log(`      Output: ${snippet || "(empty string)"}`);
      passed++;
    } else {
      console.log("FAIL");
      const err = result.error || "(no error message)";
      const short = err.length > 200 ? err.slice(0, 197) + "..." : err;
      console.log(`      Error: ${short}`);
      failed++;
    }
  }

  console.log("\n---");
  console.log(`Passed: ${passed}/${tests.length}`);
  if (failed > 0) console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
