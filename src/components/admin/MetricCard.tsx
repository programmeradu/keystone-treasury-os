import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
    title: string;
    value: string | number;
    trend?: {
        value: number;
        prefix?: string;
        suffix?: string;
        inverted?: boolean; // If true, down is good (green), up is bad (red)
        subtext?: string;
    };
    icon?: React.ReactNode;
    colorClass?: string;
    formatter?: (val: any) => string;
}

export function MetricCard({ title, value, trend, icon, colorClass = "text-primary", formatter }: MetricCardProps) {
    const displayValue = formatter ? formatter(value) : value.toLocaleString();
    
    // Determine trend styling
    let trendColor = "text-muted-foreground";
    let TrendIcon = Minus;
    if (trend) {
        if (trend.value > 0) {
            trendColor = trend.inverted ? "text-destructive" : "text-primary";
            TrendIcon = TrendingUp;
        } else if (trend.value < 0) {
            trendColor = trend.inverted ? "text-primary" : "text-destructive";
            TrendIcon = TrendingDown;
        }
    }

    return (
        <div className="bg-muted/30 border border-border rounded-xl p-4 flex flex-col justify-between overflow-hidden relative shadow-sm">
            <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground truncate pr-2">
                    {title}
                </span>
                {icon && <div className={`${colorClass} opacity-80`}>{icon}</div>}
            </div>
            
            <div className="relative z-10">
                <div className={`text-2xl sm:text-3xl font-black tracking-tight ${colorClass} truncate`}>
                    {displayValue}
                </div>
                
                {trend ? (
                    <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`flex items-center gap-0.5 text-[10px] font-bold ${trendColor}`}>
                            <TrendIcon size={12} strokeWidth={3} />
                            {trend.prefix}{Math.abs(trend.value)}{trend.suffix}
                        </span>
                        {trend.subtext && (
                            <span className="text-[9px] font-semibold text-muted-foreground uppercase opacity-70">
                                {trend.subtext}
                            </span>
                        )}
                    </div>
                ) : (
                    <div className="h-4 mt-1.5" /> // Spacer to align heights
                )}
            </div>
            
            {/* Subtle background glow based on colorClass (optional, pure CSS) */}
            <div className={`absolute -bottom-8 -right-8 w-24 h-24 ${colorClass.replace("text-", "bg-")}/5 rounded-full blur-2xl z-0 pointer-events-none`} />
        </div>
    );
}
