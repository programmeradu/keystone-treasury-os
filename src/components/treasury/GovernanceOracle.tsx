"use client";

import React from "react";
import { Clock, ArrowUpRight, Scale, CheckCircle2, AlertCircle, ThumbsUp, ThumbsDown, ExternalLink } from "lucide-react";

const PROPOSALS = [
    {
        id: "KIP-42",
        title: "Treasury Diversification: Solayer Strategy",
        desc: "Allocate 15% of SOL treasury into Solayer pools to capture 8% APY yield and secure network validation.",
        endsIn: "4H 20M",
        status: "ACTIVE",
        votesFor: 72,
        votesAgainst: 12,
        myVote: null
    },
    {
        id: "KIP-43",
        title: "Emergency Multisig Rotation (Signer #4)",
        desc: "Rotation of signer key #4 due to operational security policy update. New key provided by Ledger HQ.",
        endsIn: "2D 14H",
        status: "ACTIVE",
        votesFor: 98,
        votesAgainst: 0,
        myVote: "FOR"
    },
    {
        id: "KIP-41",
        title: "Q1-2025 Grants Program Budget",
        desc: "Authorization of 500,000 USDC for the Q1 grants wave focusing on infrastructure tooling.",
        endsIn: "Ended",
        status: "PASSED",
        votesFor: 154,
        votesAgainst: 2,
        myVote: "FOR"
    },
    {
        id: "KIP-40",
        title: "Protocol Parameter Update: Fee Switch",
        desc: "Turn on protocol fee switch for Uniswap integration.",
        endsIn: "Ended",
        status: "REJECTED",
        votesFor: 45,
        votesAgainst: 112,
        myVote: null
    }
];

export function GovernanceOracle() {
    return (
        <div className="flex flex-col h-full gap-2">
            {/* 1. Governance Identity Card - Slim Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 pt-4 border-b border-zinc-800/50 pb-4 h-auto shrink-0 bg-gradient-to-r from-zinc-900/50 to-transparent">
                <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-zinc-800 text-white"><Scale size={16} /></div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Voting Power</span>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-xl font-black text-white tracking-tighter">1,204,500</h2>
                            <span className="text-xs font-bold text-primary uppercase">vKEY</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase hidden sm:inline">Snapshot: 2D 14H</span>
                    <button className="px-4 py-2 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-lg hover:scale-105 transition-transform flex items-center gap-2">
                        Delegate <ArrowUpRight size={12} />
                    </button>
                </div>
            </div>

            {/* 2. Proposals - High Density Table */}
            <div className="flex-1 flex flex-col overflow-hidden relative border-t border-zinc-800/50 mt-2">
                {/* Table Header */}
                <div className="px-4 py-2 flex justify-between items-center bg-zinc-900/30">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Governance Register</span>
                    <div className="flex gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-bold uppercase border border-emerald-500/20">2 Active</span>
                    </div>
                </div>

                <div className="flex-1 overflow-x-auto scrollbar-thin font-mono bg-zinc-900/10">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="text-[9px] uppercase tracking-widest text-zinc-600 border-b border-zinc-800">
                                <th className="py-3 pl-4 font-normal w-24">ID</th>
                                <th className="py-3 font-normal">Proposal</th>
                                <th className="py-3 font-normal w-32">Status</th>
                                <th className="py-3 font-normal w-48">Quorum</th>
                                <th className="py-3 font-normal w-32">My Vote</th>
                                <th className="py-3 font-normal w-24 text-right pr-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-[10px] text-zinc-400">
                            {PROPOSALS.map((p) => (
                                <tr key={p.id} className="group hover:bg-zinc-900/50 transition-colors border-b border-zinc-800/30">
                                    <td className="py-4 pl-4 font-mono text-zinc-300">
                                        <div className="px-1.5 py-0.5 rounded bg-zinc-800 w-fit">{p.id}</div>
                                    </td>
                                    <td className="py-4 max-w-md">
                                        <div className="flex flex-col gap-1 pr-8">
                                            <span className="text-white font-bold text-xs group-hover:text-primary transition-colors cursor-pointer">{p.title}</span>
                                            <span className="text-zinc-500 line-clamp-1">{p.desc}</span>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-2">
                                            {p.status === 'ACTIVE' && <Clock size={12} className="text-orange-500" />}
                                            {p.status === 'PASSED' && <CheckCircle2 size={12} className="text-emerald-500" />}
                                            {p.status === 'REJECTED' && <AlertCircle size={12} className="text-rose-500" />}
                                            <span className={`font-bold ${p.status === 'ACTIVE' ? 'text-orange-500' :
                                                    p.status === 'PASSED' ? 'text-emerald-500' : 'text-rose-500'
                                                }`}>{p.status === 'ACTIVE' ? p.endsIn : p.status}</span>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex flex-col gap-1 w-32">
                                            <div className="flex justify-between text-[8px] uppercase tracking-wider">
                                                <span className="text-emerald-500">{p.votesFor} For</span>
                                                <span className="text-rose-500">{p.votesAgainst} Against</span>
                                            </div>
                                            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden flex">
                                                <div className="h-full bg-emerald-500" style={{ width: `${(p.votesFor / (p.votesFor + p.votesAgainst)) * 100}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        {p.myVote ? (
                                            <span className="flex items-center gap-2 text-emerald-500 font-bold uppercase text-[9px]">
                                                <CheckCircle2 size={12} /> Voted {p.myVote}
                                            </span>
                                        ) : p.status === 'ACTIVE' ? (
                                            <span className="text-zinc-600 text-[9px] uppercase italic">Not Voted</span>
                                        ) : (
                                            <span className="text-zinc-600 text-[9px] uppercase">Did not vote</span>
                                        )}
                                    </td>
                                    <td className="py-4 text-right pr-4">
                                        {p.status === 'ACTIVE' && !p.myVote && (
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-1.5 rounded hover:bg-emerald-500/20 hover:text-emerald-500 text-zinc-500 transition-colors"><ThumbsUp size={14} /></button>
                                                <button className="p-1.5 rounded hover:bg-rose-500/20 hover:text-rose-500 text-zinc-500 transition-colors"><ThumbsDown size={14} /></button>
                                            </div>
                                        )}
                                        {p.status !== 'ACTIVE' && (
                                            <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-white/10 text-zinc-500 hover:text-white transition-all">
                                                <ExternalLink size={14} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
