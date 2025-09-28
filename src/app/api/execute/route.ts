import { NextRequest, NextResponse } from "next/server";

// Deterministic executor stub
// POST /api/execute
// Body: { prompt?: string, steps?: string[] }
// Returns a fake run summary with per-step statuses.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt: string = typeof body?.prompt === "string" ? body.prompt : "";
    const stepsIn: any[] = Array.isArray(body?.steps) ? body.steps : [];

    // Normalize steps to strings
    const steps: string[] = stepsIn
      .map((s) => (typeof s === "string" ? s : (s?.title || s?.summary || String(s?.type || "step"))))
      .map((s) => String(s || "step").trim())
      .filter(Boolean);

    const baseSteps = steps.length > 0 ? steps : inferFromPrompt(prompt);

    // Deterministic status mapping: first n-1 succeed, last is pending
    const statuses = baseSteps.map((title, idx) => ({
      index: idx,
      title,
      status: idx < baseSteps.length - 1 ? (idx % 3 === 0 ? "confirmed" : "success") : "pending",
    }));

    const run = {
      id: "run_" + Math.abs(hash(prompt || baseSteps.join("|"))).toString(36).slice(0, 8),
      status: "in_progress" as const,
      createdAt: Date.now(),
      steps: statuses,
      summary: baseSteps.length
        ? `Executing ${baseSteps.length} step(s)…`
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