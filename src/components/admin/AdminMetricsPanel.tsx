import React from "react";

interface AdminMetricsPanelProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    status?: "healthy" | "warning" | "critical";
    className?: string;
    action?: React.ReactNode;
}

export function AdminMetricsPanel({ 
    title, 
    icon, 
    children, 
    status = "healthy", 
    className = "",
    action
}: AdminMetricsPanelProps) {
    // Status color mapping
    const statusColors = {
        healthy: "bg-primary text-primary-foreground border-primary",
        warning: "bg-orange-500 text-white border-orange-500",
        critical: "bg-destructive text-white border-destructive"
    };

    const statusPip = {
        healthy: "bg-primary shadow-[0_0_8px_var(--dashboard-accent-muted)]",
        warning: "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]",
        critical: "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]"
    };

    return (
        <div className={`bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col ${className}`}>
            <div className="px-5 py-4 border-b border-border bg-muted/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground border border-border">
                        {icon}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
                                {title}
                            </h3>
                            {status !== "healthy" && (
                                <div className={`w-2 h-2 rounded-full ${statusPip[status]} animate-pulse`} title={`Status: ${status}`} />
                            )}
                        </div>
                    </div>
                </div>
                {action && <div>{action}</div>}
            </div>
            
            <div className="p-5 flex-1 flex flex-col gap-4 bg-background">
                {children}
            </div>
        </div>
    );
}

// Sub-components for Panel layouts
export const MetricGrid = ({ children, cols = 2 }: { children: React.ReactNode, cols?: 1|2|3|4 }) => {
    const gridCols = {
        1: "grid-cols-1",
        2: "grid-cols-1 sm:grid-cols-2",
        3: "grid-cols-1 sm:grid-cols-3",
        4: "grid-cols-2 sm:grid-cols-4",
    };
    return (
        <div className={`grid ${gridCols[cols]} gap-3`}>
            {children}
        </div>
    );
};

export const BreakdownList = ({ 
    items, 
    valueFormatter = (val: any) => val.toLocaleString() 
}: { 
    items: { label: string, value: number, color?: string }[],
    valueFormatter?: (val: any) => string 
}) => {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    
    if (total === 0) {
        return <div className="text-center py-4 text-[10px] text-muted-foreground uppercase font-black">No data available</div>;
    }

    return (
        <div className="space-y-2.5">
            {items.map((item, i) => {
                const percent = Math.round((item.value / total) * 100);
                return (
                    <div key={i} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className="text-foreground">{valueFormatter(item.value)}</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                                className="h-full rounded-full transition-all duration-700" 
                                style={{ 
                                    width: `${percent}%`, 
                                    backgroundColor: item.color || "var(--dashboard-accent-muted)" 
                                }} 
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
