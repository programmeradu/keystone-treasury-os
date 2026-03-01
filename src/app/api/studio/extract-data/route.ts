/**
 * POST /api/studio/extract-data — AI-powered structured data extraction.
 *
 * Uses CF Browser Rendering /json endpoint to browse a webpage and extract
 * structured data using natural language prompts. Powered by Workers AI.
 *
 * Use cases:
 * - Extract token prices from Jupiter/Raydium
 * - Get protocol stats for AI Architect context
 * - Mini-app data feeds
 */

import { NextRequest, NextResponse } from "next/server";
import { jsonExtract } from "@/lib/cloudflare/cf-browser";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { url, html, prompt, schema } = body;

        if (!url && !html) {
            return NextResponse.json({ error: "Provide url or html" }, { status: 400 });
        }
        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        const result = await jsonExtract({
            url,
            html,
            prompt,
            response_format: schema
                ? { type: "json_schema", schema }
                : undefined,
            // Wait for JS-heavy pages to finish rendering
            waitForTimeout: 3000,
        });

        return NextResponse.json({
            success: result.success ?? true,
            data: result.result,
            source: url || "(html)",
            prompt,
        });
    } catch (err) {
        console.error("[extract-data] Error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Data extraction failed" },
            { status: 500 }
        );
    }
}
