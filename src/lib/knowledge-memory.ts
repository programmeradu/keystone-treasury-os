import { db } from "@/db";
import { knowledgeEntries } from "@/db/schema";
import { desc, eq, ilike, or, sql } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────

export interface KnowledgeEntry {
    source: string;
    sourceUrl?: string;
    title?: string;
    summary?: string;
    content?: string;
    contentType?: string;
    tags?: string[];
    userId?: string;
    expiresAt?: Date;
}

export interface StoredKnowledge extends KnowledgeEntry {
    id: number;
    createdAt: Date;
}

// ─── Constants ────────────────────────────────────────────────────────

const MAX_CONTENT_LENGTH = 50_000; // 50KB cap per entry
const DEFAULT_RECALL_LIMIT = 5;

// ─── Knowledge Memory Service ─────────────────────────────────────────

class KnowledgeMemory {

    /**
     * Store a knowledge entry in the database.
     * Content is capped at 50KB to prevent bloat.
     */
    async store(entry: KnowledgeEntry): Promise<StoredKnowledge> {
        if (!db) throw new Error("Database not initialized");
        const cappedContent = entry.content
            ? entry.content.slice(0, MAX_CONTENT_LENGTH)
            : undefined;

        const [inserted] = await db.insert(knowledgeEntries).values({
            source: entry.source,
            sourceUrl: entry.sourceUrl || null,
            title: entry.title || null,
            summary: entry.summary || null,
            content: cappedContent || null,
            contentType: entry.contentType || "markdown",
            tags: entry.tags || null,
            userId: entry.userId || null,
            expiresAt: entry.expiresAt || null,
        }).returning();

        console.log(`[KnowledgeMemory] Stored: "${entry.title || entry.sourceUrl}" (source=${entry.source})`);
        return inserted as StoredKnowledge;
    }

    /**
     * Recall knowledge by URL match or text search (ILIKE).
     * Searches across title, summary, sourceUrl, and tags.
     */
    async recall(query: string, limit = DEFAULT_RECALL_LIMIT): Promise<StoredKnowledge[]> {
        if (!db) throw new Error("Database not initialized");
        const pattern = `%${query}%`;

        const results = await db
            .select()
            .from(knowledgeEntries)
            .where(
                or(
                    ilike(knowledgeEntries.sourceUrl, pattern),
                    ilike(knowledgeEntries.title, pattern),
                    ilike(knowledgeEntries.summary, pattern),
                    sql`${knowledgeEntries.tags}::text ILIKE ${pattern}`
                )
            )
            .orderBy(desc(knowledgeEntries.createdAt))
            .limit(limit);

        return results as StoredKnowledge[];
    }

    /**
     * Get the most recent knowledge entries.
     */
    async recallRecent(limit = DEFAULT_RECALL_LIMIT): Promise<StoredKnowledge[]> {
        if (!db) throw new Error("Database not initialized");
        const results = await db
            .select()
            .from(knowledgeEntries)
            .orderBy(desc(knowledgeEntries.createdAt))
            .limit(limit);

        return results as StoredKnowledge[];
    }

    /**
     * Get entries by source type (e.g. all browser_research entries).
     */
    async recallBySource(source: string, limit = DEFAULT_RECALL_LIMIT): Promise<StoredKnowledge[]> {
        if (!db) throw new Error("Database not initialized");
        const results = await db
            .select()
            .from(knowledgeEntries)
            .where(eq(knowledgeEntries.source, source))
            .orderBy(desc(knowledgeEntries.createdAt))
            .limit(limit);

        return results as StoredKnowledge[];
    }

    /**
     * Delete expired entries to keep the store healthy.
     */
    async prune(): Promise<number> {
        if (!db) throw new Error("Database not initialized");
        const now = new Date();
        const deleted = await db
            .delete(knowledgeEntries)
            .where(sql`${knowledgeEntries.expiresAt} IS NOT NULL AND ${knowledgeEntries.expiresAt} < ${now}`)
            .returning();

        if (deleted.length > 0) {
            console.log(`[KnowledgeMemory] Pruned ${deleted.length} expired entries`);
        }
        return deleted.length;
    }
}

export const knowledgeMemory = new KnowledgeMemory();
