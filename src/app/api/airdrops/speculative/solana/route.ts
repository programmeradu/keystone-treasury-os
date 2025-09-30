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
  console.log("Airdrops API: Using fallback data - real scraping failed after all attempts");
  
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

  return NextResponse.json(
    {
      count: fallbackItems.length,
      items: fallbackItems,
      source: SOURCE_URL,
      scrapedAt: new Date().toISOString(),
      fallback: true,
      message: "Real-time scraping temporarily unavailable. Serving curated Solana DeFi opportunities. These protocols have active ecosystems with potential for rewards and airdrops."
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
      
      // Enhanced user agents to avoid bot detection
      const userAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0"
      ];
      const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];

      // Exponential backoff delay for retries
      if (attempt > 1) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 2s, 4s delays
        console.log(`Airdrops API: Waiting ${delay}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const timeoutMs = 15000 + (attempt * 5000); // Increase timeout with attempts: 20s, 25s, 30s
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(SOURCE_URL, {
        cache: "no-store",
        headers: {
          "user-agent": randomUA,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9",
          "accept-encoding": "gzip, deflate, br",
          "dnt": "1",
          "connection": "keep-alive",
          "upgrade-insecure-requests": "1",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "sec-fetch-user": "?1",
          "cache-control": "max-age=0",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn(`Airdrops API: Attempt ${attempt} failed with status ${res.status}`);
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
        console.warn(`Airdrops API: Attempt ${attempt} timed out`);
      } else if (err.code === 'ENOTFOUND' || err.message.includes('fetch failed')) {
        console.warn(`Airdrops API: Attempt ${attempt} network error`);
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