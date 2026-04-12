import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-utils";
import { fastspringBasicAuthHeader, reconcileFastSpringTierForUser } from "@/lib/fastspring";

/**
 * GET /api/fastspring/status
 * Reconciles subscription tier from FastSpring (safety net if webhooks lag).
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        fastspringBasicAuthHeader();
    } catch {
        return NextResponse.json({ error: "FastSpring is not configured" }, { status: 503 });
    }

    const miniPath = process.env.FASTSPRING_PRODUCT_PATH_MINI?.trim();
    const maxPath = process.env.FASTSPRING_PRODUCT_PATH_MAX?.trim();
    const scope = (process.env.FASTSPRING_SUBSCRIPTION_SCOPE?.trim() as "live" | "test" | "all" | undefined) || "live";

    try {
        const result = await reconcileFastSpringTierForUser(user.id, miniPath, maxPath, scope);

        if (result.tier !== user.tier) {
            const { db } = await import("@/db");
            const { users } = await import("@/db/schema");
            const { eq } = await import("drizzle-orm");
            if (db) {
                await db.update(users).set({ tier: result.tier }).where(eq(users.id, user.id));
            }
        }

        return NextResponse.json({
            tier: result.tier,
            status: result.status,
            nextChargeDate: result.nextChargeDate,
            reconciled: result.tier !== user.tier,
        });
    } catch (error) {
        console.error("[FastSpring] Status check error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
