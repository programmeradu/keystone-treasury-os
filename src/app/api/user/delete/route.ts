import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, vaults, teamMembers, runs, dcaBots, purchases } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";

export const runtime = "edge";

export async function DELETE(req: NextRequest) {
    try {
        if (!db) {
            return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
        }

        const authUser = await getAuthUser(req);
        const userId = authUser?.id;
        const walletAddress = authUser?.walletAddress;

        if (!userId) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        // Explicitly delete user data to avoid orphaned records
        // Delete associated runs, vaults, teamMembers
        await db.delete(runs).where(eq(runs.userId, userId));
        await db.delete(vaults).where(eq(vaults.userId, userId));
        await db.delete(teamMembers).where(eq(teamMembers.userId, userId));

        // Delete purchases where wallet matches
        if (walletAddress) {
            await db.delete(purchases).where(eq(purchases.buyerWallet, walletAddress));
        }

        // Delete DCA bots where userId matches
        await db.delete(dcaBots).where(eq(dcaBots.userId, userId));

        // Finally delete the user
        await db.delete(users).where(eq(users.id, userId));

        const response = NextResponse.json({ success: true, message: "User deleted successfully" });

        // Clear session cookie
        response.cookies.set('keystone-siws-session', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 0,
        });

        return response;
    } catch (error) {
        console.error("GDPR Delete error:", error);
        return NextResponse.json({ error: "Failed to delete user account" }, { status: 500 });
    }
}
