"use client";

import React from "react";
import { Rocket, Shield, Zap } from "lucide-react";
import type { OnboardingData } from "@/app/app/onboarding/page";

interface StepProps {
    data: OnboardingData;
    updateData: (updates: Partial<OnboardingData>) => void;
    onNext: () => void;
    onBack: () => void;
}

export const WelcomeStep = ({ onNext }: StepProps) => {
    return (
        <div className="text-center space-y-8">
            <div className="space-y-3">
                <h1 className="text-3xl font-black text-foreground uppercase tracking-tight">
                    Welcome to Keystone
                </h1>
                <p className="text-sm text-muted-foreground font-black uppercase tracking-widest max-w-md mx-auto">
                    Your sovereign treasury operating system. Let&apos;s get you set up in 5 quick steps.
                </p>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                <div className="p-4 rounded-xl bg-card border border-border shadow-sm text-center space-y-2 hover:border-primary/30 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto text-primary">
                        <Shield size={20} />
                    </div>
                    <p className="text-[10px] font-black text-foreground uppercase tracking-widest">Secure</p>
                    <p className="text-[9px] text-muted-foreground">Multi-sig vault protection</p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border shadow-sm text-center space-y-2 hover:border-primary/30 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500">
                        <Zap size={20} />
                    </div>
                    <p className="text-[10px] font-black text-foreground uppercase tracking-widest">AI-Powered</p>
                    <p className="text-[9px] text-muted-foreground">Agent-assisted ops</p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border shadow-sm text-center space-y-2 hover:border-primary/30 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center mx-auto text-violet-500">
                        <Rocket size={20} />
                    </div>
                    <p className="text-[10px] font-black text-foreground uppercase tracking-widest">Team-Ready</p>
                    <p className="text-[9px] text-muted-foreground">Real-time collaboration</p>
                </div>
            </div>

            <button
                onClick={onNext}
                className="px-8 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-[0_0_20px_var(--dashboard-accent-muted)] hover:shadow-[0_0_30px_var(--dashboard-accent-muted)]"
            >
                Get Started →
            </button>
        </div>
    );
};
