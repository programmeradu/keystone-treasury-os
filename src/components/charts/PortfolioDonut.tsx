"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const FALLBACK_COLORS = ["#36e27b", "#25a85c", "#1c7a43", "#12502c", "#0a2d19"];

interface PortfolioDonutProps {
    data: { name: string; value: number; color?: string }[];
}

export const PortfolioDonut = ({ data }: PortfolioDonutProps) => {
    const isPlaceholder = data.length === 1 && data[0].name === "Empty";

    return (
        <div className="w-full h-full min-h-[180px] relative overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]} />
                        ))}
                    </Pie>
                    {!isPlaceholder && (
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "var(--dashboard-card)",
                                border: "1px solid var(--dashboard-border)",
                                borderRadius: "12px",
                                fontSize: "10px",
                                color: "var(--dashboard-foreground)",
                                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                            }}
                            itemStyle={{ color: "var(--dashboard-accent)" }}
                        />
                    )}
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest block font-bold">Assets</span>
                    <span className="text-sm font-black text-foreground">{data.length}</span>
                </div>
            </div>
        </div>
    );
};
