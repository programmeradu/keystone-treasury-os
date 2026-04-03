"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/hooks/useProfile";
import { WelcomeStep } from "@/components/onboarding/WelcomeStep";
import { ProfileStep } from "@/components/onboarding/ProfileStep";
import { VaultStep } from "@/components/onboarding/VaultStep";
import { RiskStep } from "@/components/onboarding/RiskStep";
import { TeamInviteStep } from "@/components/onboarding/TeamInviteStep";
import { ReadyStep } from "@/components/onboarding/ReadyStep";
import { Logo } from "@/components/icons";
import { ChevronRight, ChevronLeft } from "lucide-react";

const STEPS = [
    { id: "welcome", label: "Welcome" },
    { id: "profile", label: "Profile" },
    { id: "vault", label: "Vault" },
    { id: "risk", label: "Risk" },
    { id: "team", label: "Team" },
    { id: "ready", label: "Ready" },
] as const;

export interface OnboardingData {
    displayName: string;
    avatarSeed: string;
    organizationName: string;
    riskProfile: "conservative" | "moderate" | "aggressive";
    teamEmails: string[];
}

export default function OnboardingPage() {
    const router = useRouter();
    const { profile, updateProfile, isLoading } = useProfile();
    const [currentStep, setCurrentStep] = useState(0);
    const [data, setData] = useState<OnboardingData>({
        displayName: "",
        avatarSeed: `user_${Date.now()}`,
        organizationName: "",
        riskProfile: "moderate",
        teamEmails: [],
    });
    const [completing, setCompleting] = useState(false);

    // Pre-fill with existing profile data
    useEffect(() => {
        if (profile && !isLoading) {
            setData((prev) => ({
                ...prev,
                displayName: profile.displayName || prev.displayName,
                avatarSeed: profile.avatarSeed || prev.avatarSeed,
                organizationName: profile.organizationName || prev.organizationName,
            }));
            // If already onboarded, redirect to dashboard
            if (profile.onboardingCompleted) {
                router.push("/app");
            }
        }
    }, [profile, isLoading, router]);

    const updateData = useCallback((updates: Partial<OnboardingData>) => {
        setData((prev) => ({ ...prev, ...updates }));
    }, []);

    const handleNext = useCallback(() => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep((s) => s + 1);
        }
    }, [currentStep]);

    const handleBack = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep((s) => s - 1);
        }
    }, [currentStep]);

    const handleComplete = useCallback(async () => {
        setCompleting(true);
        try {
            // Save all profile data
            await updateProfile({
                displayName: data.displayName || undefined,
                avatarSeed: data.avatarSeed || undefined,
                organizationName: data.organizationName || undefined,
                onboardingCompleted: true,
            } as any);

            // Hard-navigate to re-trigger auth which will generate a new JWT with onboarded=true
            window.location.href = "/app";
        } catch (err) {
            console.error("[Onboarding] Failed to complete:", err);
            setCompleting(false);
        }
    }, [data, updateProfile]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Logo size={48} />
                    <div className="h-1 w-32 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
                    </div>
                </div>
            </div>
        );
    }

    const stepProps = { data, updateData, onNext: handleNext, onBack: handleBack };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Top bar */}
            <div className="border-b border-border/50 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Logo size={28} />
                    <span className="text-sm font-black text-foreground uppercase tracking-widest">Keystone Setup</span>
                </div>
                <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                    Step {currentStep + 1} of {STEPS.length}
                </span>
            </div>

            {/* Progress bar */}
            <div className="border-b border-border/30">
                <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-2">
                    {STEPS.map((step, i) => (
                        <React.Fragment key={step.id}>
                            <div className="flex items-center gap-2">
                                <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300 ${
                                        i < currentStep
                                            ? "bg-primary text-primary-foreground shadow-[0_0_12px_var(--dashboard-accent-muted)]"
                                            : i === currentStep
                                            ? "bg-primary/20 text-primary border-2 border-primary"
                                            : "bg-muted text-muted-foreground border border-border"
                                    }`}
                                >
                                    {i < currentStep ? "✓" : i + 1}
                                </div>
                                <span
                                    className={`text-[10px] font-black uppercase tracking-widest hidden sm:block ${
                                        i === currentStep ? "text-foreground" : "text-muted-foreground"
                                    }`}
                                >
                                    {step.label}
                                </span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className={`flex-1 h-px transition-colors ${i < currentStep ? "bg-primary" : "bg-border"}`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Step content */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500" key={currentStep}>
                    {currentStep === 0 && <WelcomeStep {...stepProps} />}
                    {currentStep === 1 && <ProfileStep {...stepProps} />}
                    {currentStep === 2 && <VaultStep {...stepProps} />}
                    {currentStep === 3 && <RiskStep {...stepProps} />}
                    {currentStep === 4 && <TeamInviteStep {...stepProps} />}
                    {currentStep === 5 && <ReadyStep {...stepProps} onComplete={handleComplete} completing={completing} />}
                </div>
            </div>

            {/* Navigation footer */}
            <div className="border-t border-border/50 px-6 py-4">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <button
                        onClick={handleBack}
                        disabled={currentStep === 0}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={14} /> Back
                    </button>

                    {currentStep < STEPS.length - 1 ? (
                        <button
                            onClick={handleNext}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-[0_0_20px_var(--dashboard-accent-muted)] hover:shadow-[0_0_30px_var(--dashboard-accent-muted)]"
                        >
                            Continue <ChevronRight size={14} />
                        </button>
                    ) : (
                        <button
                            onClick={handleComplete}
                            disabled={completing}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-[0_0_20px_var(--dashboard-accent-muted)] disabled:opacity-50"
                        >
                            {completing ? "Launching..." : "Launch Keystone →"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
