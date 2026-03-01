/**
 * GET /api/og?appId=xxx — Dynamic Open Graph image for marketplace listings.
 *
 * Renders a branded card at 1200x630 (OG standard) using CF Browser Rendering.
 * Cache: 1 hour to reduce CF calls.
 */

import { NextRequest, NextResponse } from "next/server";
import { screenshot } from "@/lib/cloudflare/cf-browser";

function buildOgHtml(app: { name: string; description: string; creator: string; price?: string; category?: string }): string {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1200px; height: 630px;
      background: linear-gradient(135deg, #09090b 0%, #0c1a0f 50%, #09090b 100%);
      color: white; font-family: system-ui, -apple-system, sans-serif;
      display: flex; flex-direction: column; justify-content: center;
      padding: 80px;
      overflow: hidden;
    }
    .badge {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.2);
      border-radius: 100px; padding: 6px 16px;
      font-size: 13px; font-weight: 800; letter-spacing: 0.15em;
      text-transform: uppercase; color: #34d399; margin-bottom: 32px;
      width: fit-content;
    }
    .badge .dot { width: 6px; height: 6px; border-radius: 50%; background: #34d399; }
    .title {
      font-size: 64px; font-weight: 900; letter-spacing: -0.03em;
      line-height: 1.1; margin-bottom: 20px; max-width: 900px;
    }
    .title span { color: #34d399; }
    .desc {
      font-size: 22px; color: rgba(255,255,255,0.5); max-width: 700px;
      line-height: 1.5; margin-bottom: 40px;
    }
    .meta {
      display: flex; gap: 32px; align-items: center;
      font-size: 15px; color: rgba(255,255,255,0.4);
      font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
    }
    .meta .sep { width: 1px; height: 16px; background: rgba(255,255,255,0.1); }
    .price { color: #34d399; }
    .corner {
      position: absolute; bottom: 60px; right: 80px;
      font-size: 11px; font-weight: 900; letter-spacing: 0.3em;
      text-transform: uppercase; color: rgba(255,255,255,0.15);
    }
  </style>
</head>
<body>
  <div class="badge"><div class="dot"></div> Keystone OS</div>
  <div class="title">${escapeHtml(app.name)}</div>
  <div class="desc">${escapeHtml(app.description || "")}</div>
  <div class="meta">
    <span>By ${escapeHtml(app.creator || "Developer")}</span>
    <div class="sep"></div>
    <span>${escapeHtml(app.category || "Utility")}</span>
    ${app.price ? `<div class="sep"></div><span class="price">${escapeHtml(app.price)}</span>` : '<div class="sep"></div><span class="price">FREE</span>'}
  </div>
  <div class="corner">Sovereign OS // Mini-App</div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const appId = searchParams.get("appId");
        const name = searchParams.get("name") || "Keystone Mini-App";
        const description = searchParams.get("description") || "Built on Keystone OS";
        const creator = searchParams.get("creator") || "Developer";
        const price = searchParams.get("price") || "";
        const category = searchParams.get("category") || "Utility";

        const html = buildOgHtml({ name, description, creator, price, category });

        const imageBuffer = await screenshot({
            html,
            viewportWidth: 1200,
            viewportHeight: 630,
            screenshotOptions: { type: "png" },
        });

        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                "Content-Type": "image/png",
                "Cache-Control": "public, max-age=3600, s-maxage=3600",
                "Content-Length": String(imageBuffer.byteLength),
            },
        });
    } catch (err) {
        console.error("[og] Error:", err);
        // Return a 1x1 transparent pixel as fallback
        const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg==", "base64");
        return new NextResponse(pixel, {
            status: 200,
            headers: { "Content-Type": "image/png" },
        });
    }
}
