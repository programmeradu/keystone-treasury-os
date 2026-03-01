/**
 * POST /api/studio/render-markdown — Convert any URL to clean markdown.
 *
 * Uses CF Browser Rendering /markdown endpoint.
 * Use cases:
 * - SEO pre-rendering of mini-app pages
 * - Documentation generation
 * - Content extraction for AI context
 */

import { NextRequest, NextResponse } from "next/server";
import { markdown } from "@/lib/cloudflare/cf-browser";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { url } = body;

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        const result = await markdown({
            url,
            waitForTimeout: 3000,
        });

        // Handle both string and object response formats
        const mdContent = typeof result === "string"
            ? result
            : (result as any)?.result || (result as any)?.markdown || JSON.stringify(result);

        return NextResponse.json({
            markdown: mdContent,
            source: url,
            byteLength: Buffer.byteLength(mdContent, "utf-8"),
        });
    } catch (err) {
        console.error("[render-markdown] Error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Markdown conversion failed" },
            { status: 500 }
        );
    }
}
