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
    private _resolvedCache: Map<string, PublicKey> = new Map();

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
            const SQUADS_V4_PROGRAM_ID = "SQDS4169MvYvC6v3HnQjHeYd3sU0n3MUPfw79vjrE8G";

            // Check ownership first to avoid assertion errors on non-multisig accounts
            const info = await this.connection.getAccountInfo(multisigKey);
            if (!info || info.owner.toBase58() !== SQUADS_V4_PROGRAM_ID) {
                return null; // Not a Squads multisig — regular wallet
            }

            const multisigAccount = await squads.accounts.Multisig.fromAccountAddress(
                this.connection,
                multisigKey
            );
            return multisigAccount;
        } catch (error) {
            console.warn("[Squads] Could not fetch multisig config:", error);
            return null;
        }
    }

    /**
     * Helper to determine if an address is a Squads Multisig or standard account.
     */
    async resolveVaultAddress(address: string): Promise<PublicKey> {
        // Return cached result to avoid redundant RPC calls per sync cycle
        const cached = this._resolvedCache.get(address);
        if (cached) return cached;

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
                this._resolvedCache.set(address, vaultPda);
                return vaultPda;
            }
            // Standard wallet or other account, use direct address
            this._resolvedCache.set(address, pubkey);
            return pubkey;
        } catch {
            const pubkey = new PublicKey(address);
            this._resolvedCache.set(address, pubkey);
            return pubkey;
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

            // Fetch from both Token Program and Token-2022 Program
            const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
            const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

            const [legacyResult, token2022Result] = await Promise.allSettled([
                this.connection.getParsedTokenAccountsByOwner(resolvedKey, { programId: TOKEN_PROGRAM_ID }),
                this.connection.getParsedTokenAccountsByOwner(resolvedKey, { programId: TOKEN_2022_PROGRAM_ID }),
            ]);

            const legacyAccounts = legacyResult.status === "fulfilled" ? legacyResult.value.value : [];
            const token2022Accounts = token2022Result.status === "fulfilled" ? token2022Result.value.value : [];
            const allAccounts = [...legacyAccounts, ...token2022Accounts];

            return allAccounts.map((item) => {
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
    // Well-known token metadata — guarantees symbols/names/logos for popular tokens.
    // Logos here are fallbacks; DexScreener CDN logos take priority when available.
    // Stablecoins include a default price so they always show correct value.
    private static WELL_KNOWN: Record<string, { symbol: string; name: string; logo: string; price?: number }> = {
        "So11111111111111111111111111111111111111112":  { symbol: "SOL",   name: "Solana",           logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" },
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": { symbol: "USDC",  name: "USD Coin",        logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png", price: 1.0 },
        "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB":  { symbol: "USDT",  name: "Tether USD",      logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg", price: 1.0 },
        "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4": { symbol: "JLP",   name: "Jupiter Perps LP", logo: "https://static.jup.ag/jlp/icon.png" },
        "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN":  { symbol: "JUP",   name: "Jupiter",         logo: "https://static.jup.ag/jup/icon.png" },
        "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": { symbol: "BONK",  name: "Bonk",            logo: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I" },
        "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm": { symbol: "WIF",   name: "dogwifhat",       logo: "https://bafkreibk3covs5ltyqxa272uodhber43tp53hbyagsc2oliaijottcm2q.ipfs.nftstorage.link" },
        "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3": { symbol: "PYTH",  name: "Pyth Network",    logo: "https://pyth.network/token.svg" },
        "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL":  { symbol: "JTO",   name: "Jito",            logo: "https://metadata.jito.network/token/jto/icon.png" },
        "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So":  { symbol: "MSOL",  name: "Marinade SOL",    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png" },
        "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj": { symbol: "stSOL", name: "Lido Staked SOL", logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj/logo.png" },
        "USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA":  { symbol: "USDS",  name: "USDS",            logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA/logo.png", price: 1.0 },
        "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN": { symbol: "TRUMP", name: "OFFICIAL TRUMP",  logo: "https://dd.dexscreener.com/ds-data/tokens/solana/6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN.png" },
    };

    async getTokenMetadata(mints: string[]): Promise<Record<string, { price: number; symbol?: string; name?: string; logo?: string; change24h?: number }>> {
        if (mints.length === 0) return {};

        const metadata: Record<string, { price: number; symbol?: string; name?: string; logo?: string; change24h?: number }> = {};
        const mintSet = new Set(mints);

        // ── Pre-populate from well-known map (symbol + name only) ─────
        // Logos are stored as fallbacks — DexScreener CDN logos will override.
        const wellKnownLogos: Record<string, string> = {};
        for (const mint of mints) {
            const wk = SquadsClient.WELL_KNOWN[mint];
            if (wk) {
                metadata[mint] = { price: wk.price || 0, change24h: 0, symbol: wk.symbol, name: wk.name, logo: undefined };
                wellKnownLogos[mint] = wk.logo;
            }
        }

        // ── Source 1: DexScreener (price + metadata for base tokens) ──
        const CHUNK_SIZE = 30;
        const chunks = [];
        for (let i = 0; i < mints.length; i += CHUNK_SIZE) {
            chunks.push(mints.slice(i, i + CHUNK_SIZE));
        }

        try {
            await Promise.all(chunks.map(async (chunk) => {
                const ids = chunk.join(",");
                const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ids}`);
                if (!response.ok) throw new Error(`DexScreener API returned ${response.status}`);
                const data = await response.json();

                if (data.pairs) {
                    data.pairs.forEach((pair: any) => {
                        const baseMint = pair.baseToken.address;
                        const quoteMint = pair.quoteToken.address;
                        const liq = pair.liquidity?.usd || 0;
                        const change24h = pair.priceChange?.h24 ? parseFloat(pair.priceChange.h24) : 0;

                        // Base token: use priceUsd directly
                        if (mintSet.has(baseMint)) {
                            const price = parseFloat(pair.priceUsd || "0");
                            if (!metadata[baseMint]?.price || liq > ((metadata[baseMint] as any)?.liquidity || 0)) {
                                metadata[baseMint] = {
                                    ...metadata[baseMint],
                                    price,
                                    symbol: metadata[baseMint]?.symbol || pair.baseToken.symbol,
                                    name: metadata[baseMint]?.name || pair.baseToken.name,
                                    logo: pair.info?.imageUrl || metadata[baseMint]?.logo,
                                    change24h,
                                    ...(liq ? { liquidity: liq } as any : {})
                                };
                            }
                        }

                        // Quote token: populate symbol/name/logo only (price from well-known or Jupiter)
                        if (mintSet.has(quoteMint)) {
                            metadata[quoteMint] = {
                                ...metadata[quoteMint],
                                price: metadata[quoteMint]?.price || 0,
                                symbol: metadata[quoteMint]?.symbol || pair.quoteToken.symbol,
                                name: metadata[quoteMint]?.name || pair.quoteToken.name,
                                change24h: metadata[quoteMint]?.change24h || 0,
                            };
                        }
                    });
                }
            }));
        } catch (error) {
            console.warn("[TokenMeta] DexScreener failed:", error);
        }

        // ── Source 2: Jupiter Token API (fills missing logos + symbols) ──
        const missingMints = mints.filter(m =>
            !metadata[m]?.logo || !metadata[m]?.symbol || metadata[m]?.symbol === "SPL"
        );
        if (missingMints.length > 0) {
            console.log(`[TokenMeta] Fetching ${missingMints.length} missing tokens from Jupiter...`);
            await Promise.allSettled(missingMints.map(async (mint) => {
                try {
                    const res = await fetch(`https://tokens.jup.ag/token/${mint}`, { signal: AbortSignal.timeout(5000) });
                    if (!res.ok) return;
                    const info = await res.json();
                    if (!info || !info.symbol) return;

                    const existing = metadata[mint];
                    metadata[mint] = {
                        price: existing?.price || 0,
                        symbol: existing?.symbol && existing.symbol !== "SPL" ? existing.symbol : info.symbol,
                        name: existing?.name && existing.name !== "Unknown Token" ? existing.name : info.name,
                        logo: existing?.logo || info.logoURI || null,
                        change24h: existing?.change24h || 0,
                    };
                } catch {
                    // Jupiter miss — not critical
                }
            }));
        }

        // ── Source 3: Jupiter Price API (fills ALL missing prices) ──────
        const noPriceMints = mints.filter(m => !metadata[m]?.price || metadata[m].price === 0);
        if (noPriceMints.length > 0) {
            console.log(`[TokenMeta] Fetching prices for ${noPriceMints.length} tokens from Jupiter Price API...`);
            try {
                const ids = noPriceMints.join(",");
                const res = await fetch(`https://lite-api.jup.ag/price/v2?ids=${ids}`, { signal: AbortSignal.timeout(5000) });
                if (res.ok) {
                    const json = await res.json();
                    if (json.data) {
                        for (const mint of noPriceMints) {
                            if (json.data[mint]?.price) {
                                metadata[mint] = {
                                    ...metadata[mint],
                                    price: parseFloat(json.data[mint].price),
                                };
                            }
                        }
                    }
                }
            } catch {
                // Jupiter price miss — not critical
            }
        }

        // ── Apply well-known fallback logos for any tokens still missing logos ──
        for (const mint of mints) {
            if (!metadata[mint]?.logo && wellKnownLogos[mint]) {
                metadata[mint] = { ...metadata[mint], logo: wellKnownLogos[mint] };
            }
        }

        return metadata;
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
     * Fetches recent transaction signatures and parses details for the vault.
     */
    async getRecentTransactions(vaultAddress: string, limit: number = 50): Promise<{
        signature: string;
        blockTime: number | null;
        success: boolean;
        memo: string | null;
        slot: number;
        type?: string;
        amount?: string;
        token?: string;
    }[]> {
        try {
            const resolvedKey = await this.resolveVaultAddress(vaultAddress);

            const signatures = await this.connection.getSignaturesForAddress(resolvedKey, { limit });

            const transactions: {
                signature: string;
                blockTime: number | null;
                success: boolean;
                memo: string | null;
                slot: number;
                type?: string;
                amount?: string;
                token?: string;
            }[] = signatures.map(sig => ({
                signature: sig.signature,
                blockTime: sig.blockTime ?? null,
                success: !sig.err,
                memo: sig.memo ?? null,
                slot: sig.slot,
            }));

            // Parse ALL transactions for detailed info using balance diffs
            const vaultKey = resolvedKey.toBase58();

            // Batch in groups of 10 to avoid overwhelming RPC
            const BATCH = 10;
            for (let batch = 0; batch < transactions.length; batch += BATCH) {
                const slice = transactions.slice(batch, batch + BATCH);
                const parsedTxs = await Promise.allSettled(
                    slice.map(t =>
                        this.connection.getParsedTransaction(t.signature, { maxSupportedTransactionVersion: 0 })
                    )
                );

                parsedTxs.forEach((result, i) => {
                    const idx = batch + i;
                    if (result.status !== "fulfilled" || !result.value) return;
                    const tx = result.value;
                    const meta = tx.meta;
                    const accountKeys = tx.transaction.message.accountKeys.map((k: any) =>
                        typeof k === "string" ? k : k.pubkey?.toBase58?.() || String(k)
                    );

                    // --- Detect type from programs used ---
                    const instructions = tx.transaction.message.instructions;
                    const allPrograms = instructions.map((ix: any) => ix.programId?.toBase58?.() || ix.programId || "");
                    // Include inner instruction programs too
                    if (meta?.innerInstructions) {
                        for (const inner of meta.innerInstructions) {
                            for (const iix of inner.instructions) {
                                const pid = (iix as any).programId?.toBase58?.() || (iix as any).programId || "";
                                if (pid) allPrograms.push(pid);
                            }
                        }
                    }

                    const programSet = new Set(allPrograms);
                    if (programSet.has("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4") || programSet.has("JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcPX7")) {
                        transactions[idx].type = "Swap";
                    } else if (allPrograms.some((p: string) => p.includes("SQDS") || p === "SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu")) {
                        transactions[idx].type = "Multisig Action";
                    } else {
                        // Check top-level instructions for specific parsed types
                        let foundType = false;
                        for (const ix of instructions) {
                            if ('parsed' in ix && ix.parsed) {
                                const ptype = ix.parsed.type;
                                if (ptype === "transfer" || ptype === "transferChecked") {
                                    transactions[idx].type = "Transfer";
                                    foundType = true; break;
                                } else if (ptype === "createAccount" || ptype === "createAccountWithSeed") {
                                    transactions[idx].type = "Account Create";
                                    foundType = true; break;
                                }
                            }
                        }
                        if (!foundType) {
                            if (programSet.has("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") || programSet.has("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb")) {
                                transactions[idx].type = "Token";
                            } else {
                                transactions[idx].type = "Transaction";
                            }
                        }
                    }

                    if (!meta) return;

                    // --- Extract amounts via balance diffs (works for ALL tx types) ---
                    const vaultAccountIdx = accountKeys.indexOf(vaultKey);

                    // 1. SOL balance change
                    if (vaultAccountIdx >= 0 && meta.preBalances && meta.postBalances) {
                        const solDelta = (meta.postBalances[vaultAccountIdx] - meta.preBalances[vaultAccountIdx]) / 1e9;
                        // Only show if significant (ignore tiny rent changes)
                        if (Math.abs(solDelta) > 0.0001) {
                            transactions[idx].amount = `${solDelta > 0 ? "+" : ""}${solDelta.toFixed(4)}`;
                            transactions[idx].token = "SOL";
                        }
                    }

                    // 2. SPL token balance changes (overrides SOL if present — token movements are more interesting)
                    if (meta.preTokenBalances && meta.postTokenBalances) {
                        const preMap = new Map<string, number>();
                        const postMap = new Map<string, number>();
                        const mintMap = new Map<string, string>(); // mint -> symbol hint

                        for (const tb of meta.preTokenBalances as any[]) {
                            if (tb.owner === vaultKey) {
                                preMap.set(tb.mint, tb.uiTokenAmount?.uiAmount || 0);
                            }
                        }
                        for (const tb of meta.postTokenBalances as any[]) {
                            if (tb.owner === vaultKey) {
                                postMap.set(tb.mint, tb.uiTokenAmount?.uiAmount || 0);
                                mintMap.set(tb.mint, tb.mint);
                            }
                        }

                        // Find the largest token balance change for this vault
                        let bestDelta = 0;
                        let bestMint = "";
                        const allMints = new Set([...preMap.keys(), ...postMap.keys()]);
                        for (const mint of allMints) {
                            const pre = preMap.get(mint) || 0;
                            const post = postMap.get(mint) || 0;
                            const delta = post - pre;
                            if (Math.abs(delta) > Math.abs(bestDelta)) {
                                bestDelta = delta;
                                bestMint = mint;
                            }
                        }

                        if (bestMint && Math.abs(bestDelta) > 0) {
                            // Use well-known mint shortcuts
                            const KNOWN: Record<string, string> = {
                                "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
                                "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT",
                                "So11111111111111111111111111111111111111112": "SOL",
                                "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So": "MSOL",
                                "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN": "JUP",
                                "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": "BONK",
                                "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL": "JTO",
                                "USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA": "USDS",
                                "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4": "JLP",
                            };
                            const symbol = KNOWN[bestMint] || `${bestMint.slice(0, 4)}...`;
                            transactions[idx].amount = `${bestDelta > 0 ? "+" : ""}${bestDelta.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
                            transactions[idx].token = symbol;
                        }
                    }
                });
            }

            return transactions;
        } catch (error) {
            console.warn("[Squads] Failed to fetch recent transactions:", error);
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
