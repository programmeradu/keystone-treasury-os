import crypto from "crypto";

/** Paddle Billing API base URL */
export function getPaddleApiBase(): string {
    const useSandbox =
        process.env.PADDLE_USE_SANDBOX === "true" ||
        process.env.PADDLE_ENVIRONMENT === "sandbox";
    return useSandbox ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";
}

/** Paddle Billing REST API version (see https://developer.paddle.com/api-reference/about/versioning) */
export const PADDLE_API_VERSION = "1";

export function paddleRequestHeaders(): Record<string, string> {
    const apiKey = process.env.PADDLE_API_KEY;
    if (!apiKey) throw new Error("PADDLE_API_KEY is not configured");
    return {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Paddle-Version": PADDLE_API_VERSION,
    };
}

type PaddleSubscriptionLike = {
    status?: string;
    items?: Array<{ price?: { id?: string }; price_id?: string }>;
    custom_data?: { user_id?: string };
};

export function getFirstSubscriptionPriceId(sub: PaddleSubscriptionLike): string | undefined {
    const item = sub.items?.[0] as
        | { price?: { id?: string }; price_id?: string }
        | undefined;
    if (!item) return undefined;
    return item.price?.id ?? item.price_id;
}

/**
 * Map Paddle subscription status + catalog price id to Keystone tier.
 */
export function subscriptionToTier(
    sub: PaddleSubscriptionLike,
    miniPriceId: string | undefined,
    maxPriceId: string | undefined
): "free" | "mini" | "max" {
    const status = (sub.status || "").toLowerCase();
    const paidLike = ["active", "trialing", "past_due", "paused"].includes(status);
    if (!paidLike) return "free";

    const priceId = getFirstSubscriptionPriceId(sub);
    if (!priceId) return "free";
    if (maxPriceId && priceId === maxPriceId) return "max";
    if (miniPriceId && priceId === miniPriceId) return "mini";
    // Paid subscription with unknown price id — grant mini to avoid over-privileging as max
    return "mini";
}

/**
 * Verify Paddle-Signature header: ts=...;h1=...
 * Signed payload: `${ts}:${rawBody}` HMAC-SHA256 with webhook secret.
 */
export function verifyPaddleWebhookSignature(
    rawBody: string,
    signatureHeader: string | null,
    secret: string,
    maxSkewSeconds = 300
): boolean {
    if (!signatureHeader || !secret) return false;

    let ts = "";
    let h1 = "";
    for (const part of signatureHeader.split(";")) {
        const idx = part.indexOf("=");
        if (idx === -1) continue;
        const key = part.slice(0, idx).trim();
        const value = part.slice(idx + 1).trim();
        if (key === "ts") ts = value;
        if (key === "h1") h1 = value;
    }
    if (!ts || !h1) return false;

    const tsNum = parseInt(ts, 10);
    if (!Number.isFinite(tsNum)) return false;
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - tsNum) > maxSkewSeconds) return false;

    const signedPayload = `${ts}:${rawBody}`;
    const expectedHex = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");

    try {
        const a = Buffer.from(expectedHex, "hex");
        const b = Buffer.from(h1, "hex");
        if (a.length !== b.length || a.length === 0) return false;
        return crypto.timingSafeEqual(a, b);
    } catch {
        return false;
    }
}
