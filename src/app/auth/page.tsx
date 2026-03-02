"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useKeystoneAuth, type AuthStep } from "@/hooks/useKeystoneAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
    Shield,
    Wallet,
    PenLine,
    CheckCircle2,
    Loader2,
    AlertCircle,
    ArrowRight,
    Sparkles,
    RefreshCw,
} from "lucide-react";

import {
    PhantomIcon,
    SolflareIcon,
    WalletConnectIcon,
    GoogleIcon,
    DiscordIcon
} from "@/components/icons";

// ─── Supabase client for OAuth ───────────────────────────────────────

function getSupabaseBrowserClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

// ─── Step Indicator ──────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
    const steps = [
        { label: "Connect", icon: Wallet },
        { label: "Sign", icon: PenLine },
        { label: "Welcome", icon: CheckCircle2 },
    ];

    return (
        <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((s, i) => {
                const Icon = s.icon;
                const isActive = i === currentStep;
                const isComplete = i < currentStep;

                return (
                    <React.Fragment key={s.label}>
                        {i > 0 && (
                            <div
                                className={`h-px w-8 transition-all duration-500 ${isComplete ? "bg-emerald-400" : "bg-white/10"
                                    }`}
                            />
                        )}
                        <div className="flex flex-col items-center gap-1.5">
                            <div
                                className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500
                  ${isActive
                                        ? "bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/30 scale-110"
                                        : isComplete
                                            ? "bg-emerald-500/20 border border-emerald-400/50"
                                            : "bg-white/5 border border-white/10"
                                    }
                `}
                            >
                                {isComplete ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                ) : (
                                    <Icon
                                        className={`w-4 h-4 ${isActive ? "text-white" : "text-white/30"
                                            }`}
                                    />
                                )}
                            </div>
                            <span
                                className={`text-[10px] font-medium tracking-wide uppercase ${isActive
                                    ? "text-white"
                                    : isComplete
                                        ? "text-emerald-400/80"
                                        : "text-white/25"
                                    }`}
                            >
                                {s.label}
                            </span>
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
}

// ─── Minimal Ambient Background ───────────────────────────────────────────────

function PremiumBackground() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none bg-[#030305]">
            {/* Grid pattern */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: "60px 60px",
                }}
            />
            {/* Animated ambient glowing orbs */}
            <div
                className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-violet-600/15 blur-[120px] mix-blend-screen"
                style={{ animation: "orbFloat 15s ease-in-out infinite" }}
            />
            <div
                className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/15 blur-[140px] mix-blend-screen"
                style={{ animation: "orbFloat 20s ease-in-out infinite reverse" }}
            />
            <div
                className="absolute top-[30%] left-[40%] w-[30%] h-[30%] rounded-full bg-emerald-500/10 blur-[100px] mix-blend-screen"
                style={{ animation: "orbPulse 10s ease-in-out infinite" }}
            />
        </div>
    );
}

// ─── Wallet Button ───────────────────────────────────────────────────

function WalletButton({
    name,
    icon,
    onClick,
    recommended,
    glowColorClass
}: {
    name: string;
    icon: React.ReactNode;
    onClick: () => void;
    recommended?: boolean;
    glowColorClass?: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`
        group w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-300
        hover:scale-[1.02] active:scale-[0.98]
        ${recommended
                    ? "bg-white/[0.03] border-violet-500/30 hover:bg-violet-500/10 hover:border-violet-400 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                    : `bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] hover:border-white/20 ${glowColorClass || ''}`
                }
      `}
        >
            <div className="w-10 h-10 rounded-[10px] bg-white/[0.05] flex items-center justify-center overflow-hidden border border-white/[0.05] group-hover:bg-white/[0.1] transition-colors relative">
                {icon}
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-white/90 group-hover:text-white transition-colors tracking-wide">{name}</span>
                    {recommended && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-bold tracking-widest uppercase">
                            Recommended
                        </span>
                    )}
                </div>
            </div>
            <ArrowRight className="w-5 h-5 text-white/10 group-hover:text-white/40 group-hover:translate-x-1 transition-all" />
        </button>
    );
}

// ─── Main Auth Page ──────────────────────────────────────────────────

function AuthPageContent() {
    // Inject keyframe animation
    useEffect(() => {
        const styleId = 'keystone-auth-keyframes';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                @keyframes orbFloat {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(4%, -4%) scale(1.05); }
                    66% { transform: translate(-2%, 2%) scale(0.95); }
                }
                @keyframes orbPulse {
                    0%, 100% { opacity: 0.5; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.1); }
                }
            `;
            document.head.appendChild(style);
        }
        return () => {
            const el = document.getElementById(styleId);
            if (el) el.remove();
        };
    }, []);

    const router = useRouter();
    const searchParams = useSearchParams();
    const { connected, publicKey, connecting, disconnect } = useWallet();
    const { setVisible: openWalletModal } = useWalletModal();
    const { user, isAuthenticated, isLoading, step, error, signIn } = useKeystoneAuth();

    const [currentStep, setCurrentStep] = useState(0);
    const [showWelcome, setShowWelcome] = useState(false);
    const [socialLoading, setSocialLoading] = useState<string | null>(null);
    const [oauthError, setOauthError] = useState<string | null>(null);

    // Check for OAuth callback errors
    useEffect(() => {
        const err = searchParams.get('error');
        if (err) {
            const messages: Record<string, string> = {
                missing_code: 'OAuth callback was missing the authorization code.',
                exchange_failed: 'Failed to exchange OAuth code for session.',
                callback_failed: 'OAuth callback encountered an error.',
            };
            setOauthError(messages[err] || 'An authentication error occurred.');
        }
    }, [searchParams]);

    // Preload nonce on mount
    const cachedNonce = useRef<string | null>(null);
    useEffect(() => {
        fetch('/api/auth/nonce')
            .then(r => r.json())
            .then(d => { cachedNonce.current = d.nonce; })
            .catch(() => { /* silently fail */ });
    }, []);

    // Map auth step to UI step
    useEffect(() => {
        if (isAuthenticated) {
            setCurrentStep(2);
            setShowWelcome(true);
            const timer = setTimeout(() => router.push("/app"), 2000);
            return () => clearTimeout(timer);
        } else if (connected && publicKey) {
            setCurrentStep(1);
        } else {
            setCurrentStep(0);
        }
    }, [connected, publicKey, isAuthenticated, router]);

    // Auto-trigger sign-in when wallet connects
    useEffect(() => {
        if (connected && publicKey && !isAuthenticated && !isLoading && step === "idle") {
            const t = setTimeout(() => signIn(), 800);
            return () => clearTimeout(t);
        }
    }, [connected, publicKey, isAuthenticated, isLoading, step, signIn]);

    // If already authenticated on mount, redirect immediately
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.push("/app");
        }
    }, [isLoading, isAuthenticated, router]);

    const handleConnectWallet = useCallback(() => {
        openWalletModal(true);
    }, [openWalletModal]);

    const handleRetry = useCallback(() => {
        setOauthError(null);
        if (connected) {
            signIn();
        } else {
            openWalletModal(true);
        }
    }, [connected, signIn, openWalletModal]);

    // Social OAuth
    const handleSocialLogin = useCallback(async (provider: 'google' | 'discord') => {
        try {
            setSocialLoading(provider);
            setOauthError(null);

            if (provider === 'google') {
                // Neon Auth for Google
                const { authClient } = await import('@/lib/auth/client');
                await authClient.signIn.social({
                    provider: 'google',
                    callbackURL: `${window.location.origin}/api/auth/callback/neon`,
                });
                return;
            }

            // Fallback to supabase for discord (if not setup in neon)
            const supabase = getSupabaseBrowserClient();
            const { error: oauthErr } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/api/auth/callback?next=/app`,
                },
            });

            if (oauthErr) throw oauthErr;
        } catch (err: any) {
            console.error(`[Social Auth] ${provider} error:`, err);
            setOauthError(err.message || `Failed to sign in with ${provider}`);
            setSocialLoading(null);
        }
    }, []);

    return (
        <div className="min-h-screen bg-[#030305] flex flex-col lg:flex-row relative overflow-hidden font-sans">
            <PremiumBackground />

            {/* ─── Left Panel: Branding & Information ────────────────────── */}
            <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative z-10 flex-col justify-between p-12 lg:p-16 border-r border-white/[0.05] bg-black/20 backdrop-blur-sm shadow-[inset_-20px_0_40px_rgba(0,0,0,0.5)]">
                {/* Logo & Brand */}
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 p-[1px] shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                        <div className="w-full h-full rounded-[15px] bg-[#030305] flex items-center justify-center">
                            <Shield className="w-7 h-7 text-white" />
                        </div>
                    </div>
                    <span className="text-3xl font-bold text-white tracking-[0.2em] uppercase">Keystone</span>
                </div>

                {/* Main Hero Copy */}
                <div className="space-y-8 max-w-lg">
                    <h2 className="text-5xl xl:text-6xl font-bold text-white tracking-tight leading-[1.1]">
                        Institutional-Grade <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">Treasury OS</span>
                    </h2>
                    <p className="text-lg text-white/50 leading-relaxed font-medium">
                        Securely manage sovereign assets, execute multi-signature transactions, and optimize yields across the decentralized ecosystem with cryptographic guarantees.
                    </p>

                    <div className="flex items-center gap-6 pt-4">
                        <div className="flex -space-x-3">
                            {[
                                <PhantomIcon key="phantom" className="w-5 h-5 text-white" />,
                                <SolflareIcon key="solflare" className="w-5 h-5 text-white" />,
                                <WalletConnectIcon key="wc" className="w-5 h-5 text-white" />,
                                <GoogleIcon key="google" className="w-5 h-5 text-white" />,
                                <DiscordIcon key="discord" className="w-5 h-5 text-white" />
                            ].map((icon, i) => (
                                <div key={i} className="w-10 h-10 rounded-full bg-[#111] border-2 border-[#030305] flex items-center justify-center p-2 z-10 relative overflow-hidden">
                                    {icon}
                                </div>
                            ))}
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-widest text-white/30">
                            Supported Integrations
                        </div>
                    </div>
                </div>

                {/* Footer Copy */}
                <div className="flex items-center gap-4 text-[11px] uppercase tracking-widest font-bold text-white/20">
                    <Shield className="w-4 h-4 text-violet-500/50" />
                    <span>Secured by mathematical truth</span>
                </div>
            </div>

            {/* ─── Right Panel: Auth Flow ────────────────────────────────── */}
            <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-12 relative z-10">
                {/* Mobile Header overlay for brand Logo */}
                <div className="lg:hidden absolute top-8 left-8 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 p-[1px]">
                        <div className="w-full h-full rounded-[11px] bg-[#030305] flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                    </div>
                    <span className="text-xl font-bold text-white tracking-widest uppercase">Keystone</span>
                </div>

                {/* Auth Modal Card */}
                <div className="relative w-full max-w-[440px]">
                    {/* Modal Glow Behind */}
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-cyan-400/10 blur-3xl rounded-[32px] opacity-60 mix-blend-screen"></div>

                    <div className="relative rounded-[24px] border border-white/[0.08] bg-[#0a0a0f]/80 backdrop-blur-3xl shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] p-8 sm:p-10">

                        <StepIndicator currentStep={currentStep} />

                        {/* ─── Step 0: Connect Options ──────────────────────────── */}
                        {currentStep === 0 && !showWelcome && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="text-center space-y-2 mb-8">
                                    <h1 className="text-2xl font-bold text-white tracking-tight">Authentic Access</h1>
                                    <p className="text-[13px] text-white/40 tracking-wider uppercase font-semibold">
                                        Secure your entrance to the OS
                                    </p>
                                </div>

                                {oauthError && (
                                    <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 backdrop-blur-sm">
                                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-300 leading-snug font-medium">{oauthError}</p>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <WalletButton
                                        name="Phantom"
                                        icon={<PhantomIcon className="w-6 h-6" />}
                                        onClick={handleConnectWallet}
                                        recommended
                                    />
                                    <WalletButton
                                        name="Solflare"
                                        icon={<SolflareIcon className="w-6 h-6" />}
                                        onClick={handleConnectWallet}
                                        glowColorClass="hover:shadow-[0_0_20px_rgba(232,98,33,0.15)]"
                                    />
                                    <WalletButton
                                        name="WalletConnect"
                                        icon={<WalletConnectIcon className="w-6 h-6" />}
                                        onClick={handleConnectWallet}
                                        glowColorClass="hover:shadow-[0_0_20px_rgba(59,153,252,0.15)]"
                                    />
                                </div>

                                {connecting && (
                                    <div className="flex items-center justify-center gap-2.5 text-violet-300/80 text-sm mt-4 font-medium backdrop-blur-sm py-2 rounded-lg bg-white/[0.02]">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Establishing secure connection...</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-4 py-2">
                                    <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />
                                    <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Or Continue With</span>
                                    <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleSocialLogin('google')}
                                        disabled={!!socialLoading}
                                        className="group relative flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl
                                            bg-white/[0.02] border border-white/[0.08] overflow-hidden
                                            hover:bg-white/[0.05] hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]
                                            transition-all duration-300 active:scale-[0.98]
                                            disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        {socialLoading === 'google' ? (
                                            <Loader2 className="w-5 h-5 animate-spin text-white/50" />
                                        ) : (
                                            <>
                                                <GoogleIcon className="w-[22px] h-[22px] shrink-0" />
                                                <span className="text-[14px] font-semibold text-white/70 group-hover:text-white transition-colors">Google</span>
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => handleSocialLogin('discord')}
                                        disabled={!!socialLoading}
                                        className="group relative flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl
                                            bg-white/[0.02] border border-white/[0.08] overflow-hidden
                                            hover:bg-[#5865F2]/10 hover:border-[#5865F2]/40 hover:shadow-[0_0_20px_rgba(88,101,242,0.15)]
                                            transition-all duration-300 active:scale-[0.98]
                                            disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        {socialLoading === 'discord' ? (
                                            <Loader2 className="w-5 h-5 animate-spin text-[#5865F2]/50" />
                                        ) : (
                                            <>
                                                <DiscordIcon className="w-6 h-6 shrink-0" />
                                                <span className="text-[14px] font-semibold text-white/70 group-hover:text-white transition-colors">Discord</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                <p className="text-center text-[10px] text-white/20 mt-6 leading-relaxed font-medium">
                                    Securely powered by Supabase & Neon.<br />
                                    No private keys are ever shared with KeyStone.
                                </p>
                            </div>
                        )}

                        {/* ─── Step 1: Sign Message ────────────────────────────── */}
                        {currentStep === 1 && !showWelcome && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="text-center space-y-2">
                                    <h1 className="text-2xl font-bold text-white tracking-tight">Verify Identity</h1>
                                    <p className="text-[13px] text-white/40 tracking-wider uppercase font-semibold">
                                        Sign message to authenticate
                                    </p>
                                </div>

                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] shadow-inner backdrop-blur-md">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-400/20 border border-white/5 flex items-center justify-center">
                                            <Wallet className="w-5 h-5 text-violet-300" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] tracking-widest uppercase text-white/30 font-bold mb-1">Connected Address</p>
                                            <p className="text-[15px] font-mono font-medium text-white/90 truncate">
                                                {publicKey?.toBase58().slice(0, 10)}...{publicKey?.toBase58().slice(-8)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {step === "signing" && (
                                    <div className="flex flex-col items-center gap-4 py-6">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-xl animate-pulse"></div>
                                            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-400/30 flex items-center justify-center relative z-10 backdrop-blur-md">
                                                <PenLine className="w-7 h-7 text-violet-400 animate-pulse" />
                                            </div>
                                        </div>
                                        <p className="text-sm font-medium text-white/60">Awaiting signature approval in wallet...</p>
                                    </div>
                                )}

                                {step === "verifying" && (
                                    <div className="flex flex-col items-center gap-4 py-6">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl animate-pulse"></div>
                                            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin relative z-10" />
                                        </div>
                                        <p className="text-sm font-medium text-white/60">Verifying cryptographic signature...</p>
                                    </div>
                                )}

                                {step === "error" && error && (
                                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 space-y-4 backdrop-blur-md">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                            <p className="text-sm text-red-300 font-medium leading-relaxed">{error}</p>
                                        </div>
                                        <button
                                            onClick={handleRetry}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors text-sm font-bold shadow-lg"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            Try Again
                                        </button>
                                    </div>
                                )}

                                {(step === "idle" || step === "connecting") && (
                                    <button
                                        onClick={() => signIn()}
                                        className="w-full relative group overflow-hidden rounded-xl"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-cyan-500 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBoNDBWMEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDQwaDQwVjBIMHoiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmurlCthKSIvPjwvc3ZnPg==')] mix-blend-overlay transition-opacity duration-500"></div>

                                        <div className="relative flex items-center justify-center gap-3 px-4 py-4 text-white font-bold text-[15px] tracking-wide">
                                            <PenLine className="w-5 h-5" />
                                            <span>Sign & Enter OS</span>
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </button>
                                )}

                                <div className="pt-2">
                                    <button
                                        onClick={() => { disconnect(); }}
                                        className="w-full text-center text-[11px] font-bold tracking-widest uppercase text-white/20 hover:text-white/50 transition-colors"
                                    >
                                        Cancel & Switch Wallet
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ─── Step 2: Welcome / Success ───────────────────────── */}
                        {showWelcome && (
                            <div className="space-y-8 animate-in zoom-in-95 duration-700 text-center py-4">
                                <div className="flex justify-center">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-2xl animate-pulse"></div>
                                        <div className="relative w-24 h-24 rounded-[24px] bg-gradient-to-br from-emerald-500/20 to-cyan-400/20 border border-emerald-400/30 flex items-center justify-center backdrop-blur-xl shadow-[0_0_40px_rgba(52,211,153,0.3)]">
                                            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                                        </div>
                                        <div className="absolute -top-2 -right-2">
                                            <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" style={{ animationDuration: '2s' }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg">
                                        Access Granted
                                    </h1>
                                    <p className="text-[14px] text-white/50 font-medium">
                                        Identity verified. Initializing system...
                                    </p>
                                </div>

                                <div className="flex items-center justify-center gap-3 text-cyan-400 text-[13px] font-bold tracking-widest uppercase bg-cyan-950/30 py-3 px-6 rounded-xl border border-cyan-900/50 inline-flex mx-auto backdrop-blur-sm">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Entering Dashboard
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer links */}
                    <div className="mt-8 flex items-center justify-center gap-6 text-[11px] uppercase tracking-widest font-bold text-white/10">
                        <a href="/docs" className="hover:text-white/30 transition-colors">Documentation</a>
                        <span className="w-1 h-1 rounded-full bg-white/10"></span>
                        <a href="https://solana.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/30 transition-colors">Built on Solana</a>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AuthPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#030305] flex items-center justify-center">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-violet-600/30 blur-xl rounded-full animate-pulse"></div>
                        <div className="relative w-16 h-16 rounded-[16px] bg-[#030305] border border-white/10 flex items-center justify-center p-[1px]">
                            <div className="w-full h-full rounded-[15px] bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
                                <Shield className="w-8 h-8 text-white" />
                            </div>
                        </div>
                    </div>
                    <p className="text-white/40 text-[11px] font-bold tracking-[0.2em] uppercase">Initializing Auth Area...</p>
                </div>
            </div>
        }>
            <AuthPageContent />
        </Suspense>
    );
}
