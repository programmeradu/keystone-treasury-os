import { NextRequest, NextResponse } from "next/server";

// Real implementation placeholder: no mocks. Returns empty results until real providers are integrated.
export async function GET(req: NextRequest) {
  try {
    const { searchParams, origin } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }

    // MOCK_MODE: Return deterministic synthetic eligibility for CI/temp testing
    const mockMode = String(process.env.MOCK_MODE || "").toLowerCase() === "true";
    if (mockMode) {
      const seed = [...address].reduce((a, c) => a + c.charCodeAt(0), 0);
      const hasMSOL = seed % 2 === 0;
      const trades = (seed % 5) * 3;
      const eligibleNow: any[] = [];
      if (hasMSOL) {
        eligibleNow.push({
          id: "msol-holder",
          name: "Marinade mSOL Holder",
          status: "eligible",
          estReward: "Earning staking yield on 12.3456 MSOL",
          details: "Detected synthetic mSOL balance (MOCK_MODE).",
          source: "mock",
          tasks: [
            { id: "msol-hold", type: "hold", label: "Hold Marinade mSOL to continue earning", venue: "Marinade" },
          ],
        });
      }
      if (trades > 0) {
        eligibleNow.push({
          id: "dex-swapper-30d",
          name: "Active DEX Swapper (last 30d)",
          status: "eligible",
          estReward: `${trades} trades executed across Solana DEXs (mock)`,
          details: "Synthetic DEX activity via MOCK_MODE.",
          source: "mock",
          tasks: [
            { id: "keep-trading", type: "activity", label: "Maintain activity to stay eligible", venue: "Solana DEXs" },
          ],
        });
      }
      return NextResponse.json({ data: { address, timestamp: Date.now(), eligibleNow, potential: [] } });
    }

    // Derive absolute base URL for internal RPC proxy (works on Vercel and local)
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const baseUrl = host ? `${proto}://${host}` : origin;

    // On-chain signal: LST holder checks (real, no mocks)
    const LSTS: Record<string, { mint: string; name: string; venue: string; stakeVerb: string }> = {
      MSOL: { mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", name: "Marinade mSOL", venue: "Marinade", stakeVerb: "Stake SOL to mSOL" },
      // To extend with real, verified mints only (no guesses):
      // JITOSOL: { mint: "<JitoSOL mint>", name: "JitoSOL", venue: "Jito", stakeVerb: "Stake SOL to JitoSOL" },
      // BSOL: { mint: "<bSOL mint>", name: "Blaze bSOL", venue: "Blaze", stakeVerb: "Stake SOL to bSOL" },
      // JSOL: { mint: "<jSOL mint>", name: "JPool jSOL", venue: "JPool", stakeVerb: "Stake SOL to jSOL" },
    };

    async function getSplBalanceByMint(owner: string, mint: string): Promise<number> {
      try {
        const res = await fetch(`${baseUrl}/api/solana/rpc`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: "getTokenAccountsByOwner",
            params: [
              owner,
              { mint },
              { encoding: "jsonParsed", commitment: "processed" }
            ],
          }),
          cache: "no-store",
        });
        const json = await res.json();
        const accounts = json?.result?.value || [];
        let total = 0;
        for (const acc of accounts) {
          const amt = acc?.account?.data?.parsed?.info?.tokenAmount;
          const ui = Number(amt?.uiAmount || 0);
          if (!Number.isNaN(ui)) total += ui;
        }
        return total;
      } catch {
        return 0;
      }
    }

    const eligibleNow: any[] = [];
    const potential: any[] = [];

    // Evaluate each listed LST (currently mSOL; extend safely with verified mints only)
    for (const key of Object.keys(LSTS)) {
      const { mint, name, venue, stakeVerb } = LSTS[key];
      const bal = await getSplBalanceByMint(address, mint);
      if (bal > 0) {
        eligibleNow.push({
          id: `${key.toLowerCase()}-holder`,
          name: `${name} Holder`,
          status: "eligible",
          estReward: `Earning staking yield on ${bal.toFixed(4)} ${key}`,
          details: `Detected ${name} balance in your wallet. Rewards accrue via token appreciation relative to SOL.`,
          source: "onchain",
          tasks: [
            { id: `${key.toLowerCase()}-hold`, type: "hold", label: `Hold ${name} to continue earning`, venue },
          ],
        });
      }
    }

    // Off-chain integration: Solscan token holdings (uses SOLSCAN_API_KEY)
    // Detect additional LSTs via token symbols without guessing mint addresses.
    const SOLSCAN_API_KEY = process.env.SOLSCAN_API_KEY;
    if (SOLSCAN_API_KEY) {
      try {
        const resp = await fetch(`https://pro-api.solscan.io/v2/account/tokens?address=${address}`, {
          headers: {
            accept: "application/json",
            token: SOLSCAN_API_KEY,
          },
          cache: "no-store",
        });
        if (resp.ok) {
          const json = await resp.json();
          const tokens: any[] = json?.data || [];

          const LST_SYMBOL_META: Record<string, { name: string; venue: string; stakeVerb: string }> = {
            MSOL: { name: "Marinade mSOL", venue: "Marinade", stakeVerb: "Stake SOL to mSOL" },
            JITOSOL: { name: "JitoSOL", venue: "Jito", stakeVerb: "Stake SOL to JitoSOL" },
            BSOL: { name: "Blaze bSOL", venue: "Blaze", stakeVerb: "Stake SOL to bSOL" },
            JSOL: { name: "JPool jSOL", venue: "JPool", stakeVerb: "Stake SOL to jSOL" },
          };

          const presentIds = new Set(eligibleNow.map((e) => e.id));

          for (const t of tokens) {
            const symbol: string = String(t?.tokenSymbol || t?.symbol || "").toUpperCase();
            if (!symbol) continue;
            if (!(symbol in LST_SYMBOL_META)) continue;

            const decimals = Number(t?.decimals ?? t?.tokenDecimels ?? 0);
            const raw = Number(t?.tokenAmount ?? t?.amount ?? 0);
            const ui = decimals > 0 ? raw / Math.pow(10, decimals) : raw;
            if (ui <= 0) continue;

            const meta = LST_SYMBOL_META[symbol];
            const id = `${symbol.toLowerCase()}-holder`;
            if (presentIds.has(id)) continue; // avoid duplicates if on-chain already added

            eligibleNow.push({
              id,
              name: `${meta.name} Holder`,
              status: "eligible",
              estReward: `Earning staking yield on ${ui.toFixed(4)} ${symbol}`,
              details: `Detected ${meta.name} via Solscan holdings for your wallet.`,
              source: "solscan",
              tasks: [
                { id: `${symbol.toLowerCase()}-hold`, type: "hold", label: `Hold ${meta.name} to continue earning`, venue: meta.venue },
              ],
            });
          }
        }
      } catch {
        // Ignore Solscan errors silently; keep on-chain results
      }
    }

    // Off-chain integration: Bitquery DEX activity (uses BITQUERY_* envs)
    const BITQUERY_BEARER = process.env.BITQUERY_BEARER || process.env.BITQUERY_ACCESS_TOKEN || process.env.BITQUERY_API_KEY;
    if (BITQUERY_BEARER) {
      try {
        // Last 30 days ISO date
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const query = `
          query ($address: String!, $since: ISO8601Date!) {
            Solana {
              DEXTrades(
                date: {since: $since}
                txSender: {is: $address}
              ) {
                count: count
              }
            }
          }
        `;

        // Prefer standard GraphQL endpoint; optionally support streaming token in URL if enabled
        const useStreaming = process.env.BITQUERY_USE_STREAMING === "1";
        const baseEndpoint = useStreaming ? "https://streaming.bitquery.io/graphql" : "https://graphql.bitquery.io";
        const urlWithToken = useStreaming && BITQUERY_BEARER ? `${baseEndpoint}?token=${encodeURIComponent(BITQUERY_BEARER)}` : baseEndpoint;

        async function callBitquery(endpoint: string) {
          return fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // Keep Authorization header as primary auth; streaming also accepts it
              Authorization: `Bearer ${BITQUERY_BEARER}`,
            },
            body: JSON.stringify({ query, variables: { address, since } }),
            cache: "no-store",
          });
        }

        let resp = await callBitquery(urlWithToken);
        // Fallback: if streaming fails, retry on standard endpoint
        if (!resp.ok && useStreaming) {
          resp = await callBitquery("https://graphql.bitquery.io");
        }

        if (resp.ok) {
          const json = await resp.json();
          const count = json?.data?.Solana?.DEXTrades?.[0]?.count ?? 0;
          if (typeof count === "number" && count > 0) {
            eligibleNow.push({
              id: "dex-swapper-30d",
              name: "Active DEX Swapper (last 30d)",
              status: "eligible",
              estReward: `${count} trades executed across Solana DEXs`,
              details: "Detected DEX trades from your wallet in the last 30 days via Bitquery.",
              source: "bitquery",
              tasks: [
                { id: "keep-trading", type: "activity", label: "Maintain activity to stay eligible", venue: "Solana DEXs" },
              ],
            });
          }
        }
      } catch {
        // Ignore Bitquery errors; keep existing results intact
      }
    }

    const data = {
      address,
      timestamp: Date.now(),
      eligibleNow,
      potential, // kept for backward-compatibility but intentionally empty to avoid synthetic entries
    };

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to scan" }, { status: 500 });
  }
}