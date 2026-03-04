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
    return `${prefix}_${Math.random().toString(36).substring(2, 15)}`;
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
    // TypeScript loses narrowing of `db` inside the Promise.all array
    const database = db;

    try {
        // Fetch created apps, purchases, and installs concurrently to reduce latency
        const [createdApps, userPurchases, installed] = await Promise.all([
            // 1. Get apps created by user
            database
                .select()
                .from(miniApps)
                .where(eq(miniApps.creatorWallet, userId)),

            // 2. Get apps purchased by user
            database
                .select({ appId: purchases.appId })
                .from(purchases)
                .where(eq(purchases.buyerWallet, userId)),

            // 3. Get apps installed via userInstalledApps (dock order, pinning)
            database
                .select()
                .from(userInstalledApps)
                .where(
                    and(
                        eq(userInstalledApps.userId, userId),
                        isNull(userInstalledApps.uninstalledAt)
                    )
                )
        ]);

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
