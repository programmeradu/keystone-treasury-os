import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, vaults, dcaBots, teamMembers, purchases, runs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";

/**
 * GET /api/user/export
 * GDPR-compliant user data export.
 * Returns all personal data associated with the authenticated user in JSON format.
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    const userId = authUser.id;
    console.log(`[GDPR Export] User ${userId} requested data export`);

    // Fetch all user data
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch related data
    const vaultsData = await db
      .select()
      .from(vaults)
      .where(eq(vaults.userId, userId));

    const dcaBotsData = await db
      .select()
      .from(dcaBots)
      .where(eq(dcaBots.userId, userId));

    const teamMemberships = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));

    const purchasesData = await db
      .select()
      .from(purchases)
      .where(eq(purchases.buyerWallet, authUser.walletAddress));

    const runsData = await db
      .select()
      .from(runs)
      .where(eq(runs.userId, userId));

    const exportData = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        userId: userId,
        requestSource: "GDPR data portability request",
      },
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        tier: user.tier,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      vaults: vaultsData || [],
      dcaBots: dcaBotsData,
      teamMemberships: teamMemberships.map((m) => ({
        teamId: m.teamId,
        role: m.role,
        status: m.status,
        joinedAt: m.invitedAt,
      })),
      purchases: purchasesData.map((p) => ({
        appId: p.appId,
        amountUsdc: p.amountUsdc,
        purchasedAt: p.createdAt,
      })),
      aiRuns: runsData.map((r) => ({
        shortId: r.shortId,
        prompt: r.prompt,
        createdAt: r.createdAt,
      })),
    };

    console.log(`[GDPR Export] Successfully exported data for user ${userId}`);

    return NextResponse.json(exportData, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="keystone-data-export-${userId}.json"`,
      },
    });
  } catch (error) {
    console.error("[GDPR Export] Error:", error);
    return NextResponse.json(
      { error: "Failed to export user data" },
      { status: 500 }
    );
  }
}
