import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
// @ts-ignore
import { createTransferInstruction, getAssociatedTokenAddress } from "@solana/spl-token";

// Keystone Treasury Wallet (Hardcoded for demo)
const KEYSTONE_TREASURY_WALLET = "KeystoneTreasuryWalletAddress1111111111111";

// USDC Mint (Devnet)
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

export const marketplacePayments = {
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

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = buyerPublicKey;

        return transaction;
    }
};
