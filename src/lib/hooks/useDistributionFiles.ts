"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "keystone_distribution_files";

export interface DistributionEntry {
    address: string;
    amount: number;
    token?: string;  // auto-detected from file, e.g. "USDC", "SOL"
    label?: string;  // optional recipient name/label
}

export interface DistributionFile {
    id: string;
    name: string;
    tokenSummary: string; // auto-computed, e.g. "USDC" or "USDC, SOL" or "Mixed"
    entries: DistributionEntry[];
    recipientCount: number;
    totalAmount: number;
    createdAt: number; // unix ms
    updatedAt: number;
    sourceType: "csv" | "json";
}

// Validate a Solana base58 address (rough check: 32-44 chars, base58 alphabet)
function isValidSolanaAddress(addr: string): boolean {
    if (!addr || addr.length < 32 || addr.length > 44) return false;
    return /^[1-9A-HJ-NP-Za-km-z]+$/.test(addr);
}

// Compute a token summary from entries
function computeTokenSummary(entries: DistributionEntry[]): string {
    const tokens = new Set(entries.map(e => e.token).filter(Boolean));
    if (tokens.size === 0) return "Token";
    if (tokens.size === 1) return [...tokens][0]!;
    if (tokens.size <= 3) return [...tokens].join(", ");
    return "Mixed";
}

// Detect column indices from a CSV header row
function detectCsvColumns(header: string): { addressCol: number; amountCol: number; tokenCol: number; labelCol: number } {
    const cols = header.toLowerCase().split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
    let addressCol = cols.findIndex(c => ["address", "wallet", "recipient", "pubkey"].includes(c));
    let amountCol = cols.findIndex(c => ["amount", "value", "quantity", "tokens"].includes(c));
    let tokenCol = cols.findIndex(c => ["token", "mint", "symbol", "currency", "asset"].includes(c));
    let labelCol = cols.findIndex(c => ["label", "name", "memo", "note", "description", "tag"].includes(c));
    // Default positions if no header detected
    if (addressCol === -1) addressCol = 0;
    if (amountCol === -1) amountCol = 1;
    return { addressCol, amountCol, tokenCol, labelCol };
}

/**
 * Parse CSV text into distribution entries.
 * Auto-detects columns from header. Supports flexible column order.
 * Formats:
 *   address,amount
 *   address,amount,token
 *   address,amount,token,label
 *   wallet,value,symbol,name  (flexible column names)
 */
export function parseCsv(text: string): { entries: DistributionEntry[]; errors: string[] } {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return { entries: [], errors: ["File is empty"] };

    const entries: DistributionEntry[] = [];
    const errors: string[] = [];

    // Detect if first row is a header
    const firstLine = lines[0].toLowerCase();
    const hasHeader = /address|wallet|recipient|pubkey|amount|value/.test(firstLine);
    const { addressCol, amountCol, tokenCol, labelCol } = hasHeader
        ? detectCsvColumns(lines[0])
        : { addressCol: 0, amountCol: 1, tokenCol: -1, labelCol: -1 };
    const startIdx = hasHeader ? 1 : 0;

    for (let i = startIdx; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
        if (cols.length < 2) {
            errors.push(`Row ${i + 1}: expected at least 2 columns`);
            continue;
        }
        const address = cols[addressCol] || "";
        const amount = parseFloat(cols[amountCol] || "");
        const token = tokenCol >= 0 ? cols[tokenCol] || undefined : undefined;
        // If no header, 3rd column could be token (short string) or label
        const fallbackCol = cols[2]?.trim();
        const inferredToken = !hasHeader && tokenCol < 0 && fallbackCol && fallbackCol.length <= 10 && /^[A-Za-z]+$/.test(fallbackCol)
            ? fallbackCol.toUpperCase() : undefined;
        const label = labelCol >= 0 ? cols[labelCol] || undefined :
            (!hasHeader && !inferredToken ? fallbackCol || undefined : (cols[3]?.trim() || undefined));

        if (!isValidSolanaAddress(address)) {
            errors.push(`Row ${i + 1}: invalid Solana address "${address.slice(0, 12)}..."`);
            continue;
        }
        if (isNaN(amount) || amount <= 0) {
            errors.push(`Row ${i + 1}: invalid amount "${cols[amountCol]}"`);
            continue;
        }
        entries.push({ address, amount, token: token || inferredToken, label });
    }

    return { entries, errors };
}

/**
 * Parse JSON text into distribution entries.
 * Auto-detects token from entry fields.
 * Supports formats:
 *   [{ "address": "...", "amount": 100, "token": "USDC" }, ...]
 *   [{ "wallet": "...", "amount": 100 }, ...]
 *   { "recipients": [...] }
 *   { "token": "SOL", "recipients": [...] }  (top-level token applies to all)
 */
export function parseJson(text: string): { entries: DistributionEntry[]; errors: string[] } {
    const errors: string[] = [];
    let data: any;

    try {
        data = JSON.parse(text);
    } catch {
        return { entries: [], errors: ["Invalid JSON format"] };
    }

    // Unwrap if wrapped in an object
    let items: any[] = [];
    let topLevelToken: string | undefined;
    if (Array.isArray(data)) {
        items = data;
    } else if (data?.recipients && Array.isArray(data.recipients)) {
        items = data.recipients;
        topLevelToken = data.token || data.symbol;
    } else if (data?.entries && Array.isArray(data.entries)) {
        items = data.entries;
        topLevelToken = data.token || data.symbol;
    } else {
        return { entries: [], errors: ["JSON must be an array or contain a 'recipients'/'entries' array"] };
    }

    const entries: DistributionEntry[] = [];
    items.forEach((item, i) => {
        const address = item.address || item.wallet || item.recipient;
        const amount = parseFloat(item.amount);
        const token = item.token || item.symbol || item.mint || topLevelToken;
        const label = item.label || item.name || item.memo || undefined;

        if (!address || !isValidSolanaAddress(String(address))) {
            errors.push(`Entry ${i + 1}: invalid address`);
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            errors.push(`Entry ${i + 1}: invalid amount`);
            return;
        }
        entries.push({ address: String(address), amount, token, label });
    });

    return { entries, errors };
}

/**
 * Parse a file (CSV or JSON) and return distribution entries.
 */
export async function parseDistributionFile(file: File): Promise<{
    entries: DistributionEntry[];
    errors: string[];
    sourceType: "csv" | "json";
    detectedToken: string;
}> {
    const text = await file.text();
    const name = file.name.toLowerCase();

    const result = name.endsWith(".json") ? parseJson(text) : parseCsv(text);
    const sourceType: "csv" | "json" = name.endsWith(".json") ? "json" : "csv";
    const detectedToken = computeTokenSummary(result.entries);

    return { ...result, sourceType, detectedToken };
}

/**
 * Hook for managing saved distribution files in localStorage.
 */
export function useDistributionFiles() {
    const [files, setFiles] = useState<DistributionFile[]>([]);
    const [hydrated, setHydrated] = useState(false);

    // Hydrate from localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) setFiles(parsed);
            }
        } catch {
            // Corrupted data — start fresh
        }
        setHydrated(true);
    }, []);

    // Persist to localStorage
    useEffect(() => {
        if (!hydrated) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
        } catch {
            // Storage full or unavailable
        }
    }, [files, hydrated]);

    const saveFile = useCallback((
        name: string,
        entries: DistributionEntry[],
        sourceType: "csv" | "json"
    ): DistributionFile => {
        const now = Date.now();
        const newFile: DistributionFile = {
            id: `dist_${now}_${Math.random().toString(36).slice(2, 8)}`,
            name,
            tokenSummary: computeTokenSummary(entries),
            entries,
            recipientCount: entries.length,
            totalAmount: entries.reduce((sum, e) => sum + e.amount, 0),
            createdAt: now,
            updatedAt: now,
            sourceType,
        };
        setFiles(prev => [newFile, ...prev]);
        return newFile;
    }, []);

    const deleteFile = useCallback((id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    }, []);

    const getFile = useCallback((id: string): DistributionFile | undefined => {
        return files.find(f => f.id === id);
    }, [files]);

    const renameFile = useCallback((id: string, newName: string) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, name: newName, updatedAt: Date.now() } : f));
    }, []);

    const updateFile = useCallback((id: string, updates: Partial<Pick<DistributionFile, "name" | "entries">>) => {
        setFiles(prev => prev.map(f => {
            if (f.id !== id) return f;
            const entries = updates.entries || f.entries;
            return {
                ...f,
                ...updates,
                entries,
                tokenSummary: computeTokenSummary(entries),
                recipientCount: entries.length,
                totalAmount: entries.reduce((sum, e) => sum + e.amount, 0),
                updatedAt: Date.now(),
            };
        }));
    }, []);

    return { files, saveFile, deleteFile, getFile, renameFile, updateFile, hydrated };
}
