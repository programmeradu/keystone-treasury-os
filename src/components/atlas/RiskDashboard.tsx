"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Shield, AlertCircle, CheckCircle } from "lucide-react";

interface RiskSignal {
  id: string;
  source: "rug_detector" | "mev_scanner" | "governance" | "holder_analysis" | "price_impact";
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  timestamp: number;
  token?: string;
}

interface RiskDashboardProps {
  walletAddress?: string;
  className?: string;
}

export function RiskDashboard({ walletAddress, className = "" }: RiskDashboardProps) {
  const [riskSignals, setRiskSignals] = useState<RiskSignal[]>([]);
  const [loading] = useState(false);
  const [overallRisk, setOverallRisk] = useState<"safe" | "low" | "medium" | "high" | "critical">("safe");

  // Aggregate risk signals from various sources
  useEffect(() => {
    // This would integrate with existing security tools
    // For now, show a demo aggregation
    const demoSignals: RiskSignal[] = [
      {
        id: "demo-1",
        source: "holder_analysis",
        severity: "info",
        title: "Healthy Token Distribution",
        description: "Top 10 holders control <40% of total supply",
        timestamp: Date.now() - 120000
      },
      {
        id: "demo-2",
        source: "price_impact",
        severity: "medium",
        title: "Moderate Liquidity",
        description: "Large swaps may experience 1-3% slippage",
        timestamp: Date.now() - 60000
      }
    ];

    setRiskSignals(demoSignals);
    calculateOverallRisk(demoSignals);
  }, [walletAddress]);

  const calculateOverallRisk = (signals: RiskSignal[]) => {
    const criticalCount = signals.filter(s => s.severity === "critical").length;
    const highCount = signals.filter(s => s.severity === "high").length;
    const mediumCount = signals.filter(s => s.severity === "medium").length;

    if (criticalCount > 0) {
      setOverallRisk("critical");
    } else if (highCount > 1) {
      setOverallRisk("high");
    } else if (highCount === 1 || mediumCount > 2) {
      setOverallRisk("medium");
    } else if (mediumCount > 0) {
      setOverallRisk("low");
    } else {
      setOverallRisk("safe");
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "text-red-600 dark:text-red-500 border-red-500/30 bg-red-500/10";
      case "high": return "text-orange-600 dark:text-orange-500 border-orange-500/30 bg-orange-500/10";
      case "medium": return "text-yellow-600 dark:text-yellow-500 border-yellow-500/30 bg-yellow-500/10";
      case "low": return "text-blue-600 dark:text-blue-500 border-blue-500/30 bg-blue-500/10";
      case "info": return "text-green-600 dark:text-green-500 border-green-500/30 bg-green-500/10";
      default: return "text-gray-600 dark:text-gray-500 border-gray-500/30 bg-gray-500/10";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
      case "high":
        return <AlertTriangle className="h-4 w-4" />;
      case "medium":
        return <AlertCircle className="h-4 w-4" />;
      case "low":
        return <Shield className="h-4 w-4" />;
      case "info":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getOverallRiskDisplay = () => {
    switch (overallRisk) {
      case "critical":
        return { color: "bg-red-500", text: "Critical Risk", icon: <AlertTriangle className="h-5 w-5" /> };
      case "high":
        return { color: "bg-orange-500", text: "High Risk", icon: <AlertTriangle className="h-5 w-5" /> };
      case "medium":
        return { color: "bg-yellow-500", text: "Medium Risk", icon: <AlertCircle className="h-5 w-5" /> };
      case "low":
        return { color: "bg-blue-500", text: "Low Risk", icon: <Shield className="h-5 w-5" /> };
      case "safe":
        return { color: "bg-green-500", text: "Safe", icon: <CheckCircle className="h-5 w-5" /> };
    }
  };

  const riskDisplay = getOverallRiskDisplay();

  return (
    <Card id="risk-dashboard" className={`atlas-card relative overflow-hidden h-full flex flex-col border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 transition-colors hover:border-foreground/20 hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)] min-h-[360px] ${className}`}>
      <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[radial-gradient(closest-side,var(--color-accent)/35%,transparent_70%)]" />
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm leading-none flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Risk Dashboard</span>
          </CardTitle>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${getSeverityColor(overallRisk)}`}>
            {riskDisplay.icon}
            <span className="text-xs font-medium">{riskDisplay.text}</span>
          </div>
        </div>
        <div className="text-xs opacity-70 mt-2">
          Aggregated security signals from Rug Detector, MEV Scanner, and analytics tools
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3 overflow-y-auto">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : riskSignals.length === 0 ? (
          <Alert>
            <AlertDescription className="text-xs">
              No active risk signals. Connect wallet and scan tokens to populate risk data.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            {riskSignals.map((signal) => (
              <div
                key={signal.id}
                className={`rounded-md border p-3 text-xs ${getSeverityColor(signal.severity)}`}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    {getSeverityIcon(signal.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium">{signal.title}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {signal.source.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="opacity-90">{signal.description}</div>
                    {signal.token && (
                      <div className="mt-1 font-mono text-[10px] opacity-70">
                        Token: {signal.token}
                      </div>
                    )}
                    <div className="mt-1 text-[10px] opacity-60">
                      {new Date(signal.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-3 border-t border-border/50">
          <div className="text-xs font-medium mb-2">Risk Categories</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span>Contract Security</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-500" />
              <span>MEV Exposure</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span>Liquidity Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span>Governance</span>
            </div>
          </div>
        </div>

        <Alert className="mt-3">
          <AlertDescription className="text-[10px]">
            💡 Risk scores are aggregated from multiple sources. Always conduct your own research before interacting with new tokens or protocols.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
