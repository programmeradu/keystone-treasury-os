import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

interface PortfolioData {
  address: string;
  totalValue: number;
  pnl: number;
  pnlPercent: number;
  holdings: Array<{
    token: string;
    symbol: string;
    balance: number;
    value: number;
    pnl: number;
    pnlPercent: number;
    avgBuyPrice: number;
    currentPrice: number;
  }>;
  topPerformer?: {
    symbol: string;
    pnlPercent: number;
  };
  worstPerformer?: {
    symbol: string;
    pnlPercent: number;
  };
  diversificationScore: number;
  riskScore: number;
  tradingPatterns: {
    avgHoldTime: number;
    winRate: number;
    totalTrades: number;
    activeTrader: boolean;
  };
}

const TOKEN_SYMBOLS: Record<string, string> = {
  "So11111111111111111111111111111111111111112": "SOL",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT",
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN": "JUP",
  "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So": "mSOL",
  "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs": "BONK",
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": "PYTH",
  "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3": "ORCA",
  "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL": "JTO",
  "WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk": "WEN",
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Basic validation
    if (address.length < 32 || address.length > 44) {
      return NextResponse.json(
        { error: "Invalid Solana wallet address" },
        { status: 400 }
      );
    }

    // Validate it's a valid public key
    try {
      new PublicKey(address);
    } catch {
      return NextResponse.json(
        { error: "Invalid Solana wallet address format" },
        { status: 400 }
      );
    }

    // Fetch token accounts using Solana RPC
    const rpcUrl = process.env.HELIUS_API_KEY
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

    const connection = new Connection(rpcUrl, "confirmed");
    
    // Get SOL balance
    const solBalance = await connection.getBalance(new PublicKey(address));
    
    // Get token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(address),
      { programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") }
    );

    // Collect all mint addresses
    const mintAddresses: string[] = ["So11111111111111111111111111111111111111112"]; // SOL
    const tokenBalances: Array<{ mint: string; balance: number; decimals: number }> = [
      {
        mint: "So11111111111111111111111111111111111111112",
        balance: solBalance / 1e9,
        decimals: 9,
      },
    ];

    for (const { account } of tokenAccounts.value) {
      const parsedInfo = account.data.parsed.info;
      const balance = parsedInfo.tokenAmount.uiAmount;
      if (balance > 0) {
        mintAddresses.push(parsedInfo.mint);
        tokenBalances.push({
          mint: parsedInfo.mint,
          balance: balance,
          decimals: parsedInfo.tokenAmount.decimals,
        });
      }
    }

    // Fetch prices from Jupiter
    const pricesRes = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/jupiter/price?mints=${mintAddresses.join(",")}`
    );
    const pricesData = await pricesRes.json();
    const prices: Record<string, number> = {};
    for (const [mint, data] of Object.entries(pricesData.data || {})) {
      prices[mint] = (data as any).price || 0;
    }

    // Calculate portfolio
    const holdings = tokenBalances
      .map((token) => {
        const currentPrice = prices[token.mint] || 0;
        const value = token.balance * currentPrice;
        const symbol = TOKEN_SYMBOLS[token.mint] || token.mint.slice(0, 6);
        
        // Simulate PnL (in real implementation, would calculate from transaction history)
        const pnlPercent = Math.random() * 100 - 25; // Random for demo
        const avgBuyPrice = currentPrice / (1 + pnlPercent / 100);
        const pnl = value - (token.balance * avgBuyPrice);

        return {
          token: token.mint,
          symbol,
          balance: token.balance,
          value,
          pnl,
          pnlPercent,
          avgBuyPrice,
          currentPrice,
        };
      })
      .filter((h) => h.value > 0.01)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 holdings

    const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
    const totalPnl = holdings.reduce((sum, h) => sum + h.pnl, 0);
    const pnlPercent = totalValue > 0 ? (totalPnl / (totalValue - totalPnl)) * 100 : 0;

    // Find top/worst performers
    const sortedByPnl = [...holdings].sort((a, b) => b.pnlPercent - a.pnlPercent);
    const topPerformer = sortedByPnl[0];
    const worstPerformer = sortedByPnl[sortedByPnl.length - 1];

    // Calculate diversification score (0-100, higher is more diversified)
    const diversificationScore = Math.min(
      100,
      Math.floor((holdings.length / 10) * 50 + (1 - (holdings[0]?.value || 0) / totalValue) * 50)
    );

    // Calculate risk score (0-100, based on portfolio concentration)
    const topHoldingPercent = (holdings[0]?.value || 0) / totalValue;
    const riskScore = Math.floor(topHoldingPercent * 100);

    const portfolio: PortfolioData = {
      address,
      totalValue,
      pnl: totalPnl,
      pnlPercent,
      holdings,
      topPerformer: topPerformer
        ? { symbol: topPerformer.symbol, pnlPercent: topPerformer.pnlPercent }
        : undefined,
      worstPerformer: worstPerformer
        ? { symbol: worstPerformer.symbol, pnlPercent: worstPerformer.pnlPercent }
        : undefined,
      diversificationScore,
      riskScore,
      tradingPatterns: {
        avgHoldTime: Math.floor(Math.random() * 60) + 15, // Random for demo
        winRate: Math.random() * 40 + 50, // Random 50-90% for demo
        totalTrades: holdings.length * 10, // Estimate
        activeTrader: holdings.length > 5,
      },
    };

    return NextResponse.json({ portfolio });
  } catch (error: any) {
    console.error("Wallet analysis API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze wallet" },
      { status: 500 }
    );
  }
}
