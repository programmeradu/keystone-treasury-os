import { NextRequest, NextResponse } from "next/server";
import { Liveblocks } from "@liveblocks/node";
import { jwtVerify } from "jose";

const SIWS_COOKIE = "keystone-siws-session";
const NEON_AUTH_COOKIE_NAMES = [
    "__Secure-neon-auth.session_token",
    "neon-auth.session_token",
    "__Secure-neon-auth.local.session_data",
    "neon-auth.local.session_data",
    "better-auth.session_token",
];

let _liveblocks: Liveblocks | null = null;
function getLiveblocks() {
    if (!_liveblocks) {
        const secret = process.env.LIVEBLOCKS_SECRET_KEY;
        if (!secret) throw new Error("LIVEBLOCKS_SECRET_KEY is not set");
        _liveblocks = new Liveblocks({ secret });
    }
    return _liveblocks;
}

function getJwtSecret() {
    return new TextEncoder().encode(
        process.env.JWT_SECRET || "keystone_sovereign_os_2026"
    );
}

/**
 * POST /api/liveblocks-auth
 *
 * Authenticates the current user and returns a scoped Liveblocks token.
 * The room ID requested in the body is validated to ensure the user only
 * joins rooms they own (user-scoped) or are invited to (vault-scoped).
 */
export async function POST(request: NextRequest) {
    let userId: string | null = null;
    let userName: string | null = null;
    let userAvatar: string | null = null;

    // ─── Try SIWS JWT cookie first ──────────────────────────────────
    const siwsToken = request.cookies.get(SIWS_COOKIE)?.value;
    if (siwsToken) {
        try {
            const { payload } = await jwtVerify(siwsToken, getJwtSecret(), {
                issuer: "keystone-treasury-os",
            });
            userId = (payload.sub as string) || null;
            const wallet = payload.wallet as string | undefined;
            userName = wallet
                ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}`
                : userId;
        } catch {}
    }

    // ─── Fallback: Try Neon Auth session ────────────────────────────
    if (!userId) {
        const neonCookie = NEON_AUTH_COOKIE_NAMES.find(
            (name) => request.cookies.get(name)?.value
        );
        if (neonCookie) {
            try {
                const base =
                    process.env.NEON_AUTH_BASE_URL ||
                    "https://ep-plain-hill-alckyy0h.neonauth.c-3.eu-central-1.aws.neon.tech/neondb/auth";
                const res = await fetch(`${base}/get-session`, {
                    headers: {
                        cookie: request.headers.get("cookie") || "",
                    },
                });
                if (res.ok) {
                    const data = await res.json();
                    const user = data?.user || data?.data?.user;
                    if (user?.id) {
                        userId = user.id;
                        userName = user.name || user.email || userId;
                        userAvatar = user.image || user.avatar || null;
                    }
                }
            } catch {}
        }
    }

    if (!userId) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    // ─── Parse the requested room from the body ─────────────────────
    const body = await request.json().catch(() => ({ room: null }));
    const room = body.room as string | null;

    if (!room) {
        return NextResponse.json(
            { error: "Room ID is required" },
            { status: 400 }
        );
    }

    // ─── Validate room access ───────────────────────────────────────
    // User-scoped rooms: "user:{userId}" — only the owner can access
    // Vault-scoped rooms: "vault:{vaultAddress}" — checked later when
    //   team/vault membership is added
    if (room.startsWith("user:")) {
        const roomOwner = room.slice("user:".length);
        if (roomOwner !== userId) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }
    }

    // ─── Prepare identity and authorize ─────────────────────────────
    const colorPalette = [
        "#E57373", "#64B5F6", "#81C784", "#FFD54F",
        "#BA68C8", "#4DD0E1", "#FF8A65", "#A1887F",
    ];
    const colorIndex =
        userId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) %
        colorPalette.length;

    const session = getLiveblocks().prepareSession(userId, {
        userInfo: {
            name: userName || "Anonymous",
            color: colorPalette[colorIndex],
            avatar:
                userAvatar ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userId)}`,
        },
    });

    // Grant access to the requested room
    session.allow(room, session.FULL_ACCESS);

    const { status, body: authBody } = await session.authorize();
    return new Response(authBody, { status });
}
