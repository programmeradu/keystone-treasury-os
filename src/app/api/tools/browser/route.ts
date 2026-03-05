/**
 * Cloudflare Browser Rendering API — Exposes CF Browser endpoints.
 *
 * POST /api/tools/browser
 * Body: { action, ...params }
 *
 * Actions:
 *   screenshot  — URL/HTML to PNG/JPEG
 *   pdf         — URL/HTML to PDF
 *   json        — URL + prompt to structured JSON (AI-powered)
 *   markdown    — URL to clean markdown
 *   snapshot    — URL to full rendered HTML snapshot
 *   scrape      — URL + CSS selectors to extracted elements
 *   links       — URL to all links on the page
 */

import { NextRequest, NextResponse } from "next/server";
import {
    screenshot,
    pdf,
    jsonExtract,
    markdown,
    snapshot,
    scrape,
    links,
} from "@/lib/cloudflare/cf-browser";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, ...params } = body;

        if (!action) {
            return NextResponse.json(
                { error: "Missing 'action' field. Supported: screenshot, pdf, json, markdown, snapshot, scrape, links" },
                { status: 400 }
            );
        }

        switch (action) {
            case "screenshot": {
                const buffer = await screenshot(params);
                const base64 = Buffer.from(buffer).toString("base64");
                const type = params.screenshotOptions?.type || "png";
                return NextResponse.json({
                    action: "screenshot",
                    format: type,
                    dataUrl: `data:image/${type};base64,${base64}`,
                    sizeBytes: buffer.byteLength,
                });
            }

            case "pdf": {
                const buffer = await pdf(params);
                const base64 = Buffer.from(buffer).toString("base64");
                return NextResponse.json({
                    action: "pdf",
                    dataUrl: `data:application/pdf;base64,${base64}`,
                    sizeBytes: buffer.byteLength,
                });
            }

            case "json": {
                if (!params.prompt) {
                    return NextResponse.json(
                        { error: "JSON extraction requires a 'prompt' field." },
                        { status: 400 }
                    );
                }
                const result = await jsonExtract(params);
                return NextResponse.json({ action: "json", ...result });
            }

            case "markdown": {
                if (!params.url) {
                    return NextResponse.json(
                        { error: "Markdown conversion requires a 'url' field." },
                        { status: 400 }
                    );
                }
                const md = await markdown(params);
                return NextResponse.json({ action: "markdown", content: md });
            }

            case "snapshot": {
                if (!params.url) {
                    return NextResponse.json(
                        { error: "Snapshot requires a 'url' field." },
                        { status: 400 }
                    );
                }
                const html = await snapshot(params);
                return NextResponse.json({ action: "snapshot", content: html });
            }

            case "scrape": {
                if (!params.elements || !Array.isArray(params.elements)) {
                    return NextResponse.json(
                        { error: "Scrape requires an 'elements' array with CSS selectors." },
                        { status: 400 }
                    );
                }
                const data = await scrape(params);
                return NextResponse.json({ action: "scrape", data });
            }

            case "links": {
                if (!params.url) {
                    return NextResponse.json(
                        { error: "Links extraction requires a 'url' field." },
                        { status: 400 }
                    );
                }
                const data = await links(params);
                return NextResponse.json({ action: "links", data });
            }

            default:
                return NextResponse.json(
                    { error: `Unknown action '${action}'. Supported: screenshot, pdf, json, markdown, snapshot, scrape, links` },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error("[BrowserAPI] Error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
