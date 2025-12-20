"use client";

import React from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

interface ValueStreamChartProps {
    data: { date: string; value: number }[];
}

export const ValueStreamChart = ({ data }: ValueStreamChartProps) => {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: -5 }}>
                <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#36e27b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#36e27b" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9eb7a8", fontSize: 10 }}
                    minTickGap={30}
                />
                <YAxis
                    hide
                    domain={["auto", "auto"]}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: "#1F2833",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: "8px",
                        fontSize: "10px",
                        color: "#fff",
                    }}
                />
                <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#36e27b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
};
