import { NextRequest } from "next/server";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";

// GET /api/airdrops/sources/airdropsio/solana
// Scrapes https://airdrops.io/speculative/solana/ and returns a normalized list
export async function GET(_req: NextRequest) {
  const target = "https://airdrops.io/speculative/solana/";

  // MOCK_MODE: return deterministic items to avoid upstream flakiness in CI
  const mockMode = String(process.env.MOCK_MODE || "").toLowerCase() === "true";
  if (mockMode) {
    const items = [
      {
        id: "mock-solana-campaign",
        name: "Mock Solana Campaign",
        url: "https://example.com/solana-campaign",
        image: null,
        tags: ["speculative", "solana"],
        excerpt: "Try swapping on Jupiter and staking mSOL to qualify.",
        status: "speculative",
        network: "solana",
        source: "airdrops.io",
        tasks: [
          { id: "mock-swap", label: "Swap on Jupiter", type: "swap" },
          { id: "mock-stake", label: "Stake SOL to mSOL", type: "stake" },
        ],
      },
      {
        id: "mock-liquidity-campaign",
        name: "Mock Liquidity Campaign",
        url: "https://example.com/liquidity",
        image: null,
        tags: ["lp", "dex"],
        excerpt: "Provide SOL/USDC liquidity for bonus points.",
        status: "speculative",
        network: "solana",
        source: "airdrops.io",
        tasks: [
          { id: "mock-lp", label: "Provide SOL/USDC liquidity", type: "lp" },
        ],
      },
    ];
    return new Response(
      JSON.stringify({ ok: true, count: items.length, data: items, fetchedFrom: "mock" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const res = await fetch(target, { cache: "no-store" });
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream error ${res.status}`, status: res.status }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Heuristic card extraction (WordPress-based site may change; keep selectors flexible)
    const items: any[] = [];

    $("article, .airdrops-list .airdrop-card, .post, .entry").each((_, el) => {
      const $el = $(el);

      // Title + URL
      const $titleLink = $el.find("a:has(h2), h2 a, .entry-title a, .card-title a").first();
      const title = ($titleLink.text() || $el.find("h2, .entry-title, .card-title").first().text() || "").trim();
      const url = ($titleLink.attr("href") || $el.find("a").first().attr("href") || "").trim();

      if (!title || !url) return; // skip incomplete

      // Cover/Logo if present
      const img = ($el.find("img").attr("src") || "").trim();

      // Tags/labels
      const tags = $el
        .find(".post-tags a, .tags a, .tag, .badge, .labels .label")
        .map((_, t) => $(t).text().trim())
        .get()
        .filter(Boolean);

      // Excerpt/description
      const excerpt = (
        $el.find(".entry-content p, .excerpt, p").first().text() || ""
      )
        .replace(/\s+/g, " ")
        .trim();

      // Attempt to infer tasks/quests by scanning bullet lists or CTA sections
      const taskTexts: string[] = [];
      $el.find("ul li, .requirements li, .tasks li").each((_, li) => {
        const t = $(li).text().replace(/\s+/g, " ").trim();
        if (t) taskTexts.push(t);
      });

      // Fallback: look for inline requirements keywords
      if (taskTexts.length === 0 && excerpt) {
        const hints = ["swap", "stake", "bridge", "deposit", "trade", "lp", "meme", "vote", "mint", "hold", "use", "quest", "campaign", "referral", "stake SOL", "trade on", "provide liquidity", "bridge to"];
        const matched = hints.filter((h) => excerpt.toLowerCase().includes(h));
        if (matched.length) taskTexts.push(...matched);
      }

      // Normalize guessed task types
      const tasks = taskTexts.slice(0, 8).map((t, idx) => {
        const lt = t.toLowerCase();
        let type: "swap" | "stake" | "bridge" | "lp" | "trade" | "mint" | "hold" | "quest" | "other" = "other";
        if (/(swap|jupiter|dex)/i.test(lt)) type = "swap";
        else if (/(stake|stake\s+sol|marinade|jito|kamino)/i.test(lt)) type = "stake";
        else if (/(lp|liquidity|pool)/i.test(lt)) type = "lp";
        else if (/(trade|volume)/i.test(lt)) type = "trade";
        else if (/(bridge)/i.test(lt)) type = "bridge";
        else if (/(mint)/i.test(lt)) type = "mint";
        else if (/(hold|holding)/i.test(lt)) type = "hold";
        else if (/(quest|campaign|task)/i.test(lt)) type = "quest";
        return {
          id: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-t${idx + 1}`,
          label: t,
          type,
        };
      });

      // Build normalized item
      const id = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      items.push({
        id,
        name: title,
        url,
        image: img || null,
        tags,
        excerpt,
        status: "speculative",
        network: "solana",
        source: "airdrops.io",
        tasks,
      });
    });

    // Deduplicate by id
    const seen = new Set<string>();
    const unique = items.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));

    return new Response(
      JSON.stringify({ ok: true, count: unique.length, data: unique, fetchedFrom: target }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message || "Scrape failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}