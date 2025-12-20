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
            <div className="w-full h-32 flex items-center justify-center border border-white/5 bg-white/5 rounded-xl">
                <span className="text-xs text-[#9eb7a8]">No assets found in this vault.</span>
            </div>
        )
    }

    return (
        <div className="w-full overflow-hidden rounded-xl border border-white/5 bg-[#1F2833]/40">
            <Table>
                <TableHeader className="bg-white/5">
                    <TableRow className="border-b border-white/5 hover:bg-transparent">
                        <TableHead className="w-[100px] text-[10px] uppercase font-bold text-[#9eb7a8] tracking-wider h-8">Asset</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold text-[#9eb7a8] tracking-wider h-8">Mint Address</TableHead>
                        <TableHead className="text-right text-[10px] uppercase font-bold text-[#9eb7a8] tracking-wider h-8">Balance</TableHead>
                        <TableHead className="text-right text-[10px] uppercase font-bold text-[#9eb7a8] tracking-wider h-8">Value (USD)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tokens.map((token) => (
                        <TableRow key={token.mint} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                            <TableCell className="font-medium text-xs text-white h-10 py-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#36e27b] to-[#25a85c] flex items-center justify-center text-[8px] text-[#0B0C10] font-bold">
                                        {token.symbol ? token.symbol[0] : "T"}
                                    </div>
                                    {token.symbol || "Unknown"}
                                </div>
                            </TableCell>
                            <TableCell className="text-xs font-mono text-[#9eb7a8] h-10 py-2">
                                <div className="flex items-center gap-2">
                                    {token.mint.slice(0, 4)}...{token.mint.slice(-4)}
                                    <button className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-white">
                                        <Copy size={10} />
                                    </button>
                                    <a
                                        href={`https://solscan.io/token/${token.mint}?cluster=devnet`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
                                    >
                                        <ExternalLink size={10} />
                                    </a>
                                </div>
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono text-white h-10 py-2">
                                {token.amount.toLocaleString(undefined, { maximumFractionDigits: token.decimals > 4 ? 4 : token.decimals })}
                            </TableCell>
                            <TableCell className="text-right text-xs font-mono text-[#9eb7a8] h-10 py-2">
                                {token.value ? `$${token.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
