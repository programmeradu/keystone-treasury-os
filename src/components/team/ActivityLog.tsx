"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Activity, Filter, Download, ChevronLeft, ChevronRight, History, UserPlus, UserMinus, ShieldCheck, Settings, Zap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface LogEntry {
    id: number;
    action: string;
    description: string | null;
    metadata: any;
    txSignature: string | null;
    createdAt: string;
    userId: string | null;
    userName: string | null;
    userAvatar: string | null;
    userWallet: string | null;
}

interface ActivityLogProps {
    teamId: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
    team_created: <Zap size={14} className="text-primary" />,
    member_invited: <UserPlus size={14} className="text-emerald-400" />,
    member_removed: <UserMinus size={14} className="text-red-400" />,
    role_changed: <ShieldCheck size={14} className="text-violet-400" />,
    settings_updated: <Settings size={14} className="text-amber-400" />,
};

const ACTION_LABELS: Record<string, string> = {
    team_created: "Team Created",
    member_invited: "Member Invited",
    member_removed: "Member Removed",
    role_changed: "Role Changed",
    settings_updated: "Settings Updated",
};

const FILTER_ACTIONS = ["all", "team_created", "member_invited", "member_removed", "role_changed"];
const PAGE_SIZE = 20;

export const ActivityLog = ({ teamId }: ActivityLogProps) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [page, setPage] = useState(0);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter !== "all") params.set("action", filter);
            params.set("limit", String(PAGE_SIZE));
            params.set("offset", String(page * PAGE_SIZE));

            const res = await fetch(`/api/team/${teamId}/activity?${params}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setLogs(data.logs || []);
            setTotal(data.total || 0);
        } catch {
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [teamId, filter, page]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const exportCSV = () => {
        const headers = ["Date", "Action", "Description", "User", "Wallet", "Tx Signature"];
        const rows = logs.map((log) => [
            new Date(log.createdAt).toISOString(),
            log.action,
            log.description || "",
            log.userName || "",
            log.userWallet || "",
            log.txSignature || "",
        ]);
        const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `activity-log-${teamId}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity size={16} className="text-primary" />
                    <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Activity Log</h3>
                    <span className="text-[9px] text-muted-foreground font-black px-1.5 py-0.5 bg-muted rounded">
                        {total} entries
                    </span>
                </div>
                <button
                    onClick={exportCSV}
                    disabled={logs.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
                >
                    <Download size={12} /> Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                <Filter size={12} className="text-muted-foreground" />
                {FILTER_ACTIONS.map((a) => (
                    <button
                        key={a}
                        onClick={() => { setFilter(a); setPage(0); }}
                        className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border transition-all ${
                            filter === a
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                    >
                        {a === "all" ? "All" : ACTION_LABELS[a] || a}
                    </button>
                ))}
            </div>

            {/* Log entries */}
            <div className="space-y-1">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="h-1 w-24 mx-auto bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
                        </div>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-8 text-center">
                        <History size={24} className="text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">No activity yet</p>
                    </div>
                ) : (
                    logs.map((log) => {
                        const icon = ACTION_ICONS[log.action] || <Activity size={14} className="text-muted-foreground" />;
                        const actorName = log.userName || (log.userWallet ? `${log.userWallet.slice(0, 4)}...${log.userWallet.slice(-4)}` : "System");
                        const time = new Date(log.createdAt);
                        const timeStr = time.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + time.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

                        return (
                            <div
                                key={log.id}
                                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors group"
                            >
                                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                                    {icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-foreground uppercase tracking-tight">
                                            {ACTION_LABELS[log.action] || log.action}
                                        </span>
                                        <span className="text-[9px] text-muted-foreground">{timeStr}</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{log.description}</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <Avatar className="h-4 w-4">
                                            <AvatarImage src={log.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${log.userWallet || "sys"}`} />
                                            <AvatarFallback className="text-[6px] bg-muted">{actorName.slice(0, 2)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-[9px] text-muted-foreground font-mono">{actorName}</span>
                                    </div>
                                    {log.txSignature && (
                                        <a
                                            href={`https://solscan.io/tx/${log.txSignature}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[9px] text-primary hover:underline mt-1 inline-block"
                                        >
                                            View Tx →
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-[9px] text-muted-foreground font-black uppercase">
                        Page {page + 1} of {totalPages}
                    </span>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
                        >
                            <ChevronLeft size={12} />
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
                        >
                            <ChevronRight size={12} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
