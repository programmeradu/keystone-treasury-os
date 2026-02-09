import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
// @ts-ignore
import { createTransferInstruction, getAssociatedTokenAddress } from "@solana/spl-token";

// Keystone Treasury Wallet
// Uses env var if set, otherwise derives a deterministic devnet address from a seed
const KEYSTONE_TREASURY_WALLET = (() => {
    const envAddr = process.env.NEXT_PUBLIC_KEYSTONE_TREASURY_WALLET;
    if (envAddr) {
        try { new PublicKey(envAddr); return envAddr; } catch { /* invalid, fall through */ }
    }
    // Deterministic devnet treasury derived from a static seed
    const seed = Uint8Array.from(
        Array.from("keystone-treasury-v1-seed-000000", (c) => c.charCodeAt(0))
    );
    return Keypair.fromSeed(seed).publicKey.toBase58();
})();

// USDC Mint (Devnet)
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

/**
 * Validate that a string is a valid Solana public key
 */
export function isValidSolanaAddress(address: string): boolean {
    try {
        new PublicKey(address);
        return true;
    } catch {
        return false;
    }
}

export const marketplacePayments = {
    /** Get the treasury wallet address */
    getTreasuryAddress: () => KEYSTONE_TREASURY_WALLET,

    /**
     * Creates a transaction to purchase an app
     * Splits payment: 80% to Creator, 20% to Keystone
     */
    createPurchaseTransaction: async (
        connection: Connection,
        buyerPublicKey: PublicKey,
        creatorWallet: string,
        priceAmount: number, // In natural units (e.g. 50 USDC)
        token: "SOL" | "USDC" = "SOL"
    ) => {
        if (!isValidSolanaAddress(creatorWallet)) {
            throw new Error("Invalid creator wallet address");
        }

        const transaction = new Transaction();
        const creatorKey = new PublicKey(creatorWallet);
        const treasuryKey = new PublicKey(KEYSTONE_TREASURY_WALLET);

        const creatorShare = priceAmount * 0.8;
        const treasuryShare = priceAmount * 0.2;

        if (token === "SOL") {
            const lamportsPerSol = 1_000_000_000;

            // 80% to Creator
            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: buyerPublicKey,
                    toPubkey: creatorKey,
                    lamports: Math.floor(creatorShare * lamportsPerSol)
                })
            );

            // 20% to Keystone
            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: buyerPublicKey,
                    toPubkey: treasuryKey,
                    lamports: Math.floor(treasuryShare * lamportsPerSol)
                })
            );
        } else {
            // USDC (SPL Token) Logic
            const decimals = 6;
            const amountUnits = Math.pow(10, decimals);

            // Get ATAs
            const buyerAta = await getAssociatedTokenAddress(USDC_MINT, buyerPublicKey);
            const creatorAta = await getAssociatedTokenAddress(USDC_MINT, creatorKey);
            const treasuryAta = await getAssociatedTokenAddress(USDC_MINT, treasuryKey);

            // Note: In a real app, we need to check if ATAs exist and create them if not (ATA creation instructions)
            // For brevity, assuming receiver ATAs exist or handled by client

            // 80% to Creator
            transaction.add(
                createTransferInstruction(
                    buyerAta,
                    creatorAta,
                    buyerPublicKey,
                    Math.floor(creatorShare * amountUnits)
                )
            );

            // 20% to Keystone
            transaction.add(
                createTransferInstruction(
                    buyerAta,
                    treasuryAta,
                    buyerPublicKey,
                    Math.floor(treasuryShare * amountUnits)
                )
            );
        }

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = buyerPublicKey;

        return { transaction, blockhash, lastValidBlockHeight };
    }
};
