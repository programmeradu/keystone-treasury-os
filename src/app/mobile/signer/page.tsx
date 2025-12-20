"use client";

import React, { useState } from "react";
import { Check, X, Fingerprint, ChevronRight, Bell, ShieldCheck } from "lucide-react";

// Mock Pending Transactions
const PENDING_TXS = [
    {
        id: "tx-1",
        type: "Swap",
        details: "500 SOL → USDC",
        value: "$85,000",
        requestor: "Alice",
        time: "2m ago"
    },
    {
        id: "tx-2",
        type: "Payroll",
        details: "Monthly Dev Salaries",
        value: "$120,000",
        requestor: "Auto-Pay",
        time: "15m ago"
    }
];

export default function MobileSignerPage() {
    const [activeTx, setActiveTx] = useState(0);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleApprove = () => {
        setIsAuthenticating(true);
        // Simulate FaceID/Biometric delay
        setTimeout(() => {
            setIsAuthenticating(false);
            setIsSuccess(true);
            setTimeout(() => {
                // Reset or move to next
                setIsSuccess(false);
                if (activeTx < PENDING_TXS.length - 1) setActiveTx(prev => prev + 1);
            }, 2000);
        }, 1500);
    };

    const currentTx = PENDING_TXS[activeTx];

    if (!currentTx) {
        return (
            <div className="min-h-screen bg-[#0B0C10] flex flex-col items-center justify-center p-6 text-center">
                <ShieldCheck className="text-[#36e27b] mb-4" size={64} />
                <h2 className="text-2xl font-bold text-white mb-2">All Caught Up</h2>
                <p className="text-[#9eb7a8]">No pending transactions to sign.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0B0C10] flex flex-col relative overflow-hidden">
            {/* Header */}
            <div className="px-6 py-6 flex justify-between items-center z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#36e27b]/20 flex items-center justify-center border border-[#36e27b]/20">
                        <div className="w-4 h-4 rounded-full bg-[#36e27b]" />
                    </div>
                    <span className="font-bold text-white tracking-tight">Keystone</span>
                </div>
                <div className="relative">
                    <Bell className="text-[#9eb7a8]" size={20} />
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#0B0C10]" />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col px-6 pt-4 pb-10 z-10">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-white mb-1">Pending Approval</h1>
                    <p className="text-[#9eb7a8]">{activeTx + 1} of {PENDING_TXS.length} transactions</p>
                </div>

                {/* Transaction Card */}
                <div className="bg-[#1F2833]/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-auto relative overflow-hidden shadow-2xl">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <span className="text-xs text-[#9eb7a8] uppercase tracking-widest font-semibold block mb-1">Operation</span>
                            <h3 className="text-xl font-bold text-white">{currentTx.type}</h3>
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-[#9eb7a8] uppercase tracking-widest font-semibold block mb-1">Value</span>
                            <h3 className="text-xl font-bold text-white">{currentTx.value}</h3>
                        </div>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div className="bg-black/20 rounded-xl p-4">
                            <span className="text-xs text-[#9eb7a8] block mb-1">Details</span>
                            <p className="text-white font-medium">{currentTx.details}</p>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[#9eb7a8]">Requestor</span>
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500" />
                                <span className="text-white">{currentTx.requestor}</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-[#9eb7a8]">Time</span>
                            <span className="text-white">{currentTx.time}</span>
                        </div>
                    </div>

                    {/* Simulation Badge */}
                    <div className="absolute top-0 right-0 p-3">
                        <div className="bg-[#36e27b]/10 text-[#36e27b] text-[10px] font-bold px-2 py-1 rounded border border-[#36e27b]/20">
                            SIMULATED
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col gap-4">
                    {/* Approve Button */}
                    <button
                        onClick={handleApprove}
                        disabled={isAuthenticating}
                        className={`w-full h-16 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 relative overflow-hidden
                            ${isSuccess ? "bg-[#36e27b] text-black" : "bg-white text-black active:scale-95"}
                        `}
                    >
                        {isAuthenticating ? (
                            <Fingerprint className="animate-pulse" size={24} />
                        ) : isSuccess ? (
                            <Check size={28} />
                        ) : (
                            <>
                                <Fingerprint size={24} />
                                <span className="font-bold text-lg">Tap to Approve</span>
                            </>
                        )}

                        {/* Success Ripple */}
                        {isSuccess && (
                            <div className="absolute inset-0 bg-[#36e27b] animate-ping opacity-20" />
                        )}
                    </button>

                    <button className="w-full py-4 rounded-2xl text-[#9eb7a8] font-medium text-sm hover:text-white transition-colors">
                        Reject Transaction
                    </button>
                </div>
            </div>

            {/* Background Gradients */}
            <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_50%_0%,rgba(54,226,123,0.15),transparent_70%)] pointer-events-none" />
        </div>
    );
}
