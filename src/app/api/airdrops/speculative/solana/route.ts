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

export async function GET() {
  try {
    const res = await fetch(SOURCE_URL, {
      // Keep fresh
      cache: "no-store",
      headers: {
        "user-agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch source", status: res.status },
        { status: res.status }
      );
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
    return NextResponse.json(
      { error: "Unexpected error", message: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}