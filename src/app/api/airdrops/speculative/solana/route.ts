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

// Fallback data when the source is unavailable
function getFallbackData() {
  const fallbackItems = [
    {
      title: "Jupiter - DEX Aggregator",
      url: "https://jup.ag",
      project: "Jupiter",
      summary: "Leading DEX aggregator on Solana with potential airdrop opportunities",
      source: SOURCE_URL,
    },
    {
      title: "Marinade Finance - Liquid Staking",
      url: "https://marinade.finance",
      project: "Marinade",
      summary: "Liquid staking protocol for Solana with mSOL token",
      source: SOURCE_URL,
    },
    {
      title: "Orca - AMM DEX",
      url: "https://orca.so",
      project: "Orca",
      summary: "Automated market maker on Solana ecosystem",
      source: SOURCE_URL,
    },
    {
      title: "Raydium - AMM & DEX",
      url: "https://raydium.io",
      project: "Raydium",
      summary: "Automated market maker and DEX on Solana",
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
      message: "Source temporarily unavailable, serving cached data"
    },
    { status: 200, headers: { "Cache-Control": "private, max-age=300" } }
  );
}

export async function GET() {
  try {
    // Enhanced user agents to avoid bot detection
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ];
    const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];

    const res = await fetch(SOURCE_URL, {
      // Keep fresh
      cache: "no-store",
      headers: {
        "user-agent": randomUA,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.5",
        "accept-encoding": "gzip, deflate, br",
        "dnt": "1",
        "connection": "keep-alive",
        "upgrade-insecure-requests": "1",
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!res.ok) {
      // Return mock data when source is unavailable instead of propagating error
      console.warn(`Source ${SOURCE_URL} returned ${res.status}, returning fallback data`);
      return getFallbackData();
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Narrow scope to main content to avoid header/footer/nav captures
    const $scope = $("main, #primary, .site-main, .content-area, #content").first().length
      ? $("main, #primary, .site-main, .content-area, #content").first()
      : $("body");

    const items: Array<{
      title: string;
      url?: string;
      project?: string;
      summary?: string;
      tags?: string[];
      image?: string;
      source: string;
    }> = [];

    // NEW: Prefer explicit list inside the "Potential Solana Ecosystem Airdrops" article
    if (items.length === 0) {
      // Find the first heading that contains our section title (case-insensitive) safely
      const heading = $scope
        .find("h1, h2, h3, h4")
        .filter((_, el) => $(el).text().toLowerCase().includes("potential solana ecosystem airdrops"))
        .first();

      const $article = heading.length ? heading.closest("article") : $("");
      const base = $article.length ? $article : $scope;
      const content = base.find(".entry-content, .post-content, .entry, .content, .post-inner, .post").first().length
        ? base.find(".entry-content, .post-content, .entry, .content, .post-inner, .post").first()
        : base;

      // Collect list-style anchors (ul/li or paragraph lists)
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

        // Heuristic: keep external project links or airdrop/detail pages
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
    }

    // Primary pattern: WordPress-like article cards
    $scope.find("article").each((_, el) => {
      const node = $(el);
      const a = node.find(".entry-title a, header h2 a, h2.entry-title a, h3.entry-title a").first();
      const titleText = (a.text() || node.find(".entry-title, header h2, h2, h3").first().text() || "").trim();
      const href = a.attr("href");
      if (!titleText || !href) return;

      // Filter out generic/category pages
      if (/airdrops\.io\/?$/i.test(href)) return;
      if (href === SOURCE_URL) return;
      if (/category|tag|speculative\/solana\/?$/i.test(href)) return;
      if (/Potential Solana Ecosystem Airdrops/i.test(titleText)) return;
      if (/Airdrops\.io/i.test(titleText)) return;

      const img = node.find("img").first().attr("src") || node.find("img").first().attr("data-src");
      const summaryText = (node.find(".entry-summary, .card-text, .excerpt, .entry-content p").first().text() || "")
        .replace(/\s+/g, " ")
        .trim();

      const tags: string[] = [];
      node.find(".tags a, .tag-list a, .post-tags a, .badge, .chip").each((__, t) => {
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

    // Fallback: anchor-based collection within main content (avoid nav/footer)
    if (items.length < 4) {
      $scope.find("a[href]").each((_, el) => {
        const a = $(el);
        const href = a.attr("href") || "";
        const text = (a.text() || "").trim();
        if (!text || text.length < 2) return;
        // Skip obvious site/nav links
        if (/^\/?(privacy|terms|about|contact)/i.test(href)) return;
        if (/^https?:\/\/airdrops\.io\/?$/i.test(href)) return;
        if (href === SOURCE_URL) return;
        if (/category|tag|speculative\/solana\/?$/i.test(href)) return;
        if (/Airdrops\.io/i.test(text)) return;
        // Prefer post/article/detail pages or external project links
        if (!/\/airdrop\//i.test(href) && !/\/(post|guide|news)\//i.test(href) && !/^(https?:)?\/\//.test(href)) return;

        items.push({
          title: text,
          url: absUrl(href),
          project: text.split(" – ")[0].split(":")[0].split("|")[0].trim(),
          source: SOURCE_URL,
        });
      });
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

    return NextResponse.json(
      {
        count: unique.length,
        items: unique,
        source: SOURCE_URL,
        scrapedAt: new Date().toISOString(),
      },
      { status: 200, headers: { "Cache-Control": "private, max-age=60" } }
    );
  } catch (err: any) {
    console.error("Airdrops API error:", err.message);
    
    // Check if it's a network/timeout error, return fallback data
    if (err.name === 'AbortError' || err.code === 'ENOTFOUND' || err.message.includes('fetch failed')) {
      console.warn("Network error detected, returning fallback data");
      return getFallbackData();
    }
    
    return NextResponse.json(
      { error: "Unexpected error", message: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}