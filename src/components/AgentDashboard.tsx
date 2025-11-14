"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentExecutor } from "@/components/AgentExecutor";
import { ExecutionHistory } from "@/components/ExecutionHistory";
import { ExecutionDashboard } from "@/components/ExecutionDashboard";
import { ApprovalDialog, ApprovalRequestItem } from "@/components/ApprovalDialog";
import { StrategyTemplates } from "@/components/StrategyTemplates";
import { AlertCircle, BarChart3, Zap, Clock, Zap as Lightning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toastNotifications } from "@/lib/toast-notifications";

interface PendingApproval {
  id: string;
  message: string;
  estimatedFee?: number;
  riskLevel?: "low" | "medium" | "high";
}

/**
 * Integrated agent dashboard with execution monitoring and control
 */
export const AgentDashboard = () => {
  const { publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState("execute");
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    totalExecutions: 0,
    successRate: 0,
    totalGasSpent: 0,
    averageTime: 0
  });

  // Load pending approvals
  useEffect(() => {
    if (!publicKey) return;

    const loadApprovals = async () => {
      try {
        const response = await fetch(
          `/api/agentic/approvals?userPublicKey=${publicKey.toBase58()}`
        );
        if (response.ok) {
          const data = await response.json();
          setPendingApprovals(data.approvals || []);
        }
      } catch (error) {
        console.error("Failed to load approvals:", error);
      }
    };

    loadApprovals();
    const interval = setInterval(loadApprovals, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [publicKey]);

  const handleApproveClick = (approval: PendingApproval) => {
    setSelectedApproval(approval);
    setApprovalDialogOpen(true);
  };

  const handleApproveSignature = async (signature: string) => {
    if (!selectedApproval) return;

    try {
      const response = await fetch("/api/agentic/approve", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId: selectedApproval.id,
          approved: true,
          signature
        })
      });

      if (response.ok) {
        setPendingApprovals(
          pendingApprovals.filter(a => a.id !== selectedApproval.id)
        );
        setApprovalDialogOpen(false);
        setSelectedApproval(null);
      }
    } catch (error) {
      console.error("Failed to approve:", error);
    }
  };

  const handleRejectSignature = async () => {
    if (!selectedApproval) return;

    try {
      const response = await fetch("/api/agentic/approve", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId: selectedApproval.id,
          approved: false,
          rejectionReason: "User rejected"
        })
      });

      if (response.ok) {
        setPendingApprovals(
          pendingApprovals.filter(a => a.id !== selectedApproval.id)
        );
        setApprovalDialogOpen(false);
        setSelectedApproval(null);
      }
    } catch (error) {
      console.error("Failed to reject:", error);
    }
  };

  if (!publicKey) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 to-slate-800 p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 p-8">
                <AlertCircle className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-white font-semibold">Wallet Not Connected</p>
                  <p className="text-slate-400 text-sm">
                    Please connect your Solana wallet to use the agent system.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 to-slate-800 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Agent Command Center</h1>
          <p className="text-slate-400">
            Execute autonomous strategies with real-time monitoring and approval control
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={Zap}
            label="Total Executions"
            value={stats.totalExecutions.toString()}
            color="blue"
          />
          <StatCard
            icon={BarChart3}
            label="Success Rate"
            value={`${stats.successRate}%`}
            color="green"
          />
          <StatCard
            icon={Clock}
            label="Avg Duration"
            value={`${stats.averageTime}s`}
            color="purple"
          />
          <StatCard
            icon={AlertCircle}
            label="Gas Spent"
            value={`◎ ${stats.totalGasSpent}`}
            color="yellow"
          />
        </div>

        {/* Pending Approvals Alert */}
        {pendingApprovals.length > 0 && (
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-white font-semibold">
                    {pendingApprovals.length} Pending Approval{pendingApprovals.length !== 1 ? "s" : ""}
                  </p>
                  <p className="text-yellow-200 text-sm mt-1">
                    Review and approve pending transactions to continue execution.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-slate-800 border border-slate-700">
            <TabsTrigger value="templates">
              <Lightning className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="execute">Execute</TabsTrigger>
            <TabsTrigger value="dashboard">Monitor</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            {pendingApprovals.length > 0 && (
              <TabsTrigger value="approvals" className="relative">
                Approvals
                <Badge variant="destructive" className="ml-2">
                  {pendingApprovals.length}
                </Badge>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Strategy Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <StrategyTemplates
              onTemplateSelect={(template, inputs) => {
                toastNotifications.executionStarted(template.name);
                // Execute the template
                console.log("Executing template:", template.name, inputs);
                // Switch to monitor tab to watch execution
                setActiveTab("dashboard");
              }}
            />
          </TabsContent>

          {/* Execute Tab */}
          <TabsContent value="execute" className="space-y-6">
            <AgentExecutor
              walletPublicKey={publicKey}
              onSuccess={(result) => {
                toastNotifications.executionSuccess("Strategy", "Execution completed successfully");
                console.log("Execution successful:", result);
                // Trigger stats refresh
                setStats(prev => ({
                  ...prev,
                  totalExecutions: prev.totalExecutions + 1
                }));
              }}
              onError={(error) => {
                toastNotifications.executionFailed("Strategy", error);
                console.error("Execution error:", error);
              }}
            />
          </TabsContent>

          {/* Monitor Tab */}
          <TabsContent value="dashboard">
            <ExecutionDashboard
              autoRefresh={true}
              refreshInterval={2000}
              onExecutionClick={(executionId) => {
                setActiveTab("history");
              }}
            />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <ExecutionHistory limit={50} showFilters={true} compact={false} />
          </TabsContent>

          {/* Approvals Tab */}
          {pendingApprovals.length > 0 && (
            <TabsContent value="approvals" className="space-y-4">
              <div className="space-y-3">
                {pendingApprovals.map((approval) => (
                  <ApprovalRequestItem
                    key={approval.id}
                    approval={approval}
                    onApprove={async () => handleApproveClick(approval)}
                    onReject={async () => {
                      try {
                        const response = await fetch("/api/agentic/approve", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            approvalId: approval.id,
                            approved: false,
                            rejectionReason: "User rejected"
                          })
                        });

                        if (response.ok) {
                          setPendingApprovals(
                            pendingApprovals.filter(a => a.id !== approval.id)
                          );
                        }
                      } catch (error) {
                        console.error("Failed to reject:", error);
                      }
                    }}
                  />
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Approval Dialog */}
        <ApprovalDialog
          isOpen={approvalDialogOpen}
          approval={
            selectedApproval
              ? {
                  id: selectedApproval.id,
                  message: selectedApproval.message,
                  estimatedFee: selectedApproval.estimatedFee,
                  riskLevel: selectedApproval.riskLevel
                }
              : undefined
          }
          onApprove={handleApproveSignature}
          onReject={handleRejectSignature}
        />
      </div>
    </div>
  );
};

/**
 * Stat card component
 */
function StatCard({
  icon: Icon,
  label,
  value,
  color
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: "blue" | "green" | "purple" | "yellow";
}) {
  const colorMap = {
    blue: "bg-blue-500/10 border-blue-500/30 text-blue-300",
    green: "bg-green-500/10 border-green-500/30 text-green-300",
    purple: "bg-purple-500/10 border-purple-500/30 text-purple-300",
    yellow: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300"
  };

  return (
    <Card className={`border ${colorMap[color]}`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">{label}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
          </div>
          <Icon className="w-8 h-8 opacity-50" />
        </div>
      </CardContent>
    </Card>
  );
}

export default AgentDashboard;
