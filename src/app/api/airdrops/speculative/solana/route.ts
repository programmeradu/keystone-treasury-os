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
    {
      title: "Jupiter - DEX Aggregator",
      url: "https://jup.ag",
      project: "Jupiter",
      summary: "Leading DEX aggregator on Solana with potential airdrop opportunities. Recently launched JUP token.",
      source: SOURCE_URL,
    },
    {
      title: "Marinade Finance - Liquid Staking",
      url: "https://marinade.finance",
      project: "Marinade",
      summary: "Liquid staking protocol for Solana with mSOL token. Active governance and yield farming opportunities.",
      source: SOURCE_URL,
    },
    {
      title: "Orca - AMM DEX",
      url: "https://orca.so",
      project: "Orca",
      summary: "User-friendly automated market maker on Solana ecosystem with concentrated liquidity.",
      source: SOURCE_URL,
    },
    {
      title: "Raydium - AMM & DEX",
      url: "https://raydium.io",
      project: "Raydium",
      summary: "Automated market maker and order book DEX built on Solana with yield farming.",
      source: SOURCE_URL,
    },
    {
      title: "Kamino Finance - Yield Optimization",
      url: "https://kamino.finance",
      project: "Kamino",
      summary: "Automated liquidity and yield strategies for Solana DeFi protocols.",
      source: SOURCE_URL,
    },
    {
      title: "Solend - Lending Protocol",
      url: "https://solend.fi",
      project: "Solend",
      summary: "Algorithmic, decentralized protocol for lending and borrowing on Solana.",
      source: SOURCE_URL,
    }
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
      const items = await parseAirdropsContent($);

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

// Enhanced content parsing with multiple strategies
async function parseAirdropsContent($: cheerio.CheerioAPI): Promise<Array<{
  title: string;
  url?: string;
  project?: string;
  summary?: string;
  tags?: string[];
  image?: string;
  source: string;
}>> {
  const items: Array<{
    title: string;
    url?: string;
    project?: string;
    summary?: string;
    tags?: string[];
    image?: string;
    source: string;
  }> = [];

  // Strategy 1: Look for main content area
  const $scope = $("main, #primary, .site-main, .content-area, #content").first().length
    ? $("main, #primary, .site-main, .content-area, #content").first()
    : $("body");

  console.log("Airdrops API: Parsing strategy 1 - Main content extraction");

  // Strategy 1a: Look for structured article lists
  $scope.find("article").each((_, el) => {
    const node = $(el);
    const a = node.find(".entry-title a, header h2 a, h2.entry-title a, h3.entry-title a, .post-title a").first();
    const titleText = (a.text() || node.find(".entry-title, header h2, h2, h3, .post-title").first().text() || "").trim();
    const href = a.attr("href");
    
    if (!titleText || !href) return;

    // Filter out generic/category pages
    if (/airdrops\.io\/?$/i.test(href)) return;
    if (href === SOURCE_URL) return;
    if (/category|tag|speculative\/solana\/?$/i.test(href)) return;
    if (/Potential Solana Ecosystem Airdrops/i.test(titleText)) return;
    if (/Airdrops\.io/i.test(titleText)) return;

    const img = node.find("img").first().attr("src") || node.find("img").first().attr("data-src");
    const summaryText = (node.find(".entry-summary, .card-text, .excerpt, .entry-content p, .post-excerpt").first().text() || "")
      .replace(/\s+/g, " ")
      .trim();

    const tags: string[] = [];
    node.find(".tags a, .tag-list a, .post-tags a, .badge, .chip, .category a").each((__, t) => {
      const text = $(t).text().trim();
      if (text) tags.push(text);
    });

    let project = node.find("strong, b").first().text().trim();
    if (!project && titleText) {
      project = titleText.split(" – ")[0].split(":")[0].split("|")[0].trim();
    }

    items.push({
      title: titleText,
      url: absUrl(href),
      project,
      summary: summaryText || undefined,
      tags: tags.length ? Array.from(new Set(tags)) : undefined,
      image: absUrl(img),
      source: SOURCE_URL,
    });
  });

  console.log(`Airdrops API: Strategy 1a found ${items.length} articles`);

  // Strategy 1b: Look for list-based content if articles didn't yield enough
  if (items.length < 3) {
    console.log("Airdrops API: Strategy 1b - List-based extraction");
    
    // Find headings that mention airdrops
    const heading = $scope
      .find("h1, h2, h3, h4")
      .filter((_, el) => {
        const text = $(el).text().toLowerCase();
        return text.includes("potential") || text.includes("airdrop") || text.includes("solana");
      })
      .first();

    const $article = heading.length ? heading.closest("article") : $("");
    const base = $article.length ? $article : $scope;
    const content = base.find(".entry-content, .post-content, .entry, .content, .post-inner, .post").first().length
      ? base.find(".entry-content, .post-content, .entry, .content, .post-inner, .post").first()
      : base;

    // Collect list-style anchors
    content.find("ul li a[href], ol li a[href], p a[href]").each((_, el) => {
      const a = $(el);
      const href = a.attr("href") || "";
      const text = (a.text() || "").trim();
      if (!text || text.length < 2) return;
      
      // Skip site/nav and meta links
      if (/^\/?(privacy|terms|about|contact)/i.test(href)) return;
      if (/^https?:\/\/airdrops\.io\/?$/i.test(href)) return;
      if (href === SOURCE_URL) return;
      if (/category|tag|speculative\/solana\/?$/i.test(href)) return;
      if (/Airdrops\.io/i.test(text)) return;

      // Keep external project links or airdrop/detail pages
      const keep = /^(https?:)?\/\//.test(href) || /\/airdrop\//i.test(href) || /\/(post|guide|news)\//i.test(href);
      if (!keep) return;

      // Optional summary from nearby text
      const p = $(el).closest("li, p");
      const summary = (p.clone().children("a, img, strong, b").remove().end().text() || "").replace(/\s+/g, " ").trim();

      items.push({
        title: text,
        url: absUrl(href),
        project: text.split(" – ")[0].split(":")[0].split("|")[0].trim(),
        summary: summary || undefined,
        source: SOURCE_URL,
      });
    });

    console.log(`Airdrops API: Strategy 1b added ${items.length - (items.length - content.find("ul li a[href], ol li a[href], p a[href]").length)} more items`);
  }

  // Strategy 2: Generic link extraction as final fallback
  if (items.length < 2) {
    console.log("Airdrops API: Strategy 2 - Generic link extraction");
    
    $scope.find("a[href]").each((_, el) => {
      const a = $(el);
      const href = a.attr("href") || "";
      const text = (a.text() || "").trim();
      if (!text || text.length < 2) return;
      
      // More lenient filtering for this strategy
      if (/^\/?(privacy|terms|about|contact)/i.test(href)) return;
      if (/^https?:\/\/airdrops\.io\/?$/i.test(href)) return;
      if (href === SOURCE_URL) return;
      if (/Airdrops\.io/i.test(text)) return;
      
      // Look for promising external links
      if (/^https?:\/\//.test(href) && !href.includes('airdrops.io')) {
        // Check if the link text suggests it's a crypto project
        if (/\b(defi|dex|swap|stake|farm|pool|protocol|finance|dao|token)\b/i.test(text)) {
          items.push({
            title: text,
            url: absUrl(href),
            project: text.split(" – ")[0].split(":")[0].split("|")[0].trim(),
            source: SOURCE_URL,
          });
        }
      }
    });

    console.log(`Airdrops API: Strategy 2 added ${items.length - (items.length - $scope.find("a[href]").length)} more items`);
  }

  // Deduplicate by title/url and keep top N
  const seen = new Set<string>();
  const unique = items
    .filter((it) => {
      const key = `${(it.title || "").toLowerCase()}|${it.url || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 24);

  console.log(`Airdrops API: Final result: ${unique.length} unique items after deduplication`);
  return unique;
}