import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Proxy to Helius DAS getAssetsByOwner to fetch wallet holdings
// Docs: https://docs.helius.dev/compression-and-das-api/digital-asset-standard-das-api/get-assets-by-owner
export async function GET(req: NextRequest) {
  const apiKey = process.env.HELIUS_API_KEY;
  const mockMode = String(process.env.MOCK_MODE || "").toLowerCase() === "true";

  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 100);

  if (!address) {
    return new Response(JSON.stringify({ error: "address is required" }), { status: 400 });
  }

  // Mock mode: return deterministic token holdings for testing
  const mockParam = String(searchParams.get("mock") || "").toLowerCase() === "true";
  if ((mockMode || mockParam) && !apiKey) {
    const mockHoldings = [
      {
        mint: "So11111111111111111111111111111111111111112",
        symbol: "SOL",
        name: "Solana",
        address: "So11111111111111111111111111111111111111112",
        balance: "5000000000", // 5 SOL in lamports
        amount: "5000000000",
        decimals: 9,
      },
      {
        mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        symbol: "USDC",
        name: "USD Coin",
        address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        balance: "1000000000", // 1000 USDC
        amount: "1000000000",
        decimals: 6,
      },
      {
        mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
        symbol: "mSOL",
        name: "Marinade Staked SOL",
        address: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
        balance: "2500000000", // 2.5 mSOL
        amount: "2500000000",
        decimals: 9,
      },
    ];

    return new Response(
      JSON.stringify({ holdings: mockHoldings, total: mockHoldings.length }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing HELIUS_API_KEY" }), { status: 500 });
  }

  try {
    const heliusUrl = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
    
    // Get fungible tokens owned by the address
    const body = {
      jsonrpc: "2.0",
      id: "atlas-wallet-holdings",
      method: "getAssetsByOwner",
      params: {
        ownerAddress: address,
        page,
        limit,
        displayOptions: {
          showFungible: true,
          showNativeBalance: true,
        },
      },
    };

    const res = await fetch(heliusUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await res.json();
    
    if (!res.ok || data?.error) {
      const msg = data?.error?.message || "Helius DAS request failed";
      return new Response(JSON.stringify({ error: msg }), { status: res.status || 502 });
    }

    // Parse the response to extract token holdings
    const items = data?.result?.items || [];
    const holdings = items
      .filter((item: any) => item.interface === "FungibleToken" || item.interface === "FungibleAsset")
      .map((item: any) => ({
        mint: item.id,
        symbol: item.content?.metadata?.symbol || item.content?.metadata?.name || "UNKNOWN",
        name: item.content?.metadata?.name || item.content?.metadata?.symbol || "Unknown Token",
        address: item.id,
        balance: item.token_info?.balance || "0",
        amount: item.token_info?.balance || "0",
        decimals: item.token_info?.decimals || 9,
      }));

    return new Response(
      JSON.stringify({ holdings, total: holdings.length }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, max-age=30",
        },
      }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "Failed to fetch wallet holdings" }), { status: 500 });
  }
}
