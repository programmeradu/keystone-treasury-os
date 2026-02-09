import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import OpenAI from "openai";

/**
 * /api/foresight/parse  —  LLM-powered prompt → simulation variables
 *
 * Uses Groq (fastest) or OpenAI to extract structured simulation parameters
 * from natural language prompts.  Returns the same shape as the regex parser
 * so the CommandBar can swap in seamlessly.
 *
 * POST { prompt: string, portfolio?: { symbol, amount, price }[] }
 * → { variables, timeframeMonths, title, confidence, parsedSummary }
 */

interface SimVariable {
    id: string;
    label: string;
    type: "price_change" | "burn_rate" | "inflow" | "outflow" | "yield_apy" | "custom";
    asset?: string;
    value: number;
    unit: "percent" | "usd" | "tokens";
}

interface ParseResult {
    variables: SimVariable[];
    timeframeMonths: number;
    title: string;
    confidence: number;
    parsedSummary: string[];
    provider: string;
}

// ─── System Prompt ──────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a financial simulation parser for a crypto treasury management app called Keystone.

Your ONLY job: extract structured simulation variables from a natural language prompt.

Return ONLY valid JSON (no markdown, no explanation, no code fences):
{
  "variables": [
    {
      "type": "price_change" | "burn_rate" | "inflow" | "yield_apy" | "price_target",
      "asset": "SOL" | "ETH" | "BTC" | "USDC" | etc (only for price-related types),
      "value": <number>,
      "label": "<human-readable label>"
    }
  ],
  "timeframeMonths": <number 1-120>,
  "title": "<short 3-8 word scenario title>",
  "parsedSummary": ["<bullet point of each thing parsed>"]
}

VARIABLE TYPES AND VALUE FORMATS:
• price_change: value is a decimal fraction. -0.5 = -50%, +0.3 = +30%, 0 = unchanged.
  If user says "stays same" or "unchanged", value = 0.
• price_target: value is target USD price. E.g. "SOL drops to $100" → value: 100.
  The simulation engine will compute the % change from the current price.
• burn_rate: value is USD per month. E.g. "$20k/month" → value: 20000.
• inflow: value is USD per month. Revenue, income, inflow. E.g. "$5k/month revenue" → value: 5000.
• yield_apy: value is decimal fraction. E.g. "2% yield" → value: 0.02, "8% APY" → value: 0.08.
• outflow: same as burn_rate but for non-burn expenses.

RULES:
1. Parse EVERY variable the user mentions. Don't skip anything.
2. If user says "stays same price" or "unchanged", emit price_change with value: 0 for that asset.
3. If user mentions "market crashes/drops X%", apply to ALL mentioned or major assets (SOL, ETH, BTC).
4. timeframeMonths defaults to 12 if not specified.
5. Be precise with signs: drops/falls/crashes = negative, rises/pumps/moons = positive.
6. If the prompt is vague or you can't parse it well, still try your best but the title should indicate uncertainty.
7. NEVER return empty variables array — always extract at least one meaningful variable.`;

// ─── Provider Selection ─────────────────────────────────────────────

function getProvider(): "groq" | "openai" {
    if (process.env.GROQ_API_KEY) return "groq";   // fastest
    if (process.env.OPENAI_API_KEY) return "openai";
    return "groq"; // default
}

// ─── Route Handler ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    const startMs = Date.now();

    try {
        const body = await req.json();
        const prompt = body?.prompt;
        if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
            return NextResponse.json({ error: "Missing 'prompt' string" }, { status: 400 });
        }

        // Optional portfolio context helps the LLM understand current holdings
        const portfolio: { symbol: string; amount: number; price: number }[] = body?.portfolio || [];
        const portfolioContext = portfolio.length > 0
            ? `\n\nCurrent portfolio:\n${portfolio.map(t => `• ${t.symbol}: ${t.amount} tokens @ $${t.price}`).join("\n")}`
            : "";

        const userPrompt = `Parse this simulation prompt:\n"${prompt}"${portfolioContext}`;

        const provider = getProvider();
        let responseText = "";

        if (provider === "groq") {
            const key = process.env.GROQ_API_KEY;
            if (!key) {
                return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
            }
            const groq = new Groq({ apiKey: key });
            const completion = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                max_tokens: 512,
                temperature: 0.1, // very low for deterministic parsing
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: userPrompt },
                ],
            });
            responseText = completion.choices[0]?.message?.content || "";
        } else {
            const key = process.env.OPENAI_API_KEY;
            if (!key) {
                return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
            }
            const client = new OpenAI({ apiKey: key });
            const completion = await client.chat.completions.create({
                model: "gpt-4o-mini",
                max_tokens: 512,
                temperature: 0.1,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: userPrompt },
                ],
            });
            responseText = completion.choices[0]?.message?.content || "";
        }

        // Parse JSON from LLM response (strip markdown fences if present)
        let jsonText = responseText.trim();
        if (jsonText.startsWith("```")) {
            jsonText = jsonText.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
        }

        const parsed = JSON.parse(jsonText);

        // Validate and normalize the response
        const rawVars: any[] = Array.isArray(parsed.variables) ? parsed.variables : [];
        if (rawVars.length === 0) {
            return NextResponse.json({ error: "LLM returned no variables" }, { status: 422 });
        }

        // Map to our internal SimVariable format with IDs
        const variables: SimVariable[] = rawVars.map((v: any, i: number) => {
            const type = v.type === "price_target" ? "custom" : v.type;
            return {
                id: `llm_${type}_${i}`,
                label: v.label || `${v.type} ${v.asset || ""}`.trim(),
                type: type as SimVariable["type"],
                asset: v.asset || undefined,
                value: typeof v.value === "number" ? v.value : parseFloat(v.value) || 0,
                unit: v.type === "price_target" ? "usd" as const
                    : v.type === "price_change" || v.type === "yield_apy" ? "percent" as const
                    : "usd" as const,
            };
        });

        const timeframeMonths = Math.max(1, Math.min(120, parsed.timeframeMonths || 12));
        const title = parsed.title || "LLM-Parsed Scenario";
        const parsedSummary = Array.isArray(parsed.parsedSummary) ? parsed.parsedSummary : [];

        const result: ParseResult = {
            variables,
            timeframeMonths,
            title,
            confidence: 0.85, // LLM parsing is more confident than regex
            parsedSummary,
            provider,
        };

        console.log(`[Foresight/LLM] Parsed in ${Date.now() - startMs}ms via ${provider}:`, title);

        return NextResponse.json(result, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (err: any) {
        console.error("[Foresight/LLM] Parse error:", err?.message || err);

        // If it's a JSON parse error, the LLM returned bad format
        if (err instanceof SyntaxError) {
            return NextResponse.json(
                { error: "LLM returned invalid JSON", details: err.message },
                { status: 422 }
            );
        }

        return NextResponse.json(
            { error: "Foresight LLM parse failed", details: err?.message || String(err) },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        ok: true,
        message: "POST { prompt: string, portfolio?: { symbol, amount, price }[] } → structured simulation variables",
        providers: ["groq (llama-3.3-70b)", "openai (gpt-4o-mini)"],
    });
}
