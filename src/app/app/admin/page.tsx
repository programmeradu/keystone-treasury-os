"use client";

import React, { useEffect, useState } from "react";
import { 
    Users, Activity, Zap, Bot, Package, Shield, 
    ArrowRightLeft, Mail, RefreshCw, Server, AlertTriangle
} from "lucide-react";
import { AdminMetricsPanel, MetricGrid, BreakdownList } from "@/components/admin/AdminMetricsPanel";
import { MetricCard } from "@/components/admin/MetricCard";
import { Logo } from "@/components/icons";

export default function AdminMonitoringRoom() {
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    const fetchMetrics = async () => {
        try {
            setError(null);
            const res = await fetch("/api/admin/metrics");
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    throw new Error("Unauthorized: Admin access required.");
                }
                throw new Error(`Failed to fetch metrics: ${res.status}`);
            }
            const data = await res.json();
            setMetrics(data);
            setLastRefresh(new Date());
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        // Polling every 60 seconds
        const interval = setInterval(fetchMetrics, 60000);
        return () => clearInterval(interval);
    }, []);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
                <AlertTriangle size={48} className="text-destructive mb-4" />
                <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Access Denied</h1>
                <p className="text-muted-foreground">{error}</p>
            </div>
        );
    }

    if (loading && !metrics) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground animate-pulse">
                <Logo size={48} fillColor="var(--primary)" />
                <p className="mt-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Initializing Monitoring Room...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-background text-foreground">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                        <Server className="text-primary hover:animate-pulse" size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black tracking-tight text-foreground uppercase">Platform admin</h1>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--dashboard-accent-muted)] animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                Global Live Telemetry
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono text-muted-foreground">
                        Last ping: {lastRefresh?.toLocaleTimeString() || "..."}
                    </span>
                    <button 
                        onClick={() => { setLoading(true); fetchMetrics(); }}
                        className="p-2 rounded-lg bg-muted/50 hover:bg-muted border border-border transition-colors group"
                    >
                        <RefreshCw size={16} className={`text-muted-foreground group-hover:text-foreground ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </header>

            <main className="flex-1 p-6 overflow-y-auto scrollbar-thin">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[1800px] mx-auto pb-12">
                    
                    {/* PANEL 1: User Growth */}
                    <AdminMetricsPanel 
                        title="User Growth & Adoption" 
                        icon={<Users size={16} />}
                        className="lg:col-span-2"
                    >
                        <MetricGrid cols={2}>
                            <MetricCard 
                                title="Total Users" 
                                value={metrics.users.total} 
                                trend={{ value: metrics.users.new24h, prefix: "+", subtext: "last 24h" }}
                            />
                            <MetricCard 
                                title="New This Week" 
                                value={metrics.users.new7d} 
                                colorClass="text-emerald-500"
                            />
                        </MetricGrid>
                        <div className="mt-2 p-4 bg-muted/20 border border-border rounded-xl">
                            <span className="text-[10px] uppercase font-black text-muted-foreground mb-3 block">Conversion Targets</span>
                            <BreakdownList items={[
                                { label: "Onboarded", value: metrics.users.onboarded, color: "var(--primary)" },
                                { label: "Emails Collected", value: metrics.users.withEmail, color: "#eab308" }
                            ]} valueFormatter={(v) => `${v} users (${Math.round((v/metrics.users.total)*100 || 0)}%)`} />
                        </div>
                    </AdminMetricsPanel>

                    {/* PANEL 2: Financials & Revenue */}
                    <AdminMetricsPanel 
                        title="Financials & Tiers" 
                        icon={<Activity size={16} />}
                        className="lg:col-span-2"
                    >
                        <MetricGrid cols={2}>
                            <MetricCard 
                                title="Marketplace Volume" 
                                value={metrics.revenue.totalMarketplaceVol} 
                                formatter={(v) => `$${v.toLocaleString()}`}
                                colorClass="text-emerald-500"
                            />
                            <MetricCard 
                                title="Platform Fees" 
                                value={metrics.revenue.totalMarketplaceRev} 
                                formatter={(v) => `$${v.toLocaleString()}`}
                                colorClass="text-primary"
                            />
                        </MetricGrid>
                        <div className="mt-2 p-4 bg-muted/20 border border-border rounded-xl">
                            <span className="text-[10px] uppercase font-black text-muted-foreground mb-3 block">Tier Distribution</span>
                            <BreakdownList items={[
                                { label: "Free Tier", value: metrics.revenue.tiers.free || 0, color: "#64748b" },
                                { label: "Mini Tier", value: metrics.revenue.tiers.mini || 0, color: "var(--primary)" },
                                { label: "Max Tier", value: metrics.revenue.tiers.max || 0, color: "#8b5cf6" }
                            ]} />
                        </div>
                    </AdminMetricsPanel>

                    {/* PANEL 3: AI Agents */}
                    <AdminMetricsPanel 
                        title="AI Agent Fleet" 
                        icon={<Bot size={16} />}
                        className="lg:col-span-2"
                    >
                        <MetricGrid cols={2}>
                            <MetricCard 
                                title="Total Executions" 
                                value={metrics.ai.totalExecutions} 
                                trend={{ value: metrics.ai.executions24h, prefix: "+", subtext: "last 24h" }}
                            />
                            <MetricCard 
                                title="Architect Runs" 
                                value={metrics.ai.totalRuns} 
                                colorClass="text-purple-500"
                            />
                        </MetricGrid>
                        <div className="mt-2 p-4 bg-muted/20 border border-border rounded-xl">
                            <span className="text-[10px] uppercase font-black text-muted-foreground mb-3 block">Execution Status Pipeline</span>
                            <BreakdownList items={[
                                { label: "Successful", value: metrics.ai.executionStatus.SUCCESS || 0, color: "var(--primary)" },
                                { label: "Pending/Simulating", value: (metrics.ai.executionStatus.PENDING || 0) + (metrics.ai.executionStatus.SIMULATING || 0), color: "#eab308" },
                                { label: "Failed", value: metrics.ai.executionStatus.FAILED || 0, color: "#ef4444" }
                            ]} />
                        </div>
                    </AdminMetricsPanel>

                    {/* PANEL 4: DCA Bots */}
                    <AdminMetricsPanel 
                        title="DCA Automation" 
                        icon={<Zap size={16} />}
                        className="lg:col-span-2"
                    >
                        <MetricGrid cols={2}>
                            <MetricCard 
                                title="Active Bots" 
                                value={metrics.dca.activeBots} 
                            />
                            <MetricCard 
                                title="Total Invested" 
                                value={metrics.dca.totalInvested} 
                                formatter={(v) => `$${v.toLocaleString()}`}
                                trend={{ value: metrics.dca.volume24h, prefix: "+$", subtext: "last 24h" }}
                                colorClass="text-emerald-500"
                            />
                        </MetricGrid>
                        <div className="mt-2 p-4 bg-muted/20 border border-border rounded-xl">
                            <span className="text-[10px] uppercase font-black text-muted-foreground mb-3 block">Bot Lifecycle</span>
                            <BreakdownList items={[
                                { label: "Active", value: metrics.dca.botsStatus.active || 0, color: "var(--primary)" },
                                { label: "Completed", value: metrics.dca.botsStatus.completed || 0, color: "#64748b" },
                                { label: "Paused/Failed", value: (metrics.dca.botsStatus.paused || 0) + (metrics.dca.botsStatus.failed || 0), color: "#ef4444" }
                            ]} />
                        </div>
                    </AdminMetricsPanel>

                    {/* PANEL 5: Marketplace & Studio */}
                    <AdminMetricsPanel 
                        title="App Marketplace" 
                        icon={<Package size={16} />}
                        className="lg:col-span-2"
                    >
                        <MetricGrid cols={3}>
                            <MetricCard title="Apps Created" value={metrics.marketplace.totalApps} />
                            <MetricCard title="Published" value={metrics.marketplace.publishedApps} colorClass="text-purple-500" />
                            <MetricCard title="Active Installs" value={metrics.marketplace.activeInstalls} colorClass="text-emerald-500" />
                        </MetricGrid>
                    </AdminMetricsPanel>

                    {/* PANEL 6: On-Chain & Volume */}
                    <AdminMetricsPanel 
                        title="On-Chain & TX Volume" 
                        icon={<ArrowRightLeft size={16} />}
                        className="lg:col-span-2"
                    >
                        <MetricGrid cols={2}>
                            <MetricCard 
                                title="Tracked TXs" 
                                value={metrics.onchain.txCount} 
                            />
                            <MetricCard 
                                title="Tracked Volume" 
                                value={metrics.onchain.usdVol} 
                                formatter={(v) => `$${Math.round(v).toLocaleString()}`}
                                colorClass="text-emerald-500"
                            />
                            <MetricCard 
                                title="Airdrops Claimed" 
                                value={metrics.onchain.airdropClaims} 
                                colorClass="text-orange-500"
                            />
                            <MetricCard 
                                title="Airdrop Yield" 
                                value={metrics.onchain.airdropValue} 
                                formatter={(v) => `$${Math.round(v).toLocaleString()}`}
                                colorClass="text-emerald-500"
                            />
                        </MetricGrid>
                    </AdminMetricsPanel>

                    {/* PANEL 7: Teams & Collaboration */}
                    <AdminMetricsPanel 
                        title="Teams & Collaboration" 
                        icon={<Users size={16} />}
                        className="lg:col-span-2"
                    >
                        <MetricGrid cols={2}>
                            <MetricCard title="Total Teams" value={metrics.teams.total} />
                            <MetricCard title="Vault-Linked Teams" value={metrics.teams.vaultLinked} colorClass="text-primary" />
                        </MetricGrid>
                        <div className="mt-2 p-4 bg-muted/20 border border-border rounded-xl">
                            <span className="text-[10px] uppercase font-black text-muted-foreground mb-3 block">Invitation Funnel</span>
                            <BreakdownList items={[
                                { label: "Sent", value: metrics.teams.invitesTotal, color: "#64748b" },
                                { label: "Accepted", value: metrics.teams.invitesAccepted, color: "var(--primary)" }
                            ]} />
                        </div>
                    </AdminMetricsPanel>

                    {/* PANEL 8: System Health & Notifications */}
                    <AdminMetricsPanel 
                        title="System Health & Events" 
                        icon={<Shield size={16} />}
                        status={metrics.system.rateLimitHits24h > 1000 ? "warning" : "healthy"}
                        className="lg:col-span-2"
                    >
                        <MetricGrid cols={2}>
                            <MetricCard title="Rate Limit Hits (24h)" value={metrics.system.rateLimitHits24h} colorClass={metrics.system.rateLimitHits24h > 1000 ? "text-orange-500" : "text-muted-foreground"} />
                            <MetricCard title="Active Network Monitors" value={metrics.system.activeMonitors} colorClass="text-primary" />
                            <MetricCard title="Active Atlas Sessions" value={metrics.system.activeAtlasSessions} colorClass="text-blue-500" />
                            <MetricCard 
                                title="Foresight Accuracy" 
                                value={metrics.system.foresightAccuracy} 
                                formatter={(v) => `${(v * 100).toFixed(1)}%`}
                                colorClass="text-emerald-500"
                            />
                        </MetricGrid>
                    </AdminMetricsPanel>
                </div>
            </main>
        </div>
    );
}
