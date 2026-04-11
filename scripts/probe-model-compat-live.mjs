const profiles = [
  { name: "short", targetChars: 1500 },
  { name: "medium", targetChars: 12000 },
  { name: "long", targetChars: 26000 },
];

const cfModels = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/qwen/qwen3-30b-a3b-fp8",
  "@cf/qwen/qwen2.5-coder-32b-instruct",
  "@cf/meta/llama-3.1-8b-instruct",
];

function makePrompt(targetChars) {
  const seed = "Compatibility probe. Reply exactly with OK.";
  return seed + "\n" + "X".repeat(Math.max(0, targetChars - seed.length));
}

async function callOpenAICompatible(baseURL, apiKey, model, prompt) {
  const started = Date.now();
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 16,
      temperature: 0,
      stream: false,
    }),
  });
  const elapsedMs = Date.now() - started;
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return {
    elapsedMs,
    response: json?.choices?.[0]?.message?.content ?? text.slice(0, 120),
  };
}

async function run() {
  const results = [];

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    for (const p of profiles) {
      const prompt = makePrompt(p.targetChars);
      try {
        const r = await callOpenAICompatible(
          "https://api.groq.com/openai/v1",
          groqKey,
          "llama-3.3-70b-versatile",
          prompt,
        );
        results.push({ model: "groq/llama-3.3-70b-versatile", profile: p.name, success: true, ...r });
      } catch (e) {
        results.push({
          model: "groq/llama-3.3-70b-versatile",
          profile: p.name,
          success: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cfToken = process.env.CLOUDFLARE_AI_TOKEN;
  if (cfAccount && cfToken) {
    const base = `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/v1`;
    for (const model of cfModels) {
      for (const p of profiles) {
        const prompt = makePrompt(p.targetChars);
        try {
          const r = await callOpenAICompatible(base, cfToken, model, prompt);
          results.push({ model: `cloudflare/${model}`, profile: p.name, success: true, ...r });
        } catch (e) {
          results.push({
            model: `cloudflare/${model}`,
            profile: p.name,
            success: false,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }
  }

  if (!groqKey && !(cfAccount && cfToken)) {
    console.log(JSON.stringify({ error: "No GROQ_API_KEY or Cloudflare AI credentials found in env." }, null, 2));
    process.exit(1);
  }

  for (const r of results) {
    console.log(`${r.success ? "PASS" : "FAIL"} | ${r.model} | ${r.profile}${r.success ? ` | ${r.elapsedMs}ms` : ""}`);
  }
  console.log("\n=== JSON ===");
  console.log(JSON.stringify(results, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
