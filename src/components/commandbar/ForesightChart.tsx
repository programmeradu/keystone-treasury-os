"use client";

// Feature: commandbar-god-mode
// ForesightChart — inline mini chart rendered inside ToolCard for foresight simulation results.
// Covers Requirement 7.5

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface ForesightChartProps {
  chartType: "depletion_node" | "equity_curve" | "yield_curve";
  monthlyProjection: Array<Record<string, number>>;
  result: Record<string, unknown>;
}

function formatValue(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

export function ForesightChart({ chartType, monthlyProjection, result }: ForesightChartProps) {
  if (!monthlyProjection || monthlyProjection.length === 0) return null;

  // Determine the data keys present in the projection
  const firstRow = monthlyProjection[0];
  const keys = Object.keys(firstRow).filter((k) => k !== "month");

  if (chartType === "depletion_node") {
    // Single AreaChart — amber fading to red as balance depletes
    const balanceKey = keys.find((k) => k === "balance") ?? keys[0];
    const maxBalance = Math.max(...monthlyProjection.map((d) => d[balanceKey] ?? 0));

    return (
      <div className="mt-3 rounded-lg border border-zinc-700/50 bg-zinc-900/60 p-2">
        <p className="mb-1.5 text-[10px] font-medium text-amber-400/80 uppercase tracking-wide">
          Runway Projection
        </p>
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={monthlyProjection} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="depletionGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
              <linearGradient id="depletionFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              tick={{ fontSize: 9, fill: "#71717a" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis hide domain={[0, maxBalance * 1.05]} />
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: 6,
                fontSize: 11,
              }}
              formatter={(v: number) => [formatValue(v), "Balance"]}
              labelFormatter={(l: number | string) => `Month ${l}`}
            />
            <Area
              type="monotone"
              dataKey={balanceKey}
              stroke="url(#depletionGradient)"
              strokeWidth={1.5}
              fill="url(#depletionFill)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chartType === "equity_curve") {
    // Dual-line AreaChart — two series in green
    const [key1, key2] = keys.length >= 2 ? [keys[0], keys[1]] : [keys[0], keys[0]];

    return (
      <div className="mt-3 rounded-lg border border-zinc-700/50 bg-zinc-900/60 p-2">
        <p className="mb-1.5 text-[10px] font-medium text-emerald-400/80 uppercase tracking-wide">
          Equity Curve
        </p>
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={monthlyProjection} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="equityFill1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="equityFill2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              tick={{ fontSize: 9, fill: "#71717a" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: 6,
                fontSize: 11,
              }}
              formatter={(v: number) => [formatValue(v)]}
              labelFormatter={(l: number | string) => `Month ${l}`}
            />
            <Area
              type="monotone"
              dataKey={key1}
              stroke="#10b981"
              strokeWidth={1.5}
              fill="url(#equityFill1)"
              dot={false}
            />
            {key2 !== key1 && (
              <Area
                type="monotone"
                dataKey={key2}
                stroke="#34d399"
                strokeWidth={1.5}
                fill="url(#equityFill2)"
                dot={false}
                strokeDasharray="4 2"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // yield_curve — single AreaChart, green
  const yieldKey = keys.find((k) => k === "balance" || k === "value") ?? keys[0];

  return (
    <div className="mt-3 rounded-lg border border-zinc-700/50 bg-zinc-900/60 p-2">
      <p className="mb-1.5 text-[10px] font-medium text-emerald-400/80 uppercase tracking-wide">
        Yield Forecast
      </p>
      <ResponsiveContainer width="100%" height={100}>
        <AreaChart data={monthlyProjection} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="yieldFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            tick={{ fontSize: 9, fill: "#71717a" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              background: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: 6,
              fontSize: 11,
            }}
            formatter={(v: number) => [formatValue(v), "Balance"]}
            labelFormatter={(l: number | string) => `Month ${l}`}
          />
          <Area
            type="monotone"
            dataKey={yieldKey}
            stroke="#10b981"
            strokeWidth={1.5}
            fill="url(#yieldFill)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
