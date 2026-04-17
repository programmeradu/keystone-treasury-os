/**
 * Client-visible billing API paths. Set `NEXT_PUBLIC_BILLING_PROVIDER=square` to use Square
 * (requires Square env vars). Defaults to FastSpring for existing deployments.
 */
export function billingCheckoutPath(): string {
    const p = process.env.NEXT_PUBLIC_BILLING_PROVIDER?.trim().toLowerCase();
    return p === "square" ? "/api/square/checkout" : "/api/fastspring/checkout";
}

export function billingStatusPath(): string {
    const p = process.env.NEXT_PUBLIC_BILLING_PROVIDER?.trim().toLowerCase();
    return p === "square" ? "/api/square/status" : "/api/fastspring/status";
}
