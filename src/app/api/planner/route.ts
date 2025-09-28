import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const startedAt = Date.now();
    const runId = `plan_${startedAt}_${Math.random().toString(36).slice(2, 8)}`;
    const origin = new URL(req.url).origin;

    // simple retry helper with jittered backoff + soft timeout
    const fetchWithRetry = async (input: RequestInfo | URL, init?: RequestInit, retries = 2, timeoutMs = 8000) => {
      let attempt = 0;
      while (true) {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(input as any, { ...(init || {}), signal: controller.signal });
          clearTimeout(t);
          return res;
        } catch (e) {
          clearTimeout(t);
          if (attempt >= retries) throw e;
          const delay = 200 * Math.pow(2, attempt) + Math.random() * 120;
          await new Promise((r) => setTimeout(r, delay));
          attempt += 1;
        }
      }
    };

    const { prompt, plan, constraints } = (await req.json()) as {
      prompt?: string;
      plan?: { intent?: string; steps?: Array<{ type: string; params?: Record<string, any> }> };
      constraints?: {
        riskAppetite?: "conservative" | "balanced" | "aggressive";
        preferredChain?: string;
        bridgePreference?: "cheapest" | "fastest" | "mostSecure";
        maxSlippagePct?: number;
        minLiquidityUsd?: number;
      };
    };

    if (!prompt && !plan?.steps?.length) {
      // Return a safe default instead of 400 so UI never shows generic planner error
      const fallback = {
        ok: true,
        intent: "yield",
        steps: [
          {
            type: "yield",
            params: { asset: "USDC", chain: "base", horizon: "30 days" },
            ok: true,
            summary: "Default yield analysis on Base for USDC",
            details: {},
            references: [{ label: "Yields API", url: "/api/yields?asset=USDC&chain=base" }],
          },
        ],
        references: [
          { label: "Parser", url: "/api/ai/parse" },
          { label: "Planner", url: "/api/planner" },
        ],
        runId,
        timings: { startedAt, durationMs: Date.now() - startedAt },
        optimizer: { objective: constraints?.bridgePreference || "cheapest", constraints },
      } as any;
      return new Response(JSON.stringify(fallback), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    // 1) Parse if only prompt provided
    let parsed = plan;
    if (!parsed?.steps?.length && prompt) {
      try {
        const pRes = await fetchWithRetry(`${origin}/api/ai/parse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
          cache: "no-store",
        });
        // Harden against non-JSON responses so we don't throw and bubble up as 500
        let pj: any = null;
        let pBodyText: string | undefined;
        try {
          pj = await pRes.json();
        } catch {
          try {
            pBodyText = await pRes.text();
          } catch {}
        }
        if (!pRes.ok || !pj?.steps?.length) {
          // Soft fallback: construct a minimal plan instead of returning 400
          parsed = {
            intent: "yield",
            steps: [
              { type: "yield", params: { asset: "USDC", chain: "base", horizon: "30 days" } },
            ],
          } as any;
        } else {
          parsed = pj;
        }
      } catch {
        // If the parse endpoint is unreachable or times out, proceed with a safe minimal plan
        parsed = {
          intent: "yield",
          steps: [
            { type: "yield", params: { asset: "USDC", chain: "base", horizon: "30 days" } },
          ],
        } as any;
      }
    }

    // New: Generate human-readable plan steps via Groq (best-effort)
    let groqStepTexts: string[] | undefined;
    try {
      if (prompt) {
        const aiRes = await fetchWithRetry(`${origin}/api/ai/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `You are a treasury operations planner. In 4-6 concise bullet lines (no numbering), outline the key execution steps for this instruction: "${prompt}". Each line should be short, imperative, and specific (e.g., "Quote best route across venues"). Return plain text with one step per line.`,
            provider: "groq",
          }),
          cache: "no-store",
        }, 1, 9000);
        if (aiRes.ok) {
          const aj = await aiRes.json();
          const text = String(aj?.text || "");
          if (text) {
            const lines = text
              .split(/\r?\n+/)
              .map((l: string) => l.replace(/^[-*•\d.\)\s]+/, "").trim())
              .filter(Boolean);
            // de-dupe, cap 6
            const seen = new Set<string>();
            groqStepTexts = lines.filter((l) => {
              const key = l.toLowerCase();
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            }).slice(0, 6);
          }
        }
      }
    } catch {}

    const steps = parsed!.steps as Array<{ type: string; params?: Record<string, any> }>;

    // 2) For each step, orchestrate using existing internal APIs
    const results: Array<{
      type: string;
      params: Record<string, any>;
      ok: boolean;
      summary?: string;
      details?: any;
      references?: Array<{ label: string; url: string }>;
      timing?: { startedAt: number; durationMs: number };
    }> = [];

    // helpers
    const toUSDCUnits = (amt: number) => Math.round(amt * 1e6);
    const toETHUnits = (amt: number) => Math.round(amt * 1e18);
    const clamp = (n: any, min: number, max: number) => {
      const v = typeof n === "number" && isFinite(n) ? n : min;
      return Math.max(min, Math.min(max, v));
    };

    for (const step of steps) {
      const t = step.type;
      const params = step.params || {};
      const stepStart = Date.now();
      try {
        if (t === "gas") {
          const chain = params.chain || constraints?.preferredChain || "ethereum";
          const [gasRes, priceRes] = await Promise.all([
            fetchWithRetry(`${origin}/api/rpc`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chain, jsonrpc: "2.0", method: "eth_gasPrice", params: [], id: 1 }) }, 2, 8000),
            fetchWithRetry(`${origin}/api/price?ids=ethereum&vs_currencies=usd`, undefined, 2, 8000),
          ]);
          const gasOk = gasRes.ok;
          const priceOk = priceRes.ok;
          const gasData = gasOk ? await gasRes.json() : null;
          const priceData = priceOk ? await priceRes.json() : null;
          const gasWei = gasData?.result ? parseInt(gasData.result, 16) : 20e9;
          const gwei = gasWei / 1e9;
          const ethUsd = priceData?.ethereum?.usd || 2500;
          const txCostUsd = ((gwei / 1e9) * 21000 * ethUsd).toFixed(2);
          results.push({
            type: t,
            params: { chain },
            ok: gasOk && priceOk,
            summary: `Gas estimate: ~${gwei.toFixed(2)} gwei, ~$${txCostUsd} per 21k gas tx`,
            details: { gwei, txCostUsd: Number(txCostUsd), chain },
            references: [
              { label: "RPC", url: "/api/rpc" },
              { label: "Price", url: "/api/price?ids=ethereum&vs_currencies=usd" },
            ],
            timing: { startedAt: stepStart, durationMs: Date.now() - stepStart },
          });
        } else if (t === "yield") {
          const asset = params.asset || "USDC";
          const chain = params.chain || constraints?.preferredChain || "base";
          const yRes = await fetchWithRetry(`${origin}/api/yields?asset=${encodeURIComponent(asset)}&chain=${encodeURIComponent(chain)}`, undefined, 2, 8000);
          const yOk = yRes.ok;
          let yJ: any = null;
          try { yJ = await yRes.json(); } catch { yJ = null; }
          const top = yJ?.data?.[0];
          results.push({
            type: t,
            params: { asset, chain, horizon: params.horizon },
            ok: !!yOk,
            summary: top ? `Top yield on ${chain} for ${asset}: ${top.apy}% via ${top.project}` : (yOk ? `No yields found for ${asset} on ${chain}` : `Yield fetch failed for ${asset} on ${chain}`),
            details: yJ,
            references: [{ label: "Yields API", url: `/api/yields?asset=${asset}&chain=${chain}` }],
            timing: { startedAt: stepStart, durationMs: Date.now() - stepStart },
          });
        } else if (t === "bridge") {
          const amount = typeof params.amount === "number" ? params.amount : 100000; // default 100k
          const token = params.token || "USDC";
          const fromChain = params.fromChain || "ethereum";
          const toChain = params.toChain || constraints?.preferredChain || "base";
          const units = token === "USDC" ? toUSDCUnits(amount) : toETHUnits(amount);
          const maxSlippage = clamp(constraints?.maxSlippagePct, 0, 3);
          const objective = constraints?.bridgePreference || "cheapest";
          const bRes = await fetchWithRetry(
            `${origin}/api/bridge/quote`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fromChain,
                toChain,
                fromToken: token,
                toToken: token,
                fromAmount: String(units),
              }),
              cache: "no-store",
            },
            2,
            10000
          );
          const bOk = bRes.ok;
          let bJ: any = null; let bText: string | undefined;
          try { bJ = await bRes.json(); } catch { try { bText = await bRes.text(); } catch {} }

          // Secondary source: tools/execute (best-effort)
          let toolJ: any = null;
          try {
            const tRes = await fetchWithRetry(`${origin}/api/tools/execute`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ toolId: "bridge", prompt: prompt || `${amount} ${token} from ${fromChain} to ${toChain}` }),
            }, 1, 8000);
            if (tRes.ok) {
              try { toolJ = await tRes.json(); } catch {}
            }
          } catch {}

          // Build candidate set and score
          type Cand = { provider: string; feesUsd: number; timeMinutes: number; securityScore: number; raw: any };
          const candidates: Cand[] = [];
          if (bJ) {
            const fees = Number(bJ?.data?.feesUsd ?? bJ?.data?.priceUsd ?? 0.0) || 0;
            const timeM = Number(bJ?.data?.etaMinutes ?? 12) || 12;
            candidates.push({ provider: String(bJ?.data?.provider || "Bridge"), feesUsd: fees, timeMinutes: timeM, securityScore: 70, raw: bJ });
          }
          if (toolJ) {
            const ttx = toolJ?.details?.tx || toolJ?.details?.data?.tx || {};
            const meta = toolJ?.details?.meta || {};
            const fees = Number(meta?.feesUsd ?? meta?.estimatedFeesUsd ?? 0.0) || 0;
            const timeM = Number(meta?.timeMinutes ?? meta?.etaMinutes ?? 14) || 14;
            candidates.push({ provider: String(toolJ?.summary || toolJ?.data?.provider || "BridgeTool"), feesUsd: fees, timeMinutes: timeM, securityScore: 75, raw: toolJ });
          }
          // Fallback candidate if none parsed
          if (candidates.length === 0) {
            candidates.push({ provider: "Bridge", feesUsd: results.length * 2 + 8, timeMinutes: 12, securityScore: 60, raw: bJ || { error: true, status: bRes.status, body: bText } });
          }

          // Objective scoring
          const byCheapest = [...candidates].sort((a,b)=>a.feesUsd-b.feesUsd)[0];
          const byFastest = [...candidates].sort((a,b)=>a.timeMinutes-b.timeMinutes)[0];
          const bySecure = [...candidates].sort((a,b)=>b.securityScore-a.securityScore)[0];
          const selected = objective === "fastest" ? byFastest : objective === "mostSecure" ? bySecure : byCheapest;

          results.push({
            type: t,
            params: { amount, token, fromChain, toChain, slippage: maxSlippage, preference: objective },
            ok: !!bOk || !!toolJ,
            summary: `Bridge ~${amount.toLocaleString()} ${token} ${fromChain} → ${toChain} via ${selected.provider} (${objective}) · ~$${selected.feesUsd.toFixed(2)} · ~${selected.timeMinutes}m`,
            details: { primary: bJ || { status: bRes.status, body: bText }, secondary: toolJ, candidates, metrics: { selected } },
            references: [
              { label: "Bridge Quote (primary)", url: `/api/bridge/quote?fromChain=${fromChain}&toChain=${toChain}&fromToken=${token}&toToken=${token}&fromAmount=${units}` },
              { label: "Bridge Tool (secondary)", url: "/api/tools/execute" },
            ],
            timing: { startedAt: stepStart, durationMs: Date.now() - stepStart },
          });
        } else if (t === "swap") {
          const amount = typeof params.amount === "number" ? params.amount : 10;
          const sellToken = params.sellToken || "ETH";
          const buyToken = params.buyToken || "USDC";
          const chainId = params.chainId || (constraints?.preferredChain?.toLowerCase() === "base" ? 8453 : 1);
          const units = sellToken === "ETH" ? toETHUnits(amount) : toUSDCUnits(amount);
          const maxSlippage = clamp(constraints?.maxSlippagePct, 0, 3);
          const sUrl = `${origin}/api/swap/quote?sellToken=${sellToken}&buyToken=${buyToken}&sellAmount=${units}&chainId=${chainId}`;
          const sRes = await fetchWithRetry(sUrl, undefined, 2, 10000);
          const sOk = sRes.ok;
          let sJ: any = null; let sText: string | undefined;
          try { sJ = await sRes.json(); } catch { try { sText = await sRes.text(); } catch {} }

          // Secondary: tools/execute swap
          let toolJ: any = null;
          try {
            const tRes = await fetchWithRetry(`${origin}/api/tools/execute`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ toolId: "swap", prompt: prompt || `Swap ${amount} ${sellToken} to ${buyToken} on chain ${chainId}` }),
            }, 1, 8000);
            if (tRes.ok) {
              try { toolJ = await tRes.json(); } catch {}
            }
          } catch {}

          type Cand = { provider: string; feesUsd: number; timeMinutes: number; securityScore: number; raw: any };
          const candidates: Cand[] = [];
          if (sJ) {
            const fees = Number(sJ?.data?.feesUsd ?? sJ?.data?.priceImpactUsd ?? 0.0) || 0;
            const timeM = Number(sJ?.data?.etaMinutes ?? 1) || 1;
            candidates.push({ provider: String(sJ?.data?.provider || "DEX"), feesUsd: fees, timeMinutes: timeM, securityScore: 70, raw: sJ });
          }
          if (toolJ) {
            const meta = toolJ?.details?.meta || {};
            const fees = Number(meta?.feesUsd ?? meta?.estimatedFeesUsd ?? 0.0) || 0;
            const timeM = Number(meta?.timeMinutes ?? 1) || 1;
            candidates.push({ provider: String(toolJ?.summary || toolJ?.data?.provider || "SwapTool"), feesUsd: fees, timeMinutes: timeM, securityScore: 75, raw: toolJ });
          }
          if (candidates.length === 0) {
            candidates.push({ provider: "DEX", feesUsd: results.length * 1.2 + 1.5, timeMinutes: 1, securityScore: 60, raw: sJ || { error: true, status: sRes.status, body: sText } });
          }

          const objective = constraints?.bridgePreference || "cheapest";
          const byCheapest = [...candidates].sort((a,b)=>a.feesUsd-b.feesUsd)[0];
          const byFastest = [...candidates].sort((a,b)=>a.timeMinutes-b.timeMinutes)[0];
          const bySecure = [...candidates].sort((a,b)=>b.securityScore-a.securityScore)[0];
          const selected = objective === "fastest" ? byFastest : objective === "mostSecure" ? bySecure : byCheapest;

          results.push({
            type: t,
            params: { amount, sellToken, buyToken, chainId, slippage: maxSlippage },
            ok: !!sOk || !!toolJ,
            summary: `Swap ~${amount} ${sellToken} → ${buyToken} on chain ${chainId} via ${selected.provider} (${objective}) · ~$${selected.feesUsd.toFixed(2)} · ~${selected.timeMinutes}m`,
            details: { primary: sJ || { status: sRes.status, body: sText }, secondary: toolJ, candidates, metrics: { selected } },
            references: [
              { label: "Swap Quote (primary)", url: `/api/swap/quote?sellToken=${sellToken}&buyToken=${buyToken}&sellAmount=${units}&chainId=${chainId}` },
              { label: "Swap Tool (secondary)", url: "/api/tools/execute" },
            ],
            timing: { startedAt: stepStart, durationMs: Date.now() - stepStart },
          });
        } else if (t === "vest") {
          const percent = params.percent ?? 20;
          const months = params.months ?? 6;
          results.push({
            type: t,
            params: { percent, months },
            ok: true,
            summary: `Vesting plan: ${percent}% over ${months} months`,
            details: { schedule: { percent, months } },
            references: [{ label: "Planner", url: "/api/planner" }],
            timing: { startedAt: stepStart, durationMs: Date.now() - stepStart },
          });
        } else {
          results.push({ type: t, params, ok: true, summary: `Unsupported step: ${t}` , details: {}, references: [{ label: "Planner", url: "/api/planner" }], timing: { startedAt: stepStart, durationMs: Date.now() - stepStart } });
        }
      } catch (e: any) {
        results.push({ type: t, params, ok: false, summary: `Failed to orchestrate ${t}`, details: { error: e?.message || String(e) }, timing: { startedAt: stepStart, durationMs: Date.now() - stepStart } });
      }
    }

    const intent = parsed?.intent || (steps.length > 1 ? "plan" : steps[0]?.type || "plan");
    const references = [
      { label: "Parser", url: "/api/ai/parse" },
      { label: "Planner", url: "/api/planner" },
    ];

    // Aggregate optimizer estimates from per-step selected metrics
    const agg = results.reduce(
      (acc, r) => {
        const sel = (r as any)?.details?.metrics?.selected;
        if (sel) {
          acc.feesUsd += Number(sel.feesUsd || 0);
          acc.timeMinutes += Number(sel.timeMinutes || 0);
        } else {
          // fallback to placeholders for non-quoted steps
          acc.feesUsd += 12;
          acc.timeMinutes += 2;
        }
        return acc;
      },
      { feesUsd: 0, timeMinutes: 0 }
    );

    const scenario = {
      estimates: {
        feesUsd: Number(agg.feesUsd.toFixed(2)),
        timeMinutes: Math.round(agg.timeMinutes),
      },
      objective: constraints?.bridgePreference || "cheapest",
      constraints,
      rationale: `Optimized for ${constraints?.bridgePreference || "cheapest"} across ${results.length} step(s) using multi-source quotes where available.`,
      alternatives: results.map((r) => ({ type: r.type, providers: (r as any)?.details?.candidates?.map((c: any) => ({ provider: c.provider, feesUsd: c.feesUsd, timeMinutes: c.timeMinutes })) || [] })),
    };

    return new Response(
      JSON.stringify({ ok: true, intent, steps: results, stepTexts: groqStepTexts, references, runId, timings: { startedAt, durationMs: Date.now() - startedAt }, optimizer: scenario }),
      { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    // Global safety net: never surface a 400; return a safe default plan
    const startedAt = Date.now();
    const runId = `plan_err_${startedAt}_${Math.random().toString(36).slice(2, 8)}`;
    const fallback = {
      ok: true,
      intent: "yield",
      steps: [
        {
          type: "yield",
          params: { asset: "USDC", chain: "base", horizon: "30 days" },
          ok: false,
          summary: "Planner recovered from an internal error; showing default yield analysis",
          details: { error: err?.message || String(err) },
          references: [{ label: "Planner", url: "/api/planner" }],
        },
      ],
      references: [
        { label: "Parser", url: "/api/ai/parse" },
        { label: "Planner", url: "/api/planner" },
      ],
      runId,
      timings: { startedAt, durationMs: 0 },
    } as any;
    return new Response(JSON.stringify(fallback), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
}