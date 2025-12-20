"use client";

import React, { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingDown, Calendar, AlertTriangle, PlayCircle } from "lucide-react";
// import { StreamClient, Cluster } from "@streamflow/stream";

// Mock data generation for 12 month runway
const generateRunwayData = (startAmount: number, monthlyBurn: number, riskFactor: number = 0) => {
    const data = [];
    let current = startAmount;
    const now = new Date();

    for (let i = 0; i < 18; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
        // Apply risk factor to burn rate (e.g. 1.2x burn)
        const adjustedBurn = monthlyBurn * (1 + riskFactor);
        current = Math.max(0, current - adjustedBurn);

        data.push({
            date: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
            value: Math.round(current),
            critical: current < (monthlyBurn * 3) // Critical if < 3 months runway
        });
    }
    return data;
};

export const PredictiveRunway = () => {
    const [burnRate, setBurnRate] = useState(45000); // $45k/mo default
    const [treasuryBalance, setTreasuryBalance] = useState(850000); // $850k default
    const [riskScenario, setRiskScenario] = useState<"base" | "pessimistic" | "optimistic">("base");
    const [data, setData] = useState<any[]>([]);
    const [runwayMonths, setRunwayMonths] = useState(0);

    // [STREAMFLOW INTEGRATION NOTE]
    // In a real implementation with wallet connection:
    // const client = new StreamClient("https://api.mainnet-beta.solana.com", Cluster.Mainnet);
    // const streams = await client.get({ wallet: publicKey });
    // const committedOutflows = streams.reduce((acc, s) => acc + s.remainingAmount, 0);

    useEffect(() => {
        let riskMultiplier = 0;
        if (riskScenario === "pessimistic") riskMultiplier = 0.3; // +30% burn (market crash/hiring)
        if (riskScenario === "optimistic") riskMultiplier = -0.1; // -10% burn (efficiency)

        const runwayData = generateRunwayData(treasuryBalance, burnRate, riskMultiplier);
        setData(runwayData);

        // Calculate months until zero
        const zeroIndex = runwayData.findIndex(d => d.value <= 0);
        setRunwayMonths(zeroIndex === -1 ? 18 : zeroIndex);

    }, [burnRate, treasuryBalance, riskScenario]);

    return (
        <div className="rounded-2xl bg-[#1F2833]/30 border border-white/5 p-6 backdrop-blur-xl relative group overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <PlayCircle className="text-[#36e27b]" size={14} />
                        <span className="text-[10px] text-[#9eb7a8] uppercase tracking-widest font-semibold">Predictive Runway</span>
                    </div>
                    <h3 className="text-2xl font-bold tracking-tighter text-white">
                        {runwayMonths === 18 ? "18+ Months" : `${runwayMonths} Months`} Runway
                    </h3>
                    <p className="text-xs text-[#9eb7a8] mt-1">Based on ${burnRate.toLocaleString()}/mo burn rate</p>
                </div>

                <div className="flex items-center gap-2 bg-[#0B0C10]/50 p-1 rounded-lg border border-white/5">
                    <button
                        onClick={() => setRiskScenario("base")}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-all ${riskScenario === "base" ? "bg-[#36e27b] text-[#0B0C10]" : "text-[#9eb7a8] hover:text-white"}`}
                    >
                        Base
                    </button>
                    <button
                        onClick={() => setRiskScenario("pessimistic")}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-all ${riskScenario === "pessimistic" ? "bg-red-500/20 text-red-500 border border-red-500/20" : "text-[#9eb7a8] hover:text-white"}`}
                    >
                        Hard Mode
                    </button>
                </div>
            </div>

            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRunway" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={riskScenario === "pessimistic" ? "#ef4444" : "#36e27b"} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={riskScenario === "pessimistic" ? "#ef4444" : "#36e27b"} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#9eb7a8", fontSize: 10 }}
                            minTickGap={30}
                        />
                        <YAxis hide />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#1F2833",
                                border: "1px solid rgba(255,255,255,0.05)",
                                borderRadius: "8px",
                                fontSize: "10px",
                                color: "#fff",
                            }}
                            formatter={(value: number) => [`$${value.toLocaleString()}`, "Forecast"]}
                        />
                        <ReferenceLine y={0} stroke="#4b5563" strokeDasharray="3 3" />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={riskScenario === "pessimistic" ? "#ef4444" : "#36e27b"}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorRunway)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Streamflow Badge */}
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] text-[#9eb7a8]">Powered by <strong>Streamflow</strong> Logic</span>
                </div>
                {riskScenario === "pessimistic" && (
                    <div className="flex items-center gap-1.5 text-red-400">
                        <AlertTriangle size={12} />
                        <span className="text-[10px] font-bold">High Risk Scenario Active</span>
                    </div>
                )}
            </div>
        </div>
    );
};
