"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, ExternalLink } from "lucide-react";

interface TokenAccount {
    mint: string;
    amount: number;
    decimals: number;
    symbol?: string;
    price?: number;
    value?: number;
}

export function VaultTable({ tokens }: { tokens: TokenAccount[] }) {
    if (tokens.length === 0) {
        return (
            <div className="w-full h-32 flex items-center justify-center border border-border bg-muted rounded-xl">
                <span className="text-xs text-muted-foreground">No assets found in this vault.</span>
            </div>
        )
    }

    return (
        <div className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow className="border-b border-border hover:bg-transparent">
                        <TableHead className="w-[100px] text-[10px] uppercase font-bold text-muted-foreground tracking-wider h-8">Asset</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider h-8">Mint Address</TableHead>
                        <TableHead className="text-right text-[10px] uppercase font-bold text-muted-foreground tracking-wider h-8">Balance</TableHead>
                        <TableHead className="text-right text-[10px] uppercase font-bold text-muted-foreground tracking-wider h-8">Value (USD)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tokens.map((token) => (
                        <TableRow key={token.mint} className="border-b border-border hover:bg-muted/50 transition-colors group">
                            <TableCell className="font-medium text-xs text-foreground h-10 py-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[8px] text-primary-foreground font-bold">
                                        {token.symbol ? token.symbol[0] : "T"}
                                    </div>
                                    {token.symbol || "Unknown"}
                                </div>
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground h-10 py-2">
                                <div className="flex items-center gap-2">
                                    {token.mint.slice(0, 4)}...{token.mint.slice(-4)}
                                    <button className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary">
                                        <Copy size={10} />
                                    </button>
                                    <a
                                        href={`https://solscan.io/token/${token.mint}?cluster=devnet`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary"
                                    >
                                        <ExternalLink size={10} />
                                    </a>
                                </div>
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono text-foreground h-10 py-2">
                                {token.amount.toLocaleString(undefined, { maximumFractionDigits: token.decimals > 4 ? 4 : token.decimals })}
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono text-muted-foreground h-10 py-2">
                                {token.value ? `$${token.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
