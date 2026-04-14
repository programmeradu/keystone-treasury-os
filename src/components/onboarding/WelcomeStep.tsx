"use client";

import React from "react";
import type { OnboardingData } from "@/app/app/onboarding/page";

interface StepProps {
    data: OnboardingData;
    updateData: (updates: Partial<OnboardingData>) => void;
    onNext: () => void;
    onBack: () => void;
}

/**
 * Custom premium icons — each is a unique inline SVG with gradient fills
 * and subtle glow, designed specifically for dreyv onboarding.
 */

const VaultShieldIcon = () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="shield-grad" x1="4" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                <stop stopColor="#36e27b" />
                <stop offset="1" stopColor="#059669" />
            </linearGradient>
            <filter id="shield-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>
        <g filter="url(#shield-glow)">
            {/* Shield body */}
            <path d="M14 3L5 7.5V13C5 19.08 8.84 24.71 14 26C19.16 24.71 23 19.08 23 13V7.5L14 3Z" stroke="url(#shield-grad)" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
            {/* Inner lock */}
            <rect x="11" y="13" width="6" height="5" rx="1" stroke="url(#shield-grad)" strokeWidth="1.2" fill="none" />
            <path d="M12.5 13V11.5C12.5 10.67 13.17 10 14 10C14.83 10 15.5 10.67 15.5 11.5V13" stroke="url(#shield-grad)" strokeWidth="1.2" strokeLinecap="round" />
            {/* Lock dot */}
            <circle cx="14" cy="15.5" r="0.8" fill="url(#shield-grad)" />
        </g>
    </svg>
);

const NeuralBrainIcon = () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="brain-grad" x1="4" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                <stop stopColor="#a78bfa" />
                <stop offset="1" stopColor="#7c3aed" />
            </linearGradient>
            <filter id="brain-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>
        <g filter="url(#brain-glow)">
            {/* Brain outline */}
            <path d="M14 4C10.5 4 8 6 7 8.5C5 9 4 11 4 13C4 15 5 17 7 18C7.5 20 9 22 11 23L14 24L17 23C19 22 20.5 20 21 18C23 17 24 15 24 13C24 11 23 9 21 8.5C20 6 17.5 4 14 4Z" stroke="url(#brain-grad)" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
            {/* Neural pathways */}
            <path d="M14 8V14M11 10L14 14L17 10" stroke="url(#brain-grad)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
            {/* Neural nodes */}
            <circle cx="14" cy="8" r="1.2" fill="url(#brain-grad)" />
            <circle cx="11" cy="10" r="1" fill="url(#brain-grad)" opacity="0.8" />
            <circle cx="17" cy="10" r="1" fill="url(#brain-grad)" opacity="0.8" />
            <circle cx="14" cy="14" r="1.3" fill="url(#brain-grad)" />
            {/* Pulse rings */}
            <circle cx="14" cy="14" r="3" stroke="url(#brain-grad)" strokeWidth="0.5" opacity="0.3">
                <animate attributeName="r" values="3;5;3" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0;0.3" dur="2.5s" repeatCount="indefinite" />
            </circle>
        </g>
    </svg>
);

const TeamConstellationIcon = () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="team-grad" x1="4" y1="4" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                <stop stopColor="#38bdf8" />
                <stop offset="1" stopColor="#0284c7" />
            </linearGradient>
            <filter id="team-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>
        <g filter="url(#team-glow)">
            {/* Connection lines */}
            <line x1="14" y1="7" x2="7" y2="16" stroke="url(#team-grad)" strokeWidth="0.8" opacity="0.4" />
            <line x1="14" y1="7" x2="21" y2="16" stroke="url(#team-grad)" strokeWidth="0.8" opacity="0.4" />
            <line x1="7" y1="16" x2="21" y2="16" stroke="url(#team-grad)" strokeWidth="0.8" opacity="0.4" />
            <line x1="14" y1="7" x2="14" y2="22" stroke="url(#team-grad)" strokeWidth="0.8" opacity="0.4" />
            <line x1="7" y1="16" x2="14" y2="22" stroke="url(#team-grad)" strokeWidth="0.8" opacity="0.4" />
            <line x1="21" y1="16" x2="14" y2="22" stroke="url(#team-grad)" strokeWidth="0.8" opacity="0.4" />
            {/* Person nodes as hexagonal dots */}
            <circle cx="14" cy="7" r="2.5" fill="url(#team-grad)" opacity="0.9" />
            <circle cx="7" cy="16" r="2.2" fill="url(#team-grad)" opacity="0.7" />
            <circle cx="21" cy="16" r="2.2" fill="url(#team-grad)" opacity="0.7" />
            <circle cx="14" cy="22" r="2" fill="url(#team-grad)" opacity="0.6" />
            {/* Person silhouettes inside nodes */}
            <path d="M14 6.2C14.5 6.2 14.8 6.5 14.8 7C14.8 7.3 14.6 7.5 14.3 7.6V7.8H13.7V7.6C13.4 7.5 13.2 7.3 13.2 7C13.2 6.5 13.5 6.2 14 6.2Z" fill="white" opacity="0.9" />
            {/* Animated pulse on primary node */}
            <circle cx="14" cy="7" r="2.5" stroke="url(#team-grad)" strokeWidth="0.6" opacity="0">
                <animate attributeName="r" values="2.5;5;2.5" dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" />
            </circle>
        </g>
    </svg>
);

export const WelcomeStep = ({ onNext }: StepProps) => {
    const features = [
        {
            icon: <VaultShieldIcon />,
            title: "Sovereign Vaults",
            desc: "Multi-sig hardware security",
            borderColor: "hover:border-emerald-500/40",
            bgGlow: "group-hover:shadow-[0_0_24px_rgba(54,226,123,0.08)]",
        },
        {
            icon: <NeuralBrainIcon />,
            title: "AI Architect",
            desc: "Autonomous agent ops",
            borderColor: "hover:border-violet-500/40",
            bgGlow: "group-hover:shadow-[0_0_24px_rgba(167,139,250,0.08)]",
        },
        {
            icon: <TeamConstellationIcon />,
            title: "Team Mesh",
            desc: "Real-time multi-party",
            borderColor: "hover:border-sky-500/40",
            bgGlow: "group-hover:shadow-[0_0_24px_rgba(56,189,248,0.08)]",
        },
    ];

    return (
        <div className="text-center space-y-10">
            <div className="space-y-4">
                <h1 className="text-3xl sm:text-4xl font-black text-foreground uppercase tracking-tight">
                    Welcome to dreyv
                </h1>
                <p className="text-sm text-muted-foreground font-black uppercase tracking-widest max-w-md mx-auto leading-relaxed">
                    Your sovereign treasury operating system. Let&apos;s get you set up in 5 quick steps.
                </p>
            </div>

            <div className="grid grid-cols-3 gap-5 max-w-xl mx-auto">
                {features.map((f) => (
                    <div
                        key={f.title}
                        className={`group p-5 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/60 text-center space-y-3 transition-all duration-300 cursor-default ${f.borderColor} ${f.bgGlow}`}
                    >
                        <div className="w-14 h-14 rounded-xl bg-background/80 border border-border/40 flex items-center justify-center mx-auto transition-transform duration-300 group-hover:scale-110">
                            {f.icon}
                        </div>
                        <p className="text-[10px] font-black text-foreground uppercase tracking-[0.15em]">{f.title}</p>
                        <p className="text-[9px] text-muted-foreground/70 leading-relaxed">{f.desc}</p>
                    </div>
                ))}
            </div>

            <button
                onClick={onNext}
                className="px-10 py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-[0_0_20px_var(--dashboard-accent-muted)] hover:shadow-[0_0_40px_var(--dashboard-accent-muted)] hover:scale-[1.02] active:scale-[0.98]"
            >
                Get Started →
            </button>
        </div>
    );
};
