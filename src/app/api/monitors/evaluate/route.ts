import { NextResponse } from "next/server";
import { db } from "@/db";
import { monitors, notifications } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const TOKEN_MINTS: Record<string, string> = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  RAY: "4k3Dyjzvzp8eMZxHZCGCRaeLJZoFpK6XNbRIo5jZbGT5",
};

async function fetchPrice(target: string): Promise<number | null> {
  try {
    const mint = TOKEN_MINTS[target] || target;
    const res = await fetch(`https://api.jup.ag/price/v2?ids=${mint}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const key = Object.keys(data.data || {})[0];
    return key ? parseFloat(data.data[key]?.price || "0") : null;
  } catch { return null; }
}

async function fetchBalance(target: string, wallet: string): Promise<number | null> {
  const rpcEndpoint = process.env.HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : "https://api.mainnet-beta.solana.com";
  try {
    if (target === "SOL") {
      const res = await fetch(rpcEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [wallet] }),
      });
      const data = await res.json();
      return (data.result?.value || 0) / 1e9;
    }
    return null;
  } catch { return null; }
}

function evaluate(operator: string, currentValue: number, threshold: number, lastChecked: number | null): boolean {
  switch (operator) {
    case "above": return currentValue > threshold;
    case "below": return currentValue < threshold;
    case "equals": return Math.abs(currentValue - threshold) < threshold * 0.001;
    case "changes": return lastChecked !== null && Math.abs(currentValue - lastChecked) / Math.max(lastChecked, 0.0001) > 0.05;
    default: return false;
  }
}

/**
 * POST /api/monitors/evaluate
 * Evaluates all active monitors and triggers notifications.
 * Designed to be called by a cron job (every 60s).
 */
export async function POST() {
  try {
    if (!db) {
      return NextResponse.json({ success: false, error: "Database not initialized" }, { status: 503 });
    }

    const activeMonitors = await db.select().from(monitors).where(eq(monitors.active, true));

    let checked = 0;
    let triggered = 0;

    for (const monitor of activeMonitors) {
      let currentValue: number | null = null;

      if (monitor.type === "price") {
        currentValue = await fetchPrice(monitor.target);
      } else if (monitor.type === "balance") {
        currentValue = await fetchBalance(monitor.target, monitor.walletAddress);
      }

      if (currentValue === null) continue;
      checked++;

      const threshold = parseFloat(monitor.conditionValue);
      const lastChecked = monitor.lastCheckedValue ? parseFloat(monitor.lastCheckedValue) : null;
      const shouldTrigger = evaluate(monitor.operator, currentValue, threshold, lastChecked);

      await db.update(monitors)
        .set({ lastCheckedValue: String(currentValue), updatedAt: new Date() })
        .where(eq(monitors.id, monitor.id));

      if (shouldTrigger) {
        triggered++;
        await db.update(monitors)
          .set({
            lastTriggeredAt: new Date(),
            triggerCount: (monitor.triggerCount || 0) + 1,
          })
          .where(eq(monitors.id, monitor.id));

        if (monitor.userId) {
          try {
            await db.insert(notifications).values({
              userId: monitor.userId,
              type: "alert",
              title: `${monitor.type.toUpperCase()} Alert: ${monitor.target}`,
              message: `${monitor.target} is ${monitor.operator} $${threshold} (current: $${currentValue.toFixed(4)})`,
              severity: "warning",
              read: false,
              metadata: { monitorId: monitor.id, type: monitor.type, target: monitor.target, value: currentValue, threshold },
            });
          } catch { /* notification insert best-effort */ }
        }
      }
    }

    return NextResponse.json({
      success: true,
      monitorsChecked: checked,
      monitorsTriggered: triggered,
      total: activeMonitors.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[monitors/evaluate] Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
