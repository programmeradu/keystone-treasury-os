import { Turnkey } from "@turnkey/sdk-browser";
import { TurnkeySigner } from "@turnkey/solana";
import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";

// Ensure environment variables are set
const TURNKEY_ORG_ID = process.env.NEXT_PUBLIC_TURNKEY_ORG_ID;
const TURNKEY_API_BASE_URL = "https://api.turnkey.com";

// Initialize Turnkey Browser SDK lazily — only when actually called
// This handles the Passkey prompts and iframe communication
let _turnkey: Turnkey | null = null;

export function getTurnkey(): Turnkey {
    if (!TURNKEY_ORG_ID) {
        throw new Error("NEXT_PUBLIC_TURNKEY_ORG_ID is not configured. Turnkey wallet features are unavailable.");
    }
    if (!_turnkey) {
        _turnkey = new Turnkey({
            apiBaseUrl: TURNKEY_API_BASE_URL,
            defaultOrganizationId: TURNKEY_ORG_ID,
            rpId: typeof window !== "undefined" ? window.location.hostname : "localhost",
        });
    }
    return _turnkey;
}

// Backwards-compatible export (throws if not configured)
export const turnkey = new Proxy({} as Turnkey, {
    get(_target, prop) {
        return (getTurnkey() as any)[prop];
    },
});

// Create a new wallet
// Returns the wallet details after user completes Passkey registration
export async function createStudioWallet(walletName: string) {
    console.log("Creating wallet:", walletName);

    try {
        // 1. Generate a new Passkey Credential (WebAuthn)
        // This triggers the browser/OS FaceID/TouchID prompt
        // Use the browser SDK's passkey helper
        // @ts-ignore - SDK types mismatch in current version
        const response = await (turnkey as any).passkeys.createUser({
            publicKey: {
                user: {
                    name: walletName,
                    displayName: walletName,
                },
            },
        });

        // 2. Submit attestation to our backend server to create the Sub-Organization
        // The backend has the API keys to authorize this creation
        const res = await fetch("/api/turnkey/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                subOrgName: walletName,
                attestation: response.attestation,
                challenge: response.challenge,
            }),
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to register wallet");
        }

        const data = await res.json();

        // 3. Persist the Sub-Org ID (Wallet ID)
        localStorage.setItem("keystone_wallet_id", data.subOrganizationId);

        return {
            id: data.subOrganizationId,
            name: walletName,
            address: "Initializing..."
        };

    } catch (e: any) {
        console.error("Wallet Creation Failed:", e);
        throw e;
    }
}

// Get a Solana Signer for a specific wallet address/ID
export async function getSolanaSigner(walletAddress: string) {
    // Determine user's sub-organization or use main if it's a direct member
    // For simplicity, using the default client config

    return new TurnkeySigner({
        organizationId: TURNKEY_ORG_ID!,
        client: (turnkey as any).api, // Use the authenticated client
    });
}

// Helper to sign and broadcast a transaction
export async function signAndSendTransaction(
    transaction: Transaction | VersionedTransaction,
    connection: Connection,
    walletAddress: string
): Promise<string> {
    const signer = await getSolanaSigner(walletAddress);

    // Sign
    // The SDK will trigger the Passkey popup here
    // Verify usage: TurnkeySigner expects to sign messages or transactions
    // We might need to adapt based on whether it's legacy or versioned

    // @ts-ignore - types can be tricky between solana/web3 versions
    const signedTx = await signer.signTransaction(transaction);

    // Broadcast
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    return signature;
}
