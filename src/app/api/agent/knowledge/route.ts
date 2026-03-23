import { NextRequest, NextResponse } from "next/server";
import { knowledgeBase } from "@/lib/knowledge";

export const maxDuration = 60; // Allow 60s for scraping
export const runtime = 'edge';

export async function POST(req: NextRequest) {
    try {
        const { query } = await req.json();

        if (!query) {
            return NextResponse.json({ error: "Query required" }, { status: 400 });
        }

        const result = await knowledgeBase.study(query);

        return NextResponse.json(result);
    } catch (error) {
        console.error("[KnowledgeAPI] Error:", error);
        return NextResponse.json(
            { error: "Failed to conduct research" },
            { status: 500 }
        );
    }
}
