import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { teamActivityLog, users, teamMembers, teams } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ address: string }> }) {
    try {
        const { address } = await params;

        if (!address || address === "undefined") {
            return NextResponse.json([]);
        }

        const user = await getAuthUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const access = await db!.select()
            .from(teamMembers)
            .innerJoin(teams, eq(teamMembers.teamId, teams.id))
            .where(and(eq(teams.vaultAddress, address), eq(teamMembers.userId, user.id)))
            .limit(1);

        if (access.length === 0) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const logs = await db!
            .select({
                id: teamActivityLog.id,
                action: teamActivityLog.action,
                description: teamActivityLog.description,
                metadata: teamActivityLog.metadata,
                createdAt: teamActivityLog.createdAt,
                targetType: teamActivityLog.targetType,
                targetId: teamActivityLog.targetId,
                user: {
                    id: users.id,
                    name: users.displayName,
                    wallet: users.walletAddress,
                }
            })
            .from(teamActivityLog)
            .leftJoin(users, eq(teamActivityLog.userId, users.id))
            .where(eq(teamActivityLog.vaultAddress, address))
            .orderBy(desc(teamActivityLog.createdAt))
            .limit(50);

        return NextResponse.json(logs);
    } catch (error) {
        console.error("Failed to fetch vault activity:", error);
        return NextResponse.json({ error: "Failed to load log stream" }, { status: 500 });
    }
}
