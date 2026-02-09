import { NextRequest, NextResponse } from "next/server";

// ─── Types ──────────────────────────────────────────────────────────

interface PortfolioToken {
  symbol: string;
  amount: number;
  price: number;       // current USD price
  change24h?: number;  // 24h % change — used to seed volatility
  isStable?: boolean;  // client tags stablecoins so engine can burn them first
  mint?: string;       // optional mint for traceability
}

interface SimulationVariable {
  id: string;
  label: string;
  type: "price_change" | "burn_rate" | "inflow" | "outflow" | "yield_apy" | "custom";
  asset?: string;            // which token this applies to (e.g. "SOL")
  value: number;             // the hypothetical value (e.g. -0.5 for -50%)
  unit?: "percent" | "usd" | "tokens";
}

interface SimulationRequest {
  portfolio: PortfolioToken[];
  variables: SimulationVariable[];
  timeframeMonths: number;   // projection length
  granularity?: "daily" | "weekly" | "monthly";
  priceSource?: "live" | "vault" | "fallback"; // data quality hint
}

interface ProjectionPoint {
  date: string;              // ISO date
  totalValue: number;
  breakdown: Record<string, number>;  // symbol -> value
  events?: string[];         // notable events at this point
}

interface SimulationResponse {
  projection: ProjectionPoint[];
  summary: {
    currentValue: number;
    projectedEndValue: number;
    delta: number;
    deltaPercent: number;
    runwayMonths: number | null;   // null if no depletion
    depletionDate: string | null;
    riskFlags: string[];
  };
  metadata: {
    variables: SimulationVariable[];
    timeframeMonths: number;
    computedAt: number;
    priceSource: string;
    confidence: number;       // 0-1 confidence based on data quality
    stablecoinPct: number;    // % of portfolio in stablecoins
  };
}

// ─── Stablecoin Detection ───────────────────────────────────────────

const STABLECOIN_SYMBOLS = new Set([
  "USDC", "USDT", "BUSD", "DAI", "TUSD", "USDP", "FRAX", "LUSD",
  "PYUSD", "GUSD", "USDD", "CUSD", "SUSD", "UST", "EURC",
]);

// ─── Yield-Eligible Tokens (LSTs, staked assets, yield protocols) ───
const YIELD_ELIGIBLE_SYMBOLS = new Set([
  "MSOL", "JITOSOL", "BSOL", "STSOL", "SCNSOL", "CGNTOL",   // Solana LSTs
  "STETH", "RETH", "CBETH", "WSTETH",                        // Ethereum LSTs
  "STAKED SOL",                                                // native staking synthetic
]);

function isStablecoin(token: PortfolioToken): boolean {
  if (token.isStable !== undefined) return token.isStable;
  return STABLECOIN_SYMBOLS.has(token.symbol.toUpperCase());
}

// ─── Projection Engine (v2) ─────────────────────────────────────────

function runProjection(req: SimulationRequest): SimulationResponse {
  const { portfolio, variables, timeframeMonths, granularity = "monthly", priceSource = "vault" } = req;

  // Current portfolio value
  const currentValue = portfolio.reduce((sum, t) => sum + t.amount * t.price, 0);

  // Classify tokens
  const stableTokens = portfolio.filter(t => isStablecoin(t));
  const volatileTokens = portfolio.filter(t => !isStablecoin(t));
  const stablecoinValue = stableTokens.reduce((s, t) => s + t.amount * t.price, 0);
  const stablecoinPct = currentValue > 0 ? stablecoinValue / currentValue : 0;

  // Build per-asset price trajectories based on variables
  const priceChanges: Record<string, number> = {};  // symbol -> total % change over period
  const priceTargets: Record<string, number> = {};   // symbol -> target USD price
  let monthlyBurnRate = 0;
  let monthlyInflow = 0;
  let annualYield = 0;

  for (const v of variables) {
    switch (v.type) {
      case "price_change":
        if (v.asset) {
          priceChanges[v.asset] = (priceChanges[v.asset] || 0) + v.value;
        } else {
          // No asset specified → apply to ALL volatile tokens (market-wide move)
          for (const t of portfolio) {
            if (!isStablecoin(t)) {
              priceChanges[t.symbol] = (priceChanges[t.symbol] || 0) + v.value;
            }
          }
        }
        break;
      case "burn_rate":
        monthlyBurnRate += v.unit === "usd" ? v.value : v.value * currentValue;
        break;
      case "outflow":
        monthlyBurnRate += v.unit === "usd" ? v.value : v.value * currentValue;
        break;
      case "inflow":
        monthlyInflow += v.unit === "usd" ? v.value : v.value * currentValue;
        break;
      case "yield_apy":
        annualYield += v.value;
        break;
      case "custom":
        // Handle LLM-emitted price targets: { type: "custom", asset: "SOL", unit: "usd", value: 100 }
        if (v.unit === "usd" && v.asset) {
          // Price target — compute % change from current price
          const matchingToken = portfolio.find(t => t.symbol === v.asset);
          if (matchingToken && matchingToken.price > 0) {
            const pctChange = (v.value - matchingToken.price) / matchingToken.price;
            priceChanges[v.asset] = (priceChanges[v.asset] || 0) + pctChange;
          } else {
            priceTargets[v.asset] = v.value;
          }
        } else if (v.unit === "usd") {
          monthlyBurnRate -= v.value;
        }
        break;
    }
  }

  // Seed per-asset volatility from real 24h data (annualized daily vol proxy)
  // vol = |change24h| * sqrt(365) / 100, clamped to reasonable bounds
  const assetVolatility: Record<string, number> = {};
  for (const t of portfolio) {
    if (isStablecoin(t)) {
      assetVolatility[t.symbol] = 0; // stablecoins don't drift
    } else {
      const abs24h = Math.abs(t.change24h || 0);
      // Annualized vol proxy: daily change * sqrt(365)
      const annualizedVol = (abs24h / 100) * Math.sqrt(365);
      assetVolatility[t.symbol] = Math.min(annualizedVol, 3.0); // cap at 300% annual vol
    }
  }

  // Determine number of projection points
  const pointsPerMonth = granularity === "daily" ? 30 : granularity === "weekly" ? 4 : 1;
  const totalPoints = timeframeMonths * pointsPerMonth;
  const monthsPerStep = 1 / pointsPerMonth;

  const projection: ProjectionPoint[] = [];
  const now = new Date();
  let runwayMonths: number | null = null;
  let depletionDate: string | null = null;
  const riskFlags: string[] = [];

  // Track running token amounts — burn deducts from these
  const runningAmounts: Record<string, number> = {};
  for (const t of portfolio) {
    runningAmounts[t.symbol] = t.amount;
  }

  // Track running prices for step-by-step burn
  const runningPrices: Record<string, number> = {};
  for (const t of portfolio) {
    runningPrices[t.symbol] = t.price;
  }

  let prevPointTotal = currentValue;

  for (let i = 0; i <= totalPoints; i++) {
    const monthsElapsed = i * monthsPerStep;
    const pointDate = new Date(now);
    pointDate.setDate(pointDate.getDate() + Math.round(monthsElapsed * 30.44));

    // ── Update prices for this step ──
    for (const t of portfolio) {
      const targetChange = priceChanges[t.symbol] || 0;
      const vol = assetVolatility[t.symbol] || 0;

      // Base linear drift toward target
      const driftMultiplier = 1 + (targetChange * (monthsElapsed / timeframeMonths));

      // Volatility creates a mean-reverting noise band (deterministic for reproducibility)
      // Use sine waves at different frequencies to create realistic-looking fluctuation
      const volNoise = vol > 0
        ? vol * 0.1 * (
            Math.sin(monthsElapsed * 2.17 + t.symbol.charCodeAt(0)) * 0.6 +
            Math.sin(monthsElapsed * 5.43 + t.symbol.charCodeAt(0) * 0.7) * 0.3 +
            Math.sin(monthsElapsed * 0.89 + t.symbol.charCodeAt(0) * 1.3) * 0.1
          )
        : 0;

      const priceMultiplier = Math.max(0, driftMultiplier + volNoise);
      runningPrices[t.symbol] = t.price * priceMultiplier;
    }

    // ── Compute portfolio value before burn ──
    const breakdown: Record<string, number> = {};
    let preBurnTotal = 0;

    for (const t of portfolio) {
      // Yield only applies to yield-bearing assets:
      // - Stablecoins (USDC in lending), LSTs (mSOL, jitoSOL, stSOL, bSOL)
      // - Staked SOL synthetic entry
      // - NOT to volatile/speculative tokens like SOL, JUP, BONK, TRUMP
      const isYieldBearing = isStablecoin(t) || YIELD_ELIGIBLE_SYMBOLS.has(t.symbol.toUpperCase()) ||
        t.symbol === "Staked SOL";
      const monthlyYieldRate = isYieldBearing ? annualYield / 12 : 0;
      const yieldMultiplier = monthlyYieldRate > 0 ? Math.pow(1 + monthlyYieldRate, monthsElapsed) : 1;
      const tokenValue = runningAmounts[t.symbol] * runningPrices[t.symbol] * yieldMultiplier;
      breakdown[t.symbol] = Math.max(0, tokenValue);
      preBurnTotal += breakdown[t.symbol];
    }

    // ── Apply burn: stablecoins first, then volatile assets ──
    if (i > 0) {
      const stepBurn = (monthlyBurnRate - monthlyInflow) * monthsPerStep;
      if (stepBurn > 0) {
        let remaining = stepBurn;

        // Phase 1: Burn from stablecoins
        for (const st of stableTokens) {
          if (remaining <= 0) break;
          const available = breakdown[st.symbol] || 0;
          const deduct = Math.min(remaining, available);
          breakdown[st.symbol] = available - deduct;
          // Reduce running amounts (stables are $1 each)
          if (runningPrices[st.symbol] > 0) {
            runningAmounts[st.symbol] -= deduct / runningPrices[st.symbol];
            runningAmounts[st.symbol] = Math.max(0, runningAmounts[st.symbol]);
          }
          remaining -= deduct;
        }

        // Phase 2: If stables exhausted, sell volatile assets proportionally
        if (remaining > 0) {
          const volTotal = volatileTokens.reduce((s, t) => s + (breakdown[t.symbol] || 0), 0);
          if (volTotal > 0) {
            for (const vt of volatileTokens) {
              const share = (breakdown[vt.symbol] || 0) / volTotal;
              const deduct = remaining * share;
              breakdown[vt.symbol] = Math.max(0, (breakdown[vt.symbol] || 0) - deduct);
              if (runningPrices[vt.symbol] > 0) {
                runningAmounts[vt.symbol] -= deduct / runningPrices[vt.symbol];
                runningAmounts[vt.symbol] = Math.max(0, runningAmounts[vt.symbol]);
              }
            }
          }
        }
      } else if (stepBurn < 0) {
        // Net inflow — add to largest stablecoin (or first stable)
        const inflowUsd = Math.abs(stepBurn);
        const targetStable = stableTokens.length > 0 ? stableTokens[0] : portfolio[0];
        if (targetStable) {
          const price = runningPrices[targetStable.symbol] || 1;
          runningAmounts[targetStable.symbol] += inflowUsd / price;
          breakdown[targetStable.symbol] = (breakdown[targetStable.symbol] || 0) + inflowUsd;
        }
      }
    }

    let pointTotal = Object.values(breakdown).reduce((s, v) => s + v, 0);
    pointTotal = Math.max(0, pointTotal);

    // Check for depletion
    if (pointTotal <= 0 && runwayMonths === null) {
      runwayMonths = monthsElapsed;
      depletionDate = pointDate.toISOString().split("T")[0];
    }

    const events: string[] = [];
    if (i === 0) events.push("Current state");
    if (pointTotal <= currentValue * 0.1 && runwayMonths === null && prevPointTotal > currentValue * 0.1) {
      events.push("⚠ Below 10% of initial value");
    }
    // Flag when stablecoins run out
    const currentStableVal = stableTokens.reduce((s, t) => s + (breakdown[t.symbol] || 0), 0);
    if (currentStableVal <= 0 && stablecoinValue > 0 && i > 0) {
      const prevStableVal = projection[projection.length - 1]
        ? stableTokens.reduce((s, t) => {
            const prevBd = projection[projection.length - 1].breakdown;
            return s + (prevBd[t.symbol] || 0);
          }, 0)
        : stablecoinValue;
      if (prevStableVal > 0) events.push("⚠ Stablecoin reserves depleted — selling volatile assets");
    }

    projection.push({
      date: pointDate.toISOString().split("T")[0],
      totalValue: Math.round(pointTotal * 100) / 100,
      breakdown,
      events: events.length > 0 ? events : undefined,
    });

    prevPointTotal = pointTotal;
  }

  // Risk flags
  const endValue = projection[projection.length - 1]?.totalValue || 0;
  if (endValue < currentValue * 0.5) riskFlags.push("MAJOR_DRAWDOWN");
  if (runwayMonths !== null) riskFlags.push("DEPLETION_RISK");
  if (monthlyBurnRate > currentValue * 0.1) riskFlags.push("HIGH_BURN_RATE");
  if (stablecoinPct < 0.1 && monthlyBurnRate > 0) riskFlags.push("LOW_STABLE_RESERVES");
  for (const [sym, change] of Object.entries(priceChanges)) {
    if (change < -0.3) riskFlags.push(`${sym}_SEVERE_DECLINE`);
  }

  // Safety guardrail
  if (annualYield > 0.5) riskFlags.push("UNREALISTIC_YIELD_ASSUMPTION");

  // Concentration risk: if any volatile asset > 60% of portfolio
  for (const t of volatileTokens) {
    const pct = (t.amount * t.price) / currentValue;
    if (pct > 0.6) riskFlags.push(`${t.symbol}_CONCENTRATION_RISK`);
  }

  // Confidence score based on data quality
  let confidence = 0.5; // baseline
  if (priceSource === "live") confidence = 0.9;
  else if (priceSource === "vault") confidence = 0.7;
  else confidence = 0.3; // fallback
  // Degrade confidence if any token has no price data
  const noPriceTokens = portfolio.filter(t => t.price === 0).length;
  if (noPriceTokens > 0) confidence *= 1 - (noPriceTokens / portfolio.length) * 0.5;

  const delta = endValue - currentValue;
  const deltaPercent = currentValue > 0 ? (delta / currentValue) * 100 : 0;

  return {
    projection,
    summary: {
      currentValue: Math.round(currentValue * 100) / 100,
      projectedEndValue: Math.round(endValue * 100) / 100,
      delta: Math.round(delta * 100) / 100,
      deltaPercent: Math.round(deltaPercent * 100) / 100,
      runwayMonths: runwayMonths !== null ? Math.round(runwayMonths * 10) / 10 : null,
      depletionDate,
      riskFlags,
    },
    metadata: {
      variables,
      timeframeMonths,
      computedAt: Date.now(),
      priceSource,
      confidence: Math.round(confidence * 100) / 100,
      stablecoinPct: Math.round(stablecoinPct * 1000) / 10,
    },
  };
}

// ─── Route Handler ──────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as SimulationRequest;

    // Validation
    if (!body.portfolio || !Array.isArray(body.portfolio) || body.portfolio.length === 0) {
      return NextResponse.json({ error: "Portfolio is required and must be non-empty" }, { status: 400 });
    }
    if (!body.variables || !Array.isArray(body.variables)) {
      return NextResponse.json({ error: "Variables array is required" }, { status: 400 });
    }
    if (!body.timeframeMonths || body.timeframeMonths < 1 || body.timeframeMonths > 120) {
      return NextResponse.json({ error: "timeframeMonths must be between 1 and 120" }, { status: 400 });
    }

    // Safety: cap variables count
    if (body.variables.length > 20) {
      return NextResponse.json({ error: "Maximum 20 simulation variables allowed" }, { status: 400 });
    }

    const result = runProjection(body);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[Simulation API] Error:", err);
    return NextResponse.json({ error: err.message || "Simulation failed" }, { status: 500 });
  }
}
