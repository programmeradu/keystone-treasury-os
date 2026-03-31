"use server";

import { db } from "@/db";

import { miniApps, purchases, userInstalledApps, users } from "@/db/schema";
import { eq, desc, inArray, and, isNull } from "drizzle-orm";
import { generateId } from "@/lib/utils";

export interface ProjectMetadata {
    name: string;
    description: string;
}

export interface ProjectCode {
    files: Record<string, { content: string }>;
    content?: string;
}

export async function saveProject(
    userId: string,
    code: ProjectCode,
    metadata: ProjectMetadata,
    appId?: string
) {
    if (!db) {
        throw new Error("Database connection not available");
    }

    const id = appId || generateId();

    try {
        const existingRows = appId
            ? await db.select().from(miniApps).where(eq(miniApps.id, appId)).limit(1)
            : [];
        const existingApp = existingRows[0] ?? null;

        if (existingApp && existingApp.creatorWallet !== userId) {
            throw new Error("Unauthorized: You do not own this project");
        }

        await db
            .insert(miniApps)
            .values({
                id,
                creatorWallet: userId,
                name: metadata.name,
                description: metadata.description,
                code: code,
                version: "0.1.0",
                isPublished: false,
            })
            .onConflictDoUpdate({
                target: miniApps.id,
                set: {
                    name: metadata.name,
                    description: metadata.description,
                    code: code,
                    updatedAt: new Date(),
                }
            });

        return { success: true, appId: id };
    } catch (error) {
        console.error("Failed to save project:", error);
        return { success: false, error: "Failed to save project" };
    }
}

export async function getProjects(userId: string) {
    if (!db) return [];

    try {
        const projects = await db
            .select()
            .from(miniApps)
            .where(eq(miniApps.creatorWallet, userId))
            .orderBy(desc(miniApps.updatedAt));

        return projects;
    } catch (error) {
        console.error("Failed to fetch projects:", error);
        return [];
    }
}

export async function getProject(appId: string) {
    if (!db) return null;

    try {
        const rows = await db
            .select()
            .from(miniApps)
            .where(eq(miniApps.id, appId))
            .limit(1);

        return rows[0] ?? null;
    } catch (error) {
        console.error("Failed to fetch project:", error);
        return null;
    }
}

export async function getInstalledApps(walletAddress: string) {
    if (!db || !walletAddress) return [];

    try {
        // 1. Get apps created by user (via wallet address)
        const createdApps = await db
            .select()
            .from(miniApps)
            .where(eq(miniApps.creatorWallet, walletAddress));

        // 2. Get apps purchased by user (via wallet address)
        const userPurchases = await db
            .select({ appId: purchases.appId })
            .from(purchases)
            .where(eq(purchases.buyerWallet, walletAddress));

        const purchasedAppIds = userPurchases.map(p => p.appId);

        let purchasedApps: typeof createdApps = [];
        if (purchasedAppIds.length > 0) {
            purchasedApps = await db
                .select()
                .from(miniApps)
                .where(inArray(miniApps.id, purchasedAppIds));
        }

        // Combine and deduplicate
        const allApps = [...createdApps, ...purchasedApps];
        const uniqueApps = Array.from(new Map(allApps.map(item => [item.id, item])).values());

        // Sort by updatedAt descending
        return uniqueApps.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    } catch (error) {
        console.error("Failed to fetch installed apps:", error);
        return [];
    }
}

// ─── Install / Uninstall / Dock Management ───────────────────────────

/** Resolve a wallet address to the users.id UUID. Returns null if not found. */
async function resolveUserId(walletAddress: string): Promise<string | null> {
    if (!db || !walletAddress) return null;
    try {
        const rows = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.walletAddress, walletAddress))
            .limit(1);
        return rows[0]?.id ?? null;
    } catch {
        return null;
    }
}

export async function installApp(walletAddress: string, appId: string) {
    if (!db) throw new Error("Database not available");

    try {
        const dbUserId = await resolveUserId(walletAddress);
        if (!dbUserId) return { success: true, message: "Tracked via purchases/creatorWallet" };

        const existing = await db
            .select()
            .from(userInstalledApps)
            .where(
                and(
                    eq(userInstalledApps.userId, dbUserId),
                    eq(userInstalledApps.appId, appId),
                    isNull(userInstalledApps.uninstalledAt)
                )
            )
            .limit(1);

        if (existing.length > 0) {
            return { success: true, message: "Already installed" };
        }

        const allInstalled = await db
            .select({ dockOrder: userInstalledApps.dockOrder })
            .from(userInstalledApps)
            .where(
                and(
                    eq(userInstalledApps.userId, dbUserId),
                    isNull(userInstalledApps.uninstalledAt)
                )
            );

        const maxOrder = allInstalled.length > 0
            ? Math.max(...allInstalled.map(i => i.dockOrder))
            : -1;

        const installId = generateId("install");
        await db.insert(userInstalledApps).values({
            id: installId,
            userId: dbUserId,
            appId,
            dockOrder: maxOrder + 1,
        });

        return { success: true, installId };
    } catch (error) {
        console.error("Failed to install app:", error);
        return { success: false, error: "Install failed" };
    }
}

export async function uninstallApp(walletAddress: string, appId: string) {
    if (!db) throw new Error("Database not available");

    try {
        const dbUserId = await resolveUserId(walletAddress);
        if (!dbUserId) return { success: true };

        await db
            .update(userInstalledApps)
            .set({ uninstalledAt: new Date() })
            .where(
                and(
                    eq(userInstalledApps.userId, dbUserId),
                    eq(userInstalledApps.appId, appId),
                    isNull(userInstalledApps.uninstalledAt)
                )
            );

        return { success: true };
    } catch (error) {
        console.error("Failed to uninstall app:", error);
        return { success: false, error: "Uninstall failed" };
    }
}

export async function reorderDock(walletAddress: string, appIds: string[]) {
    if (!db) throw new Error("Database not available");

    try {
        const dbUserId = await resolveUserId(walletAddress);
        if (!dbUserId) return { success: true };

        for (let i = 0; i < appIds.length; i++) {
            await db
                .update(userInstalledApps)
                .set({ dockOrder: i })
                .where(
                    and(
                        eq(userInstalledApps.userId, dbUserId),
                        eq(userInstalledApps.appId, appIds[i]),
                        isNull(userInstalledApps.uninstalledAt)
                    )
                );
        }

        return { success: true };
    } catch (error) {
        console.error("Failed to reorder dock:", error);
        return { success: false, error: "Reorder failed" };
    }
}

export async function togglePinApp(walletAddress: string, appId: string, pinned: boolean) {
    if (!db) throw new Error("Database not available");

    try {
        const dbUserId = await resolveUserId(walletAddress);
        if (!dbUserId) return { success: true };

        await db
            .update(userInstalledApps)
            .set({ pinned })
            .where(
                and(
                    eq(userInstalledApps.userId, dbUserId),
                    eq(userInstalledApps.appId, appId),
                    isNull(userInstalledApps.uninstalledAt)
                )
            );

        return { success: true };
    } catch (error) {
        console.error("Failed to toggle pin:", error);
        return { success: false, error: "Pin toggle failed" };
    }
}

// ─── Marketplace Publish ─────────────────────────────────────────────

export async function publishApp(
    userId: string,
    appId: string,
    opts: {
        description: string;
        priceUsdc: number;
        category: string;
        screenshotUrl?: string;
    }
) {
    if (!db) throw new Error("Database not available");

    try {
        // Verify ownership
        const rows = await db
            .select({ creatorWallet: miniApps.creatorWallet })
            .from(miniApps)
            .where(eq(miniApps.id, appId))
            .limit(1);

        if (rows.length === 0) {
            return { success: false, error: "App not found" };
        }
        if (rows[0].creatorWallet !== userId) {
            return { success: false, error: "Not authorized" };
        }

        await db
            .update(miniApps)
            .set({
                isPublished: true,
                description: opts.description,
                priceUsdc: String(opts.priceUsdc),
                category: opts.category,
                screenshotUrl: opts.screenshotUrl,
                updatedAt: new Date(),
            })
            .where(eq(miniApps.id, appId));

        return { success: true };
    } catch (error) {
        console.error("Failed to publish app:", error);
        return { success: false, error: "Publish failed" };
    }
}

export async function checkOwnership(walletAddress: string, appId: string): Promise<boolean> {
    if (!db || !walletAddress) return false;

    try {
        // Check if creator
        const creatorRows = await db
            .select({ id: miniApps.id })
            .from(miniApps)
            .where(and(eq(miniApps.id, appId), eq(miniApps.creatorWallet, walletAddress)))
            .limit(1);
        if (creatorRows.length > 0) return true;

        // Check purchases
        const purchaseRows = await db
            .select({ id: purchases.id })
            .from(purchases)
            .where(and(eq(purchases.buyerWallet, walletAddress), eq(purchases.appId, appId)))
            .limit(1);
        return purchaseRows.length > 0;
    } catch {
        return false;
    }
}
