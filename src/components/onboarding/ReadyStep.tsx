"use client";

import React from "react";
import { CheckCircle, Rocket, Loader2 } from "lucide-react";
import type { OnboardingData } from "@/app/app/onboarding/page";

interface StepProps {
    data: OnboardingData;
    updateData: (updates: Partial<OnboardingData>) => void;
    onNext: () => void;
    onBack: () => void;
}

interface ReadyStepProps extends StepProps {
    onComplete: () => void;
    completing: boolean;
}

export const ReadyStep = ({ data, onComplete, completing }: ReadyStepProps) => {
    const summaryItems = [
        { label: "Display Name", value: data.displayName || "Not set" },
        { label: "Organization", value: data.organizationName || "Personal" },
        { label: "Risk Profile", value: data.riskProfile.charAt(0).toUpperCase() + data.riskProfile.slice(1) },
        { label: "Team Invites", value: data.teamEmails.length > 0 ? `${data.teamEmails.length} queued` : "None" },
    ];

    return (
        <div className="space-y-8">
            <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary mb-4">
                    <CheckCircle size={32} />
                </div>
                <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">You&apos;re All Set</h2>
                <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">
                    Review your setup before launching
                </p>
            </div>

            {/* Summary */}
            <div className="max-w-sm mx-auto space-y-2">
                {summaryItems.map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{item.label}</span>
                        <span className="text-xs font-black text-foreground uppercase">{item.value}</span>
                    </div>
                ))}
            </div>

            <div className="text-center">
                <button
                    onClick={onComplete}
                    disabled={completing}
                    className="px-8 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-[0_0_20px_var(--dashboard-accent-muted)] hover:shadow-[0_0_30px_var(--dashboard-accent-muted)] disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                    {completing ? (
                        <>
                            <Loader2 size={16} className="animate-spin" /> Launching...
                        </>
                    ) : (
                        <>
                            <Rocket size={16} /> Launch dreyv
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
