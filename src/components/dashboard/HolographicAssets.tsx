"use client";

import { useEffect, useRef } from "react";
import { Cpu, Zap, Activity } from "lucide-react";

export function HolographicAssets() {
    return (
        <div className="h-full min-h-[300px] w-full bg-[#0F1115] border border-white/5 rounded-2xl relative overflow-hidden group">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(54,226,123,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(54,226,123,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)] pointer-events-none" />

            <div className="p-6 relative z-10 h-full flex flex-col">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#36e27b]/10 flex items-center justify-center border border-[#36e27b]/20 text-[#36e27b] shadow-[0_0_15px_rgba(54,226,123,0.15)]">
                            <Cpu size={16} />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Vault Core</h3>
                            <p className="text-[10px] text-[#9eb7a8] uppercase tracking-widest">Active State</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#36e27b]/10 border border-[#36e27b]/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#36e27b] animate-pulse shadow-[0_0_8px_#36e27b]" />
                        <span className="text-[10px] font-mono font-bold text-[#36e27b]">ONLINE</span>
                    </div>
                </div>

                {/* 3D Hologram Container */}
                <div className="flex-1 flex items-center justify-center perspective-[1000px] relative">
                    {/* Rotating Cube (Pure CSS) */}
                    <div className="relative w-32 h-32 animate-[spin_20s_linear_infinite] preserve-3d">
                        {/* Core Glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-[#36e27b] rounded-full blur-[40px] opacity-20 animate-pulse" />

                        {/* Cube Faces */}
                        <div className="absolute inset-0 border-2 border-[#36e27b]/30 bg-[#36e27b]/5 backdrop-blur-sm [transform:translateZ(64px)] rounded-lg shadow-[0_0_30px_rgba(54,226,123,0.1)] flex items-center justify-center">
                            <Zap size={32} className="text-[#36e27b] opacity-50" />
                        </div>
                        <div className="absolute inset-0 border-2 border-[#36e27b]/30 bg-[#36e27b]/5 backdrop-blur-sm [transform:rotateY(180deg)_translateZ(64px)] rounded-lg flex items-center justify-center">
                            <Activity size={32} className="text-[#36e27b] opacity-50" />
                        </div>
                        <div className="absolute inset-0 border-2 border-[#36e27b]/30 bg-[#36e27b]/5 backdrop-blur-sm [transform:rotateY(90deg)_translateZ(64px)] rounded-lg flex items-center justify-center">
                            <div className="w-12 h-1 bg-[#36e27b]/40 rounded-full" />
                        </div>
                        <div className="absolute inset-0 border-2 border-[#36e27b]/30 bg-[#36e27b]/5 backdrop-blur-sm [transform:rotateY(-90deg)_translateZ(64px)] rounded-lg flex items-center justify-center">
                            <div className="w-12 h-1 bg-[#36e27b]/40 rounded-full" />
                        </div>
                        <div className="absolute inset-0 border-2 border-[#36e27b]/30 bg-[#36e27b]/5 backdrop-blur-sm [transform:rotateX(90deg)_translateZ(64px)] rounded-lg" />
                        <div className="absolute inset-0 border-2 border-[#36e27b]/30 bg-[#36e27b]/5 backdrop-blur-sm [transform:rotateX(-90deg)_translateZ(64px)] rounded-lg" />
                    </div>

                    {/* Orbiting Elements */}
                    <div className="absolute w-48 h-48 border border-[#36e27b]/10 rounded-full animate-[spin_10s_linear_infinite_reverse] [transform:rotateX(60deg)] border-t-[#36e27b]/50" />
                    <div className="absolute w-64 h-64 border border-[#36e27b]/10 rounded-full animate-[spin_15s_linear_infinite] [transform:rotateX(60deg)] border-b-[#36e27b]/50" />
                </div>

                {/* Stats */}
                <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-white/5 border border-white/5 hover:border-[#36e27b]/30 transition-colors group/stat">
                        <div className="text-[10px] text-[#9eb7a8] uppercase tracking-wider mb-1">Compute Load</div>
                        <div className="text-xl font-bold text-white font-mono group-hover/stat:text-[#36e27b] transition-colors">42%</div>
                        <div className="h-1 w-full bg-white/10 rounded-full mt-2 overflow-hidden">
                            <div className="h-full w-[42%] bg-[#36e27b]" />
                        </div>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/5 hover:border-[#36e27b]/30 transition-colors group/stat">
                        <div className="text-[10px] text-[#9eb7a8] uppercase tracking-wider mb-1">Energy</div>
                        <div className="text-xl font-bold text-white font-mono group-hover/stat:text-[#36e27b] transition-colors">98.2%</div>
                        <div className="h-1 w-full bg-white/10 rounded-full mt-2 overflow-hidden">
                            <div className="h-full w-[98%] bg-[#36e27b]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Style injection for 3D preserve */}
            <style jsx>{`
                .preserve-3d {
                    transform-style: preserve-3d;
                }
            `}</style>
        </div>
    );
}
