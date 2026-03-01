/**
 * POST /api/studio/screenshot — Capture mini-app screenshots for marketplace cards.
 *
 * Uses Cloudflare Browser Rendering to render HTML and capture a PNG.
 * Called during publish to auto-generate marketplace thumbnails.
 */

import { NextRequest, NextResponse } from "next/server";
import { screenshot } from "@/lib/cloudflare/cf-browser";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { html, url, width = 400, height = 300, selector, fullPage = false } = body;

        if (!html && !url) {
            return NextResponse.json({ error: "Provide html or url" }, { status: 400 });
        }

        const imageBuffer = await screenshot({
            html,
            url,
            viewportWidth: width,
            viewportHeight: height,
            selector,
            screenshotOptions: {
                type: "png",
                fullPage,
                omitBackground: false,
            },
            // Inject dark theme base styles for mini-app rendering
            addStyleTag: html ? [{ content: "body { margin: 0; background: #09090b; color: white; font-family: system-ui, sans-serif; }" }] : undefined,
        });

        const base64 = Buffer.from(imageBuffer).toString("base64");

        return NextResponse.json({
            image: base64,
            mimeType: "image/png",
            dataUrl: `data:image/png;base64,${base64}`,
            width,
            height,
        });
    } catch (err) {
        console.error("[screenshot] Error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Screenshot failed" },
            { status: 500 }
        );
    }
}
