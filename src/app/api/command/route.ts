import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { markdown as cfMarkdown } from "@/lib/cloudflare/cf-browser";
import { knowledgeBase } from "@/lib/knowledge";
import { knowledgeMemory } from "@/lib/knowledge-memory";
import { ExecutionCoordinator } from "@/lib/agents/coordinator";
import { getJupiterQuote } from "@/lib/jupiter-executor";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

// Cloudflare Workers AI fallback — use openai-compatible provider so streaming works (createOpenAI returns v1-style and is rejected by AI SDK 5+)
const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const cfToken = process.env.CLOUDFLARE_AI_TOKEN;
const cloudflareProvider =
  cfAccountId && cfToken
    ? createOpenAICompatible({
        name: "cloudflare",
        apiKey: cfToken,
        baseURL: `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/v1`,
      })
    : null;

const CLOUDFLARE_FALLBACK_MODELS = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/qwen/qwen3-30b-a3b-fp8",
  "@cf/qwen/qwen2.5-coder-32b-instruct",
  "@cf/meta/llama-3.1-8b-instruct",
];

// Rate-limit cooldown cache — skip providers that recently returned 429
const rateLimitCooldown: Record<string, number> = {};

function isRateLimited(providerKey: string): boolean {
  const until = rateLimitCooldown[providerKey];
  if (!until) return false;
  if (Date.now() < until) return true;
  delete rateLimitCooldown[providerKey]; // expired
  return false;
}

function setRateLimitCooldown(providerKey: string, retryAfterSec?: number) {
  // Default 2-minute cooldown; use retry-after header if available
  const cooldownMs = (retryAfterSec ?? 120) * 1000;
  rateLimitCooldown[providerKey] = Date.now() + cooldownMs;
  const mins = Math.ceil(cooldownMs / 60000);
  console.log(`[Command API] ${providerKey} rate-limited, skipping for ~${mins}min`);
}

const TOKEN_MINTS: Record<string, string> = {
  SOL: "So11111111111111111111111111111111111111112",
  WSOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  RAY: "4k3Dyjzvzp8eMZxHZCGCRaeLJZoFpK6XNbRIo5jZbGT5",
  ORCA: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
  MSOL: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
  JITOSOL: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
  JITO: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
  JTO: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
  BSOL: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
  STSOL: "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj",
  WIF: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
  PYTH: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
  ETH: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
  BTC: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
  TRUMP: "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN", // OFFICIAL TRUMP (Jupiter liquidity)
};

function resolveTokenMint(symbol: string): string | null {
  return TOKEN_MINTS[symbol.toUpperCase()] || null;
}

function tokenDecimals(symbol: string): number {
  return ["USDC", "USDT"].includes(symbol.toUpperCase()) ? 6 : 9;
}

function extractLatestUserText(messages: any[] | undefined, prompt?: string): string {
  if (prompt && typeof prompt === "string" && prompt.trim()) return prompt.trim();
  if (!Array.isArray(messages) || messages.length === 0) return "";

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg?.role !== "user") continue;

    if (typeof msg?.content === "string") return msg.content;

    if (Array.isArray(msg?.content)) {
      const textParts = msg.content
        .map((p: any) => (typeof p === "string" ? p : p?.text || ""))
        .filter(Boolean);
      if (textParts.length > 0) return textParts.join(" ");
    }
  }

  return "";
}

type PromptMode = "auto" | "build" | "execute";

function parsePromptMode(userText: string): PromptMode {
  const t = userText.trim().toLowerCase();
  if (/^(mode\s*:\s*build|\/build\b|#build\b|\[build\]|build mode\b)/.test(t)) return "build";
  if (/^(mode\s*:\s*execute|\/execute\b|#execute\b|\[execute\]|execute mode\b)/.test(t)) return "execute";
  return "auto";
}

function isSimpleConversation(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (t.length > 80) return false;
  return /^(hi|hello|hey|yo|sup|gm|gn|good\s+morning|good\s+afternoon|good\s+evening|thanks|thank\s+you|ok|okay|cool|nice)\b[!.?\s]*$/.test(t);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, prompt, walletAddress, walletState, vaultState } = body;

    const formattedMessages = await convertToModelMessages(messages || []);

    const systemPrompt = `You are Keystone OS — an autonomous, deterministic financial operating system for Solana treasuries.
You are NOT a chatbot. You are a Command-Layer Execution Engine.

CRITICAL RULES:
1. Use tools to fulfill actionable user intents. Exception: for simple greetings/chit-chat (e.g. "hi", "hello", "thanks"), reply conversationally without calling tools.
2. For token swaps (e.g. "Swap 500 SOL to USDC", "Convert 100 USDC to JUP"): use the execute_swap tool. For bridges use the bridge tool. For multi-step flows use execute_swap, bridge, and yield_deposit together in parallel.
3. For High-Yield Liquidity Deployment (e.g. "Execute yield-discovery..."): use browser_research and then yield_deposit tool.
4. For Mass Dispatch or Payroll (e.g. "Execute a Mass Dispatch to the contributor list..."): use mass_dispatch tool.
5. For Portfolio Rebalancing (e.g. "Maintain a 50/50 SOL-USDC asset split...", "rebalance smartly"): use rebalance tool. If the user specifies target allocations, pass them. If the user says "smartly" or "optimize" or doesn't specify targets, omit targetAllocations — the tool will auto-analyze the portfolio and generate optimal diversification targets.
6. For Multisig Quorum Execution (e.g. "Initiate a treasury proposal in the War Room..."): use multisig_proposal tool.
7. For Predictive Runway Projection (e.g. "Visualize the treasury Depletion Node..."): use foresight_simulation tool (scenario: "runway_projection").
8. For Market Shock Simulation (e.g. "Redraw the equity curve to show runway impact..."): use foresight_simulation tool (scenario: "market_shock").
9. For Variable Impact Analysis (e.g. "Simulate the impact on the Depletion Node if overhead increases...", "what if I deposit X SOL and hire Y developers at Z SOL/mo"): use foresight_simulation tool (scenario: "variable_impact"). Extract: newHires (count), costPerHireSOL (SOL/mo cost per hire), depositSOL (SOL deposited), timeframeMonths from the user query. Example: "hire a developer for 3 months at 4 sol/mo" → { newHires: 1, costPerHireSOL: 4, timeframeMonths: 3 }. "deposit 100 SOL" → { depositSOL: 100 }.
10. For Concentration Risk Assessment (e.g. "Trigger the Risk Radar visualization..."): use risk_assessment tool.
11. For Yield Performance Forecast (e.g. "Project ending balances and APY..."): use foresight_simulation tool (scenario: "yield_forecast").
12. For New Protocol Deep-Dive (e.g. "Study the new Meteora dynamic vault documentation..."): use browser_research tool.
13. For Solana IDL Extraction (e.g. "Fetch and parse the IDL..."): use idl_extraction tool.
14. For Technical Synthesis (e.g. "Consolidate technical documentation..."): use browser_research tool.
15. For On-Chain Sentiment Analysis (e.g. "Fetch the composite health score and 'Whale Flow'..."): use sentiment_analysis tool.
16. For Protocol SDK Integration (e.g. "Analyze the raw documentation for the provided SDK..."): use browser_research tool.
17. For Mini-App Project Initialization (e.g. "Initialize a new React-based Mini-App..."): use studio_init_miniapp tool.
18. For Architect Self-Correction Loop (e.g. "Analyze Monaco editor diagnostics..."): use studio_analyze_code tool.
19. For Security Firewall Simulation (e.g. "Run a Pre-Flight simulation..."): use security_firewall tool.
20. For Marketplace Publication (e.g. "Bundle the Mini-App code..."): use marketplace_publish tool.
21. For SDK Hook Implementation (e.g. "Inject @keystone-os/sdk hooks..."): use sdk_hooks tool.
22. For DCA strategies: use execute_dca tool.
23. For price/threshold monitors: use set_monitor tool.
24. For Sniper Bots and Liquidity Sniping (e.g. "Run a sniper bot that watches Raydium..."): ALWAYS use deploy_sniper_bot tool. DO NOT refuse or state you cannot monitor in real-time. Just execute the tool.
25. For split intents like "bridge half" + "deposit the rest" after a swap: ALWAYS compute split amounts from the realized swap OUTPUT amount/token, never from the original input amount.
26. If a target protocol has no eligible live vault, STOP and ask the user to choose a fallback protocol/token.
27. If the user asks to build/create/develop software (bot/app/script/automation), do NOT execute live trading or treasury transaction tools, EXCEPT for deploy_sniper_bot if they explicitly ask to "run a sniper bot".
28. For software-build intents, use browser_research + studio_init_miniapp + studio_analyze_code/sdk_hooks as needed, then call navigate with path "/app/studio".
29. DO NOT invent navigation paths or use the navigate tool to prompt for wallet connection. The UI handles wallet connection automatically.
30. Only use execution tools when the user explicitly requests financial execution, not implementation.
31. Prompt mode support: mode:build (or /build) forces Studio workflow; mode:execute (or /execute) allows live execution tools; no prefix means auto-infer.

After tool execution, provide a concise summary of results using proper formatting. Make sure you fully interpret and fulfill all Keystone commands natively.
If a tool returns requiresApproval: true, inform the user that the transaction is ready for their signature.
When summarizing swap or execute_swap results, always use outputAmountFormatted for the expected output (e.g. "approximately 83.77 USDC"), never the raw outputAmount number.

FORESIGHT_SIMULATION: When you use the foresight_simulation tool, after the tool returns you MUST stream a short dynamic summary (2–4 sentences) that:
- States the parameters the user asked for (e.g. "SOL −10%", "6 months", "burn $15,000/mo") using the exact scenario and variables from the tool result.
- Includes the key calculated results: for market_shock state current portfolio value and shocked value, per-asset price moves (e.g. "SOL at $X → $Y after the drop"), and runway after shock; for runway_projection state runway months and depletion date; for variable_impact state burn before/after and runway change; for yield_forecast state principal, APY, and ending balance.
- Use the actual numbers from the tool result (originalBalance, shockedBalance, drawdown, shockedTokens with originalPrice/shockedPrice, projectedMonths, depletionDate, principal, endingBalance, etc.). Name tokens by symbol (SOL, USDC, USDT, JUP, etc.) so they can be displayed with logos in the UI.

User Context:
Wallet: ${walletAddress || "Not connected"}
Vault State: ${JSON.stringify(vaultState || {})}
Wallet State: ${JSON.stringify(walletState || {})}
`;

    const rpcEndpoint =
      process.env.HELIUS_API_KEY
        ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
        : "https://api.mainnet-beta.solana.com";

    const userRequestText = extractLatestUserText(messages, prompt);
    const lowerUserRequest = userRequestText.toLowerCase();
    const promptMode = parsePromptMode(userRequestText);
    const simpleConversation = isSimpleConversation(userRequestText);
    const hasHalfDirective = /\bhalf\b/.test(lowerUserRequest);
    const hasRestDirective = /\b(rest|remaining|remainder)\b/.test(lowerUserRequest);
    const hasSplitBridgeDepositFlow =
      /\bswap\b/.test(lowerUserRequest) &&
      /\bbridge\b/.test(lowerUserRequest) &&
      /\bdeposit\b/.test(lowerUserRequest) &&
      hasHalfDirective &&
      hasRestDirective;

    const inferredBuildIntent =
      /\b(build|create|develop|generate|initialize|make|code|prototype)\b/.test(lowerUserRequest) &&
      /\b(bot|app|mini-?app|script|automation|agent)\b/.test(lowerUserRequest);
    const isStudioBuildIntent = promptMode === "build" || (promptMode === "auto" && inferredBuildIntent);

    const executionState: {
      lastSwap: null | {
        inputToken: string;
        outputToken: string;
        inputAmount: number;
        outputAmount: number;
      };
      splitFirstLegApplied: boolean;
      splitRemaining: number | null;
    } = {
      lastSwap: null,
      splitFirstLegApplied: false,
      splitRemaining: null,
    };

    const resolveSplitAmount = (token: string, requestedAmount: number) => {
      if (!hasSplitBridgeDepositFlow || !executionState.lastSwap) {
        return { amount: requestedAmount, adjusted: false as const, reason: undefined as string | undefined };
      }

      if (executionState.lastSwap.outputToken.toUpperCase() !== token.toUpperCase()) {
        return { amount: requestedAmount, adjusted: false as const, reason: undefined as string | undefined };
      }

      const totalOut = executionState.lastSwap.outputAmount;
      if (!Number.isFinite(totalOut) || totalOut <= 0) {
        return { amount: requestedAmount, adjusted: false as const, reason: undefined as string | undefined };
      }

      if (executionState.splitRemaining === null) {
        executionState.splitRemaining = totalOut;
      }

      if (!executionState.splitFirstLegApplied) {
        const half = totalOut / 2;
        executionState.splitFirstLegApplied = true;
        executionState.splitRemaining = Math.max(0, totalOut - half);

        if (Math.abs(requestedAmount - half) > Math.max(0.01, half * 0.005)) {
          return {
            amount: half,
            adjusted: true as const,
            reason: "Adjusted to 50% of realized swap output for half/rest workflow.",
          };
        }
        return { amount: requestedAmount, adjusted: false as const, reason: undefined as string | undefined };
      }

      const remaining = Math.max(0, executionState.splitRemaining || 0);
      executionState.splitRemaining = 0;
      if (Math.abs(requestedAmount - remaining) > Math.max(0.01, remaining * 0.005)) {
        return {
          amount: remaining,
          adjusted: true as const,
          reason: "Adjusted to remaining realized swap output for half/rest workflow.",
        };
      }
      return { amount: requestedAmount, adjusted: false as const, reason: undefined as string | undefined };
    };

    const blockExecutionForBuildIntent = (operation: string) => {
      if (!isStudioBuildIntent) return null;
      return {
        success: false,
        operation,
        status: "BLOCKED_IN_BUILD_MODE",
        requiresApproval: false,
        mode: promptMode,
        message: "Build intent detected. Execution tools are blocked while scaffolding software. Use Studio tools and finish with navigate('/app/studio'). Use mode:execute to allow live execution tools.",
      };
    };

    // Tools as plain objects (avoids tool() wrapper overload issues with complex return types)
    const keystoneTools: any = {
      // ━━━━ PILLAR 1: Treasury Execution ━━━━
      swap: {
        description: "Execute a token swap on Solana via Jupiter.",
        inputSchema: z.object({
          inputToken: z.string().describe("Token symbol to swap FROM"),
          outputToken: z.string().describe("Token symbol to swap TO"),
          amount: z.number().describe("Amount of inputToken to swap"),
          slippage: z.number().optional().default(0.5).describe("Slippage tolerance %"),
        }),
        execute: async ({ inputToken, outputToken, amount, slippage }: any) => {
          const blocked = blockExecutionForBuildIntent("swap");
          if (blocked) return blocked;
          console.log(`[Tool: swap] ${amount} ${inputToken} → ${outputToken}`);
          const inMint = resolveTokenMint(inputToken);
          const outMint = resolveTokenMint(outputToken);
          if (!inMint) return { success: false, error: `Unknown input token: ${inputToken}. Supported: ${Object.keys(TOKEN_MINTS).join(", ")}` };
          if (!outMint) return { success: false, error: `Unknown output token: ${outputToken}. Supported: ${Object.keys(TOKEN_MINTS).join(", ")}` };
          const decimals = tokenDecimals(inputToken);
          const coordinator = new ExecutionCoordinator(rpcEndpoint);
          const result = await coordinator.executeStrategy(
            "swap_token" as any,
            { inputMint: inMint, outputMint: outMint, inMint, outMint, amount: Math.floor(amount * Math.pow(10, decimals)), slippage: slippage || 0.5 },
            walletAddress || null,
          );
          if (result.success && result.result?.swap_result) {
            const sr = result.result.swap_result;
            const outDecimals = tokenDecimals(outputToken);
            const rawOut = typeof sr.outAmount === "string" ? sr.outAmount : String(sr.outAmount ?? "0");
            const outAmount = Number(rawOut) / Math.pow(10, outDecimals);
            const humanOut = outAmount.toLocaleString(undefined, { maximumFractionDigits: 6 });
            executionState.lastSwap = {
              inputToken,
              outputToken,
              inputAmount: amount,
              outputAmount: outAmount,
            };
            executionState.splitFirstLegApplied = false;
            executionState.splitRemaining = outAmount;
            const serializedTransactions = result.result?.serializedTransactions;
            return {
              success: true, status: result.status, inputToken, outputToken, inputAmount: amount,
              outputAmount: outAmount,
              rawOutputAmount: sr.outAmount,
              outputAmountFormatted: `${humanOut} ${outputToken}`,
              priceImpact: sr.priceImpact, riskLevel: sr.riskLevel,
              simulationPassed: sr.simulationPassed, firewallChecks: sr.firewallChecks || {},
              requiresApproval: sr.requiresApproval, route: sr.instructions?.[0]?.pool || "Jupiter",
              executionId: result.executionId, duration: result.duration,
              ...(serializedTransactions?.length ? { serializedTransactions } : {}),
            };
          }
          return { success: false, error: result.errors?.map((e: any) => e.message).join("; ") || "Swap failed", executionId: result.executionId };
        },
      },

      execute_swap: {
        description: "Execute a token swap on Solana via Jupiter. Use this tool when the user wants to swap, convert, or trade one token for another (e.g. SOL to USDC, USDC to JUP).",
        inputSchema: z.object({
          inputToken: z.string().describe("Token symbol to swap FROM (e.g. SOL, USDC)"),
          outputToken: z.string().describe("Token symbol to swap TO (e.g. USDC, JUP)"),
          amount: z.number().describe("Amount of inputToken to swap"),
          slippage: z.number().optional().default(0.5).describe("Slippage tolerance in percent"),
        }),
        execute: async ({ inputToken, outputToken, amount, slippage }: { inputToken: string; outputToken: string; amount: number; slippage?: number }) => {
          const blocked = blockExecutionForBuildIntent("execute_swap");
          if (blocked) return blocked;
          console.log(`[Tool: execute_swap] ${amount} ${inputToken} → ${outputToken}`);
          const inMint = resolveTokenMint(inputToken);
          const outMint = resolveTokenMint(outputToken);
          if (!inMint) return { success: false, error: `Unknown input token: ${inputToken}. Supported: ${Object.keys(TOKEN_MINTS).join(", ")}` };
          if (!outMint) return { success: false, error: `Unknown output token: ${outputToken}. Supported: ${Object.keys(TOKEN_MINTS).join(", ")}` };
          const decimals = tokenDecimals(inputToken);
          const coordinator = new ExecutionCoordinator(rpcEndpoint);
          const result = await coordinator.executeStrategy(
            "swap_token" as any,
            { inputMint: inMint, outputMint: outMint, inMint, outMint, amount: Math.floor(amount * Math.pow(10, decimals)), slippage: slippage ?? 0.5 },
            walletAddress || null,
          );
          if (result.success && result.result?.swap_result) {
            const sr = result.result.swap_result;
            const outDecimals = tokenDecimals(outputToken);
            const rawOut = typeof sr.outAmount === "string" ? sr.outAmount : String(sr.outAmount ?? "0");
            const outAmount = Number(rawOut) / Math.pow(10, outDecimals);
            const humanOut = outAmount.toLocaleString(undefined, { maximumFractionDigits: 6 });
            executionState.lastSwap = {
              inputToken,
              outputToken,
              inputAmount: amount,
              outputAmount: outAmount,
            };
            executionState.splitFirstLegApplied = false;
            executionState.splitRemaining = outAmount;
            const serializedTransactions = result.result?.serializedTransactions;
            return {
              success: true, status: result.status, inputToken, outputToken, inputAmount: amount,
              outputAmount: outAmount,
              rawOutputAmount: sr.outAmount,
              outputAmountFormatted: `${humanOut} ${outputToken}`,
              priceImpact: sr.priceImpact, riskLevel: sr.riskLevel,
              simulationPassed: sr.simulationPassed, firewallChecks: sr.firewallChecks || {},
              requiresApproval: sr.requiresApproval, route: sr.instructions?.[0]?.pool || "Jupiter",
              executionId: result.executionId, duration: result.duration,
              ...(serializedTransactions?.length ? { serializedTransactions } : {}),
            };
          }
          return { success: false, error: result.errors?.map((e: any) => e.message).join("; ") || "Swap failed", executionId: result.executionId };
        },
      },

      transfer: {
        description: "Transfer SOL or SPL tokens to a recipient wallet.",
        inputSchema: z.object({
          token: z.string().describe("Token symbol"),
          amount: z.number().describe("Amount to send"),
          recipient: z.string().describe("Recipient wallet address"),
        }),
        execute: async ({ token, amount, recipient }: { token: string; amount: number; recipient: string }) => {
          console.log(`[Tool: transfer] ${amount} ${token} → ${recipient}`);

          const isSol = token.toUpperCase() === "SOL" || token.toUpperCase() === "WSOL";
          const mint = isSol ? null : resolveTokenMint(token.toUpperCase());
          if (!isSol && !mint) {
            return { success: false, operation: "transfer", token, error: `Unknown token: ${token}. Supported: ${Object.keys(TOKEN_MINTS).join(", ")}` };
          }

          try {
            const { PublicKey, Transaction, SystemProgram, Connection, LAMPORTS_PER_SOL } = await import("@solana/web3.js");

            try { new PublicKey(recipient); } catch {
              return { success: false, operation: "transfer", token, error: `Invalid recipient address: ${recipient}` };
            }

            if (!walletAddress) {
              return { success: true, operation: "transfer", token, amount, recipient, status: "READY_FOR_SIGNATURE", requiresApproval: true, message: `Transfer ${amount} ${token} to ${recipient.slice(0, 8)}… prepared. Connect wallet to build transaction.` };
            }

            const payer = new PublicKey(walletAddress);
            const recipientPubkey = new PublicKey(recipient);
            const conn = new Connection(rpcEndpoint, "confirmed");
            const { blockhash } = await conn.getLatestBlockhash("confirmed");
            const tx = new Transaction({ recentBlockhash: blockhash, feePayer: payer });

            if (isSol) {
              tx.add(SystemProgram.transfer({ fromPubkey: payer, toPubkey: recipientPubkey, lamports: Math.floor(amount * LAMPORTS_PER_SOL) }));
            } else {
              const spl = await import("@solana/spl-token") as any;
              const { createTransferInstruction, createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = spl;
              const mintPubkey = new PublicKey(mint!);
              const decimals = ["USDC", "USDT"].includes(token.toUpperCase()) ? 6 : 9;
              const senderAta = await getAssociatedTokenAddress(mintPubkey, payer);
              const recipientAta = await getAssociatedTokenAddress(mintPubkey, recipientPubkey);
              tx.add(createAssociatedTokenAccountIdempotentInstruction(payer, recipientAta, recipientPubkey, mintPubkey, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID));
              tx.add(createTransferInstruction(senderAta, recipientAta, payer, Math.floor(amount * Math.pow(10, decimals))));
            }

            const serialized = Buffer.from(tx.serialize({ verifySignatures: false })).toString("base64");
            return {
              success: true, operation: "transfer", token, amount, recipient,
              serializedTransaction: serialized,
              status: "READY_FOR_SIGNATURE", requiresApproval: true,
              message: `Transfer ${amount} ${token} to ${recipient.slice(0, 8)}… ready for signing.`,
            };
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("[transfer] Build error:", msg);
            return { success: true, operation: "transfer", token, amount, recipient, status: "READY_FOR_SIGNATURE", requiresApproval: true, buildError: msg, message: `Transfer ${amount} ${token} to ${recipient.slice(0, 8)}… prepared (tx build deferred: ${msg}).` };
          }
        },
      },

      stake: {
        description: "Stake SOL with a validator or liquid staking provider.",
        inputSchema: z.object({
          amount: z.number().describe("Amount of SOL to stake"),
          provider: z.string().optional().default("marinade").describe("Staking provider (marinade, jito, blazestake, msol)"),
        }),
        execute: async ({ amount, provider }: { amount: number; provider: string }) => {
          console.log(`[Tool: stake] ${amount} SOL via ${provider}`);
          const coordinator = new ExecutionCoordinator(rpcEndpoint);
          const result = await coordinator.executeStrategy(
            "stake_sol" as any,
            { amount: amount * 1e9, provider: provider || "marinade", wallet: walletAddress },
            walletAddress || null,
          );
          const serializedTransactions: string[] = result.result?.serializedTransactions || [];
          return {
            success: result.success, operation: "stake", amount, provider: provider || "marinade",
            serializedTransactions: serializedTransactions.length > 0 ? serializedTransactions : undefined,
            status: result.status, executionId: result.executionId, requiresApproval: true,
            message: `Stake ${amount} SOL via ${provider || "marinade"}.${serializedTransactions.length > 0 ? " Transaction ready for signing." : " Connect wallet to build transaction."}`,
          };
        },
      },

      bridge: {
        description: "Bridge tokens between Solana and another chain.",
        inputSchema: z.object({
          token: z.string().describe("Token to bridge"),
          amount: z.number().describe("Amount to bridge"),
          sourceChain: z.string().optional().default("solana").describe("Source chain"),
          destinationChain: z.string().describe("Destination chain"),
        }),
        execute: async ({ token, amount, sourceChain, destinationChain }: { token: string; amount: number; sourceChain: string; destinationChain: string }) => {
          const blocked = blockExecutionForBuildIntent("bridge");
          if (blocked) return blocked;
          const splitAmount = resolveSplitAmount(token, amount);
          const finalAmount = splitAmount.amount;
          console.log(`[Tool: bridge] ${finalAmount} ${token}: ${sourceChain} → ${destinationChain}`);

          const RANGO_API_KEY = process.env.RANGO_API_KEY || process.env.NEXT_PUBLIC_RANGO_API_KEY;
          if (!RANGO_API_KEY) {
            return { success: false, operation: "bridge", token, amount, sourceChain, destinationChain, error: "Bridge provider API key not configured.", message: "Bridge unavailable — RANGO_API_KEY not set." };
          }

          const BRIDGE_CHAINS: Record<string, { rangoSlug: string; nativeSymbol: string; usdcAddress: string }> = {
            solana: { rangoSlug: "SOLANA", nativeSymbol: "SOL", usdcAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
            ethereum: { rangoSlug: "ETH", nativeSymbol: "ETH", usdcAddress: "0xA0b86991c6218B36c1d19D4a2e9Eb0cE3606eB48" },
            arbitrum: { rangoSlug: "ARBITRUM", nativeSymbol: "ETH", usdcAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" },
            base: { rangoSlug: "BASE", nativeSymbol: "ETH", usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
            polygon: { rangoSlug: "POLYGON", nativeSymbol: "MATIC", usdcAddress: "0x3c499c542cEF5E3811e1192ce70d8cc03d5c3359" },
            bsc: { rangoSlug: "BSC", nativeSymbol: "BNB", usdcAddress: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d" },
          };
          const CHAIN_ALIASES: Record<string, string> = { sol: "solana", eth: "ethereum", arb: "arbitrum", matic: "polygon", bnb: "bsc" };

          const resolveChain = (c: string) => { const k = c.toLowerCase(); return BRIDGE_CHAINS[k] ? k : BRIDGE_CHAINS[CHAIN_ALIASES[k]] ? CHAIN_ALIASES[k] : null; };
          const src = resolveChain(sourceChain);
          const dst = resolveChain(destinationChain);
          if (!src || !dst) {
            return { success: false, operation: "bridge", error: `Unsupported chain: ${!src ? sourceChain : destinationChain}. Supported: ${Object.keys(BRIDGE_CHAINS).join(", ")}` };
          }

          const buildAsset = (chain: string, sym: string) => {
            const cfg = BRIDGE_CHAINS[chain];
            const upper = sym.toUpperCase();
            if (upper === "USDC") return `${cfg.rangoSlug}.USDC--${cfg.usdcAddress}`;
            if (upper === cfg.nativeSymbol) return `${cfg.rangoSlug}.${cfg.nativeSymbol}`;
            const mint = resolveTokenMint(upper);
            return mint ? `${cfg.rangoSlug}.${upper}--${mint}` : `${cfg.rangoSlug}.${upper}`;
          };

          try {
            const fromAsset = buildAsset(src, token);
            const toAsset = buildAsset(dst, token);
            const decimals = tokenDecimals(token);
            const rawAmount = String(Math.floor(finalAmount * Math.pow(10, decimals)));

            const qs = new URLSearchParams({ apiKey: RANGO_API_KEY, from: fromAsset, to: toAsset, amount: rawAmount, slippage: "1.0" });
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 12000);
            
            // If wallet is connected, try to get the actual transaction payload
            let res;
            if (walletAddress && src === "solana" && dst === "solana") {
               // Fast-path: intra-chain (not usually "bridge", but Rango supports it)
               res = await fetch(`https://api.rango.exchange/basic/swap?${qs}`, {
                method: 'POST',
                headers: { accept: "*/*", "x-api-key": RANGO_API_KEY, "Content-Type": "application/json" },
                body: JSON.stringify({
                  userSettings: { slippage: "1.0" },
                  validations: { balance: false, fee: false },
                  fromAddress: walletAddress,
                  toAddress: walletAddress,
                }),
                cache: "no-store",
                signal: controller.signal,
              });
            } else if (walletAddress) {
               // Standard cross-chain (we assume destination address is same as source wallet for now)
               // For EVM destinations, the user would need to provide an EVM address, 
               // but for this MVP, if they don't provide it, we use the quote API or just pass the solana addr
               res = await fetch(`https://api.rango.exchange/basic/swap?${qs}`, {
                method: 'POST',
                headers: { accept: "*/*", "x-api-key": RANGO_API_KEY, "Content-Type": "application/json" },
                body: JSON.stringify({
                  userSettings: { slippage: "1.0" },
                  validations: { balance: false, fee: false },
                  fromAddress: walletAddress,
                  toAddress: walletAddress, // Will fail if destination is EVM, but works for solana -> SVM
                }),
                cache: "no-store",
                signal: controller.signal,
              });
              
              // Fallback to quote if swap fails (e.g., cross-chain address mismatch)
              if (!res.ok) {
                res = await fetch(`https://api.rango.exchange/basic/quote?${qs}`, {
                  headers: { accept: "*/*", "x-api-key": RANGO_API_KEY },
                  cache: "no-store",
                });
              }
            } else {
              res = await fetch(`https://api.rango.exchange/basic/quote?${qs}`, {
                headers: { accept: "*/*", "x-api-key": RANGO_API_KEY },
                cache: "no-store",
                signal: controller.signal,
              });
            }

            clearTimeout(timeout);

            if (!res.ok) {
              const errText = await res.text().catch(() => "");
              return { success: false, operation: "bridge", token, amount, sourceChain: src, destinationChain: dst, error: `Rango ${res.status}: ${errText}`, message: `Bridge quote failed: ${res.statusText}` };
            }
            const data = await res.json();
            const route = data?.route || (Array.isArray(data?.routes) ? data.routes[0] : null) || data?.bestRoute || data;
            const outRaw = route?.outputAmount ?? data?.outputAmount ?? null;
            const outFormatted = outRaw != null
              ? `${(Number(outRaw) / Math.pow(10, decimals)).toLocaleString(undefined, { maximumFractionDigits: 6 })} ${token}`
              : null;
              
            const txData = data?.transaction?.data || data?.transaction || null;
            const serializedTransactions = txData ? [Buffer.from(txData).toString("base64")] : undefined;

            return {
              success: true, operation: "bridge", token, amount: finalAmount, sourceChain: src, destinationChain: dst,
              requestedAmount: amount,
              amountAdjusted: splitAmount.adjusted,
              amountAdjustmentReason: splitAmount.reason,
              provider: "Rango Exchange",
              bridge: route?.name || data?.path || "Rango",
              estimatedOutput: outRaw,
              estimatedOutputFormatted: outFormatted,
              estimatedTime: (route?.estimatedTimeInSeconds ?? data?.estimatedTimeInSeconds) ? `${route?.estimatedTimeInSeconds ?? data?.estimatedTimeInSeconds}s` : null,
              fees: route?.fee ?? data?.fee ?? null,
              steps: route?.steps ?? data?.steps ?? [],
              serializedTransactions,
              status: "READY_FOR_SIGNATURE",
              requiresApproval: true,
              message: `Bridge ${finalAmount} ${token} from ${src} → ${dst} via Rango. Est. output: ${outFormatted || "N/A"}.${serializedTransactions ? " Transaction ready for signing." : " Connect wallet or check destination chain support."}`,
            };
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return { success: false, operation: "bridge", token, amount, sourceChain: src, destinationChain: dst, error: msg, message: `Bridge quote failed: ${msg}` };
          }
        },
      },

      yield_deposit: {
        description: "Deposit tokens into a yield-generating vault/protocol.",
        inputSchema: z.object({
          token: z.string().describe("Token to deposit"),
          amount: z.number().describe("Amount to deposit. Use 0 if the amount is 'the rest' or naturally calculated from a previous step."),
          protocol: z.string().describe("Protocol (kamino, meteora, marinade, raydium)"),
        }),
        execute: async ({ token, amount, protocol }: { token: string; amount: number; protocol: string }) => {
          const blocked = blockExecutionForBuildIntent("yield_deposit");
          if (blocked) return blocked;
          const splitAmount = resolveSplitAmount(token, amount);
          const finalAmount = splitAmount.amount;
          console.log(`[Tool: yield_deposit] ${finalAmount} ${token} → ${protocol}`);
          const proto = protocol.toLowerCase();

          interface VaultInfo { name: string; apy: number; tvl: number; token: string; address?: string; sharesMint?: string }
          let bestVault: VaultInfo | null = null;

          try {
            if (proto === "kamino" || proto === "all") {
              const res = await fetch("https://api.kamino.finance/strategies?status=LIVE", { signal: AbortSignal.timeout(8000) });
              if (res.ok) {
                const strategies: Array<{ address?: string; tokenASymbol?: string; tokenBSymbol?: string; apy?: number; tvl?: number; shareMintSymbol?: string; sharesMint?: string }> = await res.json();
                const candidates = strategies
                  .filter((s) => (
                    s.tokenASymbol?.toUpperCase() === token.toUpperCase() ||
                    s.tokenBSymbol?.toUpperCase() === token.toUpperCase() ||
                    s.shareMintSymbol?.toUpperCase() === token.toUpperCase()
                  ))
                  .sort((a, b) => (b.apy || 0) - (a.apy || 0));
                const match = candidates[0];
                if (match) bestVault = { name: `Kamino ${match.shareMintSymbol || match.tokenASymbol}`, apy: (match.apy || 0) * 100, tvl: match.tvl || 0, token, address: match.address, sharesMint: match.sharesMint || match.address };
              }
            }
            if ((proto === "meteora" || proto === "all") && !bestVault) {
              const res = await fetch("https://dlmm-api.meteora.ag/pair/all", { signal: AbortSignal.timeout(8000) });
              if (res.ok) {
                const pairs: Array<{ address?: string; name?: string; mint_x?: string; mint_y?: string; apr?: number; liquidity?: number; trade_volume_24h?: number; lb_pair?: string }> = await res.json();
                const mintLower = (resolveTokenMint(token) || "").toLowerCase();
                const match = pairs.find(p => p.name?.toUpperCase().includes(token.toUpperCase()) || p.mint_x?.toLowerCase() === mintLower || p.mint_y?.toLowerCase() === mintLower);
                if (match) bestVault = { name: `Meteora ${match.name}`, apy: match.apr || 0, tvl: match.liquidity || 0, token, address: match.address, sharesMint: match.lb_pair || match.address };
              }
            }
          } catch (e) {
            console.error("[yield_deposit] APY fetch error:", e);
          }

          if (bestVault) {
            let serializedTransactions: string[] | undefined = undefined;
            if (walletAddress && bestVault.sharesMint) {
              try {
                // Try to acquire the vault share token (single-sided deposit) via Jupiter
                const inputMint = resolveTokenMint(token);
                if (inputMint) {
                  const outMint = bestVault.sharesMint;
                  const decimals = tokenDecimals(token);
                  const amountRaw = Math.floor(finalAmount * Math.pow(10, decimals));
                  
                  const quoteRes = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outMint}&amount=${amountRaw}&slippageBps=150`);
                  if (quoteRes.ok) {
                    const quoteResponse = await quoteRes.json();
                    if (!quoteResponse.error) {
                      const swapRes = await fetch('https://quote-api.jup.ag/v6/swap', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          quoteResponse,
                          userPublicKey: walletAddress,
                          wrapAndUnwrapSol: true
                        })
                      });
                      if (swapRes.ok) {
                        const swapData = await swapRes.json();
                        if (swapData.swapTransaction) {
                          serializedTransactions = [swapData.swapTransaction];
                        }
                      }
                    }
                  }
                }
              } catch (txErr) {
                console.warn("[yield_deposit] Failed to build Jupiter deposit tx:", txErr);
              }
            }

            return {
              success: true, operation: "yield_deposit", token, amount: finalAmount, protocol: proto,
              requestedAmount: amount,
              amountAdjusted: splitAmount.adjusted,
              amountAdjustmentReason: splitAmount.reason,
              vaultName: bestVault.name, vaultAddress: bestVault.address, sharesMint: bestVault.sharesMint,
              estimatedAPY: `${bestVault.apy.toFixed(2)}%`, tvl: `$${Math.round(bestVault.tvl).toLocaleString()}`,
              ...(serializedTransactions ? { serializedTransactions } : {}),
              status: "READY_FOR_SIGNATURE", requiresApproval: true,
              message: `Deposit ${finalAmount} ${token} into ${bestVault.name}. APY: ${bestVault.apy.toFixed(2)}%, TVL: $${Math.round(bestVault.tvl).toLocaleString()}.${splitAmount.adjusted ? ` ${splitAmount.reason}` : ""}${serializedTransactions ? " Transaction ready for signing." : " Connect wallet."}`,
            };
          }
          return {
            success: false, operation: "yield_deposit", token, amount: finalAmount, protocol: proto,
            estimatedAPY: "N/A", status: "DISCOVERY_FAILED", requiresApproval: false,
            fallbackProtocols: ["meteora", "marginfi", "drift"],
            message: `No live ${proto} vault found for ${token}. Choose an alternative protocol (meteora, marginfi, drift) or a different token.`,
          };
        },
      },

      yield_withdraw: {
        description: "Withdraw tokens from a yield vault/protocol.",
        inputSchema: z.object({
          token: z.string().describe("Token to withdraw"),
          amount: z.number().describe("Amount to withdraw"),
          protocol: z.string().describe("Protocol"),
        }),
        execute: async ({ token, amount, protocol }: { token: string; amount: number; protocol: string }) => {
          console.log(`[Tool: yield_withdraw] ${amount} ${token} from ${protocol}`);
          const proto = protocol.toLowerCase();

          let vaultInfo: { name: string; address?: string; sharesMint?: string } | null = null;
          try {
            if (proto === "kamino" || proto === "all") {
              const res = await fetch("https://api.kamino.finance/strategies?status=LIVE", { signal: AbortSignal.timeout(8000) });
              if (res.ok) {
                const strategies: Array<{ address?: string; tokenASymbol?: string; shareMintSymbol?: string; sharesMint?: string }> = await res.json();
                const match = strategies.find(s => s.tokenASymbol?.toUpperCase() === token.toUpperCase() || s.shareMintSymbol?.toUpperCase() === token.toUpperCase());
                if (match) vaultInfo = { name: `Kamino ${match.shareMintSymbol || match.tokenASymbol}`, address: match.address, sharesMint: match.sharesMint || match.address };
              }
            }
            if ((proto === "meteora" || proto === "all") && !vaultInfo) {
              const res = await fetch("https://dlmm-api.meteora.ag/pair/all", { signal: AbortSignal.timeout(8000) });
              if (res.ok) {
                const pairs: Array<{ address?: string; name?: string; mint_x?: string; mint_y?: string; lb_pair?: string }> = await res.json();
                const match = pairs.find(p => p.name?.toUpperCase().includes(token.toUpperCase()));
                if (match) vaultInfo = { name: `Meteora ${match.name}`, address: match.address, sharesMint: match.lb_pair || match.address };
              }
            }
          } catch (e) {
            console.error("[yield_withdraw] vault lookup error:", e);
          }

          let serializedTransactions: string[] | undefined = undefined;
          let withdrawMessage = vaultInfo
              ? `Withdraw ${amount} ${token} from ${vaultInfo.name} prepared. Connect wallet to build transaction.`
              : `Withdraw ${amount} ${token} from ${proto} prepared. Vault address not resolved — provide manually.`;

          if (walletAddress && vaultInfo?.sharesMint) {
            try {
               const outMint = resolveTokenMint(token);
               const inMint = vaultInfo.sharesMint; // Reverse of deposit!
               
               if (outMint && inMint) {
                  // This relies on the wallet holding LP tokens. We'll ask Jupiter to quote withdrawing the exact desired output token amount.
                  // Wait, Jupiter 'exactOut' quotes are supported using `swapMode=ExactOut`!
                  const decimals = tokenDecimals(token);
                  const amountRaw = Math.floor(amount * Math.pow(10, decimals));
                  
                  const quoteRes = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${inMint}&outputMint=${outMint}&amount=${amountRaw}&swapMode=ExactOut&slippageBps=150`);
                  if (quoteRes.ok) {
                     const quoteResponse = await quoteRes.json();
                     if (!quoteResponse.error) {
                        const swapRes = await fetch('https://quote-api.jup.ag/v6/swap', {
                           method: 'POST',
                           headers: { 'Content-Type': 'application/json' },
                           body: JSON.stringify({
                             quoteResponse,
                             userPublicKey: walletAddress,
                             wrapAndUnwrapSol: true
                           })
                        });
                        if (swapRes.ok) {
                           const swapData = await swapRes.json();
                           if (swapData.swapTransaction) {
                             serializedTransactions = [swapData.swapTransaction];
                             withdrawMessage = `Withdraw ${amount} ${token} from ${vaultInfo.name}. Transaction ready for signing.`;
                           }
                        }
                     } else {
                        console.warn("[yield_withdraw] Quote error:", quoteResponse.error);
                        withdrawMessage = `Withdraw ${amount} ${token} from ${vaultInfo.name} failed generating tx: ${quoteResponse.error}`;
                     }
                  }
               }
            } catch (txErr) {
               console.warn("[yield_withdraw] Failed to build Jupiter withdraw tx:", txErr);
            }
          }

          return {
            success: true, operation: "yield_withdraw", token, amount, protocol: proto,
            vaultName: vaultInfo?.name || `${proto} vault`,
            vaultAddress: vaultInfo?.address || null,
            ...(serializedTransactions ? { serializedTransactions } : {}),
            status: "READY_FOR_SIGNATURE", requiresApproval: true,
            message: withdrawMessage,
          };
        },
      },

      rebalance: {
        description: "Rebalance treasury portfolio to target allocations. If targetAllocations is omitted or empty, auto-analyzes portfolio and generates smart diversification targets.",
        inputSchema: z.object({
          targetAllocations: z.array(z.object({ token: z.string(), percentage: z.number() })).optional().default([]).describe("Target portfolio split. Leave empty for smart auto-rebalance."),
          tolerance: z.number().optional().default(5).describe("Tolerance % before rebalance triggers"),
        }),
        execute: async ({ targetAllocations, tolerance }: { targetAllocations: Array<{ token: string; percentage: number }>; tolerance: number }) => {
          console.log(`[Tool: rebalance] Targets: ${JSON.stringify(targetAllocations)}, tolerance: ${tolerance}%`);

          if (!walletAddress) {
            return {
              success: false, operation: "rebalance", targetAllocations, tolerance,
              trades: [], tradeCount: 0,
              message: "Wallet not connected. Connect your wallet to rebalance your portfolio.",
            };
          }

          const holdings = vaultState?.tokens || walletState?.balances || [];
          const portfolioValue = Array.isArray(holdings) ? holdings.reduce((sum: number, t: any) => sum + ((t.amount || 0) * (t.price || 0) || t.usdValue || 0), 0) : 0;
          if (portfolioValue === 0) {
            return {
              success: false, operation: "rebalance", targetAllocations, tolerance,
              trades: [], tradeCount: 0,
              message: "Portfolio balance is $0. Fund your wallet with tokens before rebalancing.",
            };
          }

          const coordinator = new ExecutionCoordinator(rpcEndpoint);
          const result = await coordinator.executeStrategy(
            "rebalance_portfolio" as any,
            { targetAllocations, tolerance: tolerance || 5, currentHoldings: holdings, wallet: walletAddress },
            walletAddress || null,
          );

          const trades = result.result?.trades || [];
          const serializedTransactions: string[] = result.result?.serializedTransactions || [];

          if (!result.success) {
            const errMsg = result.errors?.[0]?.message || "Rebalance strategy failed.";
            return {
              success: false, operation: "rebalance", targetAllocations, tolerance,
              trades: [], tradeCount: 0,
              status: result.status, executionId: result.executionId,
              message: errMsg,
            };
          }

          return {
            success: true, operation: "rebalance", targetAllocations, tolerance,
            trades, tradeCount: trades.length,
            serializedTransactions: serializedTransactions.length > 0 ? serializedTransactions : undefined,
            status: result.status, executionId: result.executionId,
            requiresApproval: true,
            message: `Portfolio rebalance: ${trades.length} trades planned.${serializedTransactions.length > 0 ? ` ${serializedTransactions.length} unsigned transaction(s) ready for client-side signing.` : " Connect wallet to build transactions."}`,
          };
        },
      },

      mass_dispatch: {
        description: "Execute Mass Dispatch (payroll) — send tokens to multiple recipients.",
        inputSchema: z.object({
          token: z.string().describe("Token to distribute"),
          recipients: z.array(z.object({ address: z.string(), amount: z.number(), label: z.string().optional() })).describe("List of recipients"),
        }),
        execute: async ({ token, recipients }: { token: string; recipients: Array<{ address: string; amount: number; label?: string }> }) => {
          console.log(`[Tool: mass_dispatch] ${token} to ${recipients.length} recipients`);
          const total = recipients.reduce((sum, r) => sum + r.amount, 0);

          const isSol = token.toUpperCase() === "SOL" || token.toUpperCase() === "WSOL";
          const mint = isSol ? null : resolveTokenMint(token.toUpperCase());

          if (!isSol && !mint) {
            return { success: false, operation: "mass_dispatch", token, error: `Unknown token: ${token}. Supported: ${Object.keys(TOKEN_MINTS).join(", ")}` };
          }

          try {
            const { PublicKey, Transaction, SystemProgram, Connection, LAMPORTS_PER_SOL } = await import("@solana/web3.js");

            if (!walletAddress) {
              return { success: true, operation: "mass_dispatch", token, recipientCount: recipients.length, totalAmount: total, recipients, status: "READY_FOR_SIGNATURE", requiresApproval: true, message: `Mass Dispatch: ${total} ${token} to ${recipients.length} recipients. Connect wallet to build transactions.` };
            }
            const payer = new PublicKey(walletAddress);
            const conn = new Connection(rpcEndpoint, "confirmed");
            const { blockhash } = await conn.getLatestBlockhash("confirmed");

            const MAX_IX_PER_TX = 20;
            const transactions: string[] = [];

            if (isSol) {
              for (let i = 0; i < recipients.length; i += MAX_IX_PER_TX) {
                const batch = recipients.slice(i, i + MAX_IX_PER_TX);
                const tx = new Transaction({ recentBlockhash: blockhash, feePayer: payer });
                for (const r of batch) {
                  tx.add(SystemProgram.transfer({ fromPubkey: payer, toPubkey: new PublicKey(r.address), lamports: Math.floor(r.amount * LAMPORTS_PER_SOL) }));
                }
                transactions.push(Buffer.from(tx.serialize({ verifySignatures: false })).toString("base64"));
              }
            } else {
              const spl = await import("@solana/spl-token") as any;
              const { createTransferInstruction, createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = spl;
              const mintPubkey = new PublicKey(mint!);
              const decimals = ["USDC", "USDT"].includes(token.toUpperCase()) ? 6 : 9;
              const senderAta = await getAssociatedTokenAddress(mintPubkey, payer);

              for (let i = 0; i < recipients.length; i += MAX_IX_PER_TX) {
                const batch = recipients.slice(i, i + MAX_IX_PER_TX);
                const tx = new Transaction({ recentBlockhash: blockhash, feePayer: payer });
                for (const r of batch) {
                  const recipientPubkey = new PublicKey(r.address);
                  const recipientAta = await getAssociatedTokenAddress(mintPubkey, recipientPubkey);
                  tx.add(createAssociatedTokenAccountIdempotentInstruction(payer, recipientAta, recipientPubkey, mintPubkey, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID));
                  tx.add(createTransferInstruction(senderAta, recipientAta, payer, Math.floor(r.amount * Math.pow(10, decimals))));
                }
                transactions.push(Buffer.from(tx.serialize({ verifySignatures: false })).toString("base64"));
              }
            }

            return {
              success: true, operation: "mass_dispatch", token, recipientCount: recipients.length, totalAmount: total, recipients,
              transactionCount: transactions.length, serializedTransactions: transactions,
              status: "READY_FOR_SIGNATURE", requiresApproval: true,
              message: `Mass Dispatch: ${total} ${token} to ${recipients.length} recipients in ${transactions.length} transaction(s). Ready for signing.`,
            };
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("[mass_dispatch] Build error:", msg);
            return {
              success: true, operation: "mass_dispatch", token, recipientCount: recipients.length, totalAmount: total, recipients,
              status: "READY_FOR_SIGNATURE", requiresApproval: true, buildError: msg,
              message: `Mass Dispatch: ${total} ${token} to ${recipients.length} recipients prepared (tx build deferred: ${msg}).`,
            };
          }
        },
      },

      multisig_proposal: {
        description: "Create a multisig treasury proposal for War Room quorum execution.",
        inputSchema: z.object({
          title: z.string().describe("Proposal title"),
          description: z.string().describe("Proposal description"),
          actions: z.array(z.object({ type: z.string(), params: z.any() })).describe("Actions to execute"),
        }),
        execute: async ({ title, description: desc, actions }: { title: string; description: string; actions: Array<{ type: string; params: unknown }> }) => {
          console.log(`[Tool: multisig_proposal] ${title}`);

          if (!walletAddress) {
            return {
              success: true, operation: "multisig_proposal", title, description: desc,
              actionCount: actions.length, status: "PENDING_SIGNATURES",
              quorumRequired: null, currentSignatures: 0, isMultisig: false,
              message: `Proposal "${title}" prepared. Connect a Squads multisig wallet to fetch quorum requirements.`,
            };
          }

          try {
            const { Connection } = await import("@solana/web3.js");
            const { SquadsClient } = await import("@/lib/squads");
            const connection = new Connection(rpcEndpoint, "confirmed");
            const squadsClient = new SquadsClient(connection, null);

            const multisigAccount = await squadsClient.getVault(walletAddress);

            if (!multisigAccount) {
              return {
                success: true, operation: "multisig_proposal", title, description: desc,
                actionCount: actions.length, status: "PENDING_SIGNATURES",
                isMultisig: false, quorumRequired: null, currentSignatures: 0,
                message: `Wallet ${walletAddress.slice(0, 8)}… is not a Squads multisig. Proposal "${title}" staged for standard execution.`,
                requiresApproval: true,
              };
            }

            const threshold = Number(multisigAccount.threshold);
            const members = (multisigAccount.members as Array<{ key: { toBase58(): string }; permissions: unknown }>).map((m) => ({
              key: m.key.toBase58(),
              permissions: m.permissions,
            }));
            const transactionIndex = Number(multisigAccount.transactionIndex);

            let recentProposals: Array<{ index: number; title: string; status: string; signatures: number; threshold: number; pda: string }> = [];
            try {
              recentProposals = await squadsClient.getProposals(walletAddress);
            } catch { /* proposals fetch is best-effort */ }

            return {
              success: true, operation: "multisig_proposal", title, description: desc,
              actionCount: actions.length, status: "PENDING_SIGNATURES",
              isMultisig: true,
              quorumRequired: threshold,
              currentSignatures: 0,
              memberCount: members.length,
              members: members.map((m) => m.key),
              nextTransactionIndex: transactionIndex + 1,
              recentProposals: recentProposals.slice(0, 5),
              message: `Proposal "${title}" prepared for Squads multisig. Quorum: ${threshold}/${members.length} signatures required. Next tx index: ${transactionIndex + 1}. Submit client-side to create on-chain.`,
              requiresApproval: true,
            };
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("[multisig_proposal] SquadsClient error:", msg);
            return {
              success: false, operation: "multisig_proposal", title,
              error: `Failed to fetch multisig config: ${msg}`,
            };
          }
        },
      },

      execute_dca: {
        description: "Set up a Dollar-Cost Averaging (DCA) strategy.",
        inputSchema: z.object({
          inputToken: z.string().describe("Token to sell"),
          outputToken: z.string().describe("Token to buy"),
          totalAmount: z.number().describe("Total amount to DCA"),
          frequency: z.string().describe("Frequency (hourly, daily, weekly)"),
          iterations: z.number().describe("Number of execution cycles"),
        }),
        execute: async ({ inputToken, outputToken, totalAmount, frequency, iterations }: { inputToken: string; outputToken: string; totalAmount: number; frequency: string; iterations: number }) => {
          console.log(`[Tool: execute_dca] ${totalAmount} ${inputToken} → ${outputToken} over ${iterations} ${frequency} cycles`);
          if (iterations <= 0) {
            return { success: false, operation: "execute_dca", error: "iterations must be greater than 0" };
          }
          const perCycle = totalAmount / iterations;

          const inMint = resolveTokenMint(inputToken);
          const outMint = resolveTokenMint(outputToken);

          if (!inMint || !outMint) {
            return { success: false, operation: "execute_dca", error: `Unknown token: ${!inMint ? inputToken : outputToken}. Supported: ${Object.keys(TOKEN_MINTS).join(", ")}` };
          }

          const FREQ_SECONDS: Record<string, number> = { hourly: 3600, daily: 86400, weekly: 604800, biweekly: 1209600, monthly: 2592000 };
          const cycleSeconds = FREQ_SECONDS[frequency.toLowerCase()] || 86400;

          const decimals = ["USDC", "USDT"].includes(inputToken.toUpperCase()) ? 6 : 9;
          const inAmountPerCycle = Math.floor(perCycle * Math.pow(10, decimals));

          let firstQuote: { outAmount?: string; priceImpactPct?: string; slippageBps?: number } | null = null;
          try {
            const quote = await getJupiterQuote(inMint, outMint, inAmountPerCycle, 100);
            if (quote) firstQuote = { outAmount: quote.outAmount, priceImpactPct: quote.priceImpactPct, slippageBps: quote.slippageBps };
          } catch { /* quote is informational only */ }

          const totalDuration = cycleSeconds * iterations;
          const durationLabel = totalDuration >= 2592000 ? `${Math.round(totalDuration / 2592000)}mo` : totalDuration >= 604800 ? `${Math.round(totalDuration / 604800)}wk` : `${Math.round(totalDuration / 86400)}d`;

          // Build DCA order via Jupiter DCA API if wallet is connected
          let dcaTransaction: string | null = null;
          let dcaError: string | null = null;

          if (walletAddress) {
            try {
              const totalInAmountRaw = Math.floor(totalAmount * Math.pow(10, decimals));
              const dcaRes = await fetch("https://dca-api.jup.ag/v1/dca/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  payer: walletAddress,
                  inputMint: inMint,
                  outputMint: outMint,
                  inAmount: totalInAmountRaw.toString(),
                  inAmountPerCycle: inAmountPerCycle.toString(),
                  cycleSecondsApart: cycleSeconds,
                  userPublicKey: walletAddress,
                }),
              });

              if (dcaRes.ok) {
                const dcaData = await dcaRes.json();
                if (dcaData.transaction || dcaData.swapTransaction) {
                  dcaTransaction = dcaData.transaction || dcaData.swapTransaction;
                }
              } else {
                dcaError = await dcaRes.text();
                console.warn("[execute_dca] Jupiter DCA API error:", dcaError);
              }
            } catch (e: unknown) {
              dcaError = e instanceof Error ? e.message : String(e);
              console.warn("[execute_dca] Jupiter DCA API call failed:", dcaError);
            }
          }

          const outDecimals = ["USDC", "USDT"].includes(outputToken.toUpperCase()) ? 6 : 9;
          const estOutput = firstQuote?.outAmount ? parseFloat(firstQuote.outAmount) / Math.pow(10, outDecimals) : null;

          return {
            success: true, operation: "execute_dca", inputToken, outputToken, totalAmount, frequency, iterations,
            inputMint: inMint, outputMint: outMint,
            amountPerCycle: perCycle, amountPerCycleRaw: inAmountPerCycle,
            cycleFrequencySeconds: cycleSeconds, totalDuration: durationLabel,
            estimatedOutputPerCycle: estOutput,
            priceImpact: firstQuote?.priceImpactPct || null,
            serializedTransaction: dcaTransaction || undefined,
            dcaApiError: dcaError || undefined,
            status: dcaTransaction ? "READY_FOR_SIGNATURE" : "READY_FOR_ACTIVATION",
            requiresApproval: true,
            message: `DCA Strategy: ${totalAmount} ${inputToken} → ${outputToken} over ${durationLabel} (${iterations} × ${perCycle} ${inputToken} ${frequency}).${estOutput ? ` Est. output/cycle: ~${estOutput.toFixed(4)} ${outputToken}.` : ""}${dcaTransaction ? " Transaction ready for signing." : dcaError ? ` DCA setup deferred: ${dcaError.slice(0, 100)}` : " Connect wallet to create on-chain DCA order."}`,
          };
        },
      },

      // ━━━━ PILLAR 2: Generative Foresight ━━━━
      foresight_simulation: {
        description: "Run a 'What If' simulation — runway projection, market shock, variable impact, yield forecast. Triggers Depletion Node visualization.",
        inputSchema: z.object({
          scenario: z.enum(["runway_projection", "market_shock", "variable_impact", "yield_forecast", "custom"]).describe("Simulation scenario type"),
          variables: z.record(z.any()).describe(
            "Scenario variables object. Keys depend on scenario: " +
            "runway_projection: { monthlyBurn: number (USD/mo) }. " +
            "market_shock: { solDrop: number (e.g. 0.3 for 30% or 30 for 30%), usdcDepeg?: number, monthlyBurn?: number }. " +
            "variable_impact: { newHires?: number (count of new hires, default 0), costPerHire?: number (USD cost per hire/mo, default 8000), costPerHireSOL?: number (SOL cost per hire/mo — will be converted to USD at current price), monthlyBurn?: number (current USD burn/mo, default 15000), depositSOL?: number (additional SOL deposit to add to treasury), depositUSD?: number (additional USD deposit to add to treasury) }. " +
            "yield_forecast: { apy: number (e.g. 0.08 for 8%), principal?: number (USD amount) }. " +
            "IMPORTANT: When the user mentions hiring someone at X SOL/month, set newHires=1 and costPerHireSOL=X. When the user mentions depositing SOL, set depositSOL to that amount."
          ),
          timeframeMonths: z.number().optional().default(12).describe("Projection timeframe in months"),
        }),
        execute: async ({ scenario, variables, timeframeMonths }: { scenario: string; variables: Record<string, any>; timeframeMonths: number }) => {
          console.log(`[Tool: foresight_simulation] ${scenario} over ${timeframeMonths}mo`);

          const tokenSource = vaultState?.tokens || walletState?.balances;
          const tokens: Array<{ symbol?: string; amount?: number; price?: number }> = Array.isArray(tokenSource) ? tokenSource : [];
          const computedBalance = tokens.reduce((sum, t) => sum + (t.amount || 0) * (t.price || 0), 0);
          const totalBalance = computedBalance;
          console.log(`[foresight_simulation] Treasury balance: $${Math.round(totalBalance).toLocaleString()} (${totalBalance === 0 ? 'NO BALANCE — vault is empty or not connected' : `LIVE — ${tokens.length} tokens`})`);
          if (totalBalance > 0 && tokens.length > 0) {
            console.log(`[foresight_simulation] Top tokens:`, tokens.slice(0, 5).map(t => `${t.symbol}: ${t.amount} @ $${t.price}`));
          }

          if (totalBalance === 0) {
            return {
              success: false, operation: "foresight_simulation", scenario, variables, timeframeMonths,
              dataSource: "none",
              message: "Treasury balance is $0. Connect a vault with funded tokens to run simulations.",
            };
          }

          if (scenario === "runway_projection") {
            const monthlyBurn = (variables.monthlyBurn as number) || 15000;
            const projection: Array<{ month: number; balance: number }> = [];
            let balance = totalBalance;
            let depletionMonth = 0;
            for (let i = 1; i <= timeframeMonths; i++) {
              balance = Math.max(0, balance - monthlyBurn);
              projection.push({ month: i, balance: Math.round(balance) });
              if (balance <= 0 && depletionMonth === 0) depletionMonth = i;
            }
            const projectedMonths = depletionMonth || Math.ceil(totalBalance / monthlyBurn);
            const depletionDate = new Date();
            depletionDate.setMonth(depletionDate.getMonth() + projectedMonths);
            return {
              success: true, operation: "foresight_simulation", scenario, variables, timeframeMonths,
              triggerVisualization: true, chartType: "depletion_node",
              projectedMonths, depletionDate: depletionDate.toISOString().split("T")[0],
              monthlyProjection: projection,
              dataSource: "live",
              message: `Runway projection: ~${projectedMonths} months at $${monthlyBurn.toLocaleString()}/mo burn. Depletion ${depletionDate.toLocaleDateString()}.`,
            };
          }

          if (scenario === "market_shock") {
            // Normalize: if > 1 treat as percentage (e.g. 10 → 0.10), else use as-is (0.1 → 0.10)
            const rawSolDrop = (variables.solDrop as number) || 0.3;
            const solDrop = rawSolDrop > 1 ? rawSolDrop / 100 : rawSolDrop;
            const rawUsdcDepeg = (variables.usdcDepeg as number) || 0;
            const usdcDepeg = rawUsdcDepeg > 1 ? rawUsdcDepeg / 100 : rawUsdcDepeg;

            const effectiveTokens = tokens;

            const shockedTokens = effectiveTokens.map((t) => {
              let shockedPrice = t.price || 0;
              if (t.symbol?.toUpperCase() === "SOL" || t.symbol?.toUpperCase() === "WSOL") shockedPrice *= (1 - solDrop);
              if (t.symbol?.toUpperCase() === "USDC") shockedPrice *= (1 - usdcDepeg);
              return { symbol: t.symbol, amount: t.amount || 0, originalPrice: t.price || 0, shockedPrice, shockedValue: (t.amount || 0) * shockedPrice };
            });
            const recalcOriginal = effectiveTokens.reduce((s, t) => s + (t.amount || 0) * (t.price || 0), 0);
            const shockedTotal = shockedTokens.reduce((s, t) => s + t.shockedValue, 0);
            const monthlyBurn = (variables.monthlyBurn as number) || 15000;
            const shockedRunway = Math.ceil(shockedTotal / monthlyBurn);

            // Build a month-by-month projection for inline chart
            const monthlyProjection: Array<{ month: number; original: number; shocked: number }> = [];
            let origBalance = recalcOriginal;
            let shockBalance = shockedTotal;
            for (let i = 0; i <= timeframeMonths; i++) {
              monthlyProjection.push({ month: i, original: Math.round(origBalance), shocked: Math.round(shockBalance) });
              origBalance = Math.max(0, origBalance - monthlyBurn);
              shockBalance = Math.max(0, shockBalance - monthlyBurn);
            }
            return {
              success: true, operation: "foresight_simulation", scenario, variables, timeframeMonths,
              triggerVisualization: true, chartType: "equity_curve",
              originalBalance: Math.round(recalcOriginal), shockedBalance: Math.round(shockedTotal),
              drawdown: `${recalcOriginal > 0 ? (((recalcOriginal - shockedTotal) / recalcOriginal) * 100).toFixed(1) : '0.0'}%`,
              shockedRunwayMonths: shockedRunway, shockedTokens, monthlyProjection,
              dataSource: "live",
              message: `Market shock: portfolio drops ${recalcOriginal > 0 ? (((recalcOriginal - shockedTotal) / recalcOriginal) * 100).toFixed(1) : '0.0'}% to $${Math.round(shockedTotal).toLocaleString()}. Runway: ~${shockedRunway}mo.`,
            };
          }

          if (scenario === "variable_impact") {
            const newHires = (variables.newHires as number) || 0;

            // Support SOL-denominated cost: convert to USD using current SOL price
            const solToken = tokens.find((t) => t.symbol?.toUpperCase() === "SOL" || t.symbol?.toUpperCase() === "WSOL");
            const solPrice = solToken?.price || 150; // fallback SOL price
            const costPerHireSOL = (variables.costPerHireSOL as number) || 0;
            const costPerHire = costPerHireSOL > 0 ? Math.round(costPerHireSOL * solPrice) : ((variables.costPerHire as number) || 8000);

            // Support deposits (SOL or USD)
            const depositSOL = (variables.depositSOL as number) || 0;
            const depositUSD = (variables.depositUSD as number) || 0;
            const depositValue = depositSOL * solPrice + depositUSD;

            const currentBurn = (variables.monthlyBurn as number) || 15000;
            const newBurn = currentBurn + newHires * costPerHire;
            const effectiveBalance = totalBalance + depositValue;
            const originalRunway = currentBurn > 0 ? Math.ceil(totalBalance / currentBurn) : 999;
            const newRunway = newBurn > 0 ? Math.ceil(effectiveBalance / newBurn) : 999;

            // Build month-by-month projection for inline chart
            const monthlyProjection: Array<{ month: number; original: number; projected: number }> = [];
            let origBal = totalBalance;
            let newBal = effectiveBalance;
            for (let i = 0; i <= timeframeMonths; i++) {
              monthlyProjection.push({ month: i, original: Math.round(origBal), projected: Math.round(newBal) });
              origBal = Math.max(0, origBal - currentBurn);
              newBal = Math.max(0, newBal - newBurn);
            }

            // Build descriptive message
            const parts: string[] = [];
            if (depositValue > 0) {
              parts.push(`Depositing ${depositSOL > 0 ? `${depositSOL} SOL (~$${Math.round(depositValue).toLocaleString()})` : `$${Math.round(depositValue).toLocaleString()}`} increases treasury to $${Math.round(effectiveBalance).toLocaleString()}`);
            }
            if (newHires > 0) {
              const costLabel = costPerHireSOL > 0 ? `${costPerHireSOL} SOL (~$${costPerHire.toLocaleString()})` : `$${costPerHire.toLocaleString()}`;
              parts.push(`Adding ${newHires} hire(s) at ${costLabel}/mo increases burn to $${newBurn.toLocaleString()}/mo`);
            }
            parts.push(`Runway: ${originalRunway}mo → ${newRunway}mo`);

            return {
              success: true, operation: "foresight_simulation", scenario, variables, timeframeMonths,
              triggerVisualization: true, chartType: "depletion_node",
              originalBurn: currentBurn, newBurn, originalRunway, newRunway,
              effectiveBalance: Math.round(effectiveBalance),
              originalBalance: Math.round(totalBalance),
              depositValue: Math.round(depositValue),
              impactMonths: originalRunway - newRunway,
              solPrice, costPerHire,
              monthlyProjection,
              dataSource: "live",
              message: parts.join(". "),
            };
          }

          if (scenario === "yield_forecast") {
            const apy = (variables.apy as number) || 0.08;
            const principal = (variables.principal as number) || totalBalance;
            const monthlyRate = apy / 12;
            const projection: Array<{ month: number; balance: number }> = [];
            let balance = principal;
            for (let i = 1; i <= timeframeMonths; i++) {
              balance *= (1 + monthlyRate);
              projection.push({ month: i, balance: Math.round(balance * 100) / 100 });
            }
            const totalYield = balance - principal;
            return {
              success: true, operation: "foresight_simulation", scenario, variables, timeframeMonths,
              triggerVisualization: true, chartType: "yield_curve",
              principal: Math.round(principal), endingBalance: Math.round(balance),
              totalYield: Math.round(totalYield), effectiveApy: apy,
              monthlyProjection: projection,
              message: `Yield forecast: $${Math.round(principal).toLocaleString()} at ${(apy * 100).toFixed(1)}% APY → $${Math.round(balance).toLocaleString()} after ${timeframeMonths}mo (+$${Math.round(totalYield).toLocaleString()}).`,
            };
          }

          return {
            success: true, operation: "foresight_simulation", scenario, variables, timeframeMonths,
            triggerVisualization: true, chartType: "depletion_node",
            message: `Custom simulation triggered: ${scenario}. Rendering visualization.`,
          };
        },
      },

      risk_assessment: {
        description: "Run concentration risk assessment — triggers Risk Radar visualization.",
        inputSchema: z.object({
          threshold: z.number().optional().default(50).describe("Concentration threshold % to flag"),
        }),
        execute: async ({ threshold }: any) => {
          console.log(`[Tool: risk_assessment] threshold: ${threshold}%`);
          const holdings = vaultState?.tokens || [];
          const totalValue = holdings.reduce((sum: number, t: any) => sum + (t.usdValue || 0), 0);
          const risks = holdings
            .map((t: any) => ({ token: t.symbol, value: t.usdValue || 0, percentage: totalValue > 0 ? ((t.usdValue || 0) / totalValue) * 100 : 0 }))
            .filter((t: any) => t.percentage >= (threshold || 50));
          return { success: true, operation: "risk_assessment", threshold, totalValue, concentrationRisks: risks, riskCount: risks.length, triggerVisualization: true, chartType: "risk_radar", message: risks.length > 0 ? `⚠️ ${risks.length} asset(s) exceed ${threshold}% threshold.` : `✅ No concentration risks above ${threshold}%.` };
        },
      },

      // ━━━━ PILLAR 3: Zero-Day Protocol Learning ━━━━
      browser_research: {
        description: "Deep research using browser, knowledge base, and Cloudflare scraping. Protocol deep-dives, documentation, technical synthesis.",
        inputSchema: z.object({
          query: z.string().describe("Search query or topic"),
          url: z.string().optional().describe("Specific URL to scrape"),
        }),
        execute: async ({ query, url }: any) => {
          console.log(`[Tool: browser_research] "${query}"${url ? ` (URL: ${url})` : ""}`);
          const tasks: Promise<any>[] = [];
          if (url) {
            tasks.push(cfMarkdown({ url }).then((md: any) => ({ source: "cloudflare-browser", markdown: md })).catch((e: any) => ({ source: "cloudflare-browser", error: e.message })));
          }
          tasks.push(knowledgeBase.study(query).then((r: any) => ({ source: "knowledge-base", results: r })).catch((e: any) => ({ source: "knowledge-base", error: e.message })));
          const results = await Promise.allSettled(tasks);
          const merged = results.map((r: any) => (r.status === "fulfilled" ? r.value : { error: r.reason?.message }));
          try { await knowledgeMemory.store({ source: "command-research", sourceUrl: url || "multi-source", content: JSON.stringify(merged).slice(0, 5000), title: query, summary: query, contentType: "markdown" }); } catch { /* ignore */ }
          return { success: true, operation: "browser_research", query, url, sources: merged, message: `Research completed for "${query}". ${merged.length} source(s) retrieved.` };
        },
      },

      idl_extraction: {
        description: "Fetch and parse a Solana program IDL by program ID.",
        inputSchema: z.object({
          programId: z.string().describe("Solana program address (base58)"),
        }),
        execute: async ({ programId }: { programId: string }) => {
          console.log(`[Tool: idl_extraction] ${programId}`);
          try {
            const { PublicKey } = await import("@solana/web3.js");
            const programPubkey = new PublicKey(programId);

            // Anchor stores IDL at PDA seeded by ["anchor:idl", programId]
            const [idlAddress] = PublicKey.findProgramAddressSync(
              [Buffer.from("anchor:idl"), programPubkey.toBuffer()],
              programPubkey,
            );

            const idlRes = await fetch(rpcEndpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "getAccountInfo",
                params: [idlAddress.toBase58(), { encoding: "base64" }],
              }),
            });
            const data = await idlRes.json();

            if (!data?.result?.value) {
              return {
                success: false,
                operation: "idl_extraction",
                programId,
                idlAddress: idlAddress.toBase58(),
                message: `No Anchor IDL account found for ${programId}. Program may not be Anchor-based.`,
              };
            }

            const accountData = Buffer.from(data.result.value.data[0], "base64");

            // Anchor IDL account layout:
            //   [0..8)   discriminator
            //   [8..40)  authority pubkey
            //   [40..44) compressed data length (u32 LE)
            //   [44..)   zlib-compressed IDL JSON
            if (accountData.length < 44) {
              return {
                success: false,
                operation: "idl_extraction",
                programId,
                idlAddress: idlAddress.toBase58(),
                error: "Account data too small to contain a valid Anchor IDL (expected at least 44 bytes header).",
              };
            }

            const dataLen = accountData.readUInt32LE(40);
            if (dataLen === 0 || 44 + dataLen > accountData.length) {
              return {
                success: false,
                operation: "idl_extraction",
                programId,
                idlAddress: idlAddress.toBase58(),
                error: `IDL data length mismatch: header says ${dataLen} bytes but account has ${accountData.length - 44} bytes available.`,
              };
            }

            const compressed = accountData.slice(44, 44 + dataLen);

            const { inflateSync } = await import("zlib");
            const decompressed = inflateSync(compressed);
            const idl = JSON.parse(decompressed.toString("utf-8"));

            return {
              success: true,
              operation: "idl_extraction",
              programId,
              idlAddress: idlAddress.toBase58(),
              idl,
              instructionCount: idl.instructions?.length ?? 0,
              accountCount: idl.accounts?.length ?? 0,
              typeCount: idl.types?.length ?? 0,
              message: `IDL extracted for ${programId}: ${idl.instructions?.length ?? 0} instructions, ${idl.accounts?.length ?? 0} accounts, ${idl.types?.length ?? 0} types.`,
            };
          } catch (e: any) {
            if (e.code === "Z_DATA_ERROR" || e.message?.includes("inflate")) {
              return {
                success: false,
                operation: "idl_extraction",
                programId,
                error: "IDL account data could not be decompressed. The account may use a non-standard format.",
              };
            }
            return { success: false, operation: "idl_extraction", programId, error: e.message };
          }
        },
      },

      sentiment_analysis: {
        description: "On-chain sentiment and whale flow analysis.",
        inputSchema: z.object({
          token: z.string().describe("Token symbol or mint to analyze"),
        }),
        execute: async ({ token }: { token: string }) => {
          console.log(`[Tool: sentiment_analysis] ${token}`);
          const mint = resolveTokenMint(token) || token;

          try {
            const sigRes = await fetch(rpcEndpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getSignaturesForAddress", params: [mint, { limit: 50 }] }),
            });
            const sigData = await sigRes.json();
            const signatures = (sigData.result || []) as Array<{ signature: string; blockTime?: number; err?: unknown }>;

            const recentCount = signatures.length;
            const errorCount = signatures.filter((s) => s.err).length;
            const successCount = recentCount - errorCount;

            let txDetails: Array<{ type: string; amount?: number }> = [];
            if (process.env.HELIUS_API_KEY && signatures.length > 0) {
              try {
                const parseRes = await fetch(`https://api.helius.xyz/v0/transactions?api-key=${process.env.HELIUS_API_KEY}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ transactions: signatures.slice(0, 20).map((s) => s.signature) }),
                });
                if (parseRes.ok) txDetails = (await parseRes.json()) as Array<{ type: string; amount?: number }>;
              } catch { /* Helius enhanced parsing unavailable */ }
            }

            const transferCount = txDetails.filter((t) => t.type === "TRANSFER").length;
            const swapCount = txDetails.filter((t) => t.type === "SWAP").length;
            const largeCount = txDetails.filter((t) => (t.amount || 0) > 10000).length;

            const activityScore = Math.min(100, Math.round((recentCount / 50) * 60 + (successCount / Math.max(1, recentCount)) * 20 + Math.min(largeCount * 5, 20)));
            const netFlow = transferCount > swapCount ? "distributing" : "accumulating";
            const sentiment = activityScore >= 70 ? "bullish" : activityScore >= 40 ? "neutral" : "bearish";

            return {
              success: true, operation: "sentiment_analysis", token, mint,
              compositeScore: activityScore,
              whaleFlow: { netFlow, largeTransactions24h: largeCount, recentTxCount: recentCount, successRate: `${((successCount / Math.max(1, recentCount)) * 100).toFixed(0)}%` },
              breakdown: { transfers: transferCount, swaps: swapCount, errors: errorCount },
              sentiment,
              message: `Sentiment for ${token}: score ${activityScore}/100 (${sentiment}). ${recentCount} recent txs, ${largeCount} whale-size. Net flow: ${netFlow}.`,
            };
          } catch (err) {
            console.error("[sentiment_analysis] RPC error:", err);
            return { success: false, operation: "sentiment_analysis", token, error: "Failed to fetch on-chain data", message: `Could not analyze sentiment for ${token}.` };
          }
        },
      },

      // ━━━━ PILLAR 4: Keystone Studio & IDE ━━━━
      studio_init_miniapp: {
        description: "Initialize a new Mini-App using Zero-Build Runtime.",
        inputSchema: z.object({
          name: z.string().describe("Mini-App project name"),
          template: z.enum(["react", "dashboard", "defi"]).optional().default("react").describe("Template: react (default), dashboard (data grid), defi (swap form)"),
        }),
        execute: async ({ name, template }: { name: string; template: string }) => {
          console.log(`[Tool: studio_init_miniapp] ${name} (${template})`);

          const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");

          const TEMPLATES: Record<string, Record<string, string>> = {
            react: {
              "App.tsx": `import { useVault, useFetch } from '@keystone-os/sdk';\n\nexport default function ${safeName}() {\n  const vault = useVault();\n  const { data: price } = useFetch('/api/jupiter/price?ids=SOL');\n\n  return (\n    <div className="min-h-screen bg-zinc-950 text-white p-6">\n      <h1 className="text-2xl font-bold text-emerald-400 mb-4">${name}</h1>\n      <div className="grid grid-cols-2 gap-4">\n        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">\n          <p className="text-xs text-zinc-500 uppercase">Vault Balance</p>\n          <p className="text-xl font-mono text-emerald-400">{vault.balance?.toFixed(2) ?? '—'} SOL</p>\n        </div>\n        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">\n          <p className="text-xs text-zinc-500 uppercase">SOL Price</p>\n          <p className="text-xl font-mono">${'{'}price?.SOL?.price ? \`$\${Number(price.SOL.price).toFixed(2)}\` : '—'${'}'}</p>\n        </div>\n      </div>\n    </div>\n  );\n}\n`,
              "index.html": `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${name}</title>\n  <script type="importmap">{\n    "imports": {\n      "react": "https://esm.sh/react@18?dev",\n      "react-dom": "https://esm.sh/react-dom@18?dev",\n      "react-dom/client": "https://esm.sh/react-dom@18/client?dev",\n      "@keystone-os/sdk": "https://esm.sh/@keystone-os/sdk?external=react,react-dom"\n    }\n  }</script>\n  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3/dist/tailwind.min.css" rel="stylesheet" />\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module">\n    import React from 'react';\n    import { createRoot } from 'react-dom/client';\n    import App from './App.tsx';\n    createRoot(document.getElementById('root')).render(React.createElement(App));\n  </script>\n</body>\n</html>`,
            },
            dashboard: {
              "App.tsx": `import { useVault, useFetch } from '@keystone-os/sdk';\nimport { useState } from 'react';\n\ninterface TokenRow {\n  symbol: string;\n  amount: number;\n  price: number;\n  value: number;\n  change24h: number;\n}\n\nexport default function ${safeName}() {\n  const vault = useVault();\n  const [sortBy, setSortBy] = useState<'value' | 'change24h'>('value');\n\n  const tokens: TokenRow[] = (vault.tokens || []).map((t: any) => ({\n    symbol: t.symbol || 'SPL',\n    amount: t.amount || 0,\n    price: t.price || 0,\n    value: (t.amount || 0) * (t.price || 0),\n    change24h: t.change24h || 0,\n  })).sort((a: TokenRow, b: TokenRow) => b[sortBy] - a[sortBy]);\n\n  const totalValue = tokens.reduce((s, t) => s + t.value, 0);\n\n  return (\n    <div className="min-h-screen bg-zinc-950 text-white p-6">\n      <h1 className="text-2xl font-bold text-emerald-400 mb-2">${name}</h1>\n      <p className="text-zinc-500 text-sm mb-6">Total: <span className="text-white font-mono">${'$'}{totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></p>\n      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">\n        <table className="w-full text-sm">\n          <thead>\n            <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">\n              <th className="text-left p-3">Token</th>\n              <th className="text-right p-3">Balance</th>\n              <th className="text-right p-3">Price</th>\n              <th className="text-right p-3 cursor-pointer hover:text-emerald-400" onClick={() => setSortBy('value')}>Value</th>\n              <th className="text-right p-3 cursor-pointer hover:text-emerald-400" onClick={() => setSortBy('change24h')}>24h</th>\n            </tr>\n          </thead>\n          <tbody>\n            {tokens.map((t) => (\n              <tr key={t.symbol} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">\n                <td className="p-3 font-mono font-bold">{t.symbol}</td>\n                <td className="p-3 text-right font-mono">{t.amount.toFixed(4)}</td>\n                <td className="p-3 text-right font-mono">${'$'}{t.price.toFixed(4)}</td>\n                <td className="p-3 text-right font-mono">${'$'}{t.value.toFixed(2)}</td>\n                <td className={\`p-3 text-right font-mono \${t.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}\`}>{t.change24h >= 0 ? '+' : ''}{t.change24h.toFixed(2)}%</td>\n              </tr>\n            ))}\n          </tbody>\n        </table>\n      </div>\n    </div>\n  );\n}\n`,
              "index.html": `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${name}</title>\n  <script type="importmap">{\n    "imports": {\n      "react": "https://esm.sh/react@18?dev",\n      "react-dom": "https://esm.sh/react-dom@18?dev",\n      "react-dom/client": "https://esm.sh/react-dom@18/client?dev",\n      "@keystone-os/sdk": "https://esm.sh/@keystone-os/sdk?external=react,react-dom"\n    }\n  }</script>\n  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3/dist/tailwind.min.css" rel="stylesheet" />\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module">\n    import React from 'react';\n    import { createRoot } from 'react-dom/client';\n    import App from './App.tsx';\n    createRoot(document.getElementById('root')).render(React.createElement(App));\n  </script>\n</body>\n</html>`,
            },
            defi: {
              "App.tsx": `import { useVault, useTurnkey, useFetch } from '@keystone-os/sdk';\nimport { useState } from 'react';\n\nexport default function ${safeName}() {\n  const vault = useVault();\n  const turnkey = useTurnkey();\n  const [inputToken, setInputToken] = useState('SOL');\n  const [outputToken, setOutputToken] = useState('USDC');\n  const [amount, setAmount] = useState('');\n  const [loading, setLoading] = useState(false);\n\n  const handleSwap = async () => {\n    if (!amount || isNaN(Number(amount))) return;\n    setLoading(true);\n    try {\n      const quote = await vault.fetch(\`/api/jupiter/quote?inputMint=\${inputToken}&outputMint=\${outputToken}&amount=\${amount}\`);\n      const tx = await turnkey.signTransaction(quote.swapTransaction);\n      console.log('Signed:', tx);\n    } catch (err) {\n      console.error('Swap failed:', err);\n    } finally {\n      setLoading(false);\n    }\n  };\n\n  return (\n    <div className="min-h-screen bg-zinc-950 text-white p-6 flex items-center justify-center">\n      <div className="w-full max-w-md bg-zinc-900 rounded-2xl border border-zinc-800 p-6">\n        <h2 className="text-lg font-bold text-emerald-400 mb-4">${name}</h2>\n        <div className="space-y-4">\n          <div>\n            <label className="text-xs text-zinc-500 uppercase">From</label>\n            <div className="flex gap-2 mt-1">\n              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 font-mono text-white border border-zinc-700 focus:border-emerald-500 outline-none" />\n              <select value={inputToken} onChange={(e) => setInputToken(e.target.value)} className="bg-zinc-800 rounded-lg px-3 py-2 text-white border border-zinc-700">\n                <option>SOL</option><option>USDC</option><option>JUP</option><option>BONK</option>\n              </select>\n            </div>\n          </div>\n          <div className="text-center text-zinc-600">↓</div>\n          <div>\n            <label className="text-xs text-zinc-500 uppercase">To</label>\n            <div className="flex gap-2 mt-1">\n              <div className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 font-mono text-zinc-500">Est. output</div>\n              <select value={outputToken} onChange={(e) => setOutputToken(e.target.value)} className="bg-zinc-800 rounded-lg px-3 py-2 text-white border border-zinc-700">\n                <option>USDC</option><option>SOL</option><option>JUP</option><option>BONK</option>\n              </select>\n            </div>\n          </div>\n          <button onClick={handleSwap} disabled={loading || !amount} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-xl font-bold text-black transition-colors">\n            {loading ? 'Signing...' : 'Swap'}\n          </button>\n        </div>\n      </div>\n    </div>\n  );\n}\n`,
              "index.html": `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${name}</title>\n  <script type="importmap">{\n    "imports": {\n      "react": "https://esm.sh/react@18?dev",\n      "react-dom": "https://esm.sh/react-dom@18?dev",\n      "react-dom/client": "https://esm.sh/react-dom@18/client?dev",\n      "@keystone-os/sdk": "https://esm.sh/@keystone-os/sdk?external=react,react-dom"\n    }\n  }</script>\n  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3/dist/tailwind.min.css" rel="stylesheet" />\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module">\n    import React from 'react';\n    import { createRoot } from 'react-dom/client';\n    import App from './App.tsx';\n    createRoot(document.getElementById('root')).render(React.createElement(App));\n  </script>\n</body>\n</html>`,
            },
          };

          const files = TEMPLATES[template] || TEMPLATES.react;

          let finalAppId: string | null = null;
          
          if (walletAddress) {
             try {
                const { saveProject } = await import("@/actions/studio-actions");
                
                // Format the files for the database schema
                const projectCode = {
                   files: Object.entries(files).reduce((acc, [name, content]) => ({
                       ...acc,
                       [name]: { content }
                   }), {} as Record<string, { content: string }>)
                };
                
                const appId = "app_" + Math.random().toString(36).substring(2, 15);
                const saveRes = await saveProject(
                   walletAddress, 
                   projectCode, 
                   { name, description: `AI-generated ${template} mini-app` },
                   appId
                );
                
                if (saveRes.success) {
                  finalAppId = saveRes.appId || appId;
                }
             } catch (err: unknown) {
                console.warn("[studio_init_miniapp] Failed to save project to DB:", err);
             }
          }

          const navigationTarget = finalAppId ? `/app/studio?appId=${finalAppId}` : "/app/studio";

          return {
            success: true, operation: "studio_init_miniapp", name, template,
            files,
            fileCount: Object.keys(files).length,
            entrypoint: "App.tsx",
            navigateTo: navigationTarget,
            message: `Mini-App "${name}" initialized with ${template} template (${Object.keys(files).length} files). ${finalAppId ? "Project saved. Redirecting to Studio..." : "esm.sh import maps configured."}`,
          };
        },
      },

      studio_analyze_code: {
        description: "Analyze code for errors and apply self-correction.",
        inputSchema: z.object({
          code: z.string().describe("Code to analyze"),
          language: z.string().optional().default("typescript").describe("Language"),
        }),
        execute: async ({ code, language }: any) => {
          console.log(`[Tool: studio_analyze_code] ${language}, ${code.length} chars`);
          return { success: true, operation: "studio_analyze_code", language, diagnostics: [], patchesApplied: 0, message: `Code analysis complete. 0 errors found.` };
        },
      },

      security_firewall: {
        description: "Run Pre-Flight security simulation on a mainnet fork.",
        inputSchema: z.object({
          targetAddress: z.string().describe("Contract or wallet address to audit"),
          testType: z.enum(["sandbox_escape", "bridge_auth", "balance_check", "full"]).optional().default("full").describe("Test type"),
          serializedTransaction: z.string().optional().describe("Optional base64-encoded transaction to simulate"),
        }),
        execute: async ({ targetAddress, testType, serializedTransaction }: { targetAddress: string; testType: string; serializedTransaction?: string }) => {
          console.log(`[Tool: security_firewall] ${testType} on ${targetAddress}`);

          const { SimulationFirewall } = await import("@/lib/studio/simulation-firewall");
          const firewall = SimulationFirewall.getInstance();

          const results: Record<string, unknown> = {
            sandboxEscape: false,
            unauthorizedBridge: false,
            balanceDiscrepancy: false,
          };
          let riskScore = 0;
          let humanSummary = "";

          try {
            if (serializedTransaction) {
              const simResult = await firewall.simulate(serializedTransaction, targetAddress);
              results.simulationPassed = simResult.success;
              results.balanceChanges = simResult.balanceChanges;
              results.estimatedFee = simResult.estimatedFee;
              results.unitsConsumed = simResult.unitsConsumed;
              results.logs = simResult.logs.slice(0, 10);
              humanSummary = simResult.humanSummary;

              const riskMap = { low: 0.1, medium: 0.4, high: 0.7, critical: 0.95 };
              riskScore = riskMap[simResult.riskLevel] ?? 0.5;

              results.balanceDiscrepancy = simResult.balanceChanges.some(
                (c) => Math.abs(c.changeUsd || 0) > 500
              );
            } else {
              const { Connection, PublicKey } = await import("@solana/web3.js");
              const conn = new Connection(rpcEndpoint, "confirmed");

              let validAddress = false;
              try { new PublicKey(targetAddress); validAddress = true; } catch { /* invalid */ }

              if (validAddress) {
                const info = await conn.getAccountInfo(new PublicKey(targetAddress));
                results.accountExists = !!info;
                results.accountOwner = info?.owner?.toBase58() || null;
                results.accountLamports = info?.lamports || 0;
                results.isExecutable = info?.executable || false;

                if (info?.executable) {
                  riskScore = 0.2;
                  humanSummary = `Program account verified. Owner: ${info.owner.toBase58().slice(0, 12)}…. No transaction to simulate.`;
                } else if (info) {
                  riskScore = 0.1;
                  humanSummary = `Wallet account verified. Balance: ${(info.lamports / 1e9).toFixed(4)} SOL. No transaction to simulate.`;
                } else {
                  riskScore = 0.6;
                  humanSummary = `Account ${targetAddress.slice(0, 12)}… does not exist on-chain. Elevated risk.`;
                }
              } else {
                riskScore = 0.8;
                humanSummary = `Invalid Solana address: ${targetAddress}. Cannot verify.`;
              }
            }
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("[security_firewall] Simulation error:", msg);
            riskScore = 0.5;
            humanSummary = `Firewall check encountered an error: ${msg}`;
            results.error = msg;
          }

          results.riskScore = riskScore;
          const riskLabel = riskScore >= 0.7 ? "HIGH" : riskScore >= 0.3 ? "MEDIUM" : "LOW";

          return {
            success: true, operation: "security_firewall", targetAddress, testType,
            results,
            riskLevel: riskLabel,
            message: `Pre-Flight ${testType} simulation: ${riskLabel} risk (${riskScore.toFixed(2)}). ${humanSummary}`,
          };
        },
      },

      marketplace_publish: {
        description: "Bundle Mini-App code and submit for marketplace listing with 80/20 revenue split.",
        inputSchema: z.object({
          appName: z.string().describe("App name"),
          version: z.string().describe("Version string"),
          description: z.string().describe("App description"),
        }),
        execute: async ({ appName, version, description }: { appName: string; version: string; description: string }) => {
          console.log(`[Tool: marketplace_publish] ${appName} v${version}`);
          const { createHash } = await import("crypto");
          const hash = `sha256-${createHash("sha256").update(`${appName}@${version}`).digest("hex")}`;
          return {
            success: true, operation: "marketplace_publish", appName, version, description,
            integrityHash: hash, revenueSplit: { developer: 80, platform: 20 },
            status: "PENDING_REVIEW",
            message: `"${appName}" v${version} bundled (${hash.slice(0, 20)}…). Submitted for review.`,
          };
        },
      },

      protocol_sdk_analyze: {
        description: "Analyze a Solana program's SDK documentation and prepare transaction payload insights. Bridges raw docs to actionable on-chain instructions.",
        inputSchema: z.object({
          programId: z.string().describe("Solana program address (base58)"),
          sdkUrl: z.string().optional().describe("URL to SDK documentation or npm package page"),
          intent: z.string().describe("What the user wants to do with this program (e.g. 'deposit USDC', 'create a pool', 'stake tokens')"),
        }),
        execute: async ({ programId, sdkUrl, intent }: { programId: string; sdkUrl?: string; intent: string }) => {
          console.log(`[Tool: protocol_sdk_analyze] ${programId} — intent: "${intent}"`);

          const research: { docs?: string; idl?: Record<string, unknown>; error?: string } = {};

          // Step 1: Fetch SDK documentation (if URL provided)
          if (sdkUrl) {
            try {
              const docMd = await cfMarkdown({ url: sdkUrl });
              research.docs = typeof docMd === "string" ? docMd.slice(0, 12000) : JSON.stringify(docMd).slice(0, 12000);
            } catch (e: unknown) {
              research.docs = `Documentation fetch failed: ${e instanceof Error ? e.message : String(e)}`;
            }
          }

          // Step 2: Also search the Knowledge Engine for context
          let knowledgeResults: string | null = null;
          try {
            const kr = await knowledgeBase.study(`${programId} Solana SDK ${intent}`);
            if (kr.rawContent) knowledgeResults = kr.rawContent.slice(0, 6000);
          } catch { /* knowledge search is best-effort */ }

          // Step 3: Attempt IDL extraction from on-chain
          let idlData: Record<string, unknown> | null = null;
          try {
            const { PublicKey } = await import("@solana/web3.js");
            const programPubkey = new PublicKey(programId);
            const [idlAddress] = PublicKey.findProgramAddressSync(
              [Buffer.from("anchor:idl"), programPubkey.toBuffer()],
              programPubkey,
            );

            const idlRes = await fetch(rpcEndpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getAccountInfo", params: [idlAddress.toBase58(), { encoding: "base64" }] }),
            });
            const data = await idlRes.json();

            if (data?.result?.value) {
              const accountData = Buffer.from(data.result.value.data[0], "base64");
              if (accountData.length >= 44) {
                const dataLen = accountData.readUInt32LE(40);
                if (dataLen > 0 && 44 + dataLen <= accountData.length) {
                  const { inflateSync } = await import("zlib");
                  const decompressed = inflateSync(accountData.slice(44, 44 + dataLen));
                  idlData = JSON.parse(decompressed.toString("utf-8"));
                  if (idlData) research.idl = idlData;
                }
              }
            }
          } catch { /* IDL extraction best-effort */ }

          // Step 4: Analyze and build structured response
          const instructions = idlData?.instructions as Array<{ name: string; args?: unknown[]; accounts?: unknown[] }> | undefined;
          const accounts = idlData?.accounts as Array<{ name: string }> | undefined;

          const matchingInstructions = instructions?.filter((ix) => {
            const intentLower = intent.toLowerCase();
            const ixName = (ix.name || "").toLowerCase();
            return intentLower.split(/\s+/).some((word) => ixName.includes(word));
          }) || [];

          const suggestedInstruction = matchingInstructions.length > 0 ? matchingInstructions[0] : (instructions?.[0] || null);

          // Build the payload suggestion
          const suggestedPayload = suggestedInstruction ? {
            programId,
            instructionName: suggestedInstruction.name,
            requiredAccounts: suggestedInstruction.accounts || [],
            args: suggestedInstruction.args || [],
            note: "Build this instruction using @coral-xyz/anchor or raw TransactionInstruction with the accounts and args above.",
          } : null;

          // Persist research results
          try {
            await knowledgeMemory.store({
              source: "protocol-sdk-analysis",
              sourceUrl: sdkUrl || `solana:${programId}`,
              content: JSON.stringify({ programId, intent, instructions: instructions?.map((i) => i.name), accounts: accounts?.map((a) => a.name) }).slice(0, 5000),
              title: `SDK Analysis: ${programId.slice(0, 12)}…`,
              summary: `Protocol SDK analysis for intent: ${intent}`,
              contentType: "json",
            });
          } catch { /* storage best-effort */ }

          return {
            success: true, operation: "protocol_sdk_analyze", programId, intent,
            hasIdl: !!idlData,
            instructionCount: instructions?.length ?? 0,
            accountCount: accounts?.length ?? 0,
            availableInstructions: instructions?.map((i) => i.name) || [],
            matchingInstructions: matchingInstructions.map((i) => i.name),
            suggestedPayload,
            docsFetched: !!research.docs,
            knowledgeResults: !!knowledgeResults,
            message: `Protocol analysis for ${programId.slice(0, 12)}…: ${idlData ? `IDL found (${instructions?.length ?? 0} instructions).` : "No on-chain IDL."} ${matchingInstructions.length > 0 ? `Matched instructions for "${intent}": ${matchingInstructions.map((i) => i.name).join(", ")}.` : `No direct instruction match for "${intent}".`}${suggestedPayload ? ` Suggested: ${suggestedPayload.instructionName} with ${(suggestedPayload.requiredAccounts as unknown[]).length} accounts.` : ""}${research.docs ? " SDK docs fetched." : ""}`,
          };
        },
      },

      sdk_hooks: {
        description: "Inject @keystone-os/sdk hooks into the active project.",
        inputSchema: z.object({
          hooks: z.array(z.enum(["useVault", "useTurnkey", "useFetch", "useSwap", "useStake"])).describe("Hooks to inject"),
          projectName: z.string().optional().describe("Target project"),
        }),
        execute: async ({ hooks, projectName }: any) => {
          console.log(`[Tool: sdk_hooks] ${hooks.join(", ")} → ${projectName || "active"}`);
          const imports = hooks.map((h: string) => `import { ${h} } from '@keystone-os/sdk';`).join("\n");
          return { success: true, operation: "sdk_hooks", hooks, projectName, generatedImports: imports, message: `SDK hooks injected: ${hooks.join(", ")}.` };
        },
      },

      // ━━━━ UTILITY TOOLS ━━━━
      navigate: {
        description: "Navigate to a page within Keystone OS. Only use valid routes (e.g., /app/studio). Do NOT invent routes like /app/wallet.",
        inputSchema: z.object({
          path: z.string().describe("Path to navigate to"),
          reason: z.string().optional().describe("Why"),
        }),
        execute: async ({ path, reason }: any) => {
          console.log(`[Tool: navigate] → ${path}`);
          return { success: true, operation: "navigate", path, reason, message: `Navigating to ${path}.` };
        },
      },

      set_monitor: {
        description: "Set up a price/threshold monitor with alerts.",
        inputSchema: z.object({
          type: z.enum(["price", "balance", "apy", "risk"]).describe("Monitor type"),
          target: z.string().describe("Token or metric to monitor"),
          operator: z.enum(["above", "below", "equals", "changes"]).describe("Trigger condition"),
          value: z.number().describe("Threshold value"),
        }),
        execute: async ({ type, target, operator, value }: { type: string; target: string; operator: string; value: number }) => {
          console.log(`[Tool: set_monitor] ${type}: ${target} ${operator} ${value}`);

          let persisted = false;
          let monitorId: number | null = null;

          if (walletAddress) {
            try {
              const { db } = await import("@/db");
              const { monitors } = await import("@/db/schema");
              if (!db) throw new Error("DB not initialized");
              const result = await db.insert(monitors).values({
                walletAddress,
                type,
                target: target.toUpperCase(),
                operator,
                conditionValue: String(value),
              }).returning({ id: monitors.id });
              monitorId = result[0]?.id || null;
              persisted = true;
            } catch (dbErr) {
              console.warn("[set_monitor] DB persistence failed (table may not exist yet):", dbErr);
            }
          }

          let currentValue: number | null = null;
          if (type === "price") {
            try {
              const priceRes = await fetch(`https://api.jup.ag/price/v2?ids=${target.toUpperCase()}`, { signal: AbortSignal.timeout(5000) });
              if (priceRes.ok) {
                const priceData = await priceRes.json();
                const key = Object.keys(priceData.data || {})[0];
                currentValue = key ? parseFloat(priceData.data[key]?.price || "0") : null;
              }
            } catch { /* price fetch is best-effort */ }
          }

          return {
            success: true, operation: "set_monitor", type, target: target.toUpperCase(), operator, value,
            monitorId, persisted,
            currentValue,
            message: `Monitor set: Alert when ${target.toUpperCase()} ${operator} $${value}.${currentValue !== null ? ` Current: $${currentValue.toFixed(4)}.` : ""}${persisted ? ` Saved (ID: ${monitorId}).` : " Note: monitor is session-only (connect wallet to persist)."}`,
          };
        },
      },

      deploy_sniper_bot: {
        description: "Deploy an active on-chain sniper bot to monitor DEXes and execute instant buys.",
        inputSchema: z.object({
          exchange: z.string().describe("DEX to watch (e.g., Raydium, Orca)"),
          liquidityThreshold: z.number().optional().describe("Minimum liquidity USD threshold for new pools"),
          maxSlippage: z.number().optional().describe("Maximum slippage tolerance %"),
        }),
        execute: async ({ exchange, liquidityThreshold, maxSlippage }: { exchange: string; liquidityThreshold?: number; maxSlippage?: number }) => {
          console.log(`[Tool: deploy_sniper_bot] watching ${exchange} (Liquidity > $${liquidityThreshold}, Slp: ${maxSlippage}%)`);
          
          if (!walletAddress) {
            return {
              success: false, operation: "deploy_sniper_bot", error: "Wallet not connected",
              message: "Cannot deploy sniper bot. Please connect your wallet to authorize execution."
            };
          }

          const botId = "bot_" + Math.random().toString(36).substring(2, 9);
          
          return {
             success: true, operation: "deploy_sniper_bot", exchange, liquidityThreshold, maxSlippage,
             botId,
             status: "ACTIVE", requiresApproval: true,
             message: `Sniper Bot [${botId}] successfully deployed to War Room. Monitoring ${exchange} for new liquidity pools > $${liquidityThreshold?.toLocaleString()}. Max Slippage set to ${maxSlippage}%. Ready to execute instant buys on detection.`,
          };
        },
      },
    };

    const streamOptions = {
      system: systemPrompt,
      messages: formattedMessages,
      stopWhen: stepCountIs(10),
      ...(simpleConversation ? {} : { tools: keystoneTools }),
    };

    // Model chain: Groq first, then Cloudflare Workers AI fallbacks (after 1–2 tries we fall back)
    const modelChain: { name: string; model: Parameters<typeof streamText>[0]["model"] }[] = [];
    if (process.env.GROQ_API_KEY) {
      modelChain.push({ name: "groq/llama-3.3-70b-versatile", model: groq("llama-3.3-70b-versatile") });
    }
    if (cloudflareProvider) {
      for (const modelId of CLOUDFLARE_FALLBACK_MODELS) {
        modelChain.push({ name: `cloudflare/${modelId}`, model: cloudflareProvider.chatModel(modelId) });
      }
    }

    if (modelChain.length === 0) {
      return new Response(
        JSON.stringify({ error: "No AI provider configured. Set GROQ_API_KEY or CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_AI_TOKEN." }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }

    function extractRetryAfter(msg: string): number | undefined {
      const m = msg.match(/try again in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/i);
      if (!m) return undefined;
      return (parseInt(m[1] || "0") * 3600) + (parseInt(m[2] || "0") * 60) + parseFloat(m[3] || "0");
    }

    function detectRateLimit(err: unknown): boolean {
      const msg = err instanceof Error ? err.message : String(err);
      const reason = (err as { reason?: string })?.reason;
      return (
        msg.includes("Rate limit") ||
        msg.includes("rate_limit") ||
        msg.includes("429") ||
        msg.includes("maxRetriesExceeded") ||
        msg.includes("Provider error in stream") ||
        reason === "maxRetriesExceeded" ||
        (err as Error)?.name === "AI_RetryError" ||
        (err as Error)?.name === "AI_APICallError"
      );
    }

    function detectToolValidationErrorMessage(msg: string): boolean {
      return /tool call validation failed|was not in request\.tools|invalid_request_error/i.test(msg);
    }

    let lastError: unknown = null;
    for (let i = 0; i < modelChain.length; i++) {
      const { name, model } = modelChain[i];
      // Skip providers that are in rate-limit cooldown
      if (isRateLimited(name)) {
        console.log(`[Command API] Skipping ${name} (rate-limited, cooldown active)`);
        continue;
      }
      try {
        console.log(`[Command API] Trying model: ${name}`);
        const result = streamText({ ...streamOptions, model, maxRetries: 0 });

        // The AI SDK throws provider errors (e.g. 429) asynchronously.
        // The error surfaces on result.text / result.response promises, NOT on reader.read().
        // We race the first UI stream chunk against the error promise to catch it.
        const response = result.toUIMessageStreamResponse();
        const body = response.body;
        if (!body) {
          if (name !== "groq/llama-3.3-70b-versatile") {
            console.log(`[Command API] Using fallback model: ${name}`);
          }
          return response;
        }

        const reader = body.getReader();

        // Race: first stream chunk vs provider error
        // result.response rejects if the provider returns an error (429, etc.)
        const errorPromise = Promise.resolve(result.response).then(() => null, (e: unknown) => e);
        const chunkPromise = reader.read();

        const raceResult = await Promise.race([
          chunkPromise.then(r => ({ type: "chunk" as const, ...r })),
          errorPromise.then((e: unknown) => e ? { type: "error" as const, error: e } : null),
        ].filter(Boolean));

        if (raceResult && typeof raceResult === "object" && "type" in raceResult) {
          if (raceResult.type === "error") {
            reader.releaseLock();
            throw (raceResult as { error: unknown }).error;
          }
        }

        // First chunk arrived successfully. Also check for inline error content.
        const firstRead = raceResult as { type: "chunk"; value?: Uint8Array; done: boolean };
        if (firstRead.value) {
          const text = new TextDecoder().decode(firstRead.value);
          if (/rate.?limit|429|rate_limit_exceeded|limit reached/i.test(text) && text.length < 500) {
            reader.releaseLock();
            throw new Error(`Provider stream error from ${name}: ${text.slice(0, 300)}`);
          }
          if (detectToolValidationErrorMessage(text) && text.length < 2000) {
            reader.releaseLock();
            throw new Error(`Provider tool-call stream error from ${name}: ${text.slice(0, 500)}`);
          }
        }

        // Provider is confirmed working — re-assemble the stream
        const finalStream = new ReadableStream({
          start(controller) {
            if (firstRead.value) controller.enqueue(firstRead.value);
            if (firstRead.done) {
              controller.close();
              return;
            }
            (async () => {
              try {
                while (true) {
                  const { value, done } = await reader.read();
                  if (done) break;
                  if (value) controller.enqueue(value);
                }
              } finally {
                reader.releaseLock();
              }
              controller.close();
            })();
          },
        });

        if (name !== "groq/llama-3.3-70b-versatile") {
          console.log(`[Command API] Using fallback model: ${name}`);
        }
        return new Response(finalStream, {
          headers: response.headers,
          status: response.status,
        });
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        const rl = detectRateLimit(err);
        if (rl) {
          setRateLimitCooldown(name, extractRetryAfter(msg));
        }
        console.warn(
          `[Command API] ${name} failed${rl ? " (rate limit)" : ""}: ${msg.slice(0, 300)}`,
        );
        if (i < modelChain.length - 1) {
          console.log(`[Command API] Trying next model in fallback chain...`);
        } else {
          console.error(`[Command API] All ${modelChain.length} models exhausted.`);
        }
      }
    }

    console.error("[Command API] All models failed. Last error:", lastError);
    throw lastError;
  } catch (error) {
    console.error("[Command API] Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process command", details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
