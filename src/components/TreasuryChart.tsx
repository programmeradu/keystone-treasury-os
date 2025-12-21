"use client";

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

const data = [
    { time: "00:00", value: 450 },
    { time: "04:00", value: 480 },
    { time: "08:00", value: 520 },
    { time: "12:00", value: 510 },
    { time: "16:00", value: 550 },
    { time: "20:00", value: 590 },
    { time: "24:00", value: 620 },
];

export function TreasuryChart() {
    return (
        <div className="w-full h-full min-h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--dashboard-accent)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--dashboard-accent)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="time"
                        hide
                    />
                    <YAxis
                        hide
                        domain={['dataMin - 100', 'dataMax + 100']}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--dashboard-bg)',
                            border: '1px solid var(--dashboard-border)',
                            borderRadius: '8px',
                            fontSize: '12px'
                        }}
                        itemStyle={{ color: 'var(--dashboard-accent)' }}
                        cursor={{ stroke: 'var(--dashboard-border)', strokeWidth: 1 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke="var(--dashboard-accent)"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorValue)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
