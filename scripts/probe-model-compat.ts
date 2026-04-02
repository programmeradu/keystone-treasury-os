import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

type ProbeProfile = {
  name: "short" | "medium" | "long";
  targetChars: number;
};

type ProbeResult = {
  model: string;
  profile: string;
  success: boolean;
  elapsedMs: number;
  error?: string;
  responseChars?: number;
};

const profiles: ProbeProfile[] = [
  { name: "short", targetChars: 1_500 },
  { name: "medium", targetChars: 12_000 },
  { name: "long", targetChars: 26_000 },
];

function makePrompt(targetChars: number): string {
  const seed = "Keystone compatibility probe. Return only: OK.";
  const filler = "X".repeat(Math.max(0, targetChars - seed.length));
  return `${seed}\n${filler}`;
}

async function runProbe(modelName: string, model: any, profile: ProbeProfile): Promise<ProbeResult> {
  const started = Date.now();
  try {
    const prompt = makePrompt(profile.targetChars);
    const out = await generateText({
      model,
      prompt,
      maxTokens: 16,
      temperature: 0,
    });
    return {
      model: modelName,
      profile: profile.name,
      success: true,
      elapsedMs: Date.now() - started,
      responseChars: out.text?.length ?? 0,
    };
  } catch (err) {
    return {
      model: modelName,
      profile: profile.name,
      success: false,
      elapsedMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  const results: ProbeResult[] = [];
  const groqKey = process.env.GROQ_API_KEY;
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cfToken = process.env.CLOUDFLARE_AI_TOKEN;

  const targets: Array<{ name: string; model: any }> = [];

  if (groqKey) {
    const groq = createGroq({ apiKey: groqKey });
    targets.push({
      name: "groq/llama-3.3-70b-versatile",
      model: groq("llama-3.3-70b-versatile"),
    });
  }

  if (cfAccountId && cfToken) {
    const provider = createOpenAICompatible({
      name: "cloudflare",
      apiKey: cfToken,
      baseURL: `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/v1`,
    });
    const cfModels = [
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      "@cf/qwen/qwen3-30b-a3b-fp8",
      "@cf/qwen/qwen2.5-coder-32b-instruct",
      "@cf/meta/llama-3.1-8b-instruct",
    ];
    for (const m of cfModels) {
      targets.push({ name: `cloudflare/${m}`, model: provider.chatModel(m) });
    }
  }

  if (targets.length === 0) {
    console.log(JSON.stringify({ error: "No provider keys configured." }, null, 2));
    process.exit(1);
  }

  for (const t of targets) {
    for (const p of profiles) {
      const r = await runProbe(t.name, t.model, p);
      results.push(r);
      console.log(`[probe] ${t.name} ${p.name}: ${r.success ? "PASS" : "FAIL"} (${r.elapsedMs}ms)`);
    }
  }

  console.log("\n=== Probe Summary (JSON) ===");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
