/**
 * Solana RPC Integration
 * Handles blockchain operations: balance checks, transactions, confirmations
 */

import { 
  Connection, 
  PublicKey, 
  Transaction,
  Keypair,
  sendAndConfirmTransaction,
  VersionedTransaction
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddressSync,
  getAccount,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';

// RPC Connection
let connection: Connection | null = null;

/**
 * Get or create Solana RPC connection
 */
export function getConnection(): Connection {
  if (!connection) {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    connection = new Connection(rpcUrl, 'confirmed');
  }
  return connection;
}

/**
 * Get SOL balance for a wallet
 */
export async function getSolBalance(walletAddress: string): Promise<number> {
  try {
    const connection = getConnection();
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    
    // Convert lamports to SOL
    return balance / 1e9;
  } catch (error) {
console.error('Failed to get SOL balance:', error);
throw new Error(`Unable to fetch SOL balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get SPL token balance for a wallet
 */
export async function getTokenBalance(
  walletAddress: string,
  tokenMint: string
): Promise<number> {
  try {
    const connection = getConnection();
    const walletPublicKey = new PublicKey(walletAddress);
    const mintPublicKey = new PublicKey(tokenMint);
    
    // Get associated token account (sync in v0.4.x)
    const tokenAccount = getAssociatedTokenAddressSync(
      mintPublicKey,
      walletPublicKey
    );
    
    // Get account info
    const accountInfo = await getAccount(connection, tokenAccount);
    
    // Get token decimals
    const mintInfo = await connection.getParsedAccountInfo(mintPublicKey);
    const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals || 9;
    
    // Convert to human-readable amount
    return Number(accountInfo.amount) / Math.pow(10, decimals);
  } catch (error) {
    console.error('Failed to get token balance:', error);
    return 0;
  }
}

/**
 * Get USD value of token balance
 */
export async function getTokenBalanceUSD(
  walletAddress: string,
  tokenMint: string,
  priceUSD: number
): Promise<number> {
  const balance = await getTokenBalance(walletAddress, tokenMint);
  return balance * priceUSD;
}

/**
 * Check if wallet has sufficient balance for transaction
 */
export async function hasSufficientBalance(
  walletAddress: string,
  tokenMint: string,
  requiredAmount: number,
  tokenDecimals: number = 9
): Promise<{ sufficient: boolean; balance: number; required: number }> {
  try {
    const balance = await getTokenBalance(walletAddress, tokenMint);
    const requiredInTokens = requiredAmount / Math.pow(10, tokenDecimals);
    
    return {
      sufficient: balance >= requiredInTokens,
      balance,
      required: requiredInTokens
    };
  } catch (error) {
    console.error('Failed to check balance:', error);
    return {
      sufficient: false,
      balance: 0,
      required: requiredAmount
    };
  }
}

/**
 * Send a transaction to Solana
 */
export async function sendTransaction(
  transaction: Transaction,
  signers: Keypair[]
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const connection = getConnection();
    
    // Send and confirm transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      signers,
      {
        commitment: 'confirmed',
        maxRetries: 3
      }
    );
    
    console.log('Transaction sent:', signature);
    
    return {
      success: true,
      signature
    };
  } catch (error: any) {
    console.error('Failed to send transaction:', error);
    return {
      success: false,
      error: error.message || 'Transaction failed'
    };
  }
}

/**
 * Send a versioned transaction (for Jupiter swaps)
 */
export async function sendVersionedTransaction(
  serializedTransaction: string,
  signer: Keypair
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const connection = getConnection();
    
    // Deserialize transaction
    const transactionBuffer = Buffer.from(serializedTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(transactionBuffer);
    
    // Sign transaction
    transaction.sign([signer]);
    
    // Send raw transaction
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3
    });
    
    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    
    if (confirmation.value.err) {
      return {
        success: false,
        error: `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
      };
    }
    
    console.log('Versioned transaction confirmed:', signature);
    
    return {
      success: true,
      signature
    };
  } catch (error: any) {
    console.error('Failed to send versioned transaction:', error);
    return {
      success: false,
      error: error.message || 'Transaction failed'
    };
  }
}

/**
 * Wait for transaction confirmation
 */
export async function confirmTransaction(
  signature: string,
  commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed'
): Promise<boolean> {
  try {
    const connection = getConnection();
    const result = await connection.confirmTransaction(signature, commitment);
    return !result.value.err;
  } catch (error) {
    console.error('Failed to confirm transaction:', error);
    return false;
  }
}

/**
 * Get transaction details
 */
export async function getTransaction(signature: string) {
  try {
    const connection = getConnection();
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0
    });
    return tx;
  } catch (error) {
    console.error('Failed to get transaction:', error);
    return null;
  }
}

/**
 * Estimate transaction fee
 */
export async function estimateTransactionFee(
  transaction: Transaction
): Promise<number> {
  try {
    const connection = getConnection();
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    
    const fee = await connection.getFeeForMessage(
      transaction.compileMessage(),
      'confirmed'
    );
    
    // Convert lamports to SOL
    return (fee.value || 5000) / 1e9;
  } catch (error) {
    console.error('Failed to estimate fee:', error);
    // Default estimate: 5000 lamports = 0.000005 SOL
    return 0.000005;
  }
}

/**
 * Check if token account exists
 */
export async function tokenAccountExists(
  walletAddress: string,
  tokenMint: string
): Promise<boolean> {
  try {
    const connection = getConnection();
    const walletPublicKey = new PublicKey(walletAddress);
    const mintPublicKey = new PublicKey(tokenMint);
    
    const tokenAccount = getAssociatedTokenAddressSync(
      mintPublicKey,
      walletPublicKey
    );
    
    const accountInfo = await connection.getAccountInfo(tokenAccount);
    return accountInfo !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Get current slot (for debugging/monitoring)
 */
export async function getCurrentSlot(): Promise<number> {
  try {
    const connection = getConnection();
    return await connection.getSlot();
  } catch (error) {
    console.error('Failed to get current slot:', error);
    return 0;
  }
}

/**
 * Check RPC health
 */
export async function checkRPCHealth(): Promise<{
  healthy: boolean;
  slot?: number;
  version?: string;
  error?: string;
}> {
  try {
    const connection = getConnection();
    const [slot, version] = await Promise.all([
      connection.getSlot(),
      connection.getVersion()
    ]);
    
    return {
      healthy: true,
      slot,
      version: version['solana-core']
    };
  } catch (error: any) {
    return {
      healthy: false,
      error: error.message
    };
  }
}

/**
 * Token mint addresses (common tokens)
 */
export const TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  ORCA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
};

/**
 * Get token info from mint address
 */
export function getTokenSymbol(mint: string): string {
  const entries = Object.entries(TOKENS);
  for (const [symbol, address] of entries) {
    if (address === mint) {
      return symbol;
    }
  }
  return 'UNKNOWN';
}
