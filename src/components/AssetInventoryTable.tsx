"use client";

import React from "react";
import { ArrowUpRight, ArrowDownLeft, Repeat, ShieldCheck, Zap } from "lucide-react";

interface Asset {
    mint: string;
    symbol: string;
    name: string;
    balance: number;
    value: number;
    price: number;
    change24h: number;
    allocation: number;
}

interface AssetInventoryTableProps {
    assets: Asset[];
}

export const AssetInventoryTable = ({ assets }: AssetInventoryTableProps) => {
    return (
        <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full border-separate border-spacing-y-1.5">
                <thead>
                    <tr className="text-[10px] text-[#9eb7a8] uppercase tracking-widest text-left">
                        <th className="px-4 py-2 font-semibold">Asset</th>
                        <th className="px-4 py-2 font-semibold text-right">Balance</th>
                        <th className="px-4 py-2 font-semibold text-right">Value (USD)</th>
                        <th className="px-4 py-2 font-semibold text-right">Price</th>
                        <th className="px-4 py-2 font-semibold text-right">24h Change</th>
                        <th className="px-4 py-2 font-semibold text-right">Allocation</th>
                        <th className="px-4 py-2 font-semibold text-center">Quick Actions</th>
                    </tr>
                </thead>
                <tbody className="text-[11px] font-medium">
                    {assets.map((asset) => (
                        <tr
                            key={asset.mint}
                            className="bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 rounded-lg transition-all group"
                        >
                            <td className="px-4 py-2 rounded-l-lg border-l border-t border-b border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#1F2833] flex items-center justify-center text-[10px] font-bold border border-white/10 group-hover:border-[#36e27b]/50 transition-colors">
                                        {asset.symbol.substring(0, 2)}
                                    </div>
                                    <div>
                                        <span className="block text-white font-bold">{asset.symbol}</span>
                                        <span className="block text-[9px] text-[#9eb7a8] truncate max-w-[80px]">{asset.name}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-2 text-right border-t border-b border-white/5">
                                <span className="text-white">{asset.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                            </td>
                            <td className="px-4 py-2 text-right border-t border-b border-white/5">
                                <span className="text-white font-bold">${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </td>
                            <td className="px-4 py-2 text-right border-t border-b border-white/5 font-mono text-[10px]">
                                ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2 text-right border-t border-b border-white/5">
                                <span className={asset.change24h >= 0 ? "text-[#36e27b]" : "text-[#ff5b39]"}>
                                    {asset.change24h >= 0 ? "+" : ""}{asset.change24h.toFixed(2)}%
                                </span>
                            </td>
                            <td className="px-4 py-2 text-right border-t border-b border-white/5">
                                <div className="flex items-center justify-end gap-2">
                                    <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#36e27b]/40" style={{ width: `${asset.allocation}%` }} />
                                    </div>
                                    <span className="text-[9px] text-[#9eb7a8]">{asset.allocation.toFixed(1)}%</span>
                                </div>
                            </td>
                            <td className="px-4 py-2 rounded-r-lg border-r border-t border-b border-white/5">
                                <div className="flex items-center justify-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                    <button title="Swap" className="p-1.5 rounded bg-white/5 hover:bg-[#36e27b]/20 hover:text-[#36e27b] transition-colors">
                                        <Repeat size={12} />
                                    </button>
                                    <button title="Stake" className="p-1.5 rounded bg-white/5 hover:bg-[#36e27b]/20 hover:text-[#36e27b] transition-colors">
                                        <Zap size={12} />
                                    </button>
                                    <button title="Transfer" className="p-1.5 rounded bg-white/5 hover:bg-[#36e27b]/20 hover:text-[#36e27b] transition-colors">
                                        <ArrowUpRight size={12} />
                                    </button>
                                    <button title="Details" className="p-1.5 rounded bg-white/5 hover:bg-[#36e27b]/20 hover:text-[#36e27b] transition-colors">
                                        <ShieldCheck size={12} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
