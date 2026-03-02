/**
 * Atlas Session Manager
 * 
 * Wallet-based session persistence for Solana Atlas.
 * No account required — wallet address = identity.
 * Keystone subscribers get longer session retention.
 */

import { db } from "@/db";
import { atlasSessions, users } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";

// ─── Types ───────────────────────────────────────────────────────────

export interface AtlasMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string; // ISO string
}

export interface AtlasSession {
    id: number;
    walletAddress: string;
    userId: string | null;
    conversationHistory: AtlasMessage[];
    lastQuery: string | null;
    context: Record<string, unknown> | null;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Session Retention ───────────────────────────────────────────────

const SESSION_RETENTION: Record<string, number> = {
    atlas_free: 24,        // 24 hours
    atlas_mini: 720,       // 30 days
    atlas_max: 8760,       // 365 days
};

function getExpiryForTier(tier: string): Date {
    const hours = SESSION_RETENTION[tier] ?? SESSION_RETENTION.atlas_free;
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + hours);
    return expiry;
}

// ─── Get or Create Session ───────────────────────────────────────────

/**
 * Loads an existing session for the wallet, or creates a new one.
 * Checks if wallet has a Keystone account for longer retention.
 */
export async function getOrCreateSession(walletAddress: string): Promise<AtlasSession | null> {
    if (!db) return null;

    try {
        // Check for valid (non-expired) session
        const existing = await db
            .select()
            .from(atlasSessions)
            .where(
                and(
                    eq(atlasSessions.walletAddress, walletAddress),
                    gte(atlasSessions.expiresAt, new Date())
                )
            )
            .limit(1);

        if (existing[0]) {
            return {
                ...existing[0],
                conversationHistory: (existing[0].conversationHistory as AtlasMessage[]) ?? [],
                context: (existing[0].context as Record<string, unknown>) ?? null,
            };
        }

        // Determine tier for session retention
        const userRows = await db
            .select({ tier: users.tier, id: users.id, tierExpiresAt: users.tierExpiresAt })
            .from(users)
            .where(eq(users.walletAddress, walletAddress))
            .limit(1);

        const user = userRows[0];
        let atlasTier = 'atlas_free';
        let userId: string | null = null;

        if (user) {
            userId = user.id;
            const tierExpired = user.tierExpiresAt && user.tierExpiresAt < new Date();
            if (!tierExpired) {
                atlasTier = `atlas_${user.tier}`;
            }
        }

        const expiresAt = getExpiryForTier(atlasTier);

        // Create new session
        const result = await db
            .insert(atlasSessions)
            .values({
                walletAddress,
                userId,
                conversationHistory: [],
                expiresAt,
            })
            .returning();

        const session = result[0];
        return {
            ...session,
            conversationHistory: [],
            context: null,
        };
    } catch (error) {
        console.error('[atlas-session] Error getting/creating session:', error);
        return null;
    }
}

// ─── Save Conversation ──────────────────────────────────────────────

/**
 * Appends messages to the session's conversation history.
 */
export async function saveConversation(
    walletAddress: string,
    messages: AtlasMessage[]
): Promise<boolean> {
    if (!db) return false;

    try {
        const session = await getOrCreateSession(walletAddress);
        if (!session) return false;

        const updatedHistory = [...session.conversationHistory, ...messages];

        // Cap at 200 messages to prevent bloat
        const trimmed = updatedHistory.slice(-200);

        await db
            .update(atlasSessions)
            .set({
                conversationHistory: trimmed,
                lastQuery: messages.find(m => m.role === 'user')?.content ?? session.lastQuery,
                updatedAt: new Date(),
            })
            .where(eq(atlasSessions.id, session.id));

        return true;
    } catch (error) {
        console.error('[atlas-session] Error saving conversation:', error);
        return false;
    }
}

// ─── Update Context ─────────────────────────────────────────────────

/**
 * Updates cached context data (portfolio, balances, etc.) for the session.
 */
export async function updateSessionContext(
    walletAddress: string,
    context: Record<string, unknown>
): Promise<boolean> {
    if (!db) return false;

    try {
        const session = await getOrCreateSession(walletAddress);
        if (!session) return false;

        await db
            .update(atlasSessions)
            .set({
                context: { ...(session.context ?? {}), ...context },
                updatedAt: new Date(),
            })
            .where(eq(atlasSessions.id, session.id));

        return true;
    } catch (error) {
        console.error('[atlas-session] Error updating context:', error);
        return false;
    }
}

// ─── Clear Session ──────────────────────────────────────────────────

/**
 * Clears conversation history for the wallet (keeps session alive).
 */
export async function clearSession(walletAddress: string): Promise<boolean> {
    if (!db) return false;

    try {
        await db
            .update(atlasSessions)
            .set({
                conversationHistory: [],
                lastQuery: null,
                context: null,
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(atlasSessions.walletAddress, walletAddress),
                    gte(atlasSessions.expiresAt, new Date())
                )
            );

        return true;
    } catch (error) {
        console.error('[atlas-session] Error clearing session:', error);
        return false;
    }
}

// ─── Backfill User ID ───────────────────────────────────────────────

/**
 * When an Atlas user signs into Keystone (SIWS), backfill their userId
 * on all existing atlas sessions and extend retention.
 */
export async function backfillUserId(
    walletAddress: string,
    userId: string,
    keystoneTier: string = 'free'
): Promise<boolean> {
    if (!db) return false;

    try {
        const atlasTier = `atlas_${keystoneTier}`;
        const newExpiry = getExpiryForTier(atlasTier);

        await db
            .update(atlasSessions)
            .set({
                userId,
                expiresAt: newExpiry,
                updatedAt: new Date(),
            })
            .where(eq(atlasSessions.walletAddress, walletAddress));

        return true;
    } catch (error) {
        console.error('[atlas-session] Error backfilling userId:', error);
        return false;
    }
}
