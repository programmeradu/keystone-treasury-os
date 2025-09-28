/*
  Integration Test Script for Atlas APIs
  Usage:
    BASE_URL=http://localhost:3000 SAMPLE_SOL_ADDRESS=YOUR_SOL_ADDRESS node scripts/test-integrations.mjs
  or
    npm run test:integrations

  Notes:
  - BASE_URL defaults to http://localhost:3000
  - SAMPLE_SOL_ADDRESS is optional but recommended for /api/airdrops/scan
  - Requires Node 18+ (global fetch)
*/

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const SAMPLE_SOL_ADDRESS = process.env.SAMPLE_SOL_ADDRESS || "Fht1mx7hQxB7mx2g6LGbY8hC6Y7S6iWQ2m4nJ9QSTest"; // replace with a real one for better results

function now() { return Date.now(); }

async function safeJson(res) {
  try { return await res.json(); } catch { return null; }
}

async function runStep(name, fn) {
  const start = now();
  try {
    const data = await fn();
    const dur = now() - start;
    return { name, ok: true, ms: dur, sample: data };
  } catch (e) {
    const dur = now() - start;
    return { name, ok: false, ms: dur, error: e?.message || String(e) };
  }
}

async function testJupiterPrice() {
  const url = `${BASE_URL}/api/jupiter/price?ids=SOL,MSOL,USDC`;
  const res = await fetch(url, { cache: "no-store" });
  const j = await safeJson(res);
  if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
  const sample = {
    SOL: j?.data?.SOL?.price,
    MSOL: j?.data?.MSOL?.price,
    USDC: j?.data?.USDC?.price,
  };
  return sample;
}

async function testJupiterQuote() {
  // Quote 1 SOL -> USDC
  const params = new URLSearchParams({
    inputMint: "So11111111111111111111111111111111111111112",
    outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    amount: String(1_000_000_000), // 1 SOL in lamports
    slippageBps: "50",
  });
  const url = `${BASE_URL}/api/jupiter/quote?${params.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  const j = await safeJson(res);
  if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
  return {
    outAmount: j?.data?.outAmount,
    priceImpactPct: j?.data?.priceImpactPct,
    slippageBps: j?.data?.slippageBps,
  };
}

async function testSolanaInflation() {
  const url = `${BASE_URL}/api/solana/rpc`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getInflationRate", params: [] })
  });
  const j = await safeJson(res);
  if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
  return { total: j?.result?.total };
}

async function testSpeculativeAirdrops() {
  const url = `${BASE_URL}/api/airdrops/speculative/solana`;
  const res = await fetch(url, { cache: "no-store" });
  const j = await safeJson(res);
  if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
  const items = Array.isArray(j?.items) ? j.items : (j?.data || []);
  return { count: items.length, first: items[0] };
}

async function testMoralisHolders() {
  // Use USDC mint as a stable example
  const usdcMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const url = `${BASE_URL}/api/moralis/solana/holders/${usdcMint}/stats`;
  const res = await fetch(url, { cache: "no-store" });
  const j = await safeJson(res);
  if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
  return { keys: j ? Object.keys(j).slice(0, 5) : [] };
}

async function testHeliusDAS() {
  const usdcMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const url = `${BASE_URL}/api/helius/das/token-accounts?mint=${usdcMint}`;
  const res = await fetch(url, { cache: "no-store" });
  const j = await safeJson(res);
  if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
  const list = j?.result || j?.data || j?.items || [];
  return { count: Array.isArray(list) ? list.length : j?.total };
}

async function testAirdropScan() {
  const url = `${BASE_URL}/api/airdrops/scan?address=${SAMPLE_SOL_ADDRESS}`;
  const res = await fetch(url, { cache: "no-store" });
  const j = await safeJson(res);
  if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
  return {
    eligibleNow: j?.data?.eligibleNow?.length || 0,
    first: j?.data?.eligibleNow?.[0] || null,
  };
}

async function testOHLCVStreamFirstEvent(timeoutMs = 8000) {
  const url = `${BASE_URL}/api/bitquery/ohlcv/stream?symbol=SOL&interval=5s`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: "text/event-stream" } });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    const reader = res.body.getReader();
    let buf = "";
    // Read until we get one SSE event with data:
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += new TextDecoder().decode(value);
      const lines = buf.split(/\n\n/);
      for (const evt of lines) {
        if (evt.includes("data:")) {
          const dataLine = evt.split("\n").find(l => l.startsWith("data:"));
          if (dataLine) {
            const json = dataLine.slice(5).trim();
            try {
              const parsed = JSON.parse(json);
              if (parsed?.type === "candle") {
                clearTimeout(timer);
                controller.abort();
                return { candle: parsed.candle };
              }
            } catch {}
          }
        }
      }
    }
    throw new Error("No SSE event received");
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function main() {
  const results = [];

  results.push(await runStep("Jupiter Price", testJupiterPrice));
  results.push(await runStep("Jupiter Quote", testJupiterQuote));
  results.push(await runStep("Solana Inflation", testSolanaInflation));
  results.push(await runStep("Speculative Airdrops", testSpeculativeAirdrops));
  results.push(await runStep("Moralis Holders (USDC)", testMoralisHolders));
  results.push(await runStep("Helius DAS Token Accounts (USDC)", testHeliusDAS));
  results.push(await runStep("Airdrop Scan (sample address)", testAirdropScan));
  results.push(await runStep("OHLCV Stream (first event)", testOHLCVStreamFirstEvent));

  const summary = {
    baseUrl: BASE_URL,
    timestamp: new Date().toISOString(),
    results,
    pass: results.filter(r => r.ok).length,
    fail: results.filter(r => !r.ok).length,
  };

  // Pretty print to console
  console.log("\n=== Atlas API Integration Test Report ===\n");
  for (const r of results) {
    if (r.ok) {
      console.log(`✔ ${r.name} (${r.ms}ms)`);
      console.log("  sample:", JSON.stringify(r.sample, null, 2).slice(0, 400));
    } else {
      console.log(`✖ ${r.name} (${r.ms}ms)`);
      console.log("  error:", r.error);
    }
  }
  console.log("\nSummary:", { pass: summary.pass, fail: summary.fail, baseUrl: summary.baseUrl });

  // Write JSON report
  try {
    const fs = await import("node:fs/promises");
    await fs.mkdir("reports", { recursive: true });
    const path = `reports/integration-report-${Date.now()}.json`;
    await fs.writeFile(path, JSON.stringify(summary, null, 2), "utf8");
    console.log(`\nReport saved to ${path}`);
  } catch (e) {
    console.warn("Could not write report file:", e?.message || e);
  }
}

main().catch((e) => {
  console.error("Fatal error:", e?.message || e);
  process.exit(1);
});