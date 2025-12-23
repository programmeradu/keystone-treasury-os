"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Upload,
    FileText,
    Activity,
    Zap,
    Users,
    Coins,
    X,
    Terminal,
    Eye,
    ArrowUpRight
} from "lucide-react";
import { useBroadcastEvent, useEventListener, useOthers } from "@/liveblocks.config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function OperationsNexus() {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [simulating, setSimulating] = useState(false);
    const [simData, setSimData] = useState<{ recipients: number; total: string; fee: string } | null>(null);
    const [remoteSim, setRemoteSim] = useState<{ user: string; data: any } | null>(null);

    const broadcast = useBroadcastEvent();
    const others = useOthers();

    const othersInModule = others.filter(other => (other.presence as any)?.module === "OPERATIONS");

    useEventListener(({ event, user }) => {
        if (event.type === "SIMULATION_RESULT") {
            setRemoteSim({ user: (user as any)?.info?.name || "Team Member", data: event.payload.result });
            setTimeout(() => setRemoteSim(null), 10000);
        }
    });

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleFile = (file: File) => {
        setSelectedFile(file);
        setSimulating(true);
        // Simulate parsing
        setTimeout(() => {
            const result = {
                recipients: Math.floor(Math.random() * 500) + 50,
                total: `${(Math.random() * 100000).toFixed(2)} USDC`,
                fee: "0.42 SOL"
            };
            setSimData(result);
            setSimulating(false);

            broadcast({
                type: "SIMULATION_RESULT",
                payload: { proposalId: 0, result }
            });
        }, 1500);
    };

    return (
        <div className="flex flex-col gap-8 h-full">
            {/* Header / Collaboration Strip */}
            <div className="flex justify-between items-end mb-4">
                <div className="flex flex-col p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                    <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-1">Active Command</span>
                    <div className="flex items-center gap-2 text-emerald-500">
                        <Terminal size={14} />
                        <span className="text-xs font-mono font-bold uppercase">Awaiting_Inject_Sequence</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Team Status */}
                    <div className="flex -space-x-2">
                        {othersInModule.map(u => (
                            <Avatar key={u.connectionId} className="h-8 w-8 ring-2 ring-black">
                                <AvatarImage src={u.info?.avatar} />
                                <AvatarFallback>{u.info?.name?.[0]}</AvatarFallback>
                            </Avatar>
                        ))}
                    </div>
                    {othersInModule.length > 0 && (
                        <div className="px-3 py-1 bg-primary/10 rounded-full border border-primary/20 text-[9px] text-primary font-bold uppercase tracking-widest animate-pulse">
                            {othersInModule.length} Operators Active
                        </div>
                    )}
                </div>
            </div>

            {/* Central Dispatch Zone */}
            <div className="flex-1 flex flex-col items-center justify-center">
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative w-full max-w-2xl min-h-[500px] rounded-[3rem] border transition-all duration-500 flex flex-col items-center justify-center p-12 overflow-hidden
                        ${dragActive
                            ? "bg-zinc-900/80 border-primary shadow-[0_0_50px_rgba(54,226,123,0.1)] scale-[1.02]"
                            : "bg-black/40 border-dashed border-zinc-800 hover:bg-zinc-900/40 hover:border-zinc-700"
                        }`}
                >
                    {/* Background Grid Pattern */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

                    <AnimatePresence mode="wait">
                        {!selectedFile ? (
                            <motion.div
                                key="upload-prompt"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.1 }}
                                className="text-center z-10 flex flex-col items-center"
                            >
                                <div className="w-24 h-24 rounded-[2rem] bg-zinc-900 flex items-center justify-center mb-8 border border-zinc-800 shadow-2xl group relative cursor-pointer hover:border-primary/50 transition-colors">
                                    <div className="absolute inset-0 bg-primary/5 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <Upload className="text-zinc-500 group-hover:text-primary transition-colors" size={32} />
                                </div>

                                <h3 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">Initiate Dispatch</h3>
                                <p className="text-zinc-500 text-sm mb-10 max-w-sm leading-relaxed">
                                    Drag & Drop your distribution JSON/CSV here. <br />
                                    <span className="text-zinc-600 text-xs">Parsing engine v2.4 standing by.</span>
                                </p>

                                <label className="group relative px-8 py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] cursor-pointer hover:scale-105 transition-transform overflow-hidden">
                                    <span className="relative z-10 flex items-center gap-2">
                                        Select Source File <ArrowUpRight size={14} />
                                    </span>
                                    <div className="absolute inset-0 bg-primary translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                    <input type="file" className="hidden" onChange={(e) => e.target.files && handleFile(e.target.files[0])} />
                                </label>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="file-analysis"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="w-full h-full flex flex-col z-10"
                            >
                                {/* File Header */}
                                <div className="flex items-center justify-between mb-12 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-primary">
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold text-sm uppercase tracking-widest">{selectedFile.name}</h4>
                                            <span className="text-[10px] text-zinc-500 font-mono">{(selectedFile.size / 1024).toFixed(2)} KB // PARSED</span>
                                        </div>
                                    </div>
                                    <button onClick={() => { setSelectedFile(null); setSimData(null); }} className="hover:text-white text-zinc-500 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-4 mb-auto">
                                    {[
                                        { label: "Valid Recipients", val: simData?.recipients || "---", icon: Users },
                                        { label: "Total Volume", val: simData?.total || "---", icon: Coins },
                                        { label: "Network Fee", val: simData?.fee || "---", icon: Zap, color: "text-orange-500" }
                                    ].map((s, i) => (
                                        <div key={i} className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 flex flex-col gap-2">
                                            <s.icon size={16} className={`mb-2 ${s.color || "text-zinc-500"}`} />
                                            <span className="text-[9px] uppercase font-bold text-zinc-600 tracking-widest">{s.label}</span>
                                            <span className="text-xl font-mono font-bold text-white">{simulating ? "SYNC..." : s.val}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Execute Action */}
                                <button
                                    disabled={simulating}
                                    className="w-full py-5 bg-primary text-black font-black text-sm uppercase tracking-[0.3em] rounded-2xl hover:bg-primary/90 transition-colors shadow-[0_0_40px_rgba(54,226,123,0.2)] disabled:opacity-50 disabled:shadow-none mt-8"
                                >
                                    {simulating ? "Simulating Vector..." : "Execute Disbursement"}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
