import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

// Deterministic executor stub
// POST /api/execute
// Body: { prompt?: string, steps?: any[] }
// Returns a fake run summary with richer per-step data.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt: string = typeof body?.prompt === "string" ? body.prompt : "";
    const stepsIn: any[] = Array.isArray(body?.steps) ? body.steps : [];

    // Normalize steps to titles
    const stepTitles: string[] = stepsIn
      .map((s) => (typeof s === "string" ? s : (s?.summary || s?.type || "Execute Step")))
      .map((s) => String(s || "step").trim())
      .filter(Boolean);

    const baseSteps = stepTitles.length > 0 ? stepTitles : inferFromPrompt(prompt);

    // Deterministic status mapping with mock data
    const runSteps = baseSteps.map((title, idx) => {
      const isLast = idx === baseSteps.length - 1;
      const status = isLast ? "pending" : (idx % 3 === 0 ? "confirmed" : "success");
      const duration = status === "pending" ? 0 : 500 + Math.random() * 1500;
      const cost = status === "pending" ? "0.00" : (0.5 + Math.random() * 5).toFixed(2);
      const txHash = status === "pending" ? "" : `0x${randomBytes(32).toString("hex")}`;

      return {
        index: idx,
        title,
        status,
        duration: Math.round(duration),
        cost,
        txHash,
      };
    });

    const run = {
      id: "run_" + Math.abs(hash(prompt || baseSteps.join("|"))).toString(36).slice(0, 8),
      status: "in_progress" as const,
      createdAt: Date.now(),
      steps: runSteps,
      summary: baseSteps.length
        ? `Executing ${baseSteps.length} step(s) for: "${prompt}"`
        : "No steps inferred; awaiting operator confirmation.",
    };

    return NextResponse.json({ ok: true, run });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Execution error" }, { status: 400 });
  }
}

function inferFromPrompt(prompt: string): string[] {
  const t = (prompt || "").toLowerCase();
  const arr: string[] = [];
  if (!t.trim()) return arr;
  if (t.includes("swap")) arr.push("Execute best swap route");
  if (t.includes("bridge")) arr.push("Execute optimal bridge");
  if (t.includes("stake") || t.includes("lend")) arr.push("Stake / lend into target protocol");
  if (t.includes("distribute") || t.includes("send")) arr.push("Distribute funds to recipients");
  if (arr.length === 0) arr.push("Execute transaction(s)");
  return arr;
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}