/**
 * Foresight Agent — Natural Language → Simulation Variables parser.
 * No code generation — the existing Analytics charts are the rendering layer.
 *
 * v2 — Expanded NLP patterns:
 *   • "yield drops to 2%", "APY falls to 5%", "yield of 8%"
 *   • "SOL stays same price", "SOL unchanged"
 *   • "SOL drops to $100", "SOL price reaches $50"
 *   • "burn rate $20k/month", "spending 30k monthly"
 *   • Multi-variable: "SOL drops 40% AND burn 15k/month"
 */

import type { SimulationVariable } from "@/lib/stores/simulation-store";

export interface ParsedForesight {
    title: string;
    description: string;
    variables: SimulationVariable[];
    timeframeMonths: number;
    /** Confidence that the parser understood the prompt (0-1) */
    confidence: number;
    /** Raw explanation of what was parsed */
    parsedSummary: string[];
}

export interface PortfolioSnapshot {
    symbol: string;
    amount: number;
    price: number;
}

export interface ForesightScenario extends ParsedForesight {
    generatedCode: string;
    portfolio: PortfolioSnapshot[];
}

// ─── Foresight Keywords ─────────────────────────────────────────────

const FORESIGHT_KEYWORDS = [
    /what\s*if/i,
    /simulat/i,
    /foresight/i,
    /runway/i,
    /project(?:ion|ed)/i,
    /scenario/i,
    /burn\s*rate/i,
    /deplet/i,
    /drops?\s+\d/i,
    /rises?\s+\d/i,
    /crashes?/i,
    /moons?/i,
    /apy|yield/i,
    /inflow/i,
    /outflow/i,
    /buyback/i,
    /how\s+long/i,
    /stays?\s+(?:the\s+)?same/i,
    /unchanged/i,
    /reaches?\s+\$/i,
    /goes?\s+to\s+\$/i,
    /spending/i,
    /revenue/i,
    /income/i,
];

const ASSET_PATTERNS: Record<string, RegExp> = {
    SOL: /\bsol(?:ana)?\b/i,
    ETH: /\beth(?:ereum)?\b/i,
    BTC: /\bbtc|bitcoin\b/i,
    USDC: /\busdc\b/i,
    USDT: /\busdt\b/i,
    BONK: /\bbonk\b/i,
    JUP: /\bjup(?:iter)?\b/i,
    TRUMP: /\btrump\b/i,
    WIF: /\bwif\b/i,
    PYTH: /\bpyth\b/i,
    RAY: /\bray(?:dium)?\b/i,
    ORCA: /\borca\b/i,
    MNDE: /\bmnde|marinade\b/i,
    JITO: /\bjito|jto\b/i,
    MSOL: /\bmsol\b/i,
    BSOL: /\bbsol\b/i,
    JItosol: /\bjitosol\b/i,
};

/** Resolve a word to its canonical symbol */
function resolveAsset(word: string): string {
    for (const [sym, rx] of Object.entries(ASSET_PATTERNS)) {
        if (rx.test(word)) return sym;
    }
    return word.toUpperCase();
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Detect whether a CommandBar prompt is a foresight/simulation query.
 */
export function isForesightPrompt(prompt: string): boolean {
    const lower = prompt.toLowerCase().trim();
    return FORESIGHT_KEYWORDS.some(rx => rx.test(lower));
}

/**
 * Parse a natural language prompt into structured simulation variables.
 * Returns title, description, variables array, timeframe, and confidence.
 */
export function parseForesightPrompt(prompt: string): ParsedForesight {
    const variables: SimulationVariable[] = [];
    const parsedSummary: string[] = [];
    let timeframeMonths = 12;
    let varIdx = 0;

    // ─── Extract timeframe ──────────────────────────────────────
    const timeMatch = prompt.match(/(\d+)\s*(month|year|week|day)s?/i);
    if (timeMatch) {
        const num = parseInt(timeMatch[1]);
        const unit = timeMatch[2].toLowerCase();
        if (unit.startsWith("year")) timeframeMonths = num * 12;
        else if (unit.startsWith("week")) timeframeMonths = Math.max(1, Math.round(num / 4));
        else if (unit.startsWith("day")) timeframeMonths = Math.max(1, Math.round(num / 30));
        else timeframeMonths = num;
        parsedSummary.push(`Timeframe: ${num} ${unit}(s) → ${timeframeMonths} months`);
    }

    // ─── 1. Price changes: percentage ───────────────────────────
    // "SOL drops 50%", "ETH rises 30%", "BTC falls by 20%"
    const pricePatterns = [
        /(\w+)\s+(?:drops?|falls?|declines?|crashes?|tanks?|slips?|loses?)\s+(?:by\s+)?(\d+(?:\.\d+)?)\s*%/gi,
        /(\w+)\s+(?:rises?|gains?|increases?|pumps?|moons?|grows?|jumps?)\s+(?:by\s+)?(\d+(?:\.\d+)?)\s*%/gi,
        /(\w+)\s+(?:price|value)\s+(?:drops?|falls?|declines?)\s+(?:by\s+)?(\d+(?:\.\d+)?)\s*%/gi,
        /(\w+)\s+(?:price|value)\s+(?:rises?|gains?|increases?)\s+(?:by\s+)?(\d+(?:\.\d+)?)\s*%/gi,
    ];

    const parsedPriceAssets = new Set<string>();

    for (const pattern of pricePatterns) {
        let match;
        while ((match = pattern.exec(prompt)) !== null) {
            const pctValue = parseFloat(match[2]);
            const isNegative = /drop|fall|decline|crash|tank|slip|lose/i.test(match[0]);
            const asset = resolveAsset(match[1]);

            // Avoid double-counting if same asset matched by multiple patterns
            if (parsedPriceAssets.has(asset)) continue;
            parsedPriceAssets.add(asset);

            const value = isNegative ? -pctValue / 100 : pctValue / 100;
            variables.push({
                id: `price_${asset.toLowerCase()}_${varIdx++}`,
                label: `${asset} Price ${isNegative ? "Decline" : "Increase"}`,
                type: "price_change",
                asset,
                value,
                unit: "percent",
            });
            parsedSummary.push(`Price: ${asset} ${isNegative ? "-" : "+"}${pctValue}%`);
        }
    }

    // ─── 2. Price targets: "SOL drops to $100", "SOL reaches $50" ─
    // These need current price context at simulation time, so we emit as 'custom' with
    // a special convention: type=price_target, value=target price in USD
    const priceTargetPatterns = [
        /(\w+)\s+(?:drops?|falls?|goes?|declines?|crashes?)\s+to\s+\$?([\d,.]+)/gi,
        /(\w+)\s+(?:rises?|reaches?|hits?|pumps?|goes?\s+up)\s+to\s+\$?([\d,.]+)/gi,
        /(\w+)\s+(?:price|value)\s+(?:reaches?|hits?|drops?\s+to|goes?\s+to)\s+\$?([\d,.]+)/gi,
    ];

    for (const pattern of priceTargetPatterns) {
        let match;
        while ((match = pattern.exec(prompt)) !== null) {
            const targetPrice = parseFloat(match[2].replace(/,/g, ""));
            const asset = resolveAsset(match[1]);
            if (parsedPriceAssets.has(asset)) continue;
            parsedPriceAssets.add(asset);

            variables.push({
                id: `price_target_${asset.toLowerCase()}_${varIdx++}`,
                label: `${asset} Price Target $${targetPrice}`,
                type: "custom",
                asset,
                value: targetPrice,
                unit: "usd",
            });
            parsedSummary.push(`Price target: ${asset} → $${targetPrice}`);
        }
    }

    // ─── 3. "Stays same price" / "unchanged" ────────────────────
    const staysPatterns = [
        /(\w+)\s+(?:stays?|remains?|holds?|keeps?)\s+(?:the\s+)?(?:same|flat|steady|stable|unchanged)/gi,
        /(\w+)\s+(?:price|value)\s+(?:stays?|remains?|is)\s+(?:the\s+)?(?:same|unchanged|flat|stable)/gi,
        /(\w+)\s+(?:is\s+)?unchanged/gi,
        /(\w+)\s+(?:doesn'?t|does\s*not)\s+(?:change|move)/gi,
    ];

    for (const pattern of staysPatterns) {
        let match;
        while ((match = pattern.exec(prompt)) !== null) {
            const asset = resolveAsset(match[1]);
            if (parsedPriceAssets.has(asset)) continue;
            parsedPriceAssets.add(asset);

            variables.push({
                id: `price_${asset.toLowerCase()}_stable_${varIdx++}`,
                label: `${asset} Price Unchanged`,
                type: "price_change",
                asset,
                value: 0, // 0% change
                unit: "percent",
            });
            parsedSummary.push(`Price: ${asset} unchanged (0%)`);
        }
    }

    // ─── 4. Burn rate ───────────────────────────────────────────
    // "$20k/month", "burn rate of $50,000", "spending 30k monthly", "20k burn"
    const burnPatterns = [
        /\$?([\d,.]+)\s*[kK]?\s*(?:\/\s*(?:month|mo)|per\s*month|monthly|monthly\s+burn)/i,
        /burn\s*(?:rate\s*)?(?:of\s*)?\$?([\d,.]+)\s*[kK]?/i,
        /spend(?:ing)?\s+\$?([\d,.]+)\s*[kK]?\s*(?:\/?\s*(?:month|mo)|monthly|per\s+month)?/i,
        /(?:monthly\s+)?(?:expenses?|costs?|outflows?)\s+(?:of\s+)?\$?([\d,.]+)\s*[kK]?/i,
        /\$?([\d,.]+)\s*[kK]?\s*(?:burn|spend|outflow)/i,
    ];

    for (const burnPattern of burnPatterns) {
        const burnMatch = prompt.match(burnPattern);
        if (burnMatch) {
            // Find which capture group has the number (group 1 or group 2)
            const rawNum = burnMatch[1] || burnMatch[2];
            if (rawNum) {
                let val = parseFloat(rawNum.replace(/,/g, ""));
                if (/k/i.test(burnMatch[0]) && val < 1000) val *= 1000;
                // Avoid duplicates
                if (!variables.some(v => v.type === "burn_rate")) {
                    variables.push({
                        id: `burn_${varIdx++}`,
                        label: "Monthly Burn Rate",
                        type: "burn_rate",
                        value: val,
                        unit: "usd",
                    });
                    parsedSummary.push(`Burn: $${val.toLocaleString()}/month`);
                }
            }
            break; // only take first burn match
        }
    }

    // ─── 5. Inflow / Revenue ────────────────────────────────────
    const inflowPatterns = [
        /inflow\s+(?:of\s+)?\$?([\d,.]+)\s*[kK]?\s*(?:\/\s*(?:month|mo)|per\s*month|monthly)?/i,
        /revenue\s+(?:of\s+)?\$?([\d,.]+)\s*[kK]?\s*(?:\/\s*(?:month|mo)|per\s*month|monthly)?/i,
        /income\s+(?:of\s+)?\$?([\d,.]+)\s*[kK]?\s*(?:\/\s*(?:month|mo)|per\s*month|monthly)?/i,
        /earning\s+\$?([\d,.]+)\s*[kK]?\s*(?:\/\s*(?:month|mo)|per\s*month|monthly)?/i,
        /\$?([\d,.]+)\s*[kK]?\s*(?:\/\s*(?:month|mo)|per\s*month|monthly)\s+(?:inflow|income|revenue)/i,
    ];

    for (const inflowPattern of inflowPatterns) {
        const inflowMatch = prompt.match(inflowPattern);
        if (inflowMatch) {
            let val = parseFloat(inflowMatch[1].replace(/,/g, ""));
            if (/k/i.test(inflowMatch[0]) && val < 1000) val *= 1000;
            if (!variables.some(v => v.type === "inflow")) {
                variables.push({
                    id: `inflow_${varIdx++}`,
                    label: "Monthly Inflow",
                    type: "inflow",
                    value: val,
                    unit: "usd",
                });
                parsedSummary.push(`Inflow: $${val.toLocaleString()}/month`);
            }
            break;
        }
    }

    // ─── 6. Yield / APY ─────────────────────────────────────────
    // Handles: "8% APY", "yield of 12%", "yield drops to 2%",
    //          "APY falls to 5%", "yield at 3%", "2% interest"
    const yieldPatterns = [
        // "yield drops to 2%", "APY falls to 5%", "yield reaches 3%"
        /(?:yield|apy|apr|interest|staking\s+return)\s+(?:drops?|falls?|declines?|decreases?|goes?\s+down)?\s*(?:to|at|of)?\s*(\d+(?:\.\d+)?)\s*%/i,
        // "2% yield", "8% APY", "5% apr", "3% interest"
        /(\d+(?:\.\d+)?)\s*%\s*(?:apy|yield|apr|interest|staking\s+return)/i,
        // "yield is 2%", "yield becomes 3%"
        /(?:yield|apy|apr|interest)\s+(?:is|becomes?|set\s+to)\s+(\d+(?:\.\d+)?)\s*%/i,
        // "earning 5% on staked", "earn 3% yield"
        /earn(?:ing)?\s+(\d+(?:\.\d+)?)\s*%/i,
    ];

    for (const yieldPattern of yieldPatterns) {
        const yieldMatch = prompt.match(yieldPattern);
        if (yieldMatch) {
            const val = parseFloat(yieldMatch[1]);
            if (!variables.some(v => v.type === "yield_apy")) {
                variables.push({
                    id: `yield_${varIdx++}`,
                    label: `Annual Yield (${val}% APY)`,
                    type: "yield_apy",
                    value: val / 100,
                    unit: "percent",
                });
                parsedSummary.push(`Yield: ${val}% APY`);
            }
            break;
        }
    }

    // ─── 7. Buyback / Purchase ──────────────────────────────────
    const buyMatch = prompt.match(/(?:buy(?:back)?|acquire|purchase)\s+(\d+(?:\.\d+)?)\s+(\w+)/i);
    if (buyMatch) {
        const amount = parseFloat(buyMatch[1]);
        const asset = resolveAsset(buyMatch[2]);
        variables.push({
            id: `custom_buy_${varIdx++}`,
            label: `${asset} Buyback`,
            type: "custom",
            asset,
            value: amount,
            unit: "tokens",
        });
        parsedSummary.push(`Buyback: ${amount} ${asset}`);
    }

    // ─── 8. "All assets drop/rise X%" (blanket market move) ─────
    const blanketMatch = prompt.match(
        /(?:market|everything|all\s+(?:assets?|tokens?|prices?))\s+(?:drops?|falls?|crashes?|declines?|tanks?)\s+(?:by\s+)?(\d+(?:\.\d+)?)\s*%/i
    ) || prompt.match(
        /(?:market|everything|all\s+(?:assets?|tokens?|prices?))\s+(?:rises?|gains?|pumps?|increases?)\s+(?:by\s+)?(\d+(?:\.\d+)?)\s*%/i
    );

    if (blanketMatch && !parsedPriceAssets.size) {
        const pctValue = parseFloat(blanketMatch[1]);
        const isNegative = /drop|fall|decline|crash|tank/i.test(blanketMatch[0]);
        const value = isNegative ? -pctValue / 100 : pctValue / 100;
        variables.push({
            id: `price_all_${varIdx++}`,
            label: `Market ${isNegative ? "Decline" : "Rally"} ${pctValue}%`,
            type: "price_change",
            // No asset → applies to all tokens in the simulation engine
            value,
            unit: "percent",
        });
        parsedSummary.push(`Market-wide: ${isNegative ? "-" : "+"}${pctValue}%`);
    }

    // ─── Compute confidence ─────────────────────────────────────
    // Higher if we parsed multiple meaningful variables and a timeframe
    let confidence = 0;
    if (variables.length > 0) confidence += 0.4;
    if (variables.length > 1) confidence += 0.2;
    if (timeMatch) confidence += 0.2;
    // Bonus for explicitly parsed vs. fallback
    const hasPriceVar = variables.some(v => v.type === "price_change" || v.type === "custom");
    const hasEconomicVar = variables.some(v => ["burn_rate", "inflow", "yield_apy"].includes(v.type));
    if (hasPriceVar) confidence += 0.1;
    if (hasEconomicVar) confidence += 0.1;
    confidence = Math.min(1, confidence);

    // ─── Fallback if nothing was parsed ─────────────────────────
    if (variables.length === 0) {
        // Instead of silently injecting a hardcoded scenario, create a
        // reasonable "stress test" and flag low confidence.
        variables.push({
            id: "price_all_default",
            label: "Market Downturn (default scenario)",
            type: "price_change",
            // Apply to ALL assets, not just SOL
            value: -0.2,
            unit: "percent",
        });
        confidence = 0.15; // very low — the parser didn't understand the prompt
        parsedSummary.push(" Could not fully parse prompt — using default -20% market stress test");
    }

    const title = generateTitle(variables);

    return { title, description: prompt, variables, timeframeMonths, confidence, parsedSummary };
}

/**
 * Generate a full foresight scenario from a natural language prompt and portfolio.
 * Returns parsed variables + generated preview code for the ForesightPreview iframe.
 */
export function generateForesight(prompt: string, portfolio: PortfolioSnapshot[]): ForesightScenario {
    const parsed = parseForesightPrompt(prompt);
    const generatedCode = buildForesightCode(parsed, portfolio);
    return { ...parsed, generatedCode, portfolio };
}

function buildForesightCode(parsed: ParsedForesight, portfolio: PortfolioSnapshot[]): string {
    const varsJson = JSON.stringify(parsed.variables);
    const portfolioJson = JSON.stringify(portfolio);
    return `
// Auto-generated Foresight Scenario: ${parsed.title}
// Timeframe: ${parsed.timeframeMonths} months
// Variables: ${parsed.variables.length}

const variables = ${varsJson};
const portfolio = ${portfolioJson};
const timeframeMonths = ${parsed.timeframeMonths};

function simulate() {
  const months = Array.from({ length: timeframeMonths }, (_, i) => i + 1);
  const totalValue = portfolio.reduce((sum, t) => sum + t.amount * t.price, 0);
  let projectedValue = totalValue;

  const projections = months.map((m) => {
    let monthValue = totalValue;
    for (const v of variables) {
      if (v.type === "price_change") {
        const factor = 1 + (v.value * m / timeframeMonths);
        if (v.asset) {
          const token = portfolio.find(t => t.symbol === v.asset);
          if (token) monthValue += token.amount * token.price * (factor - 1);
        } else {
          monthValue *= factor;
        }
      }
      if (v.type === "burn_rate") monthValue -= v.value * m;
      if (v.type === "inflow") monthValue += v.value * m;
      if (v.type === "yield_apy") {
        monthValue *= Math.pow(1 + v.value / 12, m);
      }
    }
    projectedValue = monthValue;
    return { month: m, value: Math.max(0, monthValue) };
  });

  return { projections, finalValue: projectedValue, totalValue };
}

const result = simulate();
render({ variables, portfolio, timeframeMonths, result });
`.trim();
}

// ─── Helpers ────────────────────────────────────────────────────────

function generateTitle(variables: SimulationVariable[]): string {
    const parts: string[] = [];
    for (const v of variables.slice(0, 3)) {
        switch (v.type) {
            case "price_change":
                if (v.asset) {
                    parts.push(`${v.asset} ${v.value >= 0 ? "+" : ""}${(v.value * 100).toFixed(0)}%`);
                } else {
                    parts.push(`Market ${v.value >= 0 ? "+" : ""}${(v.value * 100).toFixed(0)}%`);
                }
                break;
            case "burn_rate":
                parts.push(`$${(v.value / 1000).toFixed(0)}K/mo burn`);
                break;
            case "yield_apy":
                parts.push(`${(v.value * 100).toFixed(0)}% yield`);
                break;
            case "inflow":
                parts.push(`$${(v.value / 1000).toFixed(0)}K/mo inflow`);
                break;
            case "custom":
                if (v.unit === "usd" && v.asset) {
                    parts.push(`${v.asset} → $${v.value.toLocaleString()}`);
                } else {
                    parts.push(v.label);
                }
                break;
            default:
                parts.push(v.label);
        }
    }
    return parts.join(" + ") || "Custom Scenario";
}
