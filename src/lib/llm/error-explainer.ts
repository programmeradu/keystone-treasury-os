/**
 * LLM Error Explainer
 * Translates technical agent errors into user-friendly explanations
 * with actionable next steps
 * 
 * Supports Groq and GitHub Models LLMs
 */

import Groq from "groq-sdk";
import OpenAI from "openai";

export interface ErrorExplanation {
  friendlyMessage: string;
  whatWentWrong: string;
  whyItHappened: string;
  whatToDoNext: string[];
  severity: "low" | "medium" | "high";
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
 * Convert technical error into user-friendly explanation
 */
export async function explainError(
  error: {
    code?: string;
    message: string;
    context?: Record<string, any>;
  },
  provider?: LLMProvider
): Promise<ErrorExplanation> {
  const selectedProvider = provider || getProvider();

  const systemPrompt = `You are a helpful crypto assistant explaining technical errors to non-technical users.
Convert technical errors into friendly explanations with clear next steps.

Return ONLY valid JSON (no markdown):
{
  "friendlyMessage": "Brief, simple explanation for user",
  "whatWentWrong": "What happened technically",
  "whyItHappened": "Reason why it happened",
  "whatToDoNext": ["Action 1", "Action 2", "Action 3"],
  "severity": "low|medium|high"
}

Be concise but helpful. Suggest specific actions user can take.`;

  const userPrompt = `Error to explain:
Code: ${error.code || "UNKNOWN"}
Message: ${error.message}
Context: ${JSON.stringify(error.context || {})}

Create a friendly explanation with next steps. Return JSON only.`;

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

    // Parse JSON response
    let jsonText = responseText.trim();
    if (jsonText.includes("```json")) {
      jsonText = jsonText.split("```json")[1].split("```")[0].trim();
    } else if (jsonText.includes("```")) {
      jsonText = jsonText.split("```")[1].split("```")[0].trim();
    }

    const explanation = JSON.parse(jsonText) as ErrorExplanation;
    return explanation;
  } catch (error) {
    // Fallback explanation if LLM fails
    return {
      friendlyMessage: "Something went wrong with your transaction.",
      whatWentWrong: error instanceof Error ? error.message : "Unknown error",
      whyItHappened: "The operation encountered an unexpected issue",
      whatToDoNext: [
        "Check your wallet balance and gas fees",
        "Verify you're using the correct token addresses",
        "Try again in a few moments",
        "Contact support if the problem persists"
      ],
      severity: "medium"
    };
  }
}

/**
 * Get common error patterns with explanations
 * Useful for FAQ or error guide
 */
export const commonErrors = {
  insufficientGas: {
    message: "Insufficient SOL for gas fees",
    explanation:
      "You don't have enough SOL to pay for transaction fees. Each operation requires a small amount of SOL.",
    solution: "Deposit more SOL to your wallet",
  },
  slippageTooHigh: {
    message: "Price slippage exceeds limit",
    explanation:
      "The price moved too much between when you initiated and when the swap would execute. This typically happens during high volatility.",
    solution: "Wait for lower volatility or increase your slippage tolerance",
  },
  insufficientLiquidity: {
    message: "Not enough liquidity in pool",
    explanation:
      "The trading pool for this pair doesn't have enough funds to handle your trade size. Too much volume through small liquidity.",
    solution: "Try a smaller amount or split into multiple trades",
  },
  tokenNotFound: {
    message: "Token not found",
    explanation: "The token you're trying to trade doesn't exist or isn't supported on Solana.",
    solution: "Double-check the token address or try a different token",
  },
  walletNotConnected: {
    message: "Wallet not connected",
    explanation: "You need to connect your wallet before executing trades.",
    solution: "Click the wallet connect button and approve the connection",
  },
  userRejected: {
    message: "Transaction rejected",
    explanation: "You declined to approve the transaction in your wallet.",
    solution: "No action needed. Your wallet is secure. Try again when ready.",
  },
};

/**
 * Map common error patterns to friendly explanations
 */
export function getQuickExplanation(errorMessage: string): string {
  const lowerMessage = errorMessage.toLowerCase();

  if (
    lowerMessage.includes("insufficient") &&
    lowerMessage.includes("sol")
  ) {
    return "You don't have enough SOL for gas fees. Try depositing more SOL to your wallet.";
  }

  if (lowerMessage.includes("slippage")) {
    return "The price moved too much. Try again when the market is calmer, or increase your slippage tolerance.";
  }

  if (lowerMessage.includes("liquidity")) {
    return "This trading pair doesn't have enough liquidity. Try trading less, or use a different exchange.";
  }

  if (lowerMessage.includes("not found")) {
    return "This token wasn't found. Check the token address and make sure it's on Solana.";
  }

  if (lowerMessage.includes("timeout")) {
    return "The network took too long to respond. Your transaction might still go through. Check your wallet in a moment.";
  }

  if (lowerMessage.includes("rejected")) {
    return "You rejected the transaction in your wallet. No funds were used. Try again when ready.";
  }

  return "Something went wrong. Try again or contact support if the problem persists.";
}
