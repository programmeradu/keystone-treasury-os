import { NextRequest, NextResponse } from "next/server";
import { SquadsClient } from "@/lib/squads";
import { Connection } from "@solana/web3.js";

/**
 * GET /api/squads/proposals?vault=<address>
 * 
 * Server-side proxy for fetching Squads proposals.
 * This prevents client browsers from hammering the RPC directly,
 * centralizes rate-limit handling, and enables future caching.
 */

// Simple in-memory cache (per serverless instance)
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL_MS = 10_000; // 10 seconds

export async function GET(req: NextRequest) {
    const vault = req.nextUrl.searchParams.get("vault");
    if (!vault) {
        return NextResponse.json({ error: "vault query parameter is required" }, { status: 400 });
    }

    // Check cache
    const cached = cache.get(vault);
    if (cached && Date.now() < cached.expiry) {
        return NextResponse.json(cached.data, {
            headers: { "X-Cache": "HIT" },
        });
    }

    try {
        const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
        const connection = new Connection(rpcUrl, "confirmed");
        const client = new SquadsClient(connection, null);

        const proposals = await client.getProposals(vault);

        // Store in cache
        cache.set(vault, { data: proposals, expiry: Date.now() + CACHE_TTL_MS });

        // Prune stale entries (prevent memory leak in long-running instances)
        if (cache.size > 100) {
            const now = Date.now();
            for (const [key, val] of cache) {
                if (now > val.expiry) cache.delete(key);
            }
        }

        return NextResponse.json(proposals, {
            headers: { "X-Cache": "MISS" },
        });
    } catch (error) {
        console.error("[Squads Proxy] Failed to fetch proposals:", error);
        return NextResponse.json({ error: "Failed to fetch proposals" }, { status: 502 });
    }
}
