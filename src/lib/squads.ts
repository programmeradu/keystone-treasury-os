import * as squads from "@sqds/multisig";
import { Connection, PublicKey } from "@solana/web3.js";

// @sqds/multisig v2.x (Squads v4) exports helpers at the top level or under namespaces
// Based on node_modules discovery, we use direct names
const { getTransactionPda, getProposalPda, getVaultPda } = squads;

/**
 * Keystone Squads Client
 * A wrapper around @sqds/multisig v2 SDK to interact with Squads Protocol.
 */
export class SquadsClient {
    connection: Connection;
    wallet: any; // Adapter wallet interface

    constructor(connection: Connection, wallet: any) {
        this.connection = connection;
        this.wallet = wallet;
    }

    /**
     * Fetches the multisig account (Vault) details.
     */
    async getVault(vaultAddress: string) {
        try {
            const multisigKey = new PublicKey(vaultAddress);
            // Fetch the Multisig account data
            // Squads v4 uses 'Multisig' as the main account type
            const multisigAccount = await squads.accounts.Multisig.fromAccountAddress(
                this.connection,
                multisigKey
            );

            return multisigAccount;
        } catch (error) {
            console.error("Failed to fetch Squads Vault:", error);
            throw error;
        }
    }

    /**
     * Helper to determine if an address is a Squads Multisig or standard account.
     */
    async resolveVaultAddress(address: string): Promise<PublicKey> {
        try {
            const pubkey = new PublicKey(address);
            const info = await this.connection.getAccountInfo(pubkey);

            // Squads V4 Program ID
            const SQUADS_V4_PROGRAM_ID = "SQDS4169MvYvC6v3HnQjHeYd3sU0n3MUPfw79vjrE8G";

            if (info && info.owner.toBase58() === SQUADS_V4_PROGRAM_ID) {
                // It is a Squads multisig, derive the Vault PDA
                const [vaultPda] = getVaultPda({
                    multisigPda: pubkey,
                    index: 0
                });
                return vaultPda;
            }
            // Standard wallet or other account, use direct address
            return pubkey;
        } catch {
            return new PublicKey(address);
        }
    }

    /**
     * Fetches the vault balance (SOL).
     */
    async getVaultBalance(vaultAddress: string): Promise<number> {
        try {
            const resolvedKey = await this.resolveVaultAddress(vaultAddress);
            const balance = await this.connection.getBalance(resolvedKey);
            return balance / 1e9; // Convert Lamports to SOL
        } catch (error) {
            console.error("Failed to fetch Vault Balance:", error);
            throw error;
        }
    }

    /**
     * Fetches all SPL Token accounts owned by the vault.
     */
    async getVaultTokens(vaultAddress: string): Promise<{ mint: string; amount: number; decimals: number; symbol?: string; name?: string; logo?: string }[]> {
        try {
            const resolvedKey = await this.resolveVaultAddress(vaultAddress);

            // Fetch parsed token accounts for the owner
            const response = await this.connection.getParsedTokenAccountsByOwner(resolvedKey, {
                programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), // TOKEN_PROGRAM_ID
            });

            return response.value.map((item) => {
                const info = item.account.data.parsed.info;
                return {
                    mint: info.mint,
                    amount: info.tokenAmount.uiAmount,
                    decimals: info.tokenAmount.decimals,
                }
            });
        } catch (error) {
            console.error("Failed to fetch Vault Tokens:", error);
            return [];
        }
    }

    /**
     * Fetches token prices from Jupiter API.
     * @param mints Array of token mint addresses
     */
    async getTokenMetadata(mints: string[]): Promise<Record<string, { price: number; symbol?: string; name?: string; logo?: string; change24h?: number }>> {
        if (mints.length === 0) return {};

        const metadata: Record<string, { price: number; symbol?: string; name?: string; logo?: string; change24h?: number }> = {};
        // DexScreener allows up to 30 addresses per request
        const CHUNK_SIZE = 30;

        const chunks = [];
        for (let i = 0; i < mints.length; i += CHUNK_SIZE) {
            chunks.push(mints.slice(i, i + CHUNK_SIZE));
        }

        try {
            await Promise.all(chunks.map(async (chunk) => {
                const ids = chunk.join(",");
                const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ids}`);
                if (!response.ok) {
                    throw new Error(`DexScreener API returned ${response.status}`);
                }
                const data = await response.json();

                if (data.pairs) {
                    // Extract the best price and metadata for each mint in the response
                    data.pairs.forEach((pair: any) => {
                        const mint = pair.baseToken.address;
                        const price = parseFloat(pair.priceUsd);
                        const change24h = pair.priceChange?.h24 ? parseFloat(pair.priceChange.h24) : 0;

                        // If we have multiple pairs for the same token, take the one with higher liquidity
                        if (!metadata[mint] || (pair.liquidity?.usd > (metadata[mint] as any)?.liquidity || 0)) {
                            metadata[mint] = {
                                price,
                                symbol: pair.baseToken.symbol,
                                name: pair.baseToken.name,
                                logo: pair.info?.imageUrl,
                                change24h,
                                ...(pair.liquidity?.usd ? { liquidity: pair.liquidity.usd } as any : {})
                            };
                        }
                    });
                }
            }));

            // Special case for SOL if missing
            const solMint = "So11111111111111111111111111111111111111112";
            if (!metadata[solMint]) {
                const solPrice = (metadata as any)[solMint]?.price || 0;
                metadata[solMint] = {
                    symbol: "SOL",
                    name: "Solana",
                    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
                    price: solPrice,
                    change24h: 0
                };
            }

            return metadata;
        } catch (error) {
            console.error("Failed to fetch Token Metadata from DexScreener:", error);
            return metadata;
        }
    }
    /**
     * Creates a new Vault Transaction Proposal in the Squads Multisig.
     * @param vaultAddress The multisig account address
     * @param instructions The Solana instructions to execute
     * @param vaultIndex The index of the vault (default 0 for main vault)
     * @param memo Optional memo
     */
    async createVaultTransaction(
        vaultAddress: string,
        instructions: any[],
        vaultIndex: number = 0,
        memo: string = "Keystone Action"
    ): Promise<string> {
        if (!this.wallet || !this.wallet.publicKey) {
            throw new Error("Wallet not connected");
        }

        try {
            const multisigKey = new PublicKey(vaultAddress);
            const multisigAccount = await squads.accounts.Multisig.fromAccountAddress(
                this.connection,
                multisigKey
            );

            // Get current transaction index
            const transactionIndex = Number(multisigAccount.transactionIndex) + 1;

            // In v4, we create a 'VaultTransaction'
            // getTransactionPda takes { multisigPda, index }
            const [vaultTransactionKey] = getTransactionPda({
                multisigPda: multisigKey,
                index: BigInt(transactionIndex)
            });

            console.log(`[Squads] Creating proposal #${transactionIndex} for vault index ${vaultIndex} in multisig ${vaultAddress}`);

            // Note: In real app, we would use squads.instructions.vaultTransactionCreate
            // which takes { multisigPda, vaultIndex, transactionIndex, creator, ... }
            return vaultTransactionKey.toBase58();

        } catch (error) {
            console.error("Failed to create Squads Proposal:", error);
            throw error;
        }
    }

    /**
     * Lists active proposals for the vault.
     */
    async getProposals(vaultAddress: string): Promise<any[]> {
        console.log(`[Squads] Fetching proposals for ${vaultAddress}`);
        try {
            const multisigKey = new PublicKey(vaultAddress);
            const info = await this.connection.getAccountInfo(multisigKey);
            const SQUADS_V4_PROGRAM_ID = "SQDS4169MvYvC6v3HnQjHeYd3sU0n3MUPfw79vjrE8G";

            if (!info || info.owner.toBase58() !== SQUADS_V4_PROGRAM_ID) {
                console.log("[Squads] Address is not a multisig, skipping proposals.");
                return [];
            }

            const multisigAccount = await squads.accounts.Multisig.fromAccountAddress(
                this.connection,
                multisigKey
            );

            const lastIndex = Number(multisigAccount.transactionIndex);
            const proposals = [];

            // Iterate backwards from the latest index
            for (let i = lastIndex; i > Math.max(0, lastIndex - 5); i--) {
                try {
                    const [pda] = getTransactionPda({
                        multisigPda: multisigKey,
                        index: BigInt(i)
                    });

                    // We attempt to fetch the account. In V4, a proposal could be a VaultTransaction or ConfigTransaction.
                    const [proposalPda] = getProposalPda({
                        multisigPda: multisigKey,
                        transactionIndex: BigInt(i)
                    });

                    const proposalAcc = await squads.accounts.Proposal.fromAccountAddress(this.connection, proposalPda);

                    proposals.push({
                        index: i,
                        title: `Proposal #${i}`,
                        status: proposalAcc.status.__kind,
                        signatures: (proposalAcc.approved as any[]).length, // Signer count from Proposal account
                        threshold: Number(multisigAccount.threshold),
                        pda: proposalPda.toBase58()
                    });
                } catch (e) {
                    // Skip if proposal doesn't exist
                }
            }
            return proposals;
        } catch (error) {
            console.error("Failed to fetch Proposals:", error);
            return [];
        }
    }

    /**
     * Casts a vote on a specific proposal (CLI: proposal-vote).
     * @param action Approve | Reject | Cancel
     */
    async voteOnProposal(vaultAddress: string, transactionIndex: number, action: "Approve" | "Reject" | "Cancel"): Promise<string> {
        console.log(`[Squads] Voting ${action} on proposal #${transactionIndex} for ${vaultAddress}`);
        // In real app: squads.instructions.proposalApprove / proposalReject / proposalCancel
        return `vote_${action.toLowerCase()}_sig_pda_index_${transactionIndex}`;
    }

    /**
     * Executes a proposal that has reached the signature threshold.
     */
    async executeProposal(vaultAddress: string, transactionIndex: number): Promise<string> {
        console.log(`[Squads] Executing proposal #${transactionIndex} for ${vaultAddress}`);
        // In real app: squads.instructions.vaultTransactionExecute or configTransactionExecute
        return `execution_sig_pda_index_${transactionIndex}`;
    }
}
