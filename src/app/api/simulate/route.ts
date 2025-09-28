import { NextRequest } from "next/server";

// Deterministic simulator stub
// - Accepts { steps: Array<{ id?: string; type: string; params?: any }> }
// - Returns viability, risk, warnings per step with consistent logic
// - Never throws: always returns ok:true with results[]

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let body: any = null;
  try {
    body = await req.json();
  } catch {}

  const inSteps = Array.isArray(body?.steps) ? body.steps : [];

  type SimResult = {
    id: string;
    type: string;
    viable: boolean;
    riskScore: number; // 0 (low) - 100 (high)
    warnings: string[];
    estimates: { durationMinutes: number; failureProbPct: number };
    notes?: string;
  };

  const hash = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) >>> 0;
    }
    return h;
  };

  const defaulted = inSteps.length > 0 ? inSteps : [{ type: "yield", params: { asset: "USDC", chain: "base" } }];

  const results: SimResult[] = defaulted.map((step, idx) => {
    const type = String(step?.type || "unknown");
    const id = String(step?.id || `${type}_${idx + 1}`);
    const k = JSON.stringify(step?.params || {});
    const seed = hash(`${type}|${k}`);

    // Deterministic scores based on "type" and lightweight params hashing
    const baseRisk =
      type === "bridge" ? 42 :
      type === "swap" ? 28 :
      type === "stake" ? 24 :
      type === "gas" ? 12 :
      type === "yield" ? 18 : 30;

    const jitter = (seed % 9); // 0..8
    const riskScore = Math.min(95, baseRisk + jitter);

    const durationMinutes =
      type === "bridge" ? 12 + (seed % 7) :
      type === "swap" ? 1 + (seed % 2) :
      type === "stake" ? 3 + (seed % 4) :
      type === "yield" ? 2 + (seed % 3) : 2 + (seed % 5);

    const warnings: string[] = [];
    if (type === "bridge" && riskScore > 45) warnings.push("Bridge ETA may vary under network congestion");
    if (type === "swap" && riskScore > 30) warnings.push("Price impact could exceed slippage cap on volatile pairs");
    if (type === "stake" && (seed % 3 === 0)) warnings.push("Protocol APY fluctuates; verify current APR before committing");
    if ((step?.params?.amount && Number(step.params.amount) > 1_000_000) || (seed % 11 === 0)) warnings.push("Large notional detected; consider splitting into tranches");

    const failureProbPct = Math.min(20, Math.max(1, Math.round(riskScore / 6)));

    return {
      id,
      type,
      viable: riskScore < 70, // simple viability threshold
      riskScore,
      warnings,
      estimates: { durationMinutes, failureProbPct },
      notes: warnings.length ? "Proceed with protections (limits, approvals, slippage)." : "Looks safe under current assumptions.",
    };
  });

  const response = {
    ok: true,
    results,
    summary: {
      steps: results.length,
      highRisk: results.filter((r) => r.riskScore >= 70).length,
      totalEtaMinutes: results.reduce((a, r) => a + r.estimates.durationMinutes, 0),
    },
    timings: { startedAt, durationMs: Date.now() - startedAt },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}