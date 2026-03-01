/**
 * POST /api/studio/generate-image — Generate images via Cloudflare Workers AI.
 *
 * Uses @cf/black-forest-labs/flux-2-klein-9b for:
 * - Mini-app icons and logos
 * - UI placeholder images
 * - In-app image generation for mini-apps
 *
 * Returns base64-encoded PNG image.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { prompt, width, height, purpose } = body;

        if (!prompt) {
            return NextResponse.json(
                { error: "Prompt is required" },
                { status: 400 }
            );
        }

        // Resolve Cloudflare credentials
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        const cfToken = process.env.CLOUDFLARE_AI_TOKEN;

        if (!accountId || !cfToken) {
            return NextResponse.json(
                {
                    error: "no_image_provider",
                    details: "Cloudflare Workers AI not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_TOKEN.",
                },
                { status: 200 }
            );
        }

        // Enhance prompt based on purpose
        let enhancedPrompt = prompt;
        switch (purpose) {
            case "app-icon":
                enhancedPrompt = `Minimal, modern app icon for a fintech/crypto application: ${prompt}. Clean design, solid background, flat style, professional, high contrast, centered symbol, no text, square composition`;
                break;
            case "mini-app-image":
                enhancedPrompt = `Clean, modern UI illustration for a Web3 financial application: ${prompt}. Dark theme, professional, minimalist, fintech style`;
                break;
            case "banner":
                enhancedPrompt = `Wide banner image for a crypto/DeFi application: ${prompt}. Dark gradient background, professional, sleek, modern fintech branding`;
                break;
            case "placeholder":
                enhancedPrompt = `Minimal placeholder illustration: ${prompt}. Monochrome, subtle, professional`;
                break;
            default:
                // Use prompt as-is
                break;
        }

        const model = "@cf/black-forest-labs/flux-2-klein-9b";
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

        const cfRes = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${cfToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                prompt: enhancedPrompt,
                width: width || 512,
                height: height || 512,
                num_steps: 4, // Flux-klein is optimized for 4 steps
            }),
        });

        if (!cfRes.ok) {
            const err = await cfRes.text().catch(() => "");
            throw new Error(`Cloudflare AI error (${cfRes.status}): ${err.slice(0, 200)}`);
        }

        // Flux returns raw binary image data
        const imageBuffer = await cfRes.arrayBuffer();
        const base64 = Buffer.from(imageBuffer).toString("base64");

        return NextResponse.json({
            image: base64,
            mimeType: "image/png",
            dataUrl: `data:image/png;base64,${base64}`,
            model,
            prompt: enhancedPrompt,
        });
    } catch (err) {
        console.error("[generate-image] Error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Image generation failed" },
            { status: 500 }
        );
    }
}
