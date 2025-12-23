import { Turnkey } from "@turnkey/sdk-browser";

const TURNKEY_BASE_URL = process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL || "https://api.turnkey.com";
const TURNKEY_RP_ID = process.env.NEXT_PUBLIC_TURNKEY_RP_ID || "localhost";
const TURNKEY_ORG_ID = process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID || process.env.NEXT_PUBLIC_TURNKEY_ORG_ID;

if (!TURNKEY_ORG_ID) {
    console.warn("Turnkey Organization ID not found. Ensure NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID is set in .env.local");
}

export const turnkeyBrowser = new Turnkey({
    apiBaseUrl: TURNKEY_BASE_URL,
    defaultOrganizationId: TURNKEY_ORG_ID || "",
    rpId: TURNKEY_RP_ID,
});
