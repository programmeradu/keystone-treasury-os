/**
 * Atlas Session API — Wallet-Based Session Recovery
 * 
 * GET  ?wallet=<address>  — Recover existing session (conversation history, context)
 * POST { wallet, messages }  — Save new messages to session
 * DELETE ?wallet=<address>  — Clear session history
 * 
 * No account required. Wallet address = identity.
 */

import { NextRequest, NextResponse } from "next/server";
import {
    getOrCreateSession,
    saveConversation,
    clearSession,
    updateSessionContext,
    type AtlasMessage,
} from "@/lib/atlas-session";

export const dynamic = "force-dynamic";

// GET — Recover session for a wallet
export async function GET(req: NextRequest) {
    try {
        const wallet = req.nextUrl.searchParams.get("wallet");

        if (!wallet) {
            return NextResponse.json(
                { error: "wallet query param required" },
                { status: 400 }
            );
        }

        const session = await getOrCreateSession(wallet);

        if (!session) {
            return NextResponse.json({
                wallet,
                hasSession: false,
                conversationHistory: [],
                context: null,
            });
        }

        return NextResponse.json({
            wallet,
            hasSession: true,
            sessionId: session.id,
            conversationHistory: session.conversationHistory,
            lastQuery: session.lastQuery,
            context: session.context,
            expiresAt: session.expiresAt.toISOString(),
            createdAt: session.createdAt.toISOString(),
        });
    } catch (error: any) {
        console.error("[atlas-session API] GET error:", error);
        return NextResponse.json(
            { error: "Failed to recover session" },
            { status: 500 }
        );
    }
}

// POST — Save messages and/or context
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { wallet, messages, context } = body as {
            wallet: string;
            messages?: AtlasMessage[];
            context?: Record<string, unknown>;
        };

        if (!wallet) {
            return NextResponse.json(
                { error: "wallet is required" },
                { status: 400 }
            );
        }

        let saved = false;

        if (messages && messages.length > 0) {
            saved = await saveConversation(wallet, messages);
        }

        if (context) {
            saved = await updateSessionContext(wallet, context) || saved;
        }

        return NextResponse.json({
            ok: saved,
            wallet,
        });
    } catch (error: any) {
        console.error("[atlas-session API] POST error:", error);
        return NextResponse.json(
            { error: "Failed to save session" },
            { status: 500 }
        );
    }
}

// DELETE — Clear session history
export async function DELETE(req: NextRequest) {
    try {
        const wallet = req.nextUrl.searchParams.get("wallet");

        if (!wallet) {
            return NextResponse.json(
                { error: "wallet query param required" },
                { status: 400 }
            );
        }

        const cleared = await clearSession(wallet);

        return NextResponse.json({
            ok: cleared,
            wallet,
        });
    } catch (error: any) {
        console.error("[atlas-session API] DELETE error:", error);
        return NextResponse.json(
            { error: "Failed to clear session" },
            { status: 500 }
        );
    }
}
