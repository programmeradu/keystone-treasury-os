"use client";

import React, { useState } from "react";
import { User, RefreshCw, Building2, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { OnboardingData } from "@/app/app/onboarding/page";

interface StepProps {
    data: OnboardingData;
    updateData: (updates: Partial<OnboardingData>) => void;
    onNext: () => void;
    onBack: () => void;
}

export const ProfileStep = ({ data, updateData }: StepProps) => {
    const randomizeAvatar = () => {
        updateData({ avatarSeed: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` });
    };

    return (
        <div className="space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">Set Up Your Identity</h2>
                <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">
                    How your team will see you across Keystone
                </p>
            </div>

            <div className="flex flex-col items-center gap-6">
                {/* Avatar */}
                <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-muted p-1 border border-border shadow-inner">
                        <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${data.avatarSeed}`}
                            alt="Avatar"
                            className="w-full h-full rounded-full bg-background"
                        />
                    </div>
                    <button
                        onClick={randomizeAvatar}
                        className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary border-4 border-background flex items-center justify-center hover:scale-110 transition-transform"
                        title="Randomize avatar"
                    >
                        <RefreshCw size={12} className="text-primary-foreground" />
                    </button>
                </div>

                {/* Fields */}
                <div className="w-full max-w-sm space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <User size={12} /> Display Name
                        </label>
                        <Input
                            value={data.displayName}
                            onChange={(e) => updateData({ displayName: e.target.value })}
                            placeholder="Your name"
                            className="bg-background"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <Mail size={12} /> Email Address
                        </label>
                        <Input
                            type="email"
                            value={data.email || ""}
                            onChange={(e) => updateData({ email: e.target.value })}
                            placeholder="you@example.com"
                            className="bg-background"
                        />
                        <p className="text-[9px] text-muted-foreground">Optional — for team invites, alerts, and notifications</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                            <Building2 size={12} /> Organization Name
                        </label>
                        <Input
                            value={data.organizationName}
                            onChange={(e) => updateData({ organizationName: e.target.value })}
                            placeholder="Your DAO, fund, or project name"
                            className="bg-background"
                        />
                        <p className="text-[9px] text-muted-foreground">Optional — helps personalize your workspace</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
