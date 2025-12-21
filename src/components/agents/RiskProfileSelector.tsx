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
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        border: "border-blue-500/20"
    },
    balanced: {
        id: "balanced",
        name: "Vanguard",
        icon: Orbit,
        description: "Balanced autonomy. Auto-signs routine transactions.",
        threshold: 500,
        color: "text-primary",
        bg: "bg-primary/10",
        border: "border-primary/20"
    },
    aggressive: {
        id: "aggressive",
        name: "Maverick",
        icon: Rocket,
        description: "High velocity. Auto-executes trading strategies.",
        threshold: 2000,
        color: "text-orange-500",
        bg: "bg-orange-500/10",
        border: "border-orange-500/20"
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
                            className={`relative p-4 rounded-xl border text-left transition-all duration-300 group shadow-sm
                                ${isSelected ? `${profile.bg} ${profile.border} ring-1 ring-inset ring-primary/20` : "bg-muted/30 border-border hover:bg-primary/5"}
                            `}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className={`p-2 rounded-lg ${isSelected ? "bg-background/50" : "bg-muted group-hover:bg-muted/80"}`}>
                                    <Icon className={isSelected ? profile.color : "text-muted-foreground"} size={20} />
                                </div>
                                {isSelected && (
                                    <div className={`w-2 h-2 rounded-full ${profile.color.replace('text', 'bg')} animate-pulse shadow-[0_0_8px_var(--dashboard-accent-muted)]`} />
                                )}
                            </div>
                            <h3 className={`font-black mb-1 uppercase tracking-tight ${isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                                {profile.name}
                            </h3>
                            <p className="text-[10px] text-muted-foreground leading-relaxed font-black uppercase tracking-widest text-[8px]">
                                {profile.description}
                            </p>
                        </button>
                    );
                })}
            </div>

            {/* Threshold Settings */}
            <div className="rounded-xl bg-muted/10 border border-border p-6 animate-in fade-in slide-in-from-top-4 duration-500 shadow-inner">
                <div className="flex items-center gap-2 mb-4">
                    <Lock className="text-primary" size={16} />
                    <h3 className="font-black text-foreground text-xs uppercase tracking-widest">Autonomy Settings</h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-2 uppercase font-black tracking-widest">
                            <span>Auto-Sign Threshold</span>
                            <span className="text-foreground font-mono font-black">${customThreshold.toLocaleString()}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="5000"
                            step="100"
                            value={customThreshold}
                            onChange={(e) => setCustomThreshold(Number(e.target.value))}
                            className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_8px_var(--dashboard-accent-muted)] [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125"
                        />
                        <p className="text-[9px] text-muted-foreground mt-2 italic font-black uppercase tracking-widest">
                            Transactions below <strong className="text-foreground">${customThreshold.toLocaleString()}</strong> will be signed automatically by the agent loop.
                            Larger amounts require standard multisig approval.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
