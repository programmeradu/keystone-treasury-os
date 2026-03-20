"use client";

import { useMemo } from "react";

// ── Original sparkline (line only) ──────────────────────────────────
export function Sparkline({ data, width = 120, height = 28, className = "" }: {data: number[];width?: number;height?: number;className?: string;}) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const rng = max - min || 1;
  const stepX = width / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * stepX;
    const y = height - (v - min) / rng * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className={className} aria-hidden>
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.7" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke="url(#spark)" strokeWidth="1.6" points={pts} strokeLinecap="round" />
    </svg>);
}

// ── Option A: Area chart with gradient fill ─────────────────────────
export function SparklineArea({ data, width = 120, height = 28, className = "" }: { data: number[]; width?: number; height?: number; className?: string }) {
  const { pts, areaPath, up, uid } = useMemo(() => {
    if (!data || data.length < 2) return { pts: "", areaPath: "", up: true, uid: "" };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const rng = max - min || 1;
    const stepX = width / (data.length - 1);
    const coords = data.map((v, i) => ({
      x: +(i * stepX).toFixed(2),
      y: +(height - ((v - min) / rng) * height).toFixed(2),
    }));
    const linePts = coords.map((c) => `${c.x},${c.y}`).join(" ");
    const area = `M${coords[0].x},${height} ` + coords.map((c) => `L${c.x},${c.y}`).join(" ") + ` L${coords[coords.length - 1].x},${height} Z`;
    return { pts: linePts, areaPath: area, up: data[data.length - 1] >= data[0], uid: `area-${globalThis.crypto.randomUUID().replace(/-/g, '').substring(0, 16)}` };
  }, [data, width, height]);

  if (!data || data.length < 2) return null;
  const color = up ? "#10b981" : "#ef4444";
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className={className} aria-hidden>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${uid})`} />
      <polyline fill="none" stroke={color} strokeWidth="1.4" points={pts} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Option B: Spark bars (vertical bars per data point) ─────────────
export function SparkBars({ data, width = 120, height = 28, className = "" }: { data: number[]; width?: number; height?: number; className?: string }) {
  const bars = useMemo(() => {
    if (!data || data.length < 2) return [];
    const min = Math.min(...data);
    const max = Math.max(...data);
    const rng = max - min || 1;
    const gap = 1;
    const barW = Math.max(1, (width - gap * (data.length - 1)) / data.length);
    return data.map((v, i) => {
      const h = Math.max(1, ((v - min) / rng) * height);
      const up = i === 0 ? true : v >= data[i - 1];
      return { x: i * (barW + gap), y: height - h, w: barW, h, up };
    });
  }, [data, width, height]);

  if (!data || data.length < 2) return null;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className={className} aria-hidden preserveAspectRatio="none">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={0.5}
          fill={b.up ? "#10b981" : "#ef4444"} opacity={0.55 + (i / bars.length) * 0.4} />
      ))}
    </svg>
  );
}

// ── Option C: Heatmap cell (pure CSS, no SVG) ──────────────────────
export function SparkHeatmap({ data, className = "" }: { data: number[]; className?: string }) {
  if (!data || data.length < 2) return null;
  const first = data[0];
  const last = data[data.length - 1];
  const pct = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
  // Intensity: 0-1% = subtle, 1-5% = medium, 5%+ = strong
  const intensity = Math.min(1, Math.abs(pct) / 5);
  const up = pct >= 0;
  const bg = up
    ? `rgba(16, 185, 129, ${0.06 + intensity * 0.22})`
    : `rgba(239, 68, 68, ${0.06 + intensity * 0.22})`;
  const border = up
    ? `rgba(16, 185, 129, ${0.15 + intensity * 0.25})`
    : `rgba(239, 68, 68, ${0.15 + intensity * 0.25})`;

  // Mini bar segments to show distribution
  const segments = 12;
  const step = Math.max(1, Math.floor(data.length / segments));
  const sampled = Array.from({ length: segments }, (_, i) => data[Math.min(i * step, data.length - 1)]);
  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const rng = max - min || 1;

  return (
    <div className={`flex items-end gap-px rounded-sm px-1 py-0.5 ${className}`} style={{ background: bg, border: `1px solid ${border}` }}>
      {sampled.map((v, i) => {
        const h = 4 + ((v - min) / rng) * 12;
        return (
          <div key={i} className="flex-1 rounded-sm" style={{
            height: `${h}px`,
            background: up ? `rgba(16, 185, 129, ${0.3 + ((v - min) / rng) * 0.5})` : `rgba(239, 68, 68, ${0.3 + ((v - min) / rng) * 0.5})`,
          }} />
        );
      })}
    </div>
  );
}

// ── Option D: Mini candlesticks (OHLC from data chunks) ────────────
export function SparkCandles({ data, width = 120, height = 28, className = "" }: { data: number[]; width?: number; height?: number; className?: string }) {
  const candles = useMemo(() => {
    if (!data || data.length < 4) return [];
    // Split data into ~8-12 chunks to form candles
    const numCandles = Math.min(12, Math.floor(data.length / 2));
    const chunkSize = Math.max(2, Math.floor(data.length / numCandles));
    const result: Array<{ o: number; h: number; l: number; c: number }> = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      if (chunk.length < 1) break;
      result.push({
        o: chunk[0],
        c: chunk[chunk.length - 1],
        h: Math.max(...chunk),
        l: Math.min(...chunk),
      });
    }
    return result;
  }, [data]);

  if (candles.length < 2) return null;

  const allVals = candles.flatMap((c) => [c.h, c.l]);
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const rng = max - min || 1;
  const gap = 2;
  const candleW = Math.max(3, (width - gap * (candles.length - 1)) / candles.length);
  const wickW = 1;

  const toY = (v: number) => +(height - ((v - min) / rng) * (height - 2) - 1).toFixed(2);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className={className} aria-hidden>
      {candles.map((c, i) => {
        const x = i * (candleW + gap);
        const cx = x + candleW / 2;
        const up = c.c >= c.o;
        const bodyTop = toY(Math.max(c.o, c.c));
        const bodyBot = toY(Math.min(c.o, c.c));
        const bodyH = Math.max(1, bodyBot - bodyTop);
        const color = up ? "#10b981" : "#ef4444";
        return (
          <g key={i}>
            {/* Wick */}
            <line x1={cx} y1={toY(c.h)} x2={cx} y2={toY(c.l)} stroke={color} strokeWidth={wickW} opacity={0.5} />
            {/* Body */}
            <rect x={x} y={bodyTop} width={candleW} height={bodyH} rx={0.5} fill={up ? color : color} opacity={up ? 0.7 : 0.55} />
          </g>
        );
      })}
    </svg>
  );
}
