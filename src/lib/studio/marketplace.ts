import { db } from "@/db";
import { miniApps, purchases, reviews } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export interface CreateAppData {
    name: string;
    description: string;
    code: string; // JSON string
    creatorWallet: string;
    priceUsdc?: number;
    category?: string;
}

export const marketplace = {
    // Create a new Mini-App (Draft)
    createApp: async (data: CreateAppData) => {
        if (!db) throw new Error("Database not initialized");
        // Sentinel: Prevent ID collisions by replacing Math.random() with cryptographically secure UUID
        const id = `app_${globalThis.crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;

        await db.insert(miniApps).values({
            id,
            name: data.name,
            description: data.description,
            code: data.code,
            creatorWallet: data.creatorWallet,
            priceUsdc: String(data.priceUsdc || 0),
            category: data.category || "utility",
            isPublished: false,
        });

        return id;
    },

    // Publish an app
    publishApp: async (appId: string, creatorWallet: string) => {
        if (!db) throw new Error("Database not initialized");
        await db.update(miniApps)
            .set({ isPublished: true, updatedAt: new Date() })
            .where(and(eq(miniApps.id, appId), eq(miniApps.creatorWallet, creatorWallet)));
    },

    // Get all published apps
    getPublishedApps: async () => {
        if (!db) throw new Error("Database not initialized");
        return await db.select()
            .from(miniApps)
            .where(eq(miniApps.isPublished, true))
            .orderBy(desc(miniApps.createdAt));
    },

    // Get user's apps (Creator Dashboard)
    getUserApps: async (walletAddress: string) => {
        if (!db) throw new Error("Database not initialized");
        return await db.select()
            .from(miniApps)
            .where(eq(miniApps.creatorWallet, walletAddress))
            .orderBy(desc(miniApps.updatedAt));
    },

    // Get App by ID
    getAppById: async (appId: string) => {
        if (!db) throw new Error("Database not initialized");
        const apps = await db.select().from(miniApps).where(eq(miniApps.id, appId)).limit(1);
        return apps[0] || null;
    },

    // Record a purchase
    recordPurchase: async (payment: {
        appId: string;
        buyerWallet: string;
        txSignature: string;
        amountUsdc: number;
        creatorPayout: number;
        keystoneFee: number;
    }) => {
        if (!db) throw new Error("Database not initialized");
        // Sentinel: Prevent ID collisions by replacing Math.random() with cryptographically secure UUID
        const id = `purch_${globalThis.crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;

        await db.insert(purchases).values({
            id,
            appId: payment.appId,
            buyerWallet: payment.buyerWallet,
            txSignature: payment.txSignature,
            amountUsdc: String(payment.amountUsdc),
            creatorPayout: String(payment.creatorPayout),
            keystoneFee: String(payment.keystoneFee),
        });

        // Increment install count
        // Note: Drizzle sqlite doesn't support increment helper easily, fetching and updating
        const app = await db.select().from(miniApps).where(eq(miniApps.id, payment.appId)).limit(1);
        if (app[0]) {
            await db.update(miniApps)
                .set({ installs: (app[0].installs || 0) + 1 })
                .where(eq(miniApps.id, payment.appId));
        }

        return id;
    }
};
