"use client";

import { Scan, AlertTriangle, Lock } from "lucide-react";

export function RiskRadar() {
    return (
        <div className="h-full min-h-[300px] w-full bg-[#0F1115] border border-white/5 rounded-2xl relative overflow-hidden group">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(54,226,123,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(54,226,123,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)] pointer-events-none" />

            <div className="p-6 h-full flex flex-col relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#36e27b]/10 flex items-center justify-center border border-[#36e27b]/20 text-[#36e27b] shadow-[0_0_15px_rgba(54,226,123,0.15)]">
                            <Scan size={16} />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Risk Radar</h3>
                            <p className="text-[10px] text-[#9eb7a8] uppercase tracking-widest">Sector Scan Active</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#36e27b]/10 border border-[#36e27b]/20">
                        <span className="text-[10px] font-mono font-bold text-[#36e27b] animate-pulse">Scanning...</span>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center relative perspective-[500px]">
                    {/* Radar Circle Container */}
                    <div className="relative w-48 h-48 flex items-center justify-center [transform:rotateX(20deg)]">
                        {/* Outer Grid Ring */}
                        <div className="absolute inset-0 rounded-full border border-[#36e27b]/30 shadow-[0_0_20px_rgba(54,226,123,0.1)]" />
                        <div className="absolute inset-2 rounded-full border border-dashed border-[#36e27b]/20" />
                        <div className="absolute inset-12 rounded-full border border-[#36e27b]/10" />
                        <div className="absolute inset-24 rounded-full border border-[#36e27b]/10" />

                        {/* Crosshairs */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-px bg-gradient-to-r from-transparent via-[#36e27b]/30 to-transparent" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-full w-px bg-gradient-to-b from-transparent via-[#36e27b]/30 to-transparent" />
                        </div>

                        {/* Scanner Sweep (Conic Gradient) */}
                        <div className="absolute inset-0 rounded-full overflow-hidden animate-[spin_3s_linear_infinite]">
                            <div className="w-full h-full bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,rgba(54,226,123,0.3)_360deg)] opacity-50" />
                        </div>

                        {/* Blips (Animated) */}
                        <div className="absolute top-[25%] right-[25%]">
                            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444] animate-ping absolute" />
                            <div className="w-2 h-2 rounded-full bg-red-500 relative z-10" />
                        </div>
                        <div className="absolute bottom-[30%] left-[40%]">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_10px_#eab308] opacity-80" />
                        </div>

                        {/* Labels (Floating) */}
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] text-[#36e27b] font-mono tracking-widest bg-[#0B0C10] px-1 border border-[#36e27b]/20 rounded">LIQUIDITY</div>
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-[#36e27b] font-mono tracking-widest bg-[#0B0C10] px-1 border border-[#36e27b]/20 rounded">OPSEC</div>
                        <div className="absolute top-1/2 -left-16 -translate-y-1/2 text-[9px] text-[#36e27b] font-mono tracking-widest bg-[#0B0C10] px-1 border border-[#36e27b]/20 rounded">BALANCE</div>
                        <div className="absolute top-1/2 -right-12 -translate-y-1/2 text-[9px] text-[#36e27b] font-mono tracking-widest bg-[#0B0C10] px-1 border border-[#36e27b]/20 rounded">VOLATILITY</div>
                    </div>
                </div>

                {/* Legend/Alerts (Compact) */}
                <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="flex flex-col p-2 rounded bg-white/5 border border-white/5 hover:border-red-500/50 transition-colors group/alert">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle size={10} className="text-red-500" />
                            <span className="text-[9px] text-white/70 uppercase">Concentration</span>
                        </div>
                        <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                            <div className="bg-red-500 w-[82%] h-full" />
                        </div>
                    </div>
                    <div className="flex flex-col p-2 rounded bg-white/5 border border-white/5 hover:border-[#36e27b]/50 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                            <Lock size={10} className="text-[#36e27b]" />
                            <span className="text-[9px] text-white/70 uppercase">Multisig</span>
                        </div>
                        <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className={`h-1 flex-1 rounded-full ${i <= 3 ? 'bg-[#36e27b]' : 'bg-white/10'}`} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
