"use client";

import React, { useState } from "react";
import { Users, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { OnboardingData } from "@/app/app/onboarding/page";

interface StepProps {
    data: OnboardingData;
    updateData: (updates: Partial<OnboardingData>) => void;
    onNext: () => void;
    onBack: () => void;
}

export const TeamInviteStep = ({ data, updateData }: StepProps) => {
    const [inputValue, setInputValue] = useState("");

    const addEmail = () => {
        const value = inputValue.trim();
        if (!value) return;
        if (data.teamEmails.includes(value)) return;
        updateData({ teamEmails: [...data.teamEmails, value] });
        setInputValue("");
    };

    const removeEmail = (email: string) => {
        updateData({ teamEmails: data.teamEmails.filter((e) => e !== email) });
    };

    return (
        <div className="space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">Invite Your Team</h2>
                <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">
                    Add co-signers or team members by email or wallet address
                </p>
            </div>

            <div className="max-w-sm mx-auto space-y-4">
                {/* Input */}
                <div className="flex gap-2">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addEmail()}
                        placeholder="email@example.com or wallet address"
                        className="bg-background flex-1"
                    />
                    <button
                        onClick={addEmail}
                        disabled={!inputValue.trim()}
                        className="px-3 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-30 hover:bg-primary/90 transition-all"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                {/* Invite list */}
                {data.teamEmails.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                            {data.teamEmails.length} invite{data.teamEmails.length !== 1 ? "s" : ""} queued
                        </p>
                        {data.teamEmails.map((email) => (
                            <div
                                key={email}
                                className="flex items-center justify-between p-3 rounded-lg bg-card border border-border"
                            >
                                <div className="flex items-center gap-2">
                                    <Users size={14} className="text-muted-foreground" />
                                    <span className="text-xs text-foreground font-mono truncate max-w-[200px]">{email}</span>
                                </div>
                                <button
                                    onClick={() => removeEmail(email)}
                                    className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {data.teamEmails.length === 0 && (
                    <div className="p-6 rounded-xl bg-muted/20 border border-border text-center">
                        <Users size={24} className="text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground font-black uppercase">No invites yet</p>
                        <p className="text-[9px] text-muted-foreground mt-1">You can invite team members later from the Team page</p>
                    </div>
                )}
            </div>
        </div>
    );
};
