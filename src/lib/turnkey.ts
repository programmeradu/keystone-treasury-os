import { TurnkeyClient } from "@turnkey/http";
import { ApiKeyStamper } from "@turnkey/api-key-stamper";

const TURNKEY_BASE_URL = process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL || "https://api.turnkey.com";

export const getTurnkeyClient = () => {
    const apiPublicKey = process.env.TURNKEY_API_PUBLIC_KEY;
    const apiPrivateKey = process.env.TURNKEY_API_PRIVATE_KEY;

    console.log("Initializing Turnkey Server Client...");
    console.log("  Default Base URL:", TURNKEY_BASE_URL);
    console.log("  Computed Base URL (if overridden):", process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL);

    if (!apiPublicKey || !apiPrivateKey) {
        console.warn("  MISSING KEYS: Public or Private key not found in env.");
        return null;
    }

    console.log("  Keys found. Initializing Stamper...");
    const stamper = new ApiKeyStamper({
        apiPublicKey,
        apiPrivateKey,
    });
    console.log("  Stamper instance:", !!stamper);
    console.log("  Stamper has stamp method:", typeof (stamper as any).stamp);

    try {
        const client = new TurnkeyClient(
            { baseUrl: TURNKEY_BASE_URL },
            stamper
        );
        console.log("  TurnkeyClient initialized successfully.");
        return client;
    } catch (err) {
        console.error("  Error constructing TurnkeyClient:", err);
        return null;
    }
};
