"use client";

import React from "react";
import { Shield, TrendingUp, Flame } from "lucide-react";
import type { OnboardingData } from "@/app/app/onboarding/page";

interface StepProps {
    data: OnboardingData;
    updateData: (updates: Partial<OnboardingData>) => void;
    onNext: () => void;
    onBack: () => void;
}

const RISK_OPTIONS = [
    {
        id: "conservative" as const,
        label: "Conservative",
        desc: "Stablecoins focus, minimal risk, strict limits on agent actions.",
        icon: Shield,
        color: "text-emerald-500",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/30",
    },
    {
        id: "moderate" as const,
        label: "Moderate",
        desc: "Balanced allocation, automated DCA, standard agent authority.",
        icon: TrendingUp,
        color: "text-primary",
        bgColor: "bg-primary/10",
        borderColor: "border-primary/30",
    },
    {
        id: "aggressive" as const,
        label: "Aggressive",
        desc: "High-yield strategies, full agent autonomy, advanced tools enabled.",
        icon: Flame,
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/30",
    },
] as const;

export const RiskStep = ({ data, updateData }: StepProps) => {
    return (
        <div className="space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">Set Your Risk Profile</h2>
                <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">
                    How the AI agent should manage your treasury
                </p>
            </div>

            <div className="space-y-3 max-w-sm mx-auto">
                {RISK_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = data.riskProfile === option.id;
                    return (
                        <button
                            key={option.id}
                            onClick={() => updateData({ riskProfile: option.id })}
                            className={`w-full p-5 rounded-xl border text-left transition-all ${
                                isSelected
                                    ? `${option.borderColor} ${option.bgColor} shadow-md`
                                    : "border-border bg-card hover:border-border/80"
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-lg ${option.bgColor} flex items-center justify-center flex-shrink-0 ${option.color}`}>
                                    <Icon size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-foreground uppercase">{option.label}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{option.desc}</p>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            <p className="text-[9px] text-muted-foreground text-center">
                This can be changed anytime in Agent Settings.
            </p>
        </div>
    );
};
