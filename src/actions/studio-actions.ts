"use server";

import { db } from "@/db";

import { miniApps, purchases, userInstalledApps } from "@/db/schema";
import { eq, desc, inArray, and, isNull } from "drizzle-orm";

export interface ProjectMetadata {
    name: string;
    description: string;
}

export interface ProjectCode {
    files: Record<string, { content: string }>;
    content?: string;
}

function generateId(prefix: string = "app"): string {
    return `${prefix}_${globalThis.crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
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

export async function getInstalledApps(userId: string) {
    if (!db) return [];

    try {
        // 1. Get apps created by user
        const createdApps = await db
            .select()
            .from(miniApps)
            .where(eq(miniApps.creatorWallet, userId));

        // 2. Get apps purchased by user
        const userPurchases = await db
            .select({ appId: purchases.appId })
            .from(purchases)
            .where(eq(purchases.buyerWallet, userId));

        // 3. Get apps installed via userInstalledApps (dock order, pinning)
        const installed = await db
            .select()
            .from(userInstalledApps)
            .where(
                and(
                    eq(userInstalledApps.userId, userId),
                    isNull(userInstalledApps.uninstalledAt)
                )
            );

        const purchasedAppIds = userPurchases.map(p => p.appId);
        const installedAppIds = installed.map(i => i.appId);
        const allAppIds = [...new Set([...purchasedAppIds, ...installedAppIds])];

        let purchasedApps: typeof createdApps = [];
        if (allAppIds.length > 0) {
            purchasedApps = await db
                .select()
                .from(miniApps)
                .where(inArray(miniApps.id, allAppIds));
        }

        // Combine and deduplicate
        const allApps = [...createdApps, ...purchasedApps];
        const uniqueApps = Array.from(new Map(allApps.map(item => [item.id, item])).values());

        // Build dock order map
        const dockOrderMap = new Map(installed.map(i => [i.appId, { order: i.dockOrder, pinned: i.pinned }]));

        // Sort: pinned first → dock order → updatedAt
        return uniqueApps.sort((a, b) => {
            const aInfo = dockOrderMap.get(a.id);
            const bInfo = dockOrderMap.get(b.id);
            if (aInfo?.pinned && !bInfo?.pinned) return -1;
            if (!aInfo?.pinned && bInfo?.pinned) return 1;
            if (aInfo && bInfo) return aInfo.order - bInfo.order;
            if (aInfo) return -1;
            if (bInfo) return 1;
            return b.updatedAt.getTime() - a.updatedAt.getTime();
        });

    } catch (error) {
        console.error("Failed to fetch installed apps:", error);
        return [];
    }
}

// ─── Install / Uninstall / Dock Management ───────────────────────────

export async function installApp(userId: string, appId: string) {
    if (!db) throw new Error("Database not available");

    try {
        const existing = await db
            .select()
            .from(userInstalledApps)
            .where(
                and(
                    eq(userInstalledApps.userId, userId),
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
                    eq(userInstalledApps.userId, userId),
                    isNull(userInstalledApps.uninstalledAt)
                )
            );

        const maxOrder = allInstalled.length > 0
            ? Math.max(...allInstalled.map(i => i.dockOrder))
            : -1;

        const installId = generateId("install");
        await db.insert(userInstalledApps).values({
            id: installId,
            userId,
            appId,
            dockOrder: maxOrder + 1,
        });

        return { success: true, installId };
    } catch (error) {
        console.error("Failed to install app:", error);
        return { success: false, error: "Install failed" };
    }
}

export async function uninstallApp(userId: string, appId: string) {
    if (!db) throw new Error("Database not available");

    try {
        await db
            .update(userInstalledApps)
            .set({ uninstalledAt: new Date() })
            .where(
                and(
                    eq(userInstalledApps.userId, userId),
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

export async function reorderDock(userId: string, appIds: string[]) {
    if (!db) throw new Error("Database not available");

    try {
        for (let i = 0; i < appIds.length; i++) {
            await db
                .update(userInstalledApps)
                .set({ dockOrder: i })
                .where(
                    and(
                        eq(userInstalledApps.userId, userId),
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

export async function togglePinApp(userId: string, appId: string, pinned: boolean) {
    if (!db) throw new Error("Database not available");

    try {
        await db
            .update(userInstalledApps)
            .set({ pinned })
            .where(
                and(
                    eq(userInstalledApps.userId, userId),
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

export async function checkOwnership(userId: string, appId: string): Promise<boolean> {
    if (!db) return false;

    try {
        // Check purchases
        const purchaseRows = await db
            .select({ id: purchases.id })
            .from(purchases)
            .where(and(eq(purchases.buyerWallet, userId), eq(purchases.appId, appId)))
            .limit(1);
        if (purchaseRows.length > 0) return true;

        // Check installed apps
        const installRows = await db
            .select({ id: userInstalledApps.id })
            .from(userInstalledApps)
            .where(
                and(
                    eq(userInstalledApps.userId, userId),
                    eq(userInstalledApps.appId, appId),
                    isNull(userInstalledApps.uninstalledAt)
                )
            )
            .limit(1);
        if (installRows.length > 0) return true;

        // Check if creator
        const creatorRows = await db
            .select({ id: miniApps.id })
            .from(miniApps)
            .where(and(eq(miniApps.id, appId), eq(miniApps.creatorWallet, userId)))
            .limit(1);
        return creatorRows.length > 0;
    } catch {
        return false;
    }
}
