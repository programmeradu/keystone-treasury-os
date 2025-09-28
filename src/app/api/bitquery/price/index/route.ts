import { NextRequest, NextResponse } from "next/server";

// Proxy Bitquery Price Index (Tokens/Currencies/Pairs) over HTTP POST
// - Uses BITQUERY_BEARER | BITQUERY_ACCESS_TOKEN | BITQUERY_API_KEY
// - Optional streaming via BITQUERY_USE_STREAMING=1 (falls back to standard endpoint on error)
// - Build-in templates for common cubes; also accepts raw GraphQL via body.query
//
// POST /api/bitquery/price/index
// { cube: "Tokens" | "Currencies" | "Pairs", variables?: Record<string, any>, duration?: 1|3|5|10|30|60|300|900|1800|3600, limit?: number, orderDesc?: boolean, query?: string }
//
// Examples:
// 1) Tokens (USDC on Solana, 1s bars):
//    { cube: "Tokens", duration: 1, limit: 1, variables: { tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", network: "Solana" } }
// 2) Currencies (Bitcoin aggregate):
//    { cube: "Currencies", duration: 1, limit: 1, variables: { currencyId: "bid:bitcoin" } }
// 3) Pairs (Base network example):
//    { cube: "Pairs", variables: { network: "Base", tokenAddress: "0x940181a94a35a4569e4529a3cdfb74e38fd98631", quoteAddress: "0x4200000000000000000000000000000000000006" } }

export async function POST(req: NextRequest) {
  try {
    const BITQUERY_BEARER = process.env.BITQUERY_BEARER || process.env.BITQUERY_ACCESS_TOKEN || process.env.BITQUERY_API_KEY;
    if (!BITQUERY_BEARER) {
      return NextResponse.json({ error: "Bitquery token not configured. Set BITQUERY_BEARER (or BITQUERY_ACCESS_TOKEN / BITQUERY_API_KEY)." }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const cube = String(body?.cube || "Tokens");
    const variables = (body?.variables || {}) as Record<string, any>;
    const duration = Number(body?.duration || 1);
    const limit = Number(body?.limit || 1);
    const orderDesc = body?.orderDesc !== false; // default true
    const rawQuery: string | undefined = body?.query;

    // Validate duration to supported set
    const SUPPORTED_DURATIONS = new Set([1,3,5,10,30,60,300,900,1800,3600]);
    const safeDuration = SUPPORTED_DURATIONS.has(duration) ? duration : 1;

    // Build default queries if not provided
    let query = rawQuery;
    if (!query) {
      if (cube === "Tokens") {
        // Requires variables: tokenAddress, network
        const { tokenAddress, network } = variables;
        if (!tokenAddress || !network) {
          return NextResponse.json({ error: "Tokens query requires variables.tokenAddress and variables.network" }, { status: 400 });
        }
        query = `
          query ($tokenAddress: String!, $network: Network!, $duration: Int!, $limit: Int!, $orderDesc: Boolean!) {
            Trading {
              Tokens(
                where: { Token: { Address: { is: $tokenAddress }, Network: { is: $network } }, Interval: { Time: { Duration: { eq: $duration } } } }
                limit: { count: $limit }
                orderBy: { descending: $orderDesc, path: ["Block_Time"] }
              ) {
                Token { Address Id IsNative Name Network Symbol TokenId }
                Block { Timestamp }
                Interval { Time { Start Duration End } }
                Volume { Base BaseAttributedToUsd Quote Usd }
                Price {
                  IsQuotedInUsd
                  Ohlc { Open Low High Close }
                  Average { Mean WeightedSimpleMoving SimpleMoving ExponentialMoving }
                }
              }
            }
          }
        `;
      } else if (cube === "Currencies") {
        // Requires variables: currencyId (e.g., bid:bitcoin)
        const { currencyId } = variables;
        if (!currencyId) {
          return NextResponse.json({ error: "Currencies query requires variables.currencyId (e.g., 'bid:bitcoin')" }, { status: 400 });
        }
        query = `
          query ($currencyId: String!, $duration: Int!, $limit: Int!, $orderDesc: Boolean!) {
            Trading {
              Currencies(
                where: { Currency: { Id: { is: $currencyId } } }
                limit: { count: $limit }
                orderBy: { descending: $orderDesc, path: ["Block_Time"] }
              ) {
                Currency { Symbol Name Id }
                Block { Timestamp }
                Interval { Time { Duration Start End } }
                Volume { Usd Quote BaseAttributedToUsd Base }
                Price {
                  IsQuotedInUsd
                  Ohlc { Open Low High Close }
                  Average { Mean WeightedSimpleMoving SimpleMoving ExponentialMoving }
                }
              }
            }
          }
        `;
      } else if (cube === "Pairs") {
        // Requires variables: network, tokenAddress, quoteAddress
        const { network, tokenAddress, quoteAddress } = variables;
        if (!network || !tokenAddress || !quoteAddress) {
          return NextResponse.json({ error: "Pairs query requires variables.network, variables.tokenAddress and variables.quoteAddress" }, { status: 400 });
        }
        query = `
          query ($network: Network!, $tokenAddress: String!, $quoteAddress: String!) {
            Trading {
              Pairs(
                where: { Market: { Network: { is: $network } }, QuoteToken: { Address: { is: $quoteAddress } }, Token: { Address: { is: $tokenAddress } } }
              ) {
                Currency { Symbol Name Id }
                Market { Protocol Program Network Name Address }
                Token { Address Id Name Symbol TokenId }
                QuoteToken { TokenId Name Id Address Symbol }
                QuoteCurrency { Id }
                Volume { Usd Base Quote BaseAttributedToUsd }
                Price {
                  Ohlc { Open Low High Close }
                  Average { WeightedSimpleMoving SimpleMoving Mean ExponentialMoving }
                }
              }
            }
          }
        `;
      } else {
        return NextResponse.json({ error: `Unsupported cube: ${cube}` }, { status: 400 });
      }
    }

    // Build variables payload depending on query selected
    const defaultVars: Record<string, any> = { duration: safeDuration, limit, orderDesc };
    const payload = { query, variables: { ...defaultVars, ...variables } };

    // Endpoint selection
    const useStreaming = process.env.BITQUERY_USE_STREAMING === "1";
    const baseEndpoint = useStreaming ? "https://streaming.bitquery.io/graphql" : "https://graphql.bitquery.io";
    const urlWithToken = useStreaming ? `${baseEndpoint}?token=${encodeURIComponent(BITQUERY_BEARER)}` : baseEndpoint;

    async function call(endpoint: string) {
      return fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BITQUERY_BEARER}`,
        },
        body: JSON.stringify(payload),
        // never cache price
        cache: "no-store",
      });
    }

    let resp = await call(urlWithToken);
    if (!resp.ok && useStreaming) {
      resp = await call("https://graphql.bitquery.io");
    }

    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      return NextResponse.json({ error: data?.error || "Bitquery request failed", details: data }, { status: resp.status });
    }

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to query Bitquery Price Index" }, { status: 500 });
  }
}