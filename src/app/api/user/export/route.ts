import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, vaults, teamMembers, runs, dcaBots, purchases } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";

export const runtime = "edge";

export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req);
        const userId = authUser?.id;
        const walletAddress = authUser?.walletAddress;

        if (!userId) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        if (!db) {
            return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
        }

        // Export all user data
        const userData = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        const userVaults = await db.select().from(vaults).where(eq(vaults.userId, userId));
        const userTeamMemberships = await db.select().from(teamMembers).where(eq(teamMembers.userId, userId));
        const userRuns = await db.select().from(runs).where(eq(runs.userId, userId));

        let userDcaBots: any[] = [];
        let userPurchases: any[] = [];

        userDcaBots = await db.select().from(dcaBots).where(eq(dcaBots.userId, userId));

        if (walletAddress) {
            userPurchases = await db.select().from(purchases).where(eq(purchases.buyerWallet, walletAddress));
        }

        const safeUser = userData[0] ? {
            id: userData[0].id,
            walletAddress: userData[0].walletAddress,
            email: userData[0].email,
            displayName: userData[0].displayName,
            role: userData[0].role,
            tier: userData[0].tier,
            onboardingCompleted: userData[0].onboardingCompleted,
            createdAt: userData[0].createdAt
        } : null;

        const exportData = {
            message: "User data export complete",
            user: safeUser,
            vaults: userVaults,
            teamMemberships: userTeamMemberships,
            runs: userRuns,
            dcaBots: userDcaBots,
            purchases: userPurchases,
            exportMetadata: {
                exportedAt: new Date().toISOString(),
                version: "1.0.0"
            }
        };

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="keystone_export_${userId}.json"`
            }
        });
    } catch (error) {
        console.error("GDPR Export error:", error);
        return NextResponse.json({ error: "Failed to export user data" }, { status: 500 });
    }
}
