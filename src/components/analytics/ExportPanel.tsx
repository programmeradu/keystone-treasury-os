"use client";

import React, { useState, useCallback } from "react";
import { useVault } from "@/lib/contexts/VaultContext";
import { Download, FileText, Table, FileSpreadsheet, Loader2 } from "lucide-react";

type ExportFormat = "csv-transactions" | "csv-portfolio" | "csv-flows" | "pdf-report";

export const ExportPanel = () => {
    const { activeVault, vaultTokens, vaultValue, stakeAccounts } = useVault();
    const [exportingId, setExportingId] = useState<ExportFormat | null>(null);

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const exportCSVTransactions = useCallback(async () => {
        if (!activeVault) return;
        setExportingId("csv-transactions");
        try {
            const res = await fetch(`/api/analytics/flows?address=${activeVault}&months=12&granularity=daily`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            const txs = data.transactions || [];

            const header = "Date,Type,Category,Token,Amount,USD Value,Fee (SOL),Counterparty,Signature";
            const rows = txs.map((tx: any) =>
                [
                    new Date(tx.timestamp * 1000).toISOString(),
                    tx.type,
                    tx.category,
                    tx.token,
                    tx.tokenAmount,
                    tx.amountUsd,
                    tx.fee,
                    tx.counterparty || "",
                    tx.signature,
                ].join(",")
            );

            const csv = [header, ...rows].join("\n");
            downloadBlob(new Blob([csv], { type: "text/csv" }), `dreyv-transactions-${activeVault.substring(0, 8)}.csv`);
        } catch (e) {
            console.error("Export failed:", e);
        }
        setExportingId(null);
    }, [activeVault]);

    const exportCSVPortfolio = useCallback(async () => {
        if (!activeVault) return;
        setExportingId("csv-portfolio");
        try {
            const totalVal = vaultTokens.reduce((s, t) => s + (t.value || 0), 0);
            const header = "Token,Amount,Price (USD),Value (USD),Allocation %";
            const rows = vaultTokens
                .filter(t => (t.value || 0) > 0)
                .map(t =>
                    [
                        t.symbol || "SPL",
                        t.amount || 0,
                        (t.price || 0).toFixed(4),
                        (t.value || 0).toFixed(2),
                        totalVal > 0 ? (((t.value || 0) / totalVal) * 100).toFixed(2) : "0",
                    ].join(",")
                );

            const csv = [header, ...rows].join("\n");
            downloadBlob(new Blob([csv], { type: "text/csv" }), `dreyv-portfolio-${activeVault.substring(0, 8)}.csv`);
        } catch (e) {
            console.error("Export failed:", e);
        }
        setExportingId(null);
    }, [activeVault, vaultTokens]);

    const exportCSVFlows = useCallback(async () => {
        if (!activeVault) return;
        setExportingId("csv-flows");
        try {
            const res = await fetch(`/api/analytics/flows?address=${activeVault}&months=12&granularity=monthly`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            const flows = data.flows || [];

            const header = "Period,Inflow (USD),Outflow (USD),Swap Volume (USD),Staking (USD),Net Flow (USD),Tx Count";
            const rows = flows.map((f: any) =>
                [f.date, f.inflow.toFixed(2), f.outflow.toFixed(2), f.swap.toFixed(2), f.staking.toFixed(2), f.net.toFixed(2), f.txCount].join(",")
            );

            const csv = [header, ...rows].join("\n");
            downloadBlob(new Blob([csv], { type: "text/csv" }), `dreyv-flows-${activeVault.substring(0, 8)}.csv`);
        } catch (e) {
            console.error("Export failed:", e);
        }
        setExportingId(null);
    }, [activeVault]);

    const exportPDFReport = useCallback(async () => {
        if (!activeVault) return;
        setExportingId("pdf-report");
        try {
            // Dynamic import to avoid SSR issues
            const { jsPDF } = await import("jspdf");
            const autoTableModule = await import("jspdf-autotable");
            const autoTable = autoTableModule.default;

            const doc = new jsPDF();
            const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

            // Title
            doc.setFontSize(20);
            doc.setFont("helvetica", "bold");
            doc.text("dreyv Treasury Report", 14, 22);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`Generated: ${now}`, 14, 30);
            doc.text(`Vault: ${activeVault}`, 14, 36);

            // Portfolio Summary
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("Portfolio Summary", 14, 50);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            const totalVal = vaultTokens.reduce((s, t) => s + (t.value || 0), 0);
            doc.text(`Total Value: $${totalVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 14, 58);
            doc.text(`Active Positions: ${vaultTokens.filter(t => (t.value || 0) > 0).length}`, 14, 64);
            doc.text(`Staked SOL Accounts: ${stakeAccounts?.length || 0}`, 14, 70);

            // Holdings Table
            const holdingsData = vaultTokens
                .filter(t => (t.value || 0) > 0)
                .sort((a, b) => (b.value || 0) - (a.value || 0))
                .map(t => [
                    t.symbol || "SPL",
                    (t.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 4 }),
                    `$${(t.price || 0).toFixed(4)}`,
                    `$${(t.value || 0).toFixed(2)}`,
                    totalVal > 0 ? `${(((t.value || 0) / totalVal) * 100).toFixed(1)}%` : "0%",
                ]);

            autoTable(doc, {
                startY: 78,
                head: [["Token", "Amount", "Price", "Value", "Allocation"]],
                body: holdingsData,
                theme: "striped",
                headStyles: { fillColor: [75, 0, 130], textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold" },
                bodyStyles: { fontSize: 8 },
                margin: { left: 14 },
            });

            // Fetch flows for additional sections
            try {
                const flowsRes = await fetch(`/api/analytics/flows?address=${activeVault}&months=6&granularity=monthly`);
                if (flowsRes.ok) {
                    const flowsData = await flowsRes.json();

                    const currentY = (doc as any).lastAutoTable?.finalY ?? 120;
                    doc.setFontSize(14);
                    doc.setFont("helvetica", "bold");
                    doc.text("Monthly Flows (6 months)", 14, currentY + 12);

                    const flowsTable = (flowsData.flows || []).map((f: any) => [
                        f.date,
                        `$${f.inflow.toFixed(0)}`,
                        `$${f.outflow.toFixed(0)}`,
                        `$${f.net.toFixed(0)}`,
                        f.txCount.toString(),
                    ]);

                    autoTable(doc, {
                        startY: currentY + 18,
                        head: [["Period", "Inflow", "Outflow", "Net Flow", "Txs"]],
                        body: flowsTable,
                        theme: "striped",
                        headStyles: { fillColor: [75, 0, 130], textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold" },
                        bodyStyles: { fontSize: 8 },
                        margin: { left: 14 },
                    });
                }
            } catch { /* skip flows section */ }

            // Footer
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(7);
                doc.setFont("helvetica", "normal");
                doc.text(`Page ${i} of ${pageCount} | dreyv Treasury OS`, 14, 290);
            }

            doc.save(`dreyv-treasury-report-${activeVault.substring(0, 8)}.pdf`);
        } catch (e) {
            console.error("PDF export failed:", e);
        }
        setExportingId(null);
    }, [activeVault, vaultTokens, stakeAccounts]);

    if (!activeVault) {
        return (
            <div className="rounded-2xl bg-card border border-border p-6 backdrop-blur-xl shadow-sm">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold block mb-4">Export & Reporting</span>
                <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Download size={24} className="text-muted-foreground/30 mb-2" />
                    <p className="text-[10px] text-muted-foreground/60">Connect vault to export data</p>
                </div>
            </div>
        );
    }

    const exportOptions: { id: ExportFormat; label: string; desc: string; icon: React.ReactNode }[] = [
        { id: "csv-transactions", label: "Transactions CSV", desc: "Full transaction history with categories", icon: <Table size={14} /> },
        { id: "csv-portfolio", label: "Portfolio CSV", desc: "Current holdings snapshot", icon: <FileSpreadsheet size={14} /> },
        { id: "csv-flows", label: "Flows CSV", desc: "Monthly inflow/outflow summary", icon: <FileSpreadsheet size={14} /> },
        { id: "pdf-report", label: "PDF Treasury Report", desc: "Formatted report with holdings & flows", icon: <FileText size={14} /> },
    ];

    const handlers: Record<ExportFormat, () => Promise<void>> = {
        "csv-transactions": exportCSVTransactions,
        "csv-portfolio": exportCSVPortfolio,
        "csv-flows": exportCSVFlows,
        "pdf-report": exportPDFReport,
    };

    return (
        <div className="rounded-2xl bg-card border border-border p-6 backdrop-blur-xl shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <Download size={14} className="text-primary" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Export & Reporting</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {exportOptions.map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => handlers[opt.id]()}
                        disabled={exportingId !== null}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border hover:border-primary/30 hover:bg-muted/40 transition-all group text-left disabled:opacity-50"
                    >
                        <div className="text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                            {exportingId === opt.id ? <Loader2 size={14} className="animate-spin" /> : opt.icon}
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold text-foreground block">{opt.label}</span>
                            <span className="text-[8px] text-muted-foreground">{opt.desc}</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
