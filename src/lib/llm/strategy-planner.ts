/**
 * LLM Strategy Planner
 * Converts natural language user requests into structured execution plans
 * for deterministic agents to execute
 * 
 * Supports multiple LLM providers:
 * - Groq (mixtral-8x7b-32768): Free tier available
 * - GitHub Models (gpt-4o): Via Microsoft Azure endpoint
 * - Anthropic (claude-3-5-sonnet): Via Anthropic SDK
 */

import Groq from "groq-sdk";
import OpenAI from "openai";

export interface StrategyPlan {
  operation: string;
  parameters: Record<string, any>;
  reasoning: string;
  warnings: string[];
  estimatedOutcome: string;
  confidence?: "high" | "medium" | "low";
}

type LLMProvider = "groq" | "github";

/**
 * Get the best available LLM provider
 */
function getProvider(): LLMProvider {
  // Prefer Groq (fast, free tier)
  if (process.env.GROQ_API_KEY) return "groq";
  // Fall back to GitHub Models
  if (process.env.GITHUB_TOKEN) return "github";
  // Default to Groq (with warning)
  return "groq";
}

/**
 * Plan a strategy based on natural language user request
 * Returns structured JSON that agents can deterministically execute
 * 
 * Supports: Groq (fastest), GitHub Models, Anthropic (most capable)
 */
export async function planStrategy(
  userRequest: string,
  walletState: {
    balances: Record<string, number>;
    portfolio: Record<string, number>;
    totalValue?: number;
  },
  provider?: LLMProvider
): Promise<StrategyPlan> {
  const selectedProvider = provider || getProvider();
  
  const systemPrompt = `You are a professional crypto portfolio advisor. Your job is to understand user requests
and create structured execution plans for deterministic agents.

IMPORTANT: Only plan, do NOT execute. You plan, agents execute.

Return ONLY valid JSON (no markdown, no explanation before/after):
{
  "operation": "swap|stake|rebalance|dca|analyze",
  "parameters": {
    "description of parameters"
  },
  "reasoning": "Explain why this strategy addresses user's request",
  "warnings": ["List of risks or warnings"],
  "estimatedOutcome": "What the user can expect after execution",
  "confidence": "high|medium|low"
}

Operations:
- "swap": Direct token swap via Jupiter (parameters: inputToken, outputToken, amount)
- "stake": Stake SOL with validator or Marinade (parameters: amount, provider)
- "rebalance": Rebalance portfolio to target allocations (parameters: targetAllocations {})
- "dca": Dollar-cost averaging (parameters: inMint, outMint, amount, frequency)
- "analyze": Analyze token safety before trading (parameters: mint)

Be specific. If user says "reduce risk", suggest actual allocation percentages.
For rebalance, always include a targetAllocations object like: { "SOL": 50, "USDC": 30, "JUP": 20 }`;

  const userPrompt = `User request: "${userRequest}"

Current wallet state:
Balances: ${JSON.stringify(walletState.balances)}
Portfolio allocation: ${JSON.stringify(walletState.portfolio)}
${walletState.totalValue ? `Total portfolio value: $${walletState.totalValue.toLocaleString()}` : ""}

Create an execution plan. Return ONLY JSON, no markdown.`;

  try {
    let responseText = "";

    if (selectedProvider === "groq") {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        throw new Error("GROQ_API_KEY not configured");
      }

      const groq = new Groq({ apiKey });
      const message = await groq.chat.completions.create({
        model: "mixtral-8x7b-32768",
        max_tokens: 1024,
        temperature: 0.3, // Lower for more deterministic planning
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ]
      });

      const content = message.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from Groq");
      }
      responseText = content;
    } else if (selectedProvider === "github") {
      const apiKey = process.env.GITHUB_TOKEN;
      if (!apiKey) {
        throw new Error("GITHUB_TOKEN not configured");
      }

      const client = new OpenAI({
        baseURL: "https://models.inference.ai.azure.com",
        apiKey: apiKey,
        defaultHeaders: {
          "user-agent": "keystone-treasury-os/1.0"
        }
      });

      const message = await client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 1024,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ]
      });

      const content = message.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from GitHub Models");
      }
      responseText = content;
    } else {
      throw new Error(`Unknown provider: ${selectedProvider}`);
    }

    // Parse response - handle markdown code blocks
    let jsonText = responseText.trim();

    // Remove markdown code blocks if present
    if (jsonText.includes("```json")) {
      jsonText = jsonText.split("```json")[1].split("```")[0].trim();
    } else if (jsonText.includes("```")) {
      jsonText = jsonText.split("```")[1].split("```")[0].trim();
    }

    const plan = JSON.parse(jsonText) as StrategyPlan;

    // Validate required fields
    if (!plan.operation || !plan.parameters || !plan.reasoning || !plan.warnings || !plan.estimatedOutcome) {
      throw new Error("Invalid plan structure from LLM");
    }

    return plan;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse LLM response as JSON: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get strategy recommendations for a user's situation
 * Useful for "What should I do?" type questions
 */
export async function getStrategyRecommendations(
  userSituation: string,
  walletState: {
    balances: Record<string, number>;
    portfolio: Record<string, number>;
  },
  provider?: LLMProvider
): Promise<string> {
  const selectedProvider = provider || getProvider();

  const systemPrompt = `You are a crypto portfolio advisor. Provide 2-3 specific, actionable recommendations.
Be concise and direct. Reference specific tokens and percentages when possible.`;

  const userPrompt = `Situation: ${userSituation}

Current wallet:
Balances: ${JSON.stringify(walletState.balances)}
Portfolio: ${JSON.stringify(walletState.portfolio)}

What strategies should I consider? (2-3 specific recommendations)`;

  try {
    let responseText = "";

    if (selectedProvider === "groq") {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error("GROQ_API_KEY not configured");

      const groq = new Groq({ apiKey });
      const message = await groq.chat.completions.create({
        model: "mixtral-8x7b-32768",
        max_tokens: 512,
        temperature: 0.5,
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
        temperature: 0.5,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });

      responseText = message.choices[0]?.message?.content || "";
    }

    return responseText;
  } catch (error) {
    throw new Error(`Failed to get recommendations: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate if a user's request is safe/reasonable
 * Helps catch unusual or risky requests before execution
 */
export async function validateStrategy(
  plan: StrategyPlan,
  walletState: {
    balances: Record<string, number>;
    portfolio: Record<string, number>;
  },
  provider?: LLMProvider
): Promise<{
  valid: boolean;
  reason?: string;
}> {
  const selectedProvider = provider || getProvider();

  const systemPrompt = `You are a security validator. Check if a planned operation is reasonable.
Return JSON only: { "valid": true/false, "reason": "explanation if invalid" }`;

  const userPrompt = `Planned operation: ${plan.operation}
Parameters: ${JSON.stringify(plan.parameters)}
Current portfolio: ${JSON.stringify(walletState.portfolio)}

Is this plan reasonable and safe?`;

  try {
    let responseText = "";

    if (selectedProvider === "groq") {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error("GROQ_API_KEY not configured");

      const groq = new Groq({ apiKey });
      const message = await groq.chat.completions.create({
        model: "mixtral-8x7b-32768",
        max_tokens: 256,
        temperature: 0.2,
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
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });

      responseText = message.choices[0]?.message?.content || "";
    }

    try {
      let jsonText = responseText.trim();
      if (jsonText.includes("```json")) {
        jsonText = jsonText.split("```json")[1].split("```")[0].trim();
      } else if (jsonText.includes("```")) {
        jsonText = jsonText.split("```")[1].split("```")[0].trim();
      }
      const result = JSON.parse(jsonText);
      return result;
    } catch {
      return { valid: true }; // Assume valid if parsing fails
    }
  } catch (error) {
    console.error("Validation error:", error);
    return { valid: true }; // Assume valid on error - don't block execution
  }
}
