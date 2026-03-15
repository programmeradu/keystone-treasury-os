/**
 * LLM Strategy Planner
 * Converts natural language user requests into structured execution plans
 * for deterministic agents to execute
 * 
 * Uses Groq (llama-3.3-70b-versatile) as the LLM provider
 * Falls back to a deterministic local parser when Groq is unavailable
 */

import Groq from "groq-sdk";
import OpenAI from "openai";
import { PluginRegistry } from "@/lib/plugins/registry";
import { knowledgeMemory } from "@/lib/knowledge-memory";

export interface ActionItem {
  operation: string;
  parameters: Record<string, any>;
}

export interface StrategyPlan {
  actions: ActionItem[];
  reasoning: string;
  direct_answer?: string;
  logs: string[];
  warnings: string[];
  estimatedOutcome: string;
  confidence?: "high" | "medium" | "low";
  isChain?: boolean;
}

// ─── Deterministic Local Parser (works without LLM) ──────────────────
// Handles common intents so the agent is functional from birth.

const TOKEN_ALIASES: Record<string, string> = {
  sol: "SOL", solana: "SOL",
  usdc: "USDC", usdt: "USDT",
  eth: "ETH", ethereum: "ETH",
  btc: "BTC", bitcoin: "BTC",
  bonk: "BONK", jup: "JUP", jupiter: "JUP",
  ray: "RAY", raydium: "RAY",
  orca: "ORCA", msol: "MSOL", jito: "JITO",
  wif: "WIF", trump: "TRUMP", pyth: "PYTH",
};

function resolveToken(word: string): string {
  return TOKEN_ALIASES[word.toLowerCase()] || word.toUpperCase();
}

function localParsePlan(prompt: string): StrategyPlan | null {
  const lower = prompt.toLowerCase().trim();

  // ─── Multi-step chains: "swap X and stake Y", "swap X then send Y" ─
  // Detect chain keywords splitting multiple intents
  const chainSplit = lower.split(/\s+(?:and\s+then|then|and|,\s*then)\s+/);
  if (chainSplit.length >= 2) {
    const actions: ActionItem[] = [];
    const logs: string[] = [];
    let prevOutputToken: string | null = null;
    let prevAmount: number | null = null;

    for (const segment of chainSplit) {
      const seg = segment.trim();

      // Parse swap segment
      const swapSeg = seg.match(
        /(?:swap|convert|exchange|trade)\s+([\d,.]+)\s*[k]?\s+(\w+)\s+(?:to|into|for|->|→)\s+(\w+)/i
      );
      if (swapSeg) {
        let amt = parseFloat(swapSeg[1].replace(/,/g, ""));
        if (/k/i.test(swapSeg[0]) && amt < 10000) amt *= 1000;
        const inTok = resolveToken(swapSeg[2]);
        const outTok = resolveToken(swapSeg[3]);
        actions.push({ operation: "swap", parameters: { inputToken: inTok, outputToken: outTok, amount: amt } });
        logs.push(`Step ${actions.length}: Swap ${amt} ${inTok} → ${outTok}`);
        prevOutputToken = outTok;
        prevAmount = amt;
        continue;
      }

      // Parse stake segment — "stake half via marinade", "stake 15 sol"
      const stakeSeg = seg.match(
        /(?:stake)\s+([\d,.]+|half|all|rest)\s*(?:sol|solana)?\s*(?:(?:with|on|via|through)\s+(\w+))?/i
      );
      if (stakeSeg) {
        let amt: number;
        const amtStr = stakeSeg[1].toLowerCase();
        if (amtStr === "half" && prevAmount) amt = prevAmount / 2;
        else if (amtStr === "all" && prevAmount) amt = prevAmount;
        else if (amtStr === "rest" && prevAmount) amt = prevAmount;
        else amt = parseFloat(amtStr.replace(/,/g, "")) || 0;
        const provider = stakeSeg[2] || "marinade";
        // If previous step swapped to a token, stake that token
        const stakeToken = prevOutputToken || "SOL";
        actions.push({ operation: "stake", parameters: { amount: amt, provider, token: stakeToken } });
        logs.push(`Step ${actions.length}: Stake ${amt} ${stakeToken} via ${provider}`);
        continue;
      }

      // Parse transfer segment — "send half to <address>", "send 15 usdc to <addr>"
      const transferSeg = seg.match(
        /(?:send|transfer|pay)\s+([\d,.]+|half|all|rest)\s*(\w+)?\s+to\s+([A-Za-z0-9]{32,44})/i
      );
      if (transferSeg) {
        let amt: number;
        const amtStr = transferSeg[1].toLowerCase();
        if (amtStr === "half" && prevAmount) amt = prevAmount / 2;
        else if (amtStr === "all" && prevAmount) amt = prevAmount;
        else amt = parseFloat(amtStr.replace(/,/g, "")) || 0;
        const token = transferSeg[2] ? resolveToken(transferSeg[2]) : (prevOutputToken || "SOL");
        const recipient = transferSeg[3];
        actions.push({ operation: "transfer", parameters: { recipient, token, amount: amt } });
        logs.push(`Step ${actions.length}: Transfer ${amt} ${token} → ${recipient.slice(0, 8)}...`);
        continue;
      }

      // Parse yield deposit — "deposit X into marinade/drift/etc"
      const yieldSeg = seg.match(
        /(?:deposit|lend)\s+([\d,.]+|half|all|rest)\s*(\w+)?\s+(?:into|on|to|via)\s+(\w+)/i
      );
      if (yieldSeg) {
        let amt: number;
        const amtStr = yieldSeg[1].toLowerCase();
        if (amtStr === "half" && prevAmount) amt = prevAmount / 2;
        else if (amtStr === "all" && prevAmount) amt = prevAmount;
        else amt = parseFloat(amtStr.replace(/,/g, "")) || 0;
        const token = yieldSeg[2] ? resolveToken(yieldSeg[2]) : (prevOutputToken || "SOL");
        const protocol = yieldSeg[3];
        actions.push({ operation: "yield_deposit", parameters: { amount: amt, token, protocol } });
        logs.push(`Step ${actions.length}: Deposit ${amt} ${token} into ${protocol}`);
        continue;
      }
    }

    if (actions.length >= 2) {
      return {
        actions,
        reasoning: `Local parser: ${actions.length}-step chain detected`,
        logs,
        warnings: ["Multi-step execution — each step requires wallet approval"],
        estimatedOutcome: logs.join(" → "),
        confidence: "medium",
        isChain: true,
      };
    }
  }

  // ─── Swap: "swap 50 sol to usdc", "convert 1000 usdc into sol" ─────
  const swapMatch = lower.match(
    /(?:swap|convert|exchange|trade)\s+([\d,.]+)\s*[k]?\s+(\w+)\s+(?:to|into|for|->|→)\s+(\w+)/i
  );
  if (swapMatch) {
    let amount = parseFloat(swapMatch[1].replace(/,/g, ""));
    if (/k/i.test(swapMatch[0]) && amount < 10000) amount *= 1000;
    const inputToken = resolveToken(swapMatch[2]);
    const outputToken = resolveToken(swapMatch[3]);
    return {
      actions: [{ operation: "swap", parameters: { inputToken, outputToken, amount } }],
      reasoning: `Local parser: swap ${amount} ${inputToken} → ${outputToken}`,
      logs: [`Parsed swap: ${amount} ${inputToken} → ${outputToken}`],
      warnings: ["Parsed locally without LLM — add GROQ_API_KEY for smarter planning"],
      estimatedOutcome: `Swap ${amount} ${inputToken} to ${outputToken} via Jupiter`,
      confidence: "medium",
      isChain: false,
    };
  }

  // ─── Transfer: "send 10 sol to <address>" ──────────────────────────
  const transferMatch = lower.match(
    /(?:send|transfer|pay)\s+([\d,.]+)\s*[k]?\s+(\w+)\s+to\s+([A-Za-z0-9]{32,44})/i
  );
  if (transferMatch) {
    let amount = parseFloat(transferMatch[1].replace(/,/g, ""));
    if (/k/i.test(transferMatch[0]) && amount < 10000) amount *= 1000;
    const token = resolveToken(transferMatch[2]);
    const recipient = transferMatch[3];
    return {
      actions: [{ operation: "transfer", parameters: { recipient, token, amount } }],
      reasoning: `Local parser: transfer ${amount} ${token} to ${recipient}`,
      logs: [`Parsed transfer: ${amount} ${token} → ${recipient}`],
      warnings: ["Parsed locally without LLM"],
      estimatedOutcome: `Transfer ${amount} ${token} to ${recipient.slice(0, 8)}...`,
      confidence: "medium",
      isChain: false,
    };
  }

  // ─── Stake: "stake 100 sol", "stake 50 sol with marinade" ──────────
  const stakeMatch = lower.match(
    /(?:stake)\s+([\d,.]+)\s*[k]?\s+(?:sol|solana)(?:\s+(?:with|on|via)\s+(\w+))?/i
  );
  if (stakeMatch) {
    let amount = parseFloat(stakeMatch[1].replace(/,/g, ""));
    const provider = stakeMatch[2] || "marinade";
    return {
      actions: [{ operation: "stake", parameters: { amount, provider } }],
      reasoning: `Local parser: stake ${amount} SOL with ${provider}`,
      logs: [`Parsed stake: ${amount} SOL via ${provider}`],
      warnings: ["Parsed locally without LLM"],
      estimatedOutcome: `Stake ${amount} SOL with ${provider}`,
      confidence: "medium",
      isChain: false,
    };
  }

  // ─── Navigate: "go to dashboard", "show analytics", "open settings" ─
  const navMap: Record<string, string> = {
    dashboard: "/app", home: "/app",
    team: "/app/team", members: "/app/team",
    settings: "/app/settings", config: "/app/settings",
    analytics: "/app/analytics", foresight: "/app/analytics",
    studio: "/app/studio",
  };
  const navMatch = lower.match(/(?:go\s+to|show|open|navigate\s+to|view)\s+(\w+)/i);
  if (navMatch) {
    const target = navMatch[1].toLowerCase();
    const path = navMap[target];
    if (path) {
      return {
        actions: [{ operation: "navigate", parameters: { path } }],
        reasoning: `Local parser: navigate to ${path}`,
        logs: [`Navigate to ${path}`],
        warnings: [],
        estimatedOutcome: `Navigating to ${target}`,
        confidence: "high",
        isChain: false,
      };
    }
  }

  // ─── Refresh: "refresh", "sync vault" ──────────────────────────────
  if (/^(?:refresh|sync|reload|update)/.test(lower)) {
    return {
      actions: [{ operation: "refresh", parameters: {} }],
      reasoning: "Local parser: refresh dashboard",
      logs: ["Dashboard refresh"],
      warnings: [],
      estimatedOutcome: "Dashboard data refreshed",
      confidence: "high",
      isChain: false,
    };
  }

  // ─── Learn protocol: "learn drift", "register protocol marginfi" ───
  const learnMatch = lower.match(
    /(?:learn|register|discover|add\s+protocol)\s+(?:protocol\s+)?([\w.-]+)/i
  );
  if (learnMatch) {
    const name = learnMatch[1];
    return {
      actions: [{ operation: "plugin_register", parameters: { name, searchQuery: `${name} Solana protocol SDK` } }],
      reasoning: `Local parser: learn protocol ${name} via Infinite Discovery Stack`,
      logs: [`Initiating discovery for ${name}`],
      warnings: ["Will attempt live web research via Tavily/Jina/Firecrawl"],
      estimatedOutcome: `Learn and register ${name} protocol capabilities`,
      confidence: "medium",
      isChain: false,
    };
  }

  // ─── Governance: "list proposals", "approve proposal 2" ────────────
  if (/(?:list|show|pending)\s*proposal/i.test(lower)) {
    return {
      actions: [{ operation: "governance_list", parameters: {} }],
      reasoning: "Local parser: list governance proposals",
      logs: ["Fetching proposals"],
      warnings: [],
      estimatedOutcome: "List all pending governance proposals",
      confidence: "high",
      isChain: false,
    };
  }
  const approveMatch = lower.match(/(?:approve|sign)\s+proposal\s+#?(\d+)/i);
  if (approveMatch) {
    return {
      actions: [{ operation: "governance_approve", parameters: { proposalIndex: parseInt(approveMatch[1]) } }],
      reasoning: `Local parser: approve proposal ${approveMatch[1]}`,
      logs: [`Approving proposal #${approveMatch[1]}`],
      warnings: ["This will sign the proposal on-chain"],
      estimatedOutcome: `Approve proposal #${approveMatch[1]}`,
      confidence: "high",
      isChain: false,
    };
  }

  // ─── Monitor: "alert me when sol > 200" ────────────────────────────
  const monitorMatch = lower.match(
    /(?:alert|notify|monitor|watch)\s+(?:me\s+)?(?:when|if)\s+(\w+)\s*([><])\s*\$?([\d,.]+)/i
  );
  if (monitorMatch) {
    const target = resolveToken(monitorMatch[1]);
    const operator = monitorMatch[2] as ">" | "<";
    const value = parseFloat(monitorMatch[3].replace(/,/g, ""));
    return {
      actions: [{ operation: "monitor", parameters: { type: "PRICE", target, operator, value } }],
      reasoning: `Local parser: monitor ${target} ${operator} $${value}`,
      logs: [`Setting price alert: ${target} ${operator} $${value}`],
      warnings: [],
      estimatedOutcome: `Alert when ${target} ${operator} $${value}`,
      confidence: "high",
      isChain: false,
    };
  }

  // ─── Browser Tool: research/read a URL ─────────────────────────
  const researchMatch = lower.match(
    /(?:research|read|fetch|browse|analyze)\s+(?:(?:page|site|url|docs?)\s+)?(?:at\s+|from\s+)?(https?:\/\/[^\s]+)/i
  );
  if (researchMatch) {
    const url = researchMatch[1];
    return {
      actions: [{ operation: "browser_research", parameters: { url, action: "markdown" } }],
      reasoning: `Local parser: research URL ${url}`,
      logs: [`Browser: converting ${url} to markdown`],
      warnings: [],
      estimatedOutcome: `Read and analyze content from ${url}`,
      confidence: "high",
      isChain: false,
    };
  }

  // ─── Browser Tool: screenshot a URL ───────────────────────────
  const screenshotMatch = lower.match(
    /(?:screenshot|capture|snap)\s+(?:(?:page|site|url)\s+)?(?:at\s+|from\s+|of\s+)?(https?:\/\/[^\s]+)/i
  );
  if (screenshotMatch) {
    const url = screenshotMatch[1];
    return {
      actions: [{ operation: "browser_screenshot", parameters: { url, action: "screenshot" } }],
      reasoning: `Local parser: screenshot ${url}`,
      logs: [`Browser: capturing screenshot of ${url}`],
      warnings: [],
      estimatedOutcome: `Screenshot of ${url}`,
      confidence: "high",
      isChain: false,
    };
  }

  // ─── Browser Tool: scrape a URL ───────────────────────────────
  const scrapeMatch = lower.match(
    /(?:scrape|extract|pull\s+data\s+from)\s+(?:(?:page|site|url)\s+)?(?:at\s+|from\s+)?(https?:\/\/[^\s]+)/i
  );
  if (scrapeMatch) {
    const url = scrapeMatch[1];
    return {
      actions: [{ operation: "browser_scrape", parameters: { url, action: "links" } }],
      reasoning: `Local parser: scrape links from ${url}`,
      logs: [`Browser: extracting links from ${url}`],
      warnings: [],
      estimatedOutcome: `Extract all links and data from ${url}`,
      confidence: "high",
      isChain: false,
    };
  }

  return null; // Not parseable locally
}

/**
 * Plan a strategy based on natural language user request
 * Returns structured JSON that agents can deterministically execute
 * Uses Groq as the sole LLM, with local parser fallback
 */
export async function planStrategy(
  userRequest: string,
  walletState: {
    balances: Record<string, number>;
    portfolio: Record<string, number>;
    totalValue?: number;
  }
): Promise<StrategyPlan> {
  const apiKey = process.env.GROQ_API_KEY || (process.env.CI || process.env.NODE_ENV === "test" ? "dummy-key" : undefined);

  // ─── No Groq key → local parser only ──────────────────────────
  if (!apiKey) {
    console.log("[StrategyPlanner] GROQ_API_KEY not set, using local parser");
    const localPlan = localParsePlan(userRequest);
    if (localPlan) return localPlan;
    throw new Error(
      "GROQ_API_KEY not configured and local parser could not understand this request. " +
      "Set GROQ_API_KEY in .env.local for full AI capabilities."
    );
  }

  // ─── Build dynamic system prompt with learned plugins ─────────────
  const learnedPlugins = PluginRegistry.getPlugins();
  const pluginContext = learnedPlugins.length > 0
    ? `\n\nLearned Protocols (available for execution):\n` +
    learnedPlugins.map(p =>
      `- "${p.name}": ${p.description} [programId: ${p.programId}] ops: ${p.operations.map(o => o.name).join(", ")}`
    ).join("\n")
    : "";

  const systemPrompt = `You are a professional crypto portfolio advisor. Your job is to understand user requests
and create structured execution plans for deterministic agents.

IMPORTANT: Only plan, do NOT execute. You plan, agents execute.

Return ONLY valid JSON (no markdown, no explanation before/after):
{
  "actions": [
    {
      "operation": "...",
      "parameters": { ... }
    }
  ],
  "reasoning": "Internal thought process/strategy derivation",
  "direct_answer": "Direct conversational response to the user's question, if applicable. E.g. 'Your treasury is healthy with $1.2M total value.'",
  "logs": ["Technical step logs"],
  "warnings": ["Risks"],
  "estimatedOutcome": "Outcome",
  "confidence": "high|medium|low",
  "isChain": true
}

Operations:
- "swap": Direct token swap via Jupiter (parameters: inputToken, outputToken, amount)
- "transfer": Send tokens or SOL to a recipient (parameters: recipient, token, amount)
- "stake": Stake SOL with validator or Marinade (parameters: amount, provider)
- "bridge": Move assets across chains (parameters: sourceChain, destinationChain, token, amount)
- "yield_deposit": Deposit assets into a lending protocol (parameters: protocol, token, amount)
- "yield_withdraw": Withdraw assets from a lending protocol (parameters: protocol, token, amount)
- "monitor": Set a persistent alert or rule (parameters: type ["PRICE"|"BALANCE"], target, operator [">"|"<"], value).
- "plugin_register": Add a new protocol to Keystone (parameters: name, programId, description, operations [{name, description, parameters}]). Use this when user says "Register/Learn protocol X".
- "navigate": Move to a different page in Keystone (parameters: path). Target paths: "/app" (Dashboard), "/app/team", "/app/settings", "/app/analytics", "/app/studio".
- "refresh": Sync the vault data and update the dashboard.
- "ui_query": Answer questions about the user's current data (parameters: query).
- "governance_list": List all pending team proposals and their status.
- "governance_approve": Sign/Approve a specific team proposal (parameters: proposalIndex).
- "governance_execute": Execute/Finalize a fully signed proposal (parameters: proposalIndex).
- "external_balance": Check the SOL balance of any external wallet address (parameters: address).
- "rebalance": Rebalance portfolio to target allocations (parameters: targetAllocations {})
- "browser_research": Read a URL and convert to clean markdown (parameters: url). Use for protocol research, reading docs, analyzing web pages.
- "browser_screenshot": Capture a screenshot of a URL (parameters: url). Use for visual proof, contract verification, monitoring.
- "browser_scrape": Extract links and elements from a URL (parameters: url, elements [CSS selectors]). Use for data extraction, competitive intel.
- "browser_read": AI-powered structured extraction from a URL (parameters: url, prompt). Use for extracting specific data points like prices, TVL, APYs.

God-Mode Ability:
You can learn ANY new protocol seamlessly using the "Infinite Discovery Stack":
1. Use **Tavily** if you only have a name and need to find the official documentation URL.
2. Use **r.jina.ai/[URL]** for instant markdown conversion of a specific documentation page.
3. Use **Firecrawl** if a single page is insufficient (e.g., complex GitBooks) to recursively crawl the entire site for all technical instructions.
Action: First "plugin_register" the learned capabilities, then execute.
Build-mode policy: If the user asks to build/create/develop code (bot/app/script/automation), do not plan live transaction operations (swap/bridge/transfer/stake/yield/rebalance/dca). Plan research + studio initialization + code analysis/hooks, then include a final navigate action to "/app/studio".
For rebalance, always include a targetAllocations object like: { "SOL": 50, "USDC": 30, "JUP": 20 }${pluginContext}`;

  // ─── Recall prior knowledge for context ──────────────────────────
  let knowledgeContext = "";
  try {
    // Extract key terms from the request to search
    const searchTerms = userRequest.replace(/[^a-zA-Z0-9\s.:/]/g, "").trim();
    const recalled = await knowledgeMemory.recall(searchTerms, 3);
    if (recalled.length > 0) {
      knowledgeContext = `\n\nPrior Intelligence (from Keystone's memory):\n` +
        recalled.map(k =>
          `- [${k.source}] ${k.title || k.sourceUrl}: ${k.summary?.slice(0, 300) || "(no summary)"}`
        ).join("\n");
    }
  } catch (recallErr) {
    console.warn("[StrategyPlanner] Knowledge recall failed:", recallErr);
  }

  const userPrompt = `User request: "${userRequest}"

Current wallet state:
Balances: ${JSON.stringify(walletState.balances)}
Portfolio allocation: ${JSON.stringify(walletState.portfolio)}
${walletState.totalValue ? `Total portfolio value: $${walletState.totalValue.toLocaleString()}` : ""}${knowledgeContext}

Create an execution plan. Return ONLY JSON, no markdown.`;

  try {
    const groq = new Groq({ apiKey });
    const message = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    const responseText = message.choices[0]?.message?.content;
    if (!responseText) throw new Error("No response from Groq");

    // Parse response - handle markdown code blocks
    let jsonText = responseText.trim();
    if (jsonText.includes("```json")) {
      jsonText = jsonText.split("```json")[1].split("```")[0].trim();
    } else if (jsonText.includes("```")) {
      jsonText = jsonText.split("```")[1].split("```")[0].trim();
    }

    const plan = JSON.parse(jsonText) as StrategyPlan;

    if (!plan.actions || !plan.reasoning || !plan.logs || !plan.warnings || !plan.estimatedOutcome) {
      throw new Error("Invalid plan structure from LLM");
    }

    console.log("[StrategyPlanner] Success via Groq");
    return plan;

  } catch (error) {
    // Groq failed — try local parser as fallback
    console.warn("[StrategyPlanner] Groq failed, trying local parser:", error);
    const localPlan = localParsePlan(userRequest);
    if (localPlan) {
      localPlan.warnings = [
        ...(localPlan.warnings || []),
        `Groq unavailable (${error instanceof Error ? error.message : String(error)}), used local parser`
      ];
      return localPlan;
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse Groq response as JSON: ${error.message}`);
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
  }
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY || (process.env.CI || process.env.NODE_ENV === "test" ? "dummy-key" : undefined);
  if (!apiKey) throw new Error("GROQ_API_KEY not configured. Set it in .env.local");

  const systemPrompt = `You are a crypto portfolio advisor. Provide 2-3 specific, actionable recommendations.
Be concise and direct. Reference specific tokens and percentages when possible.`;

  const userPrompt = `Situation: ${userSituation}

Current wallet:
Balances: ${JSON.stringify(walletState.balances)}
Portfolio: ${JSON.stringify(walletState.portfolio)}

What strategies should I consider? (2-3 specific recommendations)`;

  try {
    const groq = new Groq({ apiKey });
    const message = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 512,
      temperature: 0.5,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    return message.choices[0]?.message?.content || "";
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
  }
): Promise<{
  valid: boolean;
  reason?: string;
}> {
  const apiKey = process.env.GROQ_API_KEY || (process.env.CI || process.env.NODE_ENV === "test" ? "dummy-key" : undefined);
  if (!apiKey) return { valid: true }; // Skip validation if no key

  const systemPrompt = `You are a security validator. Check if a planned operation is reasonable.
Return JSON only: { "valid": true/false, "reason": "explanation if invalid" }`;

  const userPrompt = `Planned workflow: ${JSON.stringify(plan.actions)}
Current portfolio: ${JSON.stringify(walletState.portfolio)}

Is this plan reasonable and safe?`;

  try {
    const groq = new Groq({ apiKey });
    const message = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 256,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    const responseText = message.choices[0]?.message?.content || "";

    try {
      let jsonText = responseText.trim();
      if (jsonText.includes("```json")) {
        jsonText = jsonText.split("```json")[1].split("```")[0].trim();
      } else if (jsonText.includes("```")) {
        jsonText = jsonText.split("```")[1].split("```")[0].trim();
      }
      return JSON.parse(jsonText);
    } catch {
      return { valid: true }; // Assume valid if parsing fails
    }
  } catch (error) {
    console.error("Validation error:", error);
    return { valid: true }; // Assume valid on error - don't block execution
  }
}
