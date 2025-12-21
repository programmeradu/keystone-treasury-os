"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingDown, Calendar, AlertTriangle, PlayCircle, Users, TrendingUp } from "lucide-react";
import { useVault } from "@/lib/contexts/VaultContext";
import { Slider } from "@/components/ui/slider";

// Data generation for 18 month runway
const generateRunwayData = (startAmount: number, monthlyBurn: number, newHires: number, revenueImpact: number) => {
    const data = [];
    let current = startAmount;
    let baseline = startAmount;
    const now = new Date();

    // Average salary for new hires estimated at $8k/mo
    const additionalBurn = newHires * 8000;
    // Revenue impact logic (revenueOffset reduces burn if positive, increases if negative)
    const revenueOffset = monthlyBurn * revenueImpact;

    for (let i = 0; i < 18; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() + i, 1);

        // Scenario Path
        const adjustedBurn = (monthlyBurn + additionalBurn) - revenueOffset;
        current = Math.max(0, current - adjustedBurn);

        // Base Path (Original state)
        baseline = Math.max(0, baseline - monthlyBurn);

        data.push({
            date: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
            value: Math.round(current),
            baseline: Math.round(baseline),
            critical: current < (monthlyBurn * 3)
        });
    }
    return data;
};

export const PredictiveRunway = () => {
    const { activeVault, vaultBalance } = useVault();
    const [burnRate, setBurnRate] = useState(45000); // $45k/mo default
    const [newHires, setNewHires] = useState(0);
    const [revenueImpact, setRevenueImpact] = useState(0); // -0.5 to 0.5 range

    // Use real balance if available, otherwise fallback to mock
    const treasuryBalance = vaultBalance || 850000;

    const runwayData = useMemo(() => {
        return generateRunwayData(treasuryBalance, burnRate, newHires, revenueImpact);
    }, [treasuryBalance, burnRate, newHires, revenueImpact]);

    const runwayMonths = useMemo(() => {
        const zeroIndex = runwayData.findIndex(d => d.value <= 0);
        return zeroIndex === -1 ? 18 : zeroIndex;
    }, [runwayData]);

    return (
        <div className="rounded-2xl bg-card border border-border p-6 backdrop-blur-xl relative group overflow-hidden shadow-sm">
            <div className="flex flex-col xl:flex-row justify-between items-start mb-6 gap-8">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <PlayCircle className="text-primary animate-pulse" size={14} />
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em]">Predictive Intelligence</span>
                    </div>
                    <h3 className="text-3xl font-black tracking-tighter text-foreground uppercase">
                        {runwayMonths === 18 ? "18+ Months" : `${runwayMonths} Months`} Runway
                    </h3>
                    <p className="text-[10px] text-primary mt-1 font-mono uppercase tracking-widest font-black">
                        Depletion Node: {runwayData[runwayMonths < 18 ? runwayMonths : 17].date}
                    </p>
                </div>

                {/* Scenario Sliders */}
                <div className="w-full xl:w-80 space-y-5 bg-muted/30 p-4 rounded-xl border border-border">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Users size={12} className="text-primary" />
                                <span>New Hires</span>
                            </div>
                            <span className="text-foreground">+{newHires}</span>
                        </div>
                        <Slider
                            value={[newHires]}
                            onValueChange={([v]) => setNewHires(v)}
                            max={20}
                            step={1}
                            className="[&_[role=slider]]:bg-primary"
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={12} className="text-primary" />
                                <span>Revenue Shift</span>
                            </div>
                            <span className={revenueImpact >= 0 ? "text-primary" : "text-destructive"}>
                                {revenueImpact > 0 ? "+" : ""}{(revenueImpact * 100).toFixed(0)}%
                            </span>
                        </div>
                        <Slider
                            value={[revenueImpact * 100]}
                            onValueChange={([v]) => setRevenueImpact(v / 100)}
                            min={-50}
                            max={50}
                            step={5}
                            className="[&_[role=slider]]:bg-primary"
                        />
                    </div>
                </div>
            </div>

            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={runwayData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRunway" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--dashboard-accent)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--dashboard-accent)" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--dashboard-foreground)" stopOpacity={0.05} />
                                <stop offset="95%" stopColor="var(--dashboard-foreground)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "var(--dashboard-muted-foreground)", fontSize: 10, fontWeight: "bold" }}
                            minTickGap={20}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "var(--dashboard-background)",
                                border: "1px solid var(--dashboard-border)",
                                borderRadius: "12px",
                                fontSize: "10px",
                                color: "var(--dashboard-foreground)",
                                textTransform: "uppercase",
                                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                            }}
                            cursor={{ stroke: 'var(--dashboard-accent)', strokeDasharray: '5 5' }}
                        />
                        <ReferenceLine y={0} stroke="var(--dashboard-border)" strokeDasharray="3 3" />

                        {/* Baseline Shadow */}
                        <Area
                            type="monotone"
                            dataKey="baseline"
                            stroke="var(--dashboard-muted-foreground)"
                            strokeWidth={1}
                            strokeOpacity={0.2}
                            strokeDasharray="5 5"
                            fillOpacity={1}
                            fill="url(#colorBaseline)"
                        />
                        {/* Active Prediction */}
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="var(--dashboard-accent)"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorRunway)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                    <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Live Proactive Simulation</span>
                </div>
                {(newHires > 0 || revenueImpact !== 0) && (
                    <div className="flex items-center gap-1.5 text-primary">
                        <AlertTriangle size={12} className="animate-bounce" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Simulation Overlay Active</span>
                    </div>
                )}
            </div>
        </div>
    );
};
