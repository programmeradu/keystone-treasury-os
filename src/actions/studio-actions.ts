"use server";

import { db } from "@/db";

import { miniApps, purchases } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

export interface ProjectMetadata {
    name: string;
    description: string;
}

export interface ProjectCode {
    files: Record<string, { content: string }>;
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

    // If appId is provided, we update. Otherwise, we create.
    const id = appId || generateId();

    try {
        const existingRows = appId
            ? await db.select().from(miniApps).where(eq(miniApps.id, appId)).limit(1)
            : [];
        const existingApp = existingRows[0] ?? null;

        // Security check: Ensure user owns the app logic if updating
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

        // Sort by updated/created (timestamps are Date objects now)
        return uniqueApps.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    } catch (error) {
        console.error("Failed to fetch installed apps:", error);
        return [];
    }
}
