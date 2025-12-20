"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#36e27b", "#25a85c", "#1c7a43", "#12502c", "#0a2d19"];

interface PortfolioDonutProps {
    data: { name: string; value: number }[];
}

export const PortfolioDonut = ({ data }: PortfolioDonutProps) => {
    return (
        <div className="w-full h-full min-h-[180px] relative">
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
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "#1F2833",
                            border: "1px solid rgba(255,255,255,0.05)",
                            borderRadius: "8px",
                            fontSize: "10px",
                            color: "#fff",
                        }}
                        itemStyle={{ color: "#36e27b" }}
                    />
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                    <span className="text-[10px] text-[#9eb7a8] uppercase tracking-widest block">Assets</span>
                    <span className="text-sm font-bold text-white">{data.length}</span>
                </div>
            </div>
        </div>
    );
};
