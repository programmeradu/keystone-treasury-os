import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, vaults, dcaBots, teamMembers, purchases, runs } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";

/**
 * DELETE /api/user/delete
 * GDPR-compliant user data deletion.
 * Deletes all personal data associated with the authenticated user.
 */
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!db) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    const userId = authUser.id;
    console.log(`[GDPR Delete] User ${userId} requested data deletion`);

    // Delete in order due to foreign key constraints

    // 1. Delete DCA bots
    await db.delete(dcaBots).where(eq(dcaBots.userId, userId));

    // 2. Delete team memberships
    await db.delete(teamMembers).where(eq(teamMembers.userId, userId));

    // 3. Delete purchases made by user
    await db.delete(purchases).where(eq(purchases.buyerWallet, authUser.walletAddress));

    // 4. Delete AI runs
    await db.delete(runs).where(eq(runs.userId, userId));

    // 5. Delete user's vaults
    await db.delete(vaults).where(eq(vaults.userId, userId));

    // 6. Finally delete the user account
    await db.delete(users).where(eq(users.id, userId));

    console.log(`[GDPR Delete] Successfully deleted all data for user ${userId}`);

    // Clear session cookie
    const response = NextResponse.json({
      success: true,
      message: "All user data has been permanently deleted",
    });

    response.cookies.set("keystone-siws-session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("[GDPR Delete] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete user data" },
      { status: 500 }
    );
  }
}
