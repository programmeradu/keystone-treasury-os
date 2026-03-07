import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const SOURCE_URL = "https://airdrops.io/speculative/solana/";

function absUrl(href?: string) {
  if (!href) return undefined;
  try {
    return new URL(href, SOURCE_URL).toString();
  } catch {
    return href;
  }
}

// Fallback data when the source is unavailable after all retry attempts
function getFallbackData() {
  const isProduction = process.env.NODE_ENV === 'production';
  const environmentInfo = isProduction ? 'production' : 'development';
  
  console.log(`Airdrops API: Using fallback data in ${environmentInfo} environment - real scraping failed after all attempts`);
  
  const fallbackItems = [
    { title: "Jupiter - DEX Aggregator", url: "https://jup.ag", project: "Jupiter", summary: "Leading DEX aggregator on Solana. Active JUP staking, governance votes, and periodic airdrop seasons.", source: SOURCE_URL },
    { title: "Marinade Finance - Liquid Staking", url: "https://marinade.finance", project: "Marinade", summary: "Liquid staking with mSOL. Earn staking yield plus DeFi composability across the ecosystem.", source: SOURCE_URL },
    { title: "Orca - Concentrated Liquidity DEX", url: "https://orca.so", project: "Orca", summary: "Top concentrated-liquidity AMM on Solana. Whirlpool LPs earn trading fees and potential incentives.", source: SOURCE_URL },
    { title: "Raydium - AMM & Order Book DEX", url: "https://raydium.io", project: "Raydium", summary: "Hybrid AMM with on-chain order book. AcceleRaytor launchpad and yield farming pools.", source: SOURCE_URL },
    { title: "Kamino Finance - Yield Vaults", url: "https://kamino.finance", project: "Kamino", summary: "Automated liquidity vaults, lending, and leverage strategies. Active KMNO points program.", source: SOURCE_URL },
    { title: "Solend - Lending & Borrowing", url: "https://solend.fi", project: "Solend", summary: "Algorithmic lending protocol on Solana. Supply or borrow assets with variable APY.", source: SOURCE_URL },
    { title: "Drift Protocol - Perpetuals DEX", url: "https://drift.trade", project: "Drift", summary: "Decentralized perpetual futures and spot exchange. Active DRIFT token and trading rewards.", source: SOURCE_URL },
    { title: "Marginfi - Lending & Points", url: "https://marginfi.com", project: "Marginfi", summary: "Lending protocol with an active points program. Deposit or borrow to earn mrgn points.", source: SOURCE_URL },
    { title: "Tensor - NFT Marketplace", url: "https://tensor.trade", project: "Tensor", summary: "Pro-grade NFT trading platform. TNSR token with trading rewards and season-based airdrops.", source: SOURCE_URL },
    { title: "Sanctum - LST Hub", url: "https://sanctum.so", project: "Sanctum", summary: "Liquid staking token aggregator. Swap between LSTs and earn CLOUD points.", source: SOURCE_URL },
    { title: "Jito - MEV & Liquid Staking", url: "https://jito.network", project: "Jito", summary: "MEV-powered liquid staking with JitoSOL. Earn staking APY plus MEV rewards.", source: SOURCE_URL },
    { title: "Parcl - Real Estate Perpetuals", url: "https://parcl.co", project: "Parcl", summary: "Trade real-world real estate indexes as perpetuals on Solana. Active PRCL rewards.", source: SOURCE_URL },
    { title: "Phoenix DEX - On-chain CLOB", url: "https://phoenix.trade", project: "Phoenix", summary: "Fully on-chain central limit order book. Fast fills and deep liquidity for Solana tokens.", source: SOURCE_URL },
    { title: "Meteora - Dynamic Liquidity", url: "https://meteora.ag", project: "Meteora", summary: "Dynamic AMM pools and DLMM vaults. Earn yield with intelligent liquidity management.", source: SOURCE_URL },
    { title: "Pyth Network - Oracle Data", url: "https://pyth.network", project: "Pyth", summary: "High-fidelity oracle network. PYTH staking and governance for data publishers and consumers.", source: SOURCE_URL },
  ];

  const message = isProduction 
    ? "Real-time scraping temporarily unavailable in production. Serving curated Solana DeFi opportunities. If this persists, check Netlify function logs for network errors."
    : "Real-time scraping temporarily unavailable (likely firewall restrictions in development). Serving curated Solana DeFi opportunities.";

  return NextResponse.json(
    {
      count: fallbackItems.length,
      items: fallbackItems,
      source: SOURCE_URL,
      scrapedAt: new Date().toISOString(),
      fallback: true,
      environment: environmentInfo,
      message: message
    },
    { status: 200, headers: { "Cache-Control": "private, max-age=900" } } // 15 min cache for fallback
  );
}

export async function GET() {
  console.log("Airdrops API: Starting request to", SOURCE_URL);
  
  // Try multiple scraping attempts with different strategies
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Airdrops API: Attempt ${attempt}/3`);
      
      // Enhanced user agents to avoid bot detection - more variety and recent versions
      const userAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15"
      ];
      const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];

      // Shorter exponential backoff delay for retries (better for serverless)
      if (attempt > 1) {
        const delay = Math.pow(1.5, attempt - 1) * 1000; // 1.5s, 2.25s delays
        console.log(`Airdrops API: Waiting ${Math.round(delay)}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Shorter timeouts optimized for serverless functions (Netlify has 10s default limit)
      const timeoutMs = 8000 + (attempt * 1000); // 9s, 10s, 11s - stay under Netlify limits
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      console.log(`Airdrops API: Attempt ${attempt} using timeout ${timeoutMs}ms and UA: ${randomUA.substring(0, 50)}...`);

      const res = await fetch(SOURCE_URL, {
        cache: "no-store",
        headers: {
          "user-agent": randomUA,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9,fr;q=0.8,de;q=0.7",
          "accept-encoding": "gzip, deflate, br, zstd",
          "dnt": "1",
          "connection": "keep-alive",
          "upgrade-insecure-requests": "1",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "sec-fetch-user": "?1",
          "cache-control": "max-age=0",
          // Add more realistic headers to avoid bot detection
          "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "pragma": "no-cache",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`Airdrops API: Attempt ${attempt} got response status: ${res.status}`);

      if (!res.ok) {
        console.warn(`Airdrops API: Attempt ${attempt} failed with status ${res.status} ${res.statusText}`);
        
        // Check for specific error codes that might indicate different issues
        if (res.status === 403) {
          console.warn("Airdrops API: 403 Forbidden - possible bot detection or IP blocking");
        } else if (res.status === 429) {
          console.warn("Airdrops API: 429 Rate Limited - backing off longer");
          // For rate limiting, wait longer before next attempt
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        } else if (res.status >= 500) {
          console.warn("Airdrops API: Server error, trying next attempt");
        }
        
        if (attempt === 3) {
          // Only use fallback after all attempts failed
          console.warn("Airdrops API: All attempts failed, using fallback data");
          return getFallbackData();
        }
        continue; // Try next attempt
      }

      console.log(`Airdrops API: Attempt ${attempt} successful, parsing content`);
      const html = await res.text();
      
      if (!html || html.length < 500) {
        console.warn(`Airdrops API: Attempt ${attempt} returned insufficient content (${html.length} chars)`);
        if (attempt === 3) {
          return getFallbackData();
        }
        continue;
      }

      console.log(`Airdrops API: Attempt ${attempt} received ${html.length} chars of HTML content`);
      const $ = cheerio.load(html);
      const items = parseAirdropsContent($);

      if (items.length > 0) {
        console.log(`Airdrops API: Successfully scraped ${items.length} items on attempt ${attempt}`);
        return NextResponse.json(
          {
            count: items.length,
            items: items,
            source: SOURCE_URL,
            scrapedAt: new Date().toISOString(),
            attempt: attempt,
            fallback: false, // Explicitly mark as real data
          },
          { status: 200, headers: { "Cache-Control": "private, max-age=60" } }
        );
      } else {
        console.warn(`Airdrops API: Attempt ${attempt} parsed but found no items`);
        if (attempt === 3) {
          return getFallbackData();
        }
        continue;
      }

    } catch (err: any) {
      console.error(`Airdrops API: Attempt ${attempt} error:`, err.message);
      
      // Check if it's a network/timeout error
      if (err.name === 'AbortError') {
        console.warn(`Airdrops API: Attempt ${attempt} timed out after ${8000 + (attempt * 1000)}ms`);
      } else if (err.code === 'ENOTFOUND' || err.message.includes('fetch failed')) {
        console.warn(`Airdrops API: Attempt ${attempt} network error - DNS resolution or connection failed`);
      } else if (err.code === 'ECONNREFUSED') {
        console.warn(`Airdrops API: Attempt ${attempt} connection refused`);
      } else if (err.code === 'ETIMEDOUT') {
        console.warn(`Airdrops API: Attempt ${attempt} connection timed out`);
      } else {
        console.warn(`Airdrops API: Attempt ${attempt} unexpected error:`, err.code || err.name);
      }
      
      if (attempt === 3) {
        console.warn("Airdrops API: All attempts failed with errors, using fallback data");
        return getFallbackData();
      }
      continue; // Try next attempt
    }
  }

  // Fallback if all attempts somehow failed without returning
  console.warn("Airdrops API: Unexpected fallthrough, using fallback data");
  return getFallbackData();
}

interface AirdropItem {
  title: string;
  url?: string;
  project?: string;
  summary?: string;
  tags?: string[];
  image?: string;
  source: string;
}

function parseAirdropsContent($: cheerio.CheerioAPI): AirdropItem[] {
  const items: AirdropItem[] = [];

  // Strategy 1: Card-based extraction via "CLAIM AIRDROP" links (current site layout)
  // Each card has: h3 project name, li with "Actions:", and a visit link
  const claimLinks = $('a[href*="airdrops.io/visit/"]');
  console.log(`Airdrops API: Strategy 1 - Found ${claimLinks.length} claim links`);

  claimLinks.each((_, el) => {
    const link = $(el);
    const card = link.closest("div, article, section, li");
    if (!card.length) return;

    const heading = card.find("h3, h2, h4").first();
    const title = (heading.text() || "").trim();
    if (!title) return;

    const detailHref = heading.find("a").attr("href") || link.attr("href") || "";
    const img = card.find("img").first().attr("src") || card.find("img").first().attr("data-src");

    let summary = "";
    card.find("li, p, .description, .excerpt, .actions, span").each((__, descEl) => {
      const text = $(descEl).text().trim();
      if (text.startsWith("Actions:") || text.startsWith("Value:")) {
        summary = text;
        return false;
      }
    });
    if (!summary) {
      const cardText = card.text().replace(/\s+/g, " ").trim();
      const actionsMatch = cardText.match(/Actions?:\s*(.+?)(?:CLAIM|$)/i);
      const valueMatch = cardText.match(/Value:\s*(.+?)(?:CLAIM|$)/i);
      summary = actionsMatch?.[0]?.trim() || valueMatch?.[0]?.trim() || "";
    }

    const tags: string[] = [];
    card.find(".badge, .tag, .chip, .label, [class*='tag'], [class*='badge']").each((__, t) => {
      const text = $(t).text().trim();
      if (text && text.length < 30) tags.push(text);
    });

    items.push({
      title,
      url: absUrl(detailHref),
      project: title.split(" – ")[0].split(":")[0].split("|")[0].trim(),
      summary: summary || undefined,
      tags: tags.length ? Array.from(new Set(tags)) : undefined,
      image: absUrl(img),
      source: SOURCE_URL,
    });
  });

  console.log(`Airdrops API: Strategy 1 extracted ${items.length} items`);

  // Strategy 2: Heading + sibling link extraction (alternative layouts)
  if (items.length < 3) {
    console.log("Airdrops API: Strategy 2 - Heading-based extraction");
    const beforeCount = items.length;
    const existingTitles = new Set(items.map(i => i.title.toLowerCase()));

    $("h3, h2").each((_, el) => {
      const heading = $(el);
      const title = heading.text().trim();
      if (!title || title.length < 2 || title.length > 100) return;
      if (existingTitles.has(title.toLowerCase())) return;
      if (/filter|follow|newsletter|airdrops\.io/i.test(title)) return;

      const href = heading.find("a").attr("href")
        || heading.next("a").attr("href")
        || heading.parent().find('a[href*="airdrops.io/visit/"], a[href*="/airdrop/"]').first().attr("href")
        || "";
      if (!href) return;
      if (/airdrops\.io\/?$/i.test(href) || href === SOURCE_URL) return;

      let summary = "";
      const nextEl = heading.nextAll("ul, ol, p").first();
      if (nextEl.length) {
        summary = nextEl.text().replace(/\s+/g, " ").trim().slice(0, 200);
      }

      items.push({
        title,
        url: absUrl(href),
        project: title.split(" – ")[0].split(":")[0].split("|")[0].trim(),
        summary: summary || undefined,
        source: SOURCE_URL,
      });
      existingTitles.add(title.toLowerCase());
    });

    console.log(`Airdrops API: Strategy 2 added ${items.length - beforeCount} items`);
  }

  // Deduplicate by normalized title+url
  const seen = new Set<string>();
  const unique = items
    .filter((it) => {
      const key = `${it.title.toLowerCase()}|${it.url || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 30);

  console.log(`Airdrops API: Final result: ${unique.length} unique items after deduplication`);
  return unique;
}