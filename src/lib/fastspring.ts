import crypto from "crypto";

const API_BASE = "https://api.fastspring.com";
export const FASTSPRING_USER_AGENT = "KeystoneTreasuryOS/1.0 (billing)";

export function getFastSpringApiBase(): string {
    return API_BASE;
}

export function fastspringBasicAuthHeader(): string {
    const user = process.env.FASTSPRING_API_USERNAME?.trim();
    const pass = process.env.FASTSPRING_API_PASSWORD?.trim();
    if (!user || !pass) {
        throw new Error("FASTSPRING_API_USERNAME / FASTSPRING_API_PASSWORD are not configured");
    }
    return `Basic ${Buffer.from(`${user}:${pass}`, "utf8").toString("base64")}`;
}

export function fastspringRequestHeaders(): Record<string, string> {
    return {
        Authorization: fastspringBasicAuthHeader(),
        "Content-Type": "application/json",
        "User-Agent": FASTSPRING_USER_AGENT,
    };
}

export type FastSpringSubscriptionLike = {
    active?: boolean;
    state?: string;
    product?: string;
    live?: boolean;
    account?: string;
};

/**
 * Map FastSpring subscription state + product path to Keystone tier.
 */
export function fastSpringSubscriptionToTier(
    sub: FastSpringSubscriptionLike,
    miniPath: string | undefined,
    maxPath: string | undefined
): "free" | "mini" | "max" {
    const state = (sub.state || "").toLowerCase();
    const active = sub.active;

    if (state === "deactivated") return "free";
    if (active === false) return "free";

    const entitled =
        active === true ||
        state === "active" ||
        state === "trial" ||
        state === "overdue";

    if (!entitled) return "free";

    const path = (sub.product || "").trim();
    if (maxPath && path === maxPath) return "max";
    if (miniPath && path === miniPath) return "mini";
    if (path) return "mini";
    return "free";
}

/**
 * HMAC-SHA256 of raw body, base64 — compare to X-FS-Signature (case-insensitive header).
 */
export function verifyFastSpringWebhookSignature(
    rawBody: string,
    signatureHeader: string | null | undefined,
    secret: string
): boolean {
    if (!signatureHeader || !secret) return false;

    const computed = crypto.createHmac("sha256", secret).update(rawBody).digest();

    const headerNorm = signatureHeader.trim();
    let expected: Buffer;
    try {
        expected = Buffer.from(headerNorm, "base64");
    } catch {
        return false;
    }

    if (expected.length !== computed.length || expected.length === 0) return false;
    try {
        return crypto.timingSafeEqual(computed, expected);
    } catch {
        return false;
    }
}

export function getBuyerIpFromRequest(headers: Headers): string | undefined {
    const xff = headers.get("x-forwarded-for");
    if (xff) {
        const first = xff.split(",")[0]?.trim();
        if (first) return first;
    }
    const realIp = headers.get("x-real-ip");
    if (realIp?.trim()) return realIp.trim();
    return undefined;
}

function headersOnlyAuth(): Record<string, string> {
    return {
        Authorization: fastspringBasicAuthHeader(),
        "User-Agent": FASTSPRING_USER_AGENT,
    };
}

/** List account IDs where `lookup.custom` matches (exact). */
export async function fastspringListAccountIdsByCustom(custom: string): Promise<string[]> {
    const url = new URL(`${API_BASE}/accounts`);
    url.searchParams.set("custom", custom);
    url.searchParams.set("limit", "10");

    const res = await fetch(url.toString(), { headers: headersOnlyAuth() });
    const text = await res.text();
    if (!res.ok) {
        console.error("[FastSpring] list accounts failed:", res.status, text.slice(0, 500));
        return [];
    }
    try {
        const json = JSON.parse(text) as { accounts?: string[]; result?: string };
        if (json.result === "error") return [];
        return json.accounts || [];
    } catch {
        return [];
    }
}

export async function fastspringCreateAccountForUser(params: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    country?: string;
}): Promise<string | null> {
    const body: Record<string, unknown> = {
        contact: {
            first: params.firstName,
            last: params.lastName,
            email: params.email,
        },
        lookup: { custom: params.userId },
    };
    if (params.country) body.country = params.country;

    const res = await fetch(`${API_BASE}/accounts`, {
        method: "POST",
        headers: fastspringRequestHeaders(),
        body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
        console.error("[FastSpring] create account failed:", res.status, text.slice(0, 800));
        return null;
    }
    try {
        const json = JSON.parse(text) as { account?: string; id?: string; result?: string };
        if (json.result === "error") return null;
        return json.account || json.id || null;
    } catch {
        return null;
    }
}

/**
 * Ensure a FastSpring buyer account exists with `lookup.custom === userId` (idempotent).
 */
export async function fastspringEnsureAccount(params: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    country?: string;
}): Promise<string | null> {
    const existing = await fastspringListAccountIdsByCustom(params.userId);
    if (existing.length > 0) return existing[0];

    const created = await fastspringCreateAccountForUser(params);
    if (created) return created;

    const again = await fastspringListAccountIdsByCustom(params.userId);
    return again[0] || null;
}

export type FastSpringSessionCreateResult =
    | { ok: true; webcheckoutUrl: string }
    | { ok: false; status: number; detail: string };

export async function fastspringCreateCheckoutSession(params: {
    checkoutPath: string;
    productPath: string;
    fastspringAccountId: string;
    userId: string;
    buyerIp?: string;
    live: boolean;
}): Promise<FastSpringSessionCreateResult> {
    const checkoutSegments = params.checkoutPath
        .split("/")
        .filter(Boolean)
        .map((s) => encodeURIComponent(s))
        .join("/");
    const url = `${API_BASE}/v2/checkouts/${checkoutSegments}/sessions`;

    const body = {
        live: params.live,
        ...(params.buyerIp ? { buyerIp: params.buyerIp } : {}),
        customer: {
            accountId: params.fastspringAccountId,
            externalAccountId: params.userId,
        },
        orderTags: {
            keystone_user_id: params.userId,
        },
        cart: {
            lineItems: [{ productPath: params.productPath, quantity: 1 }],
        },
    };

    const res = await fetch(url, {
        method: "POST",
        headers: fastspringRequestHeaders(),
        body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
        console.error("[FastSpring] create session failed:", res.status, text.slice(0, 1200));
        return { ok: false, status: res.status, detail: text.slice(0, 500) };
    }

    try {
        const json = JSON.parse(text) as {
            checkoutUrls?: { webcheckoutUrl?: string };
        };
        const webcheckoutUrl = json.checkoutUrls?.webcheckoutUrl;
        if (!webcheckoutUrl) {
            return { ok: false, status: 500, detail: "Missing checkoutUrls.webcheckoutUrl" };
        }
        return { ok: true, webcheckoutUrl };
    } catch {
        return { ok: false, status: 500, detail: "Invalid JSON from FastSpring" };
    }
}

export async function fastspringGetSubscription(
    subscriptionId: string,
    query?: { scope?: "live" | "test" | "all" }
): Promise<FastSpringSubscriptionLike & { result?: string } | null> {
    const url = new URL(`${API_BASE}/subscriptions/${encodeURIComponent(subscriptionId)}`);
    if (query?.scope) url.searchParams.set("scope", query.scope);

    const res = await fetch(url.toString(), { headers: headersOnlyAuth() });
    const text = await res.text();
    if (!res.ok) {
        console.error("[FastSpring] get subscription failed:", res.status, text.slice(0, 500));
        return null;
    }
    try {
        return JSON.parse(text) as FastSpringSubscriptionLike & { result?: string };
    } catch {
        return null;
    }
}

export async function fastspringGetAccount(accountId: string): Promise<{
    lookup?: { custom?: string };
    subscriptions?: string[];
    result?: string;
} | null> {
    const res = await fetch(`${API_BASE}/accounts/${encodeURIComponent(accountId)}`, {
        headers: headersOnlyAuth(),
    });
    const text = await res.text();
    if (!res.ok) {
        console.error("[FastSpring] get account failed:", res.status, text.slice(0, 500));
        return null;
    }
    try {
        return JSON.parse(text) as {
            lookup?: { custom?: string };
            subscriptions?: string[];
            result?: string;
        };
    } catch {
        return null;
    }
}

function tierRank(t: "free" | "mini" | "max"): number {
    if (t === "max") return 2;
    if (t === "mini") return 1;
    return 0;
}

export type ReconcileTierResult = {
    tier: "free" | "mini" | "max";
    status: string;
    nextChargeDate: string | null;
};

/**
 * Compute the best Keystone tier for a user from FastSpring accounts keyed by `lookup.custom === userId`.
 */
export async function reconcileFastSpringTierForUser(
    userId: string,
    miniPath: string | undefined,
    maxPath: string | undefined,
    scope: "live" | "test" | "all" = "live"
): Promise<ReconcileTierResult> {
    const accountIds = await fastspringListAccountIdsByCustom(userId);
    if (accountIds.length === 0) {
        return { tier: "free", status: "no_account_found", nextChargeDate: null };
    }

    let bestTier: "free" | "mini" | "max" = "free";
    let bestStatus = "";
    let nextChargeDate: string | null = null;

    for (const accountId of accountIds) {
        const acc = await fastspringGetAccount(accountId);
        const subIds = acc?.subscriptions || [];
        for (const subId of subIds) {
            const sub = await fastspringGetSubscription(subId, { scope });
            if (!sub || sub.result === "error") continue;
            if (scope === "live" && sub.live === false) continue;

            const tier = fastSpringSubscriptionToTier(sub, miniPath, maxPath);
            if (tierRank(tier) > tierRank(bestTier)) {
                bestTier = tier;
                bestStatus = (sub.state || "").toString();
            }
            const ncd = (sub as { nextChargeDate?: string }).nextChargeDate;
            if (ncd && tier !== "free") nextChargeDate = ncd;
        }
    }

    return { tier: bestTier, status: bestStatus || "unknown", nextChargeDate };
}

export function subscriptionIdsFromWebhookEvent(eventType: string, data: unknown): string[] {
    if (!data || typeof data !== "object") return [];
    const o = data as Record<string, unknown>;
    const out: string[] = [];

    if (eventType.startsWith("subscription.")) {
        if (typeof o.subscription === "string") out.push(o.subscription);
        if (typeof o.id === "string") out.push(o.id);
    }

    if (eventType === "order.completed") {
        const subs = o.subscriptions;
        if (Array.isArray(subs)) {
            for (const s of subs) {
                if (typeof s === "string") out.push(s);
            }
        }
    }

    return [...new Set(out)];
}

/** Find first string value for a key anywhere in a JSON-like tree. */
export function deepFindStringValue(root: unknown, key: string): string | undefined {
    if (root === null || root === undefined) return undefined;
    if (typeof root !== "object") return undefined;
    if (Array.isArray(root)) {
        for (const el of root) {
            const v = deepFindStringValue(el, key);
            if (v !== undefined) return v;
        }
        return undefined;
    }
    const o = root as Record<string, unknown>;
    if (key in o && typeof o[key] === "string") return o[key] as string;
    for (const v of Object.values(o)) {
        const found = deepFindStringValue(v, key);
        if (found !== undefined) return found;
    }
    return undefined;
}

export async function resolveKeystoneUserIdFromSubscriptionId(subscriptionId: string): Promise<string | null> {
    const sub = await fastspringGetSubscription(subscriptionId);
    const accountId = typeof sub?.account === "string" ? sub.account : undefined;
    if (!accountId) return null;
    const acc = await fastspringGetAccount(accountId);
    const custom = acc?.lookup?.custom?.trim();
    if (custom && custom.length >= 4) return custom;
    return null;
}
