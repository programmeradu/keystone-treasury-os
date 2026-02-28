"use client";

import React, { useState, useRef, useCallback } from "react";

// ── Score Gauge (circular SVG with animated ring) ────────────────────
export function ScoreGauge({ score, size = 72, label }: { score: number; size?: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, score));
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (clamped / 100) * circ;
  const color = clamped >= 75 ? "#10b981" : clamped >= 50 ? "#f59e0b" : "#ef4444";
  const bg = clamped >= 75 ? "#10b98118" : clamped >= 50 ? "#f59e0b18" : "#ef444418";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="drop-shadow-sm">
        <circle cx={size / 2} cy={size / 2} r={r} fill={bg} stroke="currentColor" strokeWidth={2} strokeOpacity={0.08} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={3} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-1000 ease-out"
        />
        <text x="50%" y="48%" dominantBaseline="central" textAnchor="middle"
          className="fill-current text-foreground" fontSize={size * 0.26} fontWeight={700} fontFamily="monospace">
          {clamped.toFixed(0)}
        </text>
        <text x="50%" y="72%" dominantBaseline="central" textAnchor="middle"
          fill={color} fontSize={size * 0.12} fontWeight={500}>
          / 100
        </text>
      </svg>
      {label && <span className="text-[10px] opacity-50">{label}</span>}
    </div>
  );
}

// ── Interactive Yield Projection Chart ───────────────────────────────
export function YieldProjectionChart({
  principal,
  apy,
  months = 12,
  height = 140,
  color = "#10b981",
}: {
  principal: number;
  apy: number;
  months?: number;
  height?: number;
  color?: string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const w = 320;
  const pad = { t: 16, b: 24, l: 36, r: 12 };
  const plotW = w - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;

  // Generate monthly compounding curve
  const points: { x: number; y: number; val: number; month: number }[] = [];
  for (let m = 0; m <= months; m++) {
    const val = principal * Math.pow(1 + apy / 100 / 12, m);
    points.push({ x: pad.l + (m / months) * plotW, y: 0, val, month: m });
  }
  const maxVal = Math.max(...points.map((p) => p.val), principal * 1.02);
  const minVal = principal * 0.995;
  const range = maxVal - minVal || 1;
  for (const p of points) {
    p.y = pad.t + plotH - ((p.val - minVal) / range) * plotH;
  }

  // Smooth curve via cubic bezier
  const curvePath = points.map((p, i) => {
    if (i === 0) return `M${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    const prev = points[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return `C${cpx.toFixed(1)},${prev.y.toFixed(1)} ${cpx.toFixed(1)},${p.y.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ");

  const areaPath = curvePath + ` L${points[points.length - 1].x.toFixed(1)},${pad.t + plotH} L${points[0].x.toFixed(1)},${pad.t + plotH} Z`;
  const finalVal = points[points.length - 1]?.val ?? principal;
  const gain = finalVal - principal;

  const handleMouse = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = w / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    let closest = 0;
    let minDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(points[i].x - mouseX);
      if (d < minDist) { minDist = d; closest = i; }
    }
    setHoverIdx(closest);
  }, [points]);

  const hp = hoverIdx !== null ? points[hoverIdx] : null;

  // Y-axis labels
  const yLabels = [0, 0.5, 1].map((f) => ({
    y: pad.t + plotH * (1 - f),
    val: minVal + range * f,
  }));

  return (
    <div className="w-full select-none">
      <svg ref={svgRef} viewBox={`0 0 ${w} ${height}`} className="w-full cursor-crosshair"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouse} onMouseLeave={() => setHoverIdx(null)}>
        <defs>
          <linearGradient id={`grad-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Y-axis labels + grid */}
        {yLabels.map((yl, i) => (
          <React.Fragment key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={yl.y} y2={yl.y} stroke="currentColor" strokeOpacity={0.06} strokeWidth={0.5} strokeDasharray="3,3" />
            <text x={pad.l - 4} y={yl.y} textAnchor="end" dominantBaseline="central" fontSize={7} fill="currentColor" fillOpacity={0.3} fontFamily="monospace">
              {yl.val.toFixed(yl.val >= 10 ? 1 : 2)}
            </text>
          </React.Fragment>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#grad-${color.replace("#","")})`} />
        {/* Curve line */}
        <path d={curvePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />

        {/* Data point dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={hoverIdx === i ? 4 : 1.5}
            fill={hoverIdx === i ? color : "currentColor"} fillOpacity={hoverIdx === i ? 1 : 0.15}
            className="transition-all duration-150" />
        ))}

        {/* Hover crosshair + tooltip */}
        {hp && (
          <>
            <line x1={hp.x} x2={hp.x} y1={pad.t} y2={pad.t + plotH} stroke={color} strokeOpacity={0.3} strokeWidth={0.5} strokeDasharray="2,2" />
            <line x1={pad.l} x2={w - pad.r} y1={hp.y} y2={hp.y} stroke={color} strokeOpacity={0.15} strokeWidth={0.5} strokeDasharray="2,2" />
            {/* Tooltip background */}
            <rect x={Math.min(hp.x + 6, w - 90)} y={Math.max(hp.y - 30, pad.t)} width={82} height={26} rx={4}
              fill="hsl(var(--card))" fillOpacity={0.95} stroke={color} strokeOpacity={0.3} strokeWidth={0.5} />
            <text x={Math.min(hp.x + 10, w - 86)} y={Math.max(hp.y - 18, pad.t + 8)} fontSize={8} fill={color} fontWeight={600} fontFamily="monospace">
              {hp.val.toFixed(3)} SOL
            </text>
            <text x={Math.min(hp.x + 10, w - 86)} y={Math.max(hp.y - 9, pad.t + 17)} fontSize={7} fill="currentColor" fillOpacity={0.5}>
              Month {hp.month} · +{((hp.val - principal) / principal * 100).toFixed(2)}%
            </text>
          </>
        )}

        {/* X-axis month labels */}
        {[0, 3, 6, 9, 12].map((m) => {
          if (m > months) return null;
          const x = pad.l + (m / months) * plotW;
          return (
            <text key={m} x={x} y={height - 5} textAnchor="middle" fontSize={8} fill="currentColor" fillOpacity={0.35} fontFamily="monospace">
              {m === 0 ? "Now" : `${m}m`}
            </text>
          );
        })}
      </svg>
      <div className="flex justify-between text-[10px] mt-1 px-1">
        <span className="opacity-40 font-mono">{principal.toFixed(2)} SOL start</span>
        <span style={{ color }} className="font-mono font-semibold">
          → {finalVal.toFixed(3)} SOL (+{gain.toFixed(3)}, {((gain / principal) * 100).toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}

// ── Risk Indicator Bar ───────────────────────────────────────────────
export function RiskBar({ level, label }: { level: "low" | "medium" | "high"; label?: string }) {
  const config = {
    low: { w: "25%", color: "bg-emerald-500", text: "Low Risk", emoji: "" },
    medium: { w: "55%", color: "bg-amber-500", text: "Medium Risk", emoji: "" },
    high: { w: "85%", color: "bg-red-500", text: "High Risk", emoji: "" },
  };
  const c = config[level];
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px]">
        <span className="opacity-60">{label || "Risk Level"}</span>
        <span className="font-medium">{c.text}</span>
      </div>
      <div className="h-1.5 rounded-full bg-foreground/5 overflow-hidden">
        <div className={`h-full rounded-full ${c.color} transition-all duration-700 ease-out`} style={{ width: c.w }} />
      </div>
    </div>
  );
}

// ── Strategy Comparison Mini Bars ────────────────────────────────────
export function StrategyCompare({
  strategies,
}: {
  strategies: { name: string; apy: number; risk: string; active?: boolean }[];
}) {
  const maxApy = Math.max(...strategies.map((s) => s.apy), 1);
  return (
    <div className="space-y-2">
      {strategies.map((s, i) => (
        <div key={i} className={`flex items-center gap-2.5 text-[11px] rounded-lg px-3 py-2 transition-all duration-200 ${s.active ? "bg-foreground/[0.06] ring-1 ring-emerald-500/20 shadow-sm" : "bg-foreground/[0.02] hover:bg-foreground/[0.04]"}`}>
          <span className={`w-14 truncate font-semibold ${s.active ? "text-foreground" : "opacity-50"}`}>{s.name}</span>
          <div className="flex-1 h-2 rounded-full bg-foreground/[0.04] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${s.active ? "bg-emerald-500" : "bg-foreground/10"}`}
              style={{ width: `${Math.max((s.apy / maxApy) * 100, s.apy > 0 ? 4 : 0)}%` }}
            />
          </div>
          <span className={`font-mono w-14 text-right font-medium ${s.active ? "text-emerald-500" : "opacity-40"}`}>{s.apy.toFixed(1)}%</span>
          <span className="opacity-30 w-10 text-right text-[9px]">{s.risk}</span>
        </div>
      ))}
    </div>
  );
}

// ── Animated Pulse Dot ───────────────────────────────────────────────
export function PulseDot({ color = "bg-emerald-500" }: { color?: string }) {
  return (
    <span className="relative inline-flex h-1.5 w-1.5">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-30`} />
      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${color}`} />
    </span>
  );
}
