import { NextRequest, NextResponse } from "next/server";
import { planStrategy } from "@/lib/llm/strategy-planner";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { prompt, walletState } = body;

        if (!prompt) {
            return NextResponse.json(
                { error: "Prompt is required" },
                { status: 400 }
            );
        }

        // Default mock wallet state if not provided (for safety/testing)
        const state = walletState || {
            balances: {},
            portfolio: {},
            totalValue: 0
        };

        const plan = await planStrategy(prompt, state);

        return NextResponse.json({ plan });
    } catch (error) {
        console.error("Agent API Error:", error);
        return NextResponse.json(
            { error: "Failed to process agent request", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
