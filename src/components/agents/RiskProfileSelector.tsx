"use client";

import React, { useState } from "react";
import { Shield, Zap, TrendingUp, CheckCircle2, Lock, Landmark, Orbit, Rocket } from "lucide-react";

type RiskProfile = "conservative" | "balanced" | "aggressive";

const PROFILES = {
    conservative: {
        id: "conservative",
        name: "Sentinel",
        icon: Landmark,
        description: "Maximum security. Requires approval for almost everything.",
        threshold: 100,
        color: "text-blue-400",
        bg: "bg-blue-400/10",
        border: "border-blue-400/20"
    },
    balanced: {
        id: "balanced",
        name: "Vanguard",
        icon: Orbit,
        description: "Balanced autonomy. Auto-signs routine transactions.",
        threshold: 500,
        color: "text-[#36e27b]",
        bg: "bg-[#36e27b]/10",
        border: "border-[#36e27b]/20"
    },
    aggressive: {
        id: "aggressive",
        name: "Maverick",
        icon: Rocket,
        description: "High velocity. Auto-executes trading strategies.",
        threshold: 2000,
        color: "text-orange-400",
        bg: "bg-orange-400/10",
        border: "border-orange-400/20"
    }
};

export const RiskProfileSelector = () => {
    const [selectedProfile, setSelectedProfile] = useState<RiskProfile>("balanced");
    const [customThreshold, setCustomThreshold] = useState(PROFILES[selectedProfile].threshold);

    const handleProfileChange = (profile: RiskProfile) => {
        setSelectedProfile(profile);
        setCustomThreshold(PROFILES[profile].threshold);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(Object.keys(PROFILES) as RiskProfile[]).map((key) => {
                    const profile = PROFILES[key];
                    const isSelected = selectedProfile === key;
                    const Icon = profile.icon;

                    return (
                        <button
                            key={key}
                            onClick={() => handleProfileChange(key)}
                            className={`relative p-4 rounded-xl border text-left transition-all duration-300 group
                                ${isSelected ? `${profile.bg} ${profile.border} ring-1 ring-inset ring-${profile.color.split('-')[1]}-400/50` : "bg-[#1F2833]/30 border-white/5 hover:bg-white/5"}
                            `}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className={`p-2 rounded-lg ${isSelected ? "bg-black/20" : "bg-white/5 group-hover:bg-white/10"}`}>
                                    <Icon className={isSelected ? profile.color : "text-[#9eb7a8]"} size={20} />
                                </div>
                                {isSelected && (
                                    <div className={`w-2 h-2 rounded-full ${profile.color.replace('text', 'bg')} animate-pulse`} />
                                )}
                            </div>
                            <h3 className={`font-bold mb-1 ${isSelected ? "text-white" : "text-[#9eb7a8] group-hover:text-white"}`}>
                                {profile.name}
                            </h3>
                            <p className="text-[10px] text-[#9eb7a8] leading-relaxed">
                                {profile.description}
                            </p>
                        </button>
                    );
                })}
            </div>

            {/* Threshold Settings */}
            <div className="rounded-xl bg-[#1F2833]/30 border border-white/5 p-6 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-2 mb-4">
                    <Lock className="text-[#36e27b]" size={16} />
                    <h3 className="font-bold text-white text-sm">Autonomy Settings</h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-xs text-[#9eb7a8] mb-2">
                            <span>Auto-Sign Threshold</span>
                            <span className="text-white font-mono">${customThreshold.toLocaleString()}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="5000"
                            step="100"
                            value={customThreshold}
                            onChange={(e) => setCustomThreshold(Number(e.target.value))}
                            className="w-full h-1.5 bg-black/40 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#36e27b] [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125"
                        />
                        <p className="text-[10px] text-[#9eb7a8] mt-2 italic">
                            Transactions below <strong>${customThreshold.toLocaleString()}</strong> will be signed automatically by the agent loop.
                            Larger amounts require standard multisig approval.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
