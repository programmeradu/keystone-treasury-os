import { SquareClient, SquareEnvironment, WebhooksHelper } from "square";

export type KeystoneTier = "free" | "mini" | "max";

function tierRank(t: KeystoneTier): number {
    if (t === "max") return 2;
    if (t === "mini") return 1;
    return 0;
}

export function getSquareAccessToken(): string | null {
    const t = process.env.SQUARE_ACCESS_TOKEN?.trim();
    return t || null;
}

export function getSquareLocationId(): string | null {
    const t = process.env.SQUARE_LOCATION_ID?.trim();
    return t || null;
}

export function squarePlanVariationIdForTier(tier: "mini" | "max"): string | null {
    const key = tier === "max" ? "SQUARE_PLAN_VARIATION_ID_MAX" : "SQUARE_PLAN_VARIATION_ID_MINI";
    return process.env[key]?.trim() || null;
}

export function createSquareClient(): SquareClient | null {
    const token = getSquareAccessToken();
    if (!token) return null;
    const env = process.env.SQUARE_ENV?.trim().toLowerCase();
    const environment = env === "sandbox" ? SquareEnvironment.Sandbox : SquareEnvironment.Production;
    return new SquareClient({ token, environment });
}

function subscriptionStatusEntitled(status: string | undefined): boolean {
    const s = (status || "").toUpperCase();
    return s === "ACTIVE" || s === "PENDING";
}

export function squareSubscriptionToTier(
    sub: { status?: string; planVariationId?: string },
    miniPlanVariationId: string | undefined,
    maxPlanVariationId: string | undefined
): KeystoneTier {
    if (!subscriptionStatusEntitled(sub.status)) return "free";
    const vid = (sub.planVariationId || "").trim();
    if (maxPlanVariationId && vid === maxPlanVariationId) return "max";
    if (miniPlanVariationId && vid === miniPlanVariationId) return "mini";
    if (vid) return "mini";
    return "free";
}

export async function squareEnsureCustomer(params: {
    client: SquareClient;
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
}): Promise<string | null> {
    const search = await params.client.customers.search({
        limit: BigInt(5),
        query: { filter: { referenceId: { exact: params.userId } } },
    });
    const existing = search.customers?.find((c) => c.id);
    if (existing?.id) return existing.id;

    const created = await params.client.customers.create({
        idempotencyKey: crypto.randomUUID(),
        givenName: params.firstName,
        familyName: params.lastName,
        emailAddress: params.email,
        referenceId: params.userId,
    });
    return created.customer?.id ?? null;
}

export async function squareCreateSubscriptionCheckoutUrl(params: {
    client: SquareClient;
    tier: "mini" | "max";
    buyerEmail: string;
    customerId?: string;
}): Promise<{ ok: true; url: string } | { ok: false; detail: string }> {
    const locationId = getSquareLocationId();
    const planVariationId = squarePlanVariationIdForTier(params.tier);
    if (!locationId) {
        return { ok: false, detail: "SQUARE_LOCATION_ID is not set" };
    }
    if (!planVariationId) {
        return {
            ok: false,
            detail: `Missing plan variation id for ${params.tier} (SQUARE_PLAN_VARIATION_ID_${params.tier === "max" ? "MAX" : "MINI"})`,
        };
    }

    const { amount, title } =
        params.tier === "max"
            ? { amount: BigInt(19900), title: "dreyv workspace · Max" }
            : { amount: BigInt(4900), title: "dreyv workspace · Mini" };

    const appBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
    const redirectUrl = appBase ? `${appBase}/app/billing` : undefined;

    try {
        const res = await params.client.checkout.paymentLinks.create({
            idempotencyKey: crypto.randomUUID(),
            description: `dreyv OS — ${params.tier === "max" ? "Max" : "Mini"} subscription`,
            quickPay: {
                name: title,
                priceMoney: { amount, currency: "USD" },
                locationId,
            },
            checkoutOptions: {
                subscriptionPlanId: planVariationId,
                ...(redirectUrl ? { redirectUrl } : {}),
            },
            prePopulatedData: {
                buyerEmail: params.buyerEmail,
            },
        });

        const url = res.paymentLink?.url || res.paymentLink?.longUrl;
        if (!url) {
            return { ok: false, detail: "Square did not return a payment link URL" };
        }
        return { ok: true, url };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[Square] create payment link failed:", msg);
        return { ok: false, detail: msg.slice(0, 500) };
    }
}

export type ReconcileSquareTierResult = {
    tier: KeystoneTier;
    status: string;
    nextChargeDate: string | null;
};

export async function reconcileSquareTierForUser(
    client: SquareClient,
    userId: string
): Promise<ReconcileSquareTierResult> {
    const locationId = getSquareLocationId();
    const miniVid = squarePlanVariationIdForTier("mini") || undefined;
    const maxVid = squarePlanVariationIdForTier("max") || undefined;

    const search = await client.customers.search({
        limit: BigInt(5),
        query: { filter: { referenceId: { exact: userId } } },
    });
    const customerId = search.customers?.[0]?.id;
    if (!customerId) {
        return { tier: "free", status: "no_square_customer", nextChargeDate: null };
    }

    const allSubs: Array<{
        status?: string;
        planVariationId?: string;
        chargedThroughDate?: string;
    }> = [];

    let cursor: string | undefined;
    for (let page = 0; page < 20; page++) {
        const subSearch = await client.subscriptions.search({
            cursor,
            limit: 50,
            query: {
                filter: {
                    customerIds: [customerId],
                    ...(locationId ? { locationIds: [locationId] } : {}),
                },
            },
        });
        const batch = subSearch.subscriptions || [];
        for (const s of batch) {
            allSubs.push({
                status: s.status,
                planVariationId: s.planVariationId,
                chargedThroughDate: s.chargedThroughDate,
            });
        }
        cursor = subSearch.cursor || undefined;
        if (!cursor) break;
    }

    let bestTier: KeystoneTier = "free";
    let bestStatus = "";
    let nextChargeDate: string | null = null;

    for (const s of allSubs) {
        const tier = squareSubscriptionToTier(s, miniVid, maxVid);
        if (tierRank(tier) > tierRank(bestTier)) {
            bestTier = tier;
            bestStatus = (s.status || "").toString();
        }
        if (tier !== "free" && s.chargedThroughDate) {
            nextChargeDate = s.chargedThroughDate;
        }
    }

    return {
        tier: bestTier,
        status: bestStatus || (allSubs.length ? "checked" : "no_subscriptions"),
        nextChargeDate,
    };
}

export async function squareResolveUserIdFromCustomerId(
    client: SquareClient,
    customerId: string
): Promise<string | null> {
    try {
        const { customer } = await client.customers.get({ customerId });
        const ref = customer?.referenceId?.trim();
        if (ref && /^[0-9a-f-]{36}$/i.test(ref)) return ref;
    } catch (e) {
        console.error("[Square] get customer failed:", e);
    }
    return null;
}

/** Raw webhook JSON body → Square customer IDs worth reconciling. */
export function squareWebhookCollectCustomerIds(body: Record<string, unknown>): string[] {
    const out = new Set<string>();
    const type = typeof body.type === "string" ? body.type : "";
    if (!type.startsWith("subscription.")) return [];

    const visit = (node: unknown) => {
        if (node === null || node === undefined) return;
        if (Array.isArray(node)) {
            for (const x of node) visit(x);
            return;
        }
        if (typeof node !== "object") return;
        const o = node as Record<string, unknown>;
        const cid = o.customerId ?? o.customer_id;
        if (typeof cid === "string" && cid.length > 0) out.add(cid);
        for (const v of Object.values(o)) visit(v);
    };

    visit(body);
    return [...out];
}

export async function verifySquareWebhookSignature(params: {
    rawBody: string;
    signatureHeader: string | null;
}): Promise<boolean> {
    const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim();
    const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL?.trim();
    if (!signatureKey || !notificationUrl || !params.signatureHeader) return false;
    return WebhooksHelper.verifySignature({
        requestBody: params.rawBody,
        signatureHeader: params.signatureHeader,
        signatureKey,
        notificationUrl,
    });
}
