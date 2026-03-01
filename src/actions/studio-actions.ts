"use server";

import { db } from "@/db";

import { miniApps, purchases } from "@/db/schema";
import { eq, desc, or, inArray } from "drizzle-orm";

export interface ProjectMetadata {
    name: string;
    description: string;
}

export interface ProjectCode {
    files: Record<string, { content: string }>;
}

function generateId(prefix: string = "app"): string {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').substring(0, 13)}`;
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

    const timestamp = Date.now();

    // If appId is provided, we update. Otherwise, we create.
    const id = appId || generateId();

    try {
        const existingApp = appId ? await db.select().from(miniApps).where(eq(miniApps.id, appId)).get() : null;

        // Security check: Ensure user owns the app logic if updating
        // For MVP, we trust the wallet address passed, but in prod we'd verify session
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
                version: "0.1.0", // Draft version
                isPublished: false,
                createdAt: existingApp?.createdAt || timestamp,
                updatedAt: timestamp,
            })
            .onConflictDoUpdate({
                target: miniApps.id,
                set: {
                    name: metadata.name,
                    description: metadata.description,
                    code: code,
                    updatedAt: timestamp
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
        const project = await db
            .select()
            .from(miniApps)
            .where(eq(miniApps.id, appId))
            .get();

        return project;
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

        // Sort by updated/created
        return uniqueApps.sort((a, b) => b.updatedAt - a.updatedAt);

    } catch (error) {
        console.error("Failed to fetch installed apps:", error);
        return [];
    }
}

