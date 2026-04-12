/**
 * Minimal validation for billing contact email (FastSpring account.create / checkout prefill).
 * Rejects obvious garbage; does not guarantee deliverability.
 */
export function isValidBillingEmail(email: string): boolean {
    const t = email.trim();
    if (t.length < 5 || t.length > 254) return false;
    // Single @, local + domain with at least one dot in domain (e.g. user@domain.tld)
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(t);
}
