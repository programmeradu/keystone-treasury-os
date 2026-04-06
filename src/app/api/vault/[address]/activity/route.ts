import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { teamActivityLog, users, vaults, teamMembers } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { jwtVerify } from "jose";

async function getAuthUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('keystone-siws-session')?.value;
  if (!token) return null;

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;

    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer: 'keystone-treasury-os',
    });
    return payload.sub as string;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ address: string }> }) {
    try {
        const { address } = await params;

        if (!address || address === "undefined") {
            return NextResponse.json([]);
        }

        // SECURITY: Verify user has access to this vault
        const userId = await getAuthUserId(req);
        if (!userId) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        // Find vault and verify user has access (owner or team member)
        const vault = await db!
            .select()
            .from(vaults)
            .where(eq(vaults.address, address))
            .limit(1);

        if (!vault[0]) {
            return NextResponse.json({ error: "Vault not found" }, { status: 404 });
        }

        // Allow vault owner direct access
        const isOwner = vault[0].userId === userId;

        if (!isOwner && vault[0].teamId) {
            // Check team membership for shared vaults
            const membership = await db!
                .select()
                .from(teamMembers)
                .where(and(
                    eq(teamMembers.teamId, vault[0].teamId),
                    eq(teamMembers.userId, userId)
                ))
                .limit(1);

            if (!membership[0]) {
                return NextResponse.json({ error: "Forbidden - you don't have access to this vault" }, { status: 403 });
            }
        } else if (!isOwner) {
            return NextResponse.json({ error: "Forbidden - you don't have access to this vault" }, { status: 403 });
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
