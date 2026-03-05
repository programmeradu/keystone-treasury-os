"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useKeystoneAuth } from "@/hooks/useKeystoneAuth";
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
    RefreshCw,
    Lock,
    Terminal
} from "lucide-react";

import { Logo, LogoFilled, Sparkles } from "@/components/icons";
import { motion, AnimatePresence } from "framer-motion";

const LOGO_DEV_TOKEN = "pk_DFEjHHL4QteaMOzcFuSlwg";

const BRAND_COLORS: Record<string, { bg: string, ring: string, glow: string }> = {
    'phantom.app': { bg: 'bg-transparent', ring: 'border-transparent', glow: 'group-hover:shadow-[0_0_20px_rgba(90,50,250,0.3)] group-hover:bg-[#5A32FA]/10' },
    'solflare.com': { bg: 'bg-transparent', ring: 'border-transparent', glow: 'group-hover:shadow-[0_0_20px_rgba(252,122,0,0.3)] group-hover:bg-[#FC7A00]/10' },
    'walletconnect.com': { bg: 'bg-transparent', ring: 'border-transparent', glow: 'group-hover:shadow-[0_0_20px_rgba(51,150,255,0.3)] group-hover:bg-[#3396FF]/10' },
};

const DEFAULT_BRAND_COLOR = { bg: 'bg-transparent', ring: 'border-transparent', glow: 'group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:bg-white/5' };


// ─── Telemetry Context ──────────────────────────────────────────────
const TelemetryContext = React.createContext<{
    lines: string[];
    addLog: (msg: string) => void;
}>({ lines: [], addLog: () => { } });

const useTelemetry = () => React.useContext(TelemetryContext);

function TelemetryProvider({ children }: { children: React.ReactNode }) {
    const [lines, setLines] = useState<string[]>([
        "> INIT.KEYSTONE_OS_V2",
        "> SYNCHRONIZING_NODES...",
        "> ESTABLISHING_SECURE_UPLINK..."
    ]);

    useEffect(() => {
        const commands = [
            "> VERIFYING_ZERO_TRUST_HANDSHAKE...",
            "> HANDSHAKE_ACCEPTED",
            "> LATENCY: 12ms",
            "> DECRYPTING_LOCAL_STATE...",
            "> CONNECTING_TO_SOLANA_MAINNET_BETA...",
            "> CONNECTION_SECURED_VIA_RPC",
            "> READY_FOR_AUTHENTICATION..."
        ];

        let i = 0;
        const interval = setInterval(() => {
            if (i < commands.length) {
                setLines(prev => {
                    const next = [...prev, commands[i]];
                    return next.length > 8 ? next.slice(next.length - 8) : next;
                });
                i++;
            } else {
                clearInterval(interval);
            }
        }, 800);
        return () => clearInterval(interval);
    }, []);

    const addLog = useCallback((msg: string) => {
        setLines(prev => {
            const next = [...prev, `> ${msg}`];
            return next.length > 8 ? next.slice(next.length - 8) : next;
        });
    }, []);

    return (
        <TelemetryContext.Provider value={{ lines, addLog }}>
            {children}
        </TelemetryContext.Provider>
    );
}

// ─── Supabase client for OAuth ───────────────────────────────────────
function getSupabaseBrowserClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xyzcompany.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'public-anon-key'
    );
}

// ─── Logo Image Loaders ─────────────────────────────────────────────
function WalletLogo({ domain, name }: { domain: string; name: string }) {
    const src = `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&format=png&size=120&fallback=monogram&theme=dark`;
    const brand = BRAND_COLORS[domain] || DEFAULT_BRAND_COLOR;
    return (
        <div className={`w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center p-0.5 border transition-all duration-500 shrink-0 ${brand.bg} ${brand.ring} ${brand.glow}`}>
            <img src={src} alt={`${name} logo`} className="w-full h-full object-contain drop-shadow-md rounded-[10px]" />
        </div>
    );
}

function SocialLogo({ domain, name }: { domain: string; name: string }) {
    const src = `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&format=png&size=120&fallback=monogram&theme=dark`;
    return (
        <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center p-0.5 border shadow-inner transition-all duration-500 shrink-0 bg-transparent border-transparent group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:bg-white/5">
            <img src={src} alt={`${name} logo`} className="w-full h-full object-contain drop-shadow-md rounded-[10px]" />
        </div>
    );
}

function WalletButton({
    name,
    domain,
    onClick,
    recommended,
}: {
    name: string;
    domain: string;
    onClick: () => void;
    recommended?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={`
        group relative w-full flex items-center gap-3 p-3 rounded-[18px] border transition-all duration-500 overflow-hidden
        hover:-translate-y-0.5 active:scale-[0.98]
        ${recommended
                    ? "bg-gradient-to-r from-[#36e27b]/10 to-transparent border-[#36e27b]/40 hover:from-[#36e27b]/20 hover:to-[#36e27b]/5 hover:border-[#36e27b]/70 shadow-[0_0_20px_rgba(54,226,123,0.05)] hover:shadow-[0_8px_30px_-10px_rgba(54,226,123,0.3)]"
                    : "bg-[#0a0a0f]/60 border-white/[0.08] hover:bg-white/[0.05] hover:border-white/20 hover:shadow-[0_8px_30px_-10px_rgba(255,255,255,0.08)]"
                }
      `}
        >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

            <WalletLogo domain={domain} name={name} />

            <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold text-white/90 group-hover:text-white transition-colors tracking-wide">{name}</span>
                    {recommended && (
                        <span className="text-[9px] px-2.5 py-1 rounded-full bg-[#36e27b]/20 border border-[#36e27b]/40 text-[#36e27b] font-extrabold tracking-widest uppercase shadow-[0_0_10px_rgba(54,226,123,0.2)]">
                            Recommended
                        </span>
                    )}
                </div>
            </div>
            <ArrowRight className={`w-5 h-5 transition-all duration-300 ${recommended ? 'text-[#36e27b] group-hover:translate-x-1' : 'text-white/20 group-hover:text-white/60 group-hover:translate-x-1'}`} />
        </button>
    );
}

function SocialButton({ name, domain, onClick, loading }: { name: string, domain: string, onClick: () => void, loading: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className="group w-full flex items-center justify-center gap-3 p-3 rounded-[16px] bg-[#0a0a0f]/60 border border-white/[0.08] hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
            {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-white/50" />
            ) : (
                <>
                    <SocialLogo domain={domain} name={name} />
                    <span className="text-[14px] font-bold text-white/70 group-hover:text-white transition-colors tracking-wide">{name}</span>
                </>
            )}
        </button>
    );
}

function ProgressIndicator({ step }: { step: number }) {
    return (
        <div className="flex items-center justify-center gap-2 mb-5">
            <div className={`h-1.5 rounded-full transition-all duration-700 ${step >= 0 ? "w-8 bg-[#36e27b] shadow-[0_0_10px_rgba(54,226,123,0.5)]" : "w-3 bg-white/10"}`} />
            <div className={`h-1.5 rounded-full transition-all duration-700 ${step >= 1 ? "w-8 bg-[#36e27b] shadow-[0_0_10px_rgba(54,226,123,0.5)]" : "w-3 bg-white/10"}`} />
            <div className={`h-1.5 rounded-full transition-all duration-700 ${step >= 2 ? "w-8 bg-[#36e27b] shadow-[0_0_10px_rgba(54,226,123,0.5)]" : "w-3 bg-white/10"}`} />
        </div>
    );
}

function TerminalFeed() {
    const { lines } = useTelemetry();

    return (
        <div className="absolute bottom-12 left-12 z-20 hidden lg:flex flex-col w-[450px] rounded-[24px] bg-[#030305]/40 backdrop-blur-xl border border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none z-0"></div>

            {/* Content Segment */}
            <div className="p-6 font-mono text-[11px] text-[#36e27b] tracking-widest relative z-10 h-[220px] flex flex-col justify-end">
                <div className="overflow-hidden flex flex-col justify-end gap-2.5 text-[#36e27b] drop-shadow-[0_0_2px_rgba(54,226,123,0.2)]">
                    {lines.map((line, idx) => (
                        <div key={idx} className={`animate-in fade-in slide-in-from-bottom-2 duration-300 font-bold ${idx === lines.length - 1 ? 'opacity-100' : 'opacity-[0.65]'}`}>
                            {line}
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/5 relative z-10 bg-[#0a0a0f]/20 flex items-center gap-2">
                <span className="text-[#36e27b]/50 font-bold text-[10px] tracking-widest uppercase">System Telemetry Live</span>
                <span className="w-2.5 h-3.5 bg-[#36e27b]/80 animate-pulse"></span>
            </div>
        </div>
    );
}

function AuthCommandBar({ onExecute }: { onExecute: (cmd: string) => void }) {
    const [open, setOpen] = useState(false);
    const [cmd, setCmd] = useState("");

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setOpen(prev => !prev);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-4 w-full flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-[16px] bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_30px_-10px_rgba(0,0,0,0.5)] hover:border-[#36e27b]/30 hover:shadow-[0_0_20px_rgba(54,226,123,0.05)] transition-all group"
            >
                <Sparkles size={16} className="text-[#36e27b]" />
                <span className="text-[14px] font-medium text-white/40 group-hover:text-white/70 transition-colors flex-1 text-left tracking-wide">
                    Ask Keystone...
                </span>
                <div className="flex items-center gap-1 opacity-50 text-[10px] font-mono text-white/30 border-l border-white/[0.08] pl-3">
                    <span>⌘</span> K
                </div>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        key="overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans"
                    >
                        <div className="absolute inset-0" onClick={() => setOpen(false)} />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            className="relative w-full max-w-2xl bg-[#0a0a0c] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
                        >
                            <div className="absolute inset-0 z-0 pointer-events-none rounded-2xl ring-1 ring-[#36e27b]/20" />
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#36e27b] to-[#25a85c] rounded-2xl blur opacity-20" />
                            <div className="relative z-10 flex flex-col">
                                <div className="flex items-center px-6 py-5 border-b border-white/[0.06]">
                                    <Sparkles size={20} className="text-[#36e27b] mr-4" />
                                    <input
                                        autoFocus
                                        value={cmd}
                                        onChange={(e) => setCmd(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && cmd.trim()) {
                                                e.preventDefault();
                                                onExecute(cmd);
                                                setOpen(false);
                                                setCmd("");
                                            }
                                        }}
                                        placeholder="Describe your intent (e.g., 'Log in with Phantom' or 'Connect Google')..."
                                        className="flex-1 bg-transparent text-lg font-medium text-white placeholder:text-white/25 outline-none font-sans"
                                    />
                                </div>
                                <div className="px-6 py-3 bg-white/[0.02] flex items-center justify-between text-[10px] text-white/30">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#36e27b] animate-pulse" />
                                        <span className="font-mono uppercase tracking-widest">AI AGENT LISTENING</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span>Press <strong className="text-white/60">Enter</strong> to execute</span>
                                        <span><strong className="text-white/60">Esc</strong> to close</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

function KeystoneBackground() {
    return (
        <>
            <style>{`
                @keyframes scan-line {
                    0% { transform: translateY(-100vh); }
                    100% { transform: translateY(100vh); }
                }
            `}</style>

            {/* Full Page Background Image - Light, Minimal, Real */}
            <div className="absolute inset-0 z-0 bg-zinc-100">
                <div
                    className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
                    style={{
                        backgroundImage: `url('/images/auth_bg_minimal_arch_4k.png')`,
                    }}
                />
                {/* 
                  Gradient overlay: 
                  - Mobile: darker to support central card
                  - Desktop: clear on left, dark gradient on right 
                */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-[#030305] lg:bg-none lg:bg-gradient-to-r lg:from-white/40 lg:via-white/10 lg:to-[#030305]" />
            </div>

            {/* Desktop Left Panel Theme - "Command Ops" Light Edition */}
            <div className="hidden lg:flex absolute inset-y-0 left-0 w-[55%] xl:w-[60%] overflow-hidden z-0 pointer-events-none">
                {/* Subtle Grid - Darkened for light bg */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.8) 1px, transparent 1px)`,
                        backgroundSize: "64px 64px",
                    }}
                />

                {/* Large Watermark */}
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none flex items-center justify-center">
                    <Logo size={800} fillColor="#000000" />
                </div>

                {/* Left Panel Branding (Top Left) */}
                <div className="absolute top-12 left-12 flex items-center gap-4 z-20">
                    <LogoFilled size={36} className="text-zinc-900 drop-shadow-md" />
                    <div>
                        <h1 className="text-[28px] font-bold text-zinc-900 tracking-tight leading-none drop-shadow-md">Keystone</h1>
                        <p className="text-[11px] text-[#059669] mt-2 uppercase tracking-[0.3em] font-bold drop-shadow-md">TreasuryOS</p>
                    </div>
                </div>

                {/* Automated Data Feed (Bottom Left) */}
                <TerminalFeed />
            </div>

            {/* Mobile / Right Panel Background Effects */}
            <div className="absolute inset-y-0 right-0 w-full lg:w-[45%] xl:w-[40%] z-0 flex items-center justify-center pointer-events-none overflow-hidden">
                {/* Deep elegant emerald glow behind auth card */}
                <div
                    className="absolute top-[30%] -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#36e27b]/[0.05] blur-[150px] mix-blend-screen pointer-events-none"
                />
            </div>

            {/* Desktop Divider Line */}
            <div className="hidden lg:block absolute inset-y-0 left-[55%] xl:left-[60%] w-px bg-gradient-to-b from-transparent via-black/10 to-transparent z-10" />
        </>
    );
}

function AuthPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { connected, publicKey, connecting, disconnect } = useWallet();
    const { setVisible: openWalletModal } = useWalletModal();
    const { user, isAuthenticated, isLoading, step, error, signIn } = useKeystoneAuth();
    const { addLog } = useTelemetry();

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
            addLog(`ERROR: OAUTH_FAILED [${err.toUpperCase()}]`);
        }
    }, [searchParams, addLog]);

    // Detect Neon Auth session after Google OAuth redirect
    // Uses window.location.search instead of useSearchParams to avoid
    // Suspense/hydration timing issues where params can be null.
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const params = new URLSearchParams(window.location.search);
        const verifier = params.get('neon_auth_session_verifier');
        if (!verifier) return;

        console.log('[Neon Auth] Session verifier detected:', verifier);
        addLog('NEON_AUTH_SESSION_DETECTED...');
        addLog('EXCHANGING_SESSION_VERIFIER...');

        let cancelled = false;

        (async () => {
            try {
                // Step 1: Exchange the verifier for session cookies by calling
                // the Better Auth session endpoint with the verifier token
                console.log('[Neon Auth] Exchanging verifier via /api/auth/session...');
                const exchangeRes = await fetch(
                    `/api/auth/session?neon_auth_session_verifier=${encodeURIComponent(verifier)}`,
                    { credentials: 'include' }
                );
                const exchangeData = await exchangeRes.json().catch(() => null);
                console.log('[Neon Auth] Exchange response:', exchangeRes.status, exchangeData);

                if (cancelled) return;

                // Step 2: Verify we now have a valid session
                const sessionRes = await fetch('/api/auth/get-session', {
                    credentials: 'include',
                });
                const sessionData = await sessionRes.json().catch(() => null);
                console.log('[Neon Auth] Session check:', sessionData);

                if (cancelled) return;

                const hasSession =
                    sessionData?.session?.userId ||
                    sessionData?.user?.id ||
                    exchangeData?.session?.userId ||
                    exchangeData?.user?.id;

                if (hasSession) {
                    addLog('AUTHENTICATION_SUCCESSFUL');
                    addLog('SYNCING_USER_PROFILE...');

                    // Sync to public.users
                    try {
                        await fetch('/api/auth/sync-user', {
                            method: 'POST',
                            credentials: 'include',
                        });
                    } catch { /* non-critical */ }

                    addLog('REDIRECTING_TO_APP...');
                    window.location.href = '/app';
                    return;
                }

                // Step 3: Fallback — try the client SDK
                console.log('[Neon Auth] Direct exchange failed, trying client SDK...');
                const { authClient } = await import('@/lib/auth/client');
                const clientSession = await authClient.getSession();
                console.log('[Neon Auth] Client SDK session:', clientSession);

                if (cancelled) return;

                if (clientSession?.data?.session || clientSession?.data?.user) {
                    addLog('AUTHENTICATION_SUCCESSFUL');
                    addLog('SYNCING_USER_PROFILE...');
                    try {
                        await fetch('/api/auth/sync-user', {
                            method: 'POST',
                            credentials: 'include',
                        });
                    } catch { /* non-critical */ }
                    addLog('REDIRECTING_TO_APP...');
                    window.location.href = '/app';
                } else {
                    console.error('[Neon Auth] All session exchange methods failed');
                    addLog('ERROR: SESSION_EXCHANGE_FAILED');
                    setOauthError('Google sign-in completed but session could not be established. Please try again.');
                    setSocialLoading(null);
                }
            } catch (err: any) {
                if (cancelled) return;
                console.error('[Neon Auth] Session exchange error:', err);
                addLog('ERROR: NEON_AUTH_EXCHANGE_FAILED');
                setOauthError('Failed to establish authentication session.');
                setSocialLoading(null);
            }
        })();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const hasLoggedConnect = React.useRef(false);
    const hasLoggedAuth = React.useRef(false);

    useEffect(() => {
        if (connected && publicKey && !hasLoggedConnect.current) {
            addLog(`WALLET_CONNECTED: ${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`);
            addLog("INITIATING_SIGNATURE_REQUEST...");
            hasLoggedConnect.current = true;
        }
        if (isAuthenticated && !hasLoggedAuth.current) {
            addLog("AUTHENTICATION_SUCCESSFUL");
            addLog("PREPARING_SESSION_DATA...");
            hasLoggedAuth.current = true;
        }
    }, [connected, publicKey, isAuthenticated, addLog]);

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
        addLog("INITIALIZING_WALLET_ADAPTER...");
        openWalletModal(true);
    }, [openWalletModal, addLog]);

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
            addLog(`INITIATING_OAUTH_FLOW: ${provider.toUpperCase()}`);

            if (provider === 'google') {
                const { authClient } = await import('@/lib/auth/client');
                await authClient.signIn.social({
                    provider: 'google',
                    callbackURL: '/app',
                });
                return;
            }

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
            addLog(`ERROR: OAUTH_FAILED [${provider.toUpperCase()}]`);
            setSocialLoading(null);
        }
    }, [addLog]);

    const { select } = useWallet();

    const handleCommand = useCallback((cmd: string) => {
        const lower = cmd.toLowerCase();
        addLog(`COMMAND_RECEIVED: "${cmd}"`);

        // Match wallets
        if (lower.includes('phantom')) select('Phantom' as any);
        else if (lower.includes('solflare')) select('Solflare' as any);
        else if (lower.includes('walletconnect')) select('WalletConnect' as any);

        // Match socials
        else if (lower.includes('google')) handleSocialLogin('google');
        else if (lower.includes('discord')) handleSocialLogin('discord');
        // If nothing matches explicitly, trigger wallet modal
        else openWalletModal(true);
    }, [select, handleSocialLogin, openWalletModal]);

    return (
        <div className="min-h-screen flex relative overflow-hidden font-sans bg-zinc-100">
            <KeystoneBackground />

            {/* Content Wrapper */}
            <div className="relative w-full h-full min-h-screen flex flex-col lg:flex-row z-10">

                {/* Empty left side placeholder for Desktop Command-Ops Panel */}
                <div className="hidden lg:block lg:w-[55%] xl:w-[60%] pointer-events-none"></div>

                {/* Right side containing Auth Card */}
                <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col justify-center items-center p-4">

                    {/* Auth Modal Card - Super Premium & Compact */}
                    <div className="relative w-full max-w-[400px]">

                        {/* Logo Header - Only visible on Mobile since Desktop has it in the Left Panel */}
                        <div className="flex flex-col items-center mb-5 relative z-20 lg:hidden">
                            <div className="w-16 h-16 rounded-[20px] bg-[#0a0a0f] border border-white/10 flex items-center justify-center shadow-2xl mb-5 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-b from-[#36e27b]/20 to-transparent opacity-50"></div>
                                <LogoFilled size={32} className="text-white relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
                                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#36e27b]/50 to-transparent"></div>
                            </div>
                            <h1 className="text-[28px] font-bold text-white tracking-tight drop-shadow-lg leading-none">Keystone</h1>
                            <p className="text-[11px] text-[#36e27b] mt-2.5 uppercase tracking-[0.3em] font-bold drop-shadow-[0_0_10px_rgba(54,226,123,0.5)]">TreasuryOS</p>
                        </div>

                        <div className="relative rounded-[32px] border border-white/[0.08] bg-[#050508]/80 backdrop-blur-[40px] shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset,0_40px_80px_-20px_rgba(0,0,0,1)] p-6 overflow-hidden w-full">
                            {/* Noise Texture Overlay */}
                            <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url('data:image/svg+xml;utf8,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E')` }}></div>

                            {/* Inner radial gradient for ambient light */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#36e27b]/5 via-transparent to-transparent pointer-events-none" />

                            {/* Subtle top glare */}
                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

                            <div className="relative z-10">
                                <ProgressIndicator step={currentStep} />

                                {/* ─── Step 0: Connect Options ──────────────────────────── */}
                                {currentStep === 0 && !showWelcome && (
                                    <div className="space-y-3.5 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                        <div className="text-center space-y-2 mb-6">
                                            <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-sm">Access Terminal</h2>
                                            <p className="text-[14px] text-white/50 font-medium tracking-wide">
                                                Authenticate connection securely
                                            </p>
                                        </div>

                                        {oauthError && (
                                            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 backdrop-blur-md">
                                                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                                <p className="text-[13px] text-red-300 leading-snug font-medium">{oauthError}</p>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <WalletButton
                                                name="Phantom"
                                                domain="phantom.app"
                                                onClick={handleConnectWallet}
                                                recommended
                                            />
                                            <WalletButton
                                                name="Solflare"
                                                domain="solflare.com"
                                                onClick={handleConnectWallet}
                                            />
                                            <WalletButton
                                                name="WalletConnect"
                                                domain="walletconnect.com"
                                                onClick={handleConnectWallet}
                                            />
                                        </div>

                                        {connecting && (
                                            <div className="flex items-center justify-center gap-2.5 text-[#36e27b]/90 text-[13px] mt-4 font-semibold py-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Establishing secure protocol...</span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-4 py-2 opacity-60">
                                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent" />
                                            <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Or Continue With</span>
                                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <SocialButton name="Google" domain="google.com" onClick={() => handleSocialLogin('google')} loading={socialLoading === 'google'} />
                                            <SocialButton name="Discord" domain="discord.com" onClick={() => handleSocialLogin('discord')} loading={socialLoading === 'discord'} />
                                        </div>

                                        <AuthCommandBar onExecute={handleCommand} />
                                    </div>
                                )}

                                {/* ─── Step 1: Sign Message ────────────────────────────── */}
                                {currentStep === 1 && !showWelcome && (
                                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-700">
                                        <div className="text-center space-y-2 mb-4">
                                            <h1 className="text-xl font-bold text-white tracking-tight">Verify Identity</h1>
                                            <p className="text-[13px] text-white/40 tracking-wide font-medium">
                                                Sign message to authenticate
                                            </p>
                                        </div>

                                        <div className="p-4 rounded-[16px] bg-white/[0.02] border border-white/[0.05] shadow-inner relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                                <Shield className="w-16 h-16 text-white" />
                                            </div>
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className="w-11 h-11 rounded-xl bg-[#36e27b]/10 border border-[#36e27b]/20 flex items-center justify-center shadow-[0_0_15px_rgba(54,226,123,0.1)]">
                                                    <Wallet className="w-5 h-5 text-[#36e27b]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#36e27b] shadow-[0_0_5px_rgba(54,226,123,0.8)]"></div>
                                                        <p className="text-[10px] tracking-widest uppercase text-[#36e27b] font-bold">Connected</p>
                                                    </div>
                                                    <p className="text-[15px] font-mono font-medium text-white/90 truncate">
                                                        {publicKey?.toBase58().slice(0, 10)}...{publicKey?.toBase58().slice(-8)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {step === "signing" && (
                                            <div className="flex flex-col items-center justify-center gap-4 py-5">
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-[#36e27b]/20 rounded-full blur-2xl animate-pulse"></div>
                                                    <div className="w-16 h-16 rounded-[20px] bg-[#0a0a0f] border border-[#36e27b]/40 flex items-center justify-center relative z-10 shadow-[0_0_20px_rgba(54,226,123,0.2)]">
                                                        <PenLine className="w-7 h-7 text-[#36e27b] animate-pulse" />
                                                    </div>
                                                </div>
                                                <p className="text-[14px] font-medium text-emerald-400">Awaiting signature approval...</p>
                                            </div>
                                        )}

                                        {step === "verifying" && (
                                            <div className="flex flex-col items-center justify-center gap-4 py-5">
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-[#36e27b]/10 rounded-full blur-2xl animate-pulse"></div>
                                                    <Loader2 className="w-10 h-10 text-[#36e27b] animate-spin relative z-10" />
                                                </div>
                                                <p className="text-[14px] font-medium text-emerald-400">Verifying signature cryptographically...</p>
                                            </div>
                                        )}

                                        {step === "error" && error && (
                                            <div className="relative overflow-hidden p-5 rounded-[16px] bg-red-950/30 border border-red-500/30 space-y-4">
                                                <div className="absolute inset-0 bg-red-500/5 mix-blend-overlay"></div>
                                                <div className="flex items-start gap-3 relative z-10">
                                                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                                    <p className="text-[13px] text-red-200 font-medium leading-relaxed">{error}</p>
                                                </div>
                                                <button
                                                    onClick={handleRetry}
                                                    className="w-full relative z-10 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 hover:bg-red-500/20 transition-colors text-[13px] font-bold shadow-sm"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                    Try Again
                                                </button>
                                            </div>
                                        )}

                                        {(step === "idle" || step === "connecting") && (
                                            <button
                                                onClick={() => signIn()}
                                                className="w-full relative group overflow-hidden rounded-[16px] bg-[#36e27b]/10 hover:bg-[#36e27b]/20 border border-[#36e27b]/30 hover:border-[#36e27b]/50 transition-all duration-500 shadow-[0_0_20px_rgba(54,226,123,0.05)] hover:shadow-[0_0_30px_rgba(54,226,123,0.15)]"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#36e27b]/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                                <div className="relative flex items-center justify-center gap-3 px-5 py-4 text-emerald-400 group-hover:text-[#36e27b] font-bold text-[15px] tracking-wide">
                                                    <Lock className="w-5 h-5" />
                                                    <span>Sign & Enter OS</span>
                                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 opacity-70 transition-transform" />
                                                </div>
                                            </button>
                                        )}

                                        <div className="pt-2 text-center">
                                            <button
                                                onClick={() => { disconnect(); }}
                                                className="text-[11px] font-bold tracking-widest uppercase text-white/30 hover:text-white/60 transition-colors"
                                            >
                                                Cancel & Switch Wallet
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* ─── Step 2: Welcome / Success ───────────────────────── */}
                                {showWelcome && (
                                    <div className="space-y-6 animate-in zoom-in-95 duration-700 text-center py-5">
                                        <div className="flex justify-center">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-[#36e27b]/20 rounded-full blur-[30px] animate-pulse"></div>
                                                <div className="relative w-24 h-24 rounded-[24px] bg-[#0a0a0f] border border-[#36e27b]/40 flex items-center justify-center backdrop-blur-xl shadow-[0_0_40px_rgba(54,226,123,0.2)]">
                                                    <CheckCircle2 className="w-12 h-12 text-[#36e27b]" />
                                                </div>
                                                <div className="absolute -top-3 -right-3">
                                                    <Sparkles className="w-6 h-6 text-white animate-pulse" style={{ animationDuration: '2s' }} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-lg">
                                                Access Granted
                                            </h1>
                                            <p className="text-[14px] text-white/50 font-medium tracking-wide">
                                                Identity verified. Preparing session...
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-center gap-2.5 text-[#36e27b] text-[13px] font-bold tracking-widest uppercase bg-[#36e27b]/10 py-3 px-6 rounded-xl border border-[#36e27b]/20 inline-flex mx-auto backdrop-blur-sm shadow-[0_0_15px_rgba(54,226,123,0.1)]">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Entering Protocol
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer elements */}
                        <div className="mt-8 flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest font-semibold text-zinc-500 relative z-10 transition-colors hover:text-zinc-600 cursor-default drop-shadow-sm">
                            <Shield className="w-3.5 h-3.5" />
                            <span>Zero Trust Security Architecture</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AuthPage() {
    return (
        <TelemetryProvider>
            <Suspense fallback={
                <div className="min-h-screen bg-[#030305] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-16 h-16 rounded-[20px] bg-[#0a0a0f] border border-white/10 flex items-center justify-center shadow-2xl relative overflow-hidden">
                            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                            <LogoFilled size={32} className="text-white animate-pulse" />
                        </div>
                        <p className="text-white/30 text-[11px] font-bold tracking-[0.2em] uppercase">Initializing Handshake...</p>
                    </div>
                </div>
            }>
                <AuthPageContent />
            </Suspense>
        </TelemetryProvider>
    );
}
