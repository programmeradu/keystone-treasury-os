"use client";

import { Scale, RefreshCw, ExternalLink, Inbox, ShieldCheck, ThumbsUp } from "lucide-react";
import { toast } from "@/lib/toast-notifications";
import { useVault } from "@/lib/contexts/VaultContext";

function statusIcon(status: string) {
    const s = status.toLowerCase();
    if (s === "active") return <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />;
    if (s === "executed") return <span className="h-2 w-2 rounded-full bg-blue-500" />;
    if (s === "rejected") return <span className="h-2 w-2 rounded-full bg-red-500" />;
    return <span className="h-2 w-2 rounded-full bg-muted-foreground" />;
}

function statusColor(status: string) {
    const s = status.toLowerCase();
    if (s === "active") return "text-emerald-500";
    if (s === "executed") return "text-blue-500";
    if (s === "rejected") return "text-red-500";
    return "text-muted-foreground";
}

export function GovernanceOracle() {
    const { proposals, isMultisig, activeVault, vaultConfig, loading, refresh, sqClient } = useVault();

    const activeCount = proposals.filter((p: any) => p.status.toLowerCase() === "active").length;

    const handleApprove = async (proposalIndex: number) => {
        if (!sqClient || !activeVault) return;
        try {
            await sqClient.voteOnProposal(activeVault, proposalIndex, "Approve");
            toast.success(`Approved proposal #${proposalIndex}`);
            refresh();
        } catch (err: any) {
            toast.error("Vote failed", { description: err?.message || String(err) });
        }
    };


    return (
        <div className="flex flex-col h-full gap-2">
            {/* Governance Header — real config */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 pt-4 border-b border-border pb-4 h-auto shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-muted text-foreground"><Scale size={16} /></div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-medium text-muted-foreground">
                            {isMultisig ? "Multisig Governance" : "Address Mode"}
                        </span>
                        <div className="flex items-baseline gap-2">
                            {vaultConfig ? (
                                <>
                                    <h2 className="text-xl font-bold text-foreground tracking-tight">
                                        {vaultConfig.threshold}/{vaultConfig.members}
                                    </h2>
                                    <span className="text-xs font-medium text-primary">threshold</span>
                                </>
                            ) : (
                                <h2 className="text-lg font-bold text-foreground tracking-tight">
                                    {isMultisig ? "Loading..." : "Observer"}
                                </h2>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => refresh()}
                        disabled={loading}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                    </button>
                    {isMultisig && activeVault && (
                        <button
                            onClick={() => window.open(`https://app.squads.so/squads/${activeVault}`, "_blank")}
                            className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-[10px] rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
                        >
                            Open in Squads <ExternalLink size={10} />
                        </button>
                    )}
                </div>
            </div>

            {/* Proposals — real data from Squads */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <div className="px-4 py-2 flex justify-between items-center border-b border-border">
                    <span className="text-[9px] font-semibold text-muted-foreground">Proposals</span>
                    <div className="flex gap-2">
                        {activeCount > 0 && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-bold border border-emerald-500/20">
                                {activeCount} Active
                            </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[8px] font-medium border border-border">
                            {proposals.length} Total
                        </span>
                    </div>
                </div>

                {!activeVault ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3">
                        <Inbox size={24} className="text-muted-foreground" />
                        <p className="text-[11px] text-muted-foreground">Connect an address to view governance</p>
                    </div>
                ) : !isMultisig ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3">
                        <ShieldCheck size={24} className="text-muted-foreground" />
                        <p className="text-[11px] text-muted-foreground">Governance requires a Squads multisig</p>
                        <p className="text-[9px] text-muted-foreground/60">Standard wallets don&apos;t have proposals</p>
                    </div>
                ) : proposals.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3">
                        <Scale size={24} className="text-muted-foreground" />
                        <p className="text-[11px] text-muted-foreground">{loading ? "Loading proposals..." : "No proposals found"}</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-x-auto scrollbar-thin">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className="text-[9px] uppercase tracking-wider text-muted-foreground border-b border-border">
                                    <th className="py-3 pl-4 font-normal w-20">#</th>
                                    <th className="py-3 font-normal">Proposal</th>
                                    <th className="py-3 font-normal w-28">Status</th>
                                    <th className="py-3 font-normal w-40">Approvals</th>
                                    <th className="py-3 font-normal w-24 text-right pr-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-[10px] text-muted-foreground">
                                {proposals.map((p: any) => {
                                    const approvalPct = p.threshold > 0 ? (p.signatures / p.threshold) * 100 : 0;
                                    const isActive = p.status.toLowerCase() === "active";
                                    return (
                                        <tr key={p.index} className="group hover:bg-muted/30 transition-colors border-b border-border/50">
                                            <td className="py-4 pl-4 font-mono">
                                                <div className="px-1.5 py-0.5 rounded bg-muted text-foreground w-fit text-[9px] font-bold">#{p.index}</div>
                                            </td>
                                            <td className="py-4 max-w-md">
                                                <div className="flex flex-col gap-0.5 pr-4">
                                                    <span className="text-foreground font-bold text-xs group-hover:text-primary transition-colors cursor-pointer">{p.title}</span>
                                                    <span className="text-muted-foreground text-[9px] font-mono truncate">{p.pda}</span>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex items-center gap-2">
                                                    {statusIcon(p.status)}
                                                    <span className={`font-bold text-[9px] uppercase ${statusColor(p.status)}`}>
                                                        {p.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex flex-col gap-1 w-36">
                                                    <div className="flex justify-between text-[8px]">
                                                        <span className="text-foreground font-semibold">{p.signatures}/{p.threshold} signed</span>
                                                        <span className="text-muted-foreground">{Math.round(approvalPct)}%</span>
                                                    </div>
                                                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden flex">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${approvalPct >= 100 ? "bg-emerald-500" : "bg-primary"}`}
                                                            style={{ width: `${Math.min(100, approvalPct)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 text-right pr-4">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {isActive && (
                                                        <button
                                                            onClick={() => handleApprove(p.index)}
                                                            title="Approve"
                                                            className="p-1.5 rounded hover:bg-emerald-500/20 hover:text-emerald-500 text-muted-foreground transition-colors"
                                                        >
                                                            <ThumbsUp size={13} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => window.open(`https://explorer.solana.com/address/${p.pda}`, "_blank")}
                                                        title="View on Explorer"
                                                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                    >
                                                        <ExternalLink size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
