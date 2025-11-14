/**
 * LLM Analysis Translator
 * Converts technical AnalysisAgent results into natural language explanations
 * that non-technical users can understand
 * 
 * Supports Groq and GitHub Models LLMs
 */

import Groq from "groq-sdk";
import OpenAI from "openai";
import type { TokenSafetyAnalysis } from "@/lib/agents/types";

export interface TranslatedAnalysis {
  summary: string;
  risks: string[];
  positives: string[];
  recommendation: string;
  shouldTrade: boolean;
}

type LLMProvider = "groq" | "github";

/**
 * Get best available LLM provider
 */
function getProvider(): LLMProvider {
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.GITHUB_TOKEN) return "github";
  return "groq";
}

/**
 * Translate token safety analysis into user-friendly explanation
 */
export async function translateTokenAnalysis(
  analysis: TokenSafetyAnalysis,
  provider?: LLMProvider
): Promise<TranslatedAnalysis> {
  const selectedProvider = provider || getProvider();

  const systemPrompt = `You are explaining token safety analysis to a crypto trader.
Make technical analysis accessible without losing important information.

Return ONLY valid JSON (no markdown):
{
  "summary": "One sentence verdict",
  "risks": ["Risk 1", "Risk 2", "Risk 3"],
  "positives": ["Positive 1", "Positive 2"],
  "recommendation": "Clear recommendation for trading this token",
  "shouldTrade": true/false
}

Be concise but informative. If riskScore > 70, shouldTrade = false.
If riskScore < 40, shouldTrade = true.
Between 40-70, suggest with caution.`;

  const userPrompt = `Analyze this token:
Risk Score: ${analysis.riskScore}/100
Verdict: ${analysis.verdict}
Flags: ${analysis.flags.map((f) => f.message).join("; ")}
Checks: ${JSON.stringify(
    Object.entries(analysis.checks).map(([k, v]) => `${k}: ${v.status}`),
    null,
    2
  )}

Explain in plain language what this means for a trader. Return JSON only.`;

  try {
    let responseText = "";

    if (selectedProvider === "groq") {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error("GROQ_API_KEY not configured");

      const groq = new Groq({ apiKey });
      const message = await groq.chat.completions.create({
        model: "mixtral-8x7b-32768",
        max_tokens: 512,
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });

      responseText = message.choices[0]?.message?.content || "";
    } else if (selectedProvider === "github") {
      const apiKey = process.env.GITHUB_TOKEN;
      if (!apiKey) throw new Error("GITHUB_TOKEN not configured");

      const client = new OpenAI({
        baseURL: "https://models.inference.ai.azure.com",
        apiKey: apiKey,
        defaultHeaders: { "user-agent": "keystone-treasury-os/1.0" }
      });

      const message = await client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 512,
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });

      responseText = message.choices[0]?.message?.content || "";
    }

    let jsonText = responseText.trim();
    if (jsonText.includes("```json")) {
      jsonText = jsonText.split("```json")[1].split("```")[0].trim();
    } else if (jsonText.includes("```")) {
      jsonText = jsonText.split("```")[1].split("```")[0].trim();
    }

    const translated = JSON.parse(jsonText) as TranslatedAnalysis;
    return translated;
  } catch (error) {
    // Fallback translation based on score
    const riskScore = analysis.riskScore;
    const verdict =
      riskScore > 70
        ? "Very Risky - Not Recommended"
        : riskScore > 40
          ? "Risky - Proceed with Caution"
          : "Relatively Safe";

    return {
      summary: verdict,
      risks: analysis.flags.map((f) => f.message),
      positives: Object.entries(analysis.checks)
        .filter(([_, v]) => v.status === "pass")
        .map(([k, _]) => `${k} is safe`),
      recommendation: `${verdict}. Review the flags below before trading.`,
      shouldTrade: riskScore < 70,
    };
  }
}

/**
 * Generate MEV risk explanation
 */
export async function explainMEVRisk(
  opportunity: {
    type: string;
    tokens: string[];
    profitPotential: number;
    risk: string;
  },
  provider?: LLMProvider
): Promise<string> {
  const selectedProvider = provider || getProvider();

  const systemPrompt = `Explain MEV (Maximal Extractable Value) risks in simple terms.
What could go wrong? What should the trader do?`;

  const userPrompt = `MEV opportunity detected:
Type: ${opportunity.type}
Tokens: ${opportunity.tokens.join(", ")}
Potential profit: ${opportunity.profitPotential}%
Risk level: ${opportunity.risk}

Explain what this means.`;

  try {
    let responseText = "";

    if (selectedProvider === "groq") {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error("GROQ_API_KEY not configured");

      const groq = new Groq({ apiKey });
      const message = await groq.chat.completions.create({
        model: "mixtral-8x7b-32768",
        max_tokens: 256,
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });

      responseText = message.choices[0]?.message?.content || "";
    } else if (selectedProvider === "github") {
      const apiKey = process.env.GITHUB_TOKEN;
      if (!apiKey) throw new Error("GITHUB_TOKEN not configured");

      const client = new OpenAI({
        baseURL: "https://models.inference.ai.azure.com",
        apiKey: apiKey,
        defaultHeaders: { "user-agent": "keystone-treasury-os/1.0" }
      });

      const message = await client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 256,
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });

      responseText = message.choices[0]?.message?.content || "";
    }

    return responseText || "MEV opportunity detected. Be cautious with large trades.";
  } catch (error) {
    return "MEV opportunity detected. Be cautious with large trades.";
  }
}

/**
 * Explain portfolio concentration risk
 */
export async function explainConcentrationRisk(
  portfolio: {
    symbol: string;
    percentage: number;
  }[],
  provider?: LLMProvider
): Promise<string> {
  const selectedProvider = provider || getProvider();

  const systemPrompt = `Analyze portfolio concentration and explain diversification risks.
Be specific about what's risky and what could be done.`;

  const userPrompt = `Current portfolio:
${portfolio.map((p) => `${p.symbol}: ${p.percentage.toFixed(1)}%`).join("\n")}

Is this diversified enough? What are the risks?`;

  try {
    let responseText = "";

    if (selectedProvider === "groq") {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error("GROQ_API_KEY not configured");

      const groq = new Groq({ apiKey });
      const message = await groq.chat.completions.create({
        model: "mixtral-8x7b-32768",
        max_tokens: 256,
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });

      responseText = message.choices[0]?.message?.content || "";
    } else if (selectedProvider === "github") {
      const apiKey = process.env.GITHUB_TOKEN;
      if (!apiKey) throw new Error("GITHUB_TOKEN not configured");

      const client = new OpenAI({
        baseURL: "https://models.inference.ai.azure.com",
        apiKey: apiKey,
        defaultHeaders: { "user-agent": "keystone-treasury-os/1.0" }
      });

      const message = await client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 256,
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });

      responseText = message.choices[0]?.message?.content || "";
    }

    return responseText || "Review your portfolio diversification.";
  } catch (error) {
    return "Review your portfolio diversification.";
  }
}

/**
 * Generate holder distribution risk explanation
 */
export function explainHolderDistribution(
  topHolderPercent: number,
  totalHolders: number
): string {
  if (topHolderPercent > 50) {
    return `⚠️ CRITICAL: One wallet owns ${topHolderPercent.toFixed(1)}% of this token. They could crash the price anytime. Avoid this token.`;
  }

  if (topHolderPercent > 30) {
    return `⚠️ RISK: Top holder controls ${topHolderPercent.toFixed(1)}% of supply. This is heavily concentrated. Proceed with caution.`;
  }

  if (topHolderPercent > 10) {
    return `✓ ACCEPTABLE: Top holder has ${topHolderPercent.toFixed(1)}% of supply. Reasonable diversification with ${totalHolders} total holders.`;
  }

  return `✓ GOOD: ${topHolderPercent.toFixed(1)}% held by largest wallet with ${totalHolders} total holders. Well distributed.`;
}

/**
 * Get quick risk assessment without LLM
 */
export function quickRiskAssessment(riskScore: number): string {
  if (riskScore > 80) return "🔴 CRITICAL RISK - DO NOT TRADE";
  if (riskScore > 60) return "🟠 HIGH RISK - Proceed with extreme caution";
  if (riskScore > 40) return "🟡 MEDIUM RISK - Review flags carefully";
  if (riskScore > 20) return "🟢 LOW RISK - Generally safe";
  return "✅ VERY LOW RISK - Safe to trade";
}
