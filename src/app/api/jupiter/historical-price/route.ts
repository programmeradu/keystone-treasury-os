import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Historical Price API - Fetches real historical token prices
 * Uses multiple providers with fallback chain:
 * 1. Birdeye (premium, requires API key)
 * 2. DexScreener (free, limited historical data)
 * 3. CoinGecko (free tier, limited rate)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol") || "SOL"; // e.g., SOL, BONK
    const mint = searchParams.get("mint"); // Solana mint address
    const daysAgo = parseInt(searchParams.get("daysAgo") || "30");
    
    if (daysAgo < 1 || daysAgo > 365) {
      return NextResponse.json({ error: "daysAgo must be between 1 and 365" }, { status: 400 });
    }

    // Calculate timestamp for historical date
    const historicalTimestamp = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
    const historicalDate = new Date(historicalTimestamp);

    // Mock mode for testing
    const mockMode = String(process.env.MOCK_MODE || "").toLowerCase() === "true";
    if (mockMode) {
      // Return deterministic mock data
      const seed = (daysAgo * 12345) % 1000000;
      const variance = (seed / 1000000) * 0.3 + 0.85; // 0.85-1.15 range
      const currentPrice = 150; // Mock current SOL price
      const historicalPrice = currentPrice * variance;
      
      return NextResponse.json({
        symbol,
        daysAgo,
        historicalDate: historicalDate.toISOString(),
        historicalPrice,
        source: "mock",
        note: "MOCK_MODE enabled - using synthetic data",
      }, { status: 200 });
    }

    // Try Birdeye first (best quality, requires API key)
    const birdeyeKey = process.env.BIRDEYE_API_KEY;
    if (birdeyeKey && mint) {
      try {
        const birdeyeUrl = new URL("https://public-api.birdeye.so/defi/history_price");
        birdeyeUrl.searchParams.set("address", mint);
        birdeyeUrl.searchParams.set("address_type", "token");
        birdeyeUrl.searchParams.set("type", "1D"); // Daily data
        birdeyeUrl.searchParams.set("time_from", Math.floor(historicalTimestamp / 1000).toString());
        birdeyeUrl.searchParams.set("time_to", Math.floor(historicalTimestamp / 1000 + 86400).toString());

        const response = await fetch(birdeyeUrl.toString(), {
          headers: {
            "X-API-KEY": birdeyeKey,
          },
          next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (response.ok) {
          const data = await response.json();
          const items = data?.data?.items || [];
          
          if (items.length > 0) {
            // Get the closest price point
            const pricePoint = items[0];
            const historicalPrice = pricePoint.value || pricePoint.price;
            
            if (historicalPrice) {
              return NextResponse.json({
                symbol,
                mint,
                daysAgo,
                historicalDate: historicalDate.toISOString(),
                historicalPrice,
                source: "birdeye",
                timestamp: pricePoint.unixTime * 1000,
              }, { status: 200 });
            }
          }
        }
      } catch (e) {
        console.error("Birdeye API error:", e);
        // Continue to fallback
      }
    }

    // Fallback 1: CoinGecko (free tier)
    const coinGeckoIds: Record<string, string> = {
      SOL: "solana",
      USDC: "usd-coin",
      BONK: "bonk",
      JUP: "jupiter-exchange-solana",
      ORCA: "orca",
      RAY: "raydium",
      MSOL: "marinade-staked-sol",
    };

    const coinGeckoId = coinGeckoIds[symbol.toUpperCase()];
    if (coinGeckoId) {
      try {
        // CoinGecko's free API has historical data
        const dateStr = historicalDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const parts = dateStr.split('-');
        const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY for CoinGecko
        
        const cgUrl = `https://api.coingecko.com/api/v3/coins/${coinGeckoId}/history?date=${formattedDate}`;
        
        const response = await fetch(cgUrl, {
          next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (response.ok) {
          const data = await response.json();
          const historicalPrice = data?.market_data?.current_price?.usd;
          
          if (historicalPrice) {
            return NextResponse.json({
              symbol,
              daysAgo,
              historicalDate: historicalDate.toISOString(),
              historicalPrice,
              source: "coingecko",
            }, { status: 200 });
          }
        }
      } catch (e) {
        console.error("CoinGecko API error:", e);
        // Continue to fallback
      }
    }

    // Fallback 2: DexScreener (limited historical, but free)
    // DexScreener doesn't have great historical data, but we can try
    if (mint) {
      try {
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
          { next: { revalidate: 300 } }
        );

        if (response.ok) {
          const data = await response.json();
          const pairs = data.pairs || [];
          
          if (pairs.length > 0) {
            // Use price change data to estimate historical price
            const pair = pairs[0];
            const currentPrice = parseFloat(pair.priceUsd);
            const priceChange24h = pair.priceChange?.h24 || 0;
            
            // Very rough approximation based on 24h change
            // This is not accurate for longer periods, but better than nothing
            let historicalPrice = currentPrice;
            
            if (daysAgo <= 1) {
              historicalPrice = currentPrice / (1 + priceChange24h / 100);
            } else {
              // For longer periods, we don't have data, so we'll estimate
              // This is very approximate and should be flagged
              const estimatedChange = priceChange24h * (daysAgo / 30); // Linear approximation (not accurate!)
              historicalPrice = currentPrice / (1 + estimatedChange / 100);
            }
            
            return NextResponse.json({
              symbol,
              mint,
              daysAgo,
              historicalDate: historicalDate.toISOString(),
              historicalPrice,
              source: "dexscreener",
              warning: daysAgo > 1 ? "Historical data approximated - limited accuracy for periods > 24h" : undefined,
            }, { status: 200 });
          }
        }
      } catch (e) {
        console.error("DexScreener API error:", e);
      }
    }

    // Final fallback: Use current price with synthetic variance
    // This is the same as the mock, but we've tried all real sources
    try {
      const priceResponse = await fetch(
        `${req.url.split('/historical-price')[0]}/price?ids=${symbol}`,
        { next: { revalidate: 0 } }
      );
      
      if (priceResponse.ok) {
        const priceData = await priceResponse.json();
        const currentPrice = priceData?.data?.[symbol]?.price;
        
        if (currentPrice) {
          // Use deterministic variance based on days
          const seed = (daysAgo * 12345) % 1000000;
          const variance = (seed / 1000000) * 0.3 + 0.85; // 0.85-1.15 range
          const historicalPrice = currentPrice * variance;
          
          return NextResponse.json({
            symbol,
            daysAgo,
            historicalDate: historicalDate.toISOString(),
            historicalPrice,
            source: "approximation",
            warning: "Historical price approximated - could not fetch real historical data. Consider adding BIRDEYE_API_KEY for accurate historical prices.",
          }, { status: 200 });
        }
      }
    } catch (e) {
      console.error("Fallback price fetch error:", e);
    }

    // If all else fails, return error
    return NextResponse.json({
      error: "Could not fetch historical price from any provider",
      suggestions: [
        "Add BIRDEYE_API_KEY environment variable for best historical data",
        "Provide mint address for better provider support",
        "Check if the token symbol is supported",
      ],
    }, { status: 503 });

  } catch (e: any) {
    console.error("Historical price error:", e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
