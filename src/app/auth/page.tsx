"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useKeystoneAuth } from "@/hooks/useKeystoneAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import {
    Shield,
    Wallet,
    PenLine,
    Loader2,
    AlertCircle,
    ArrowRight,
    RefreshCw,
    Lock,
} from "lucide-react";

import { Logo, Sparkles } from "@/components/icons";
import { sanitizeRedirect } from "@/lib/utils";
import { DreyvMark } from "@/components/brand/dreyv-mark";
import { DreyvLogoLight } from "@/components/brand/dreyv-logo-light";
import { motion, AnimatePresence } from "framer-motion";
import { marketingPrimaryCta } from "@/components/home/marketing-styles";

const LOGO_DEV_TOKEN = "pk_DFEjHHL4QteaMOzcFuSlwg";

const BRAND_COLORS: Record<string, { bg: string, ring: string, glow: string }> = {
    'phantom.app': { bg: 'bg-transparent', ring: 'border-transparent', glow: 'group-hover:shadow-[0_0_20px_rgba(90,50,250,0.3)] group-hover:bg-[#5A32FA]/10' },
    'solflare.com': { bg: 'bg-transparent', ring: 'border-transparent', glow: 'group-hover:shadow-[0_0_20px_rgba(252,122,0,0.3)] group-hover:bg-[#FC7A00]/10' },
    'walletconnect.com': { bg: 'bg-transparent', ring: 'border-transparent', glow: 'group-hover:shadow-[0_0_20px_rgba(51,150,255,0.3)] group-hover:bg-[#3396FF]/10' },
};

const DEFAULT_BRAND_COLOR = { bg: 'bg-transparent', ring: 'border-transparent', glow: 'group-hover:shadow-[0_0_12px_rgba(124,58,237,0.12)] group-hover:bg-violet-50/90' };


// ─── Telemetry Context ──────────────────────────────────────────────
const TelemetryContext = React.createContext<{
    lines: string[];
    addLog: (msg: string) => void;
}>({ lines: [], addLog: () => { } });

const useTelemetry = () => React.useContext(TelemetryContext);

function TelemetryProvider({ children }: { children: React.ReactNode }) {
    const [lines, setLines] = useState<string[]>([
        "> INIT.DREYV_OS_V2",
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

// Neon Auth client is imported from @/lib/auth/client

// ─── Logo Image Loaders ─────────────────────────────────────────────
function WalletLogo({ domain, name }: { domain: string; name: string }) {
    const src = `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&format=png&size=120&fallback=monogram&theme=light`;
    const brand = BRAND_COLORS[domain] || DEFAULT_BRAND_COLOR;
    return (
        <div className={`h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-violet-200/35 bg-white/90 p-0.5 transition-all duration-500 flex items-center justify-center lg:h-11 lg:w-11 ${brand.bg} ${brand.ring} ${brand.glow}`}>
            <img src={src} alt={`${name} logo`} className="w-full h-full object-contain rounded-[10px]" />
        </div>
    );
}

function SocialLogo({ domain, name }: { domain: string; name: string }) {
    const src = `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&format=png&size=120&fallback=monogram&theme=light`;
    return (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-violet-200/35 bg-white/90 p-0.5 shadow-sm transition-all duration-500 group-hover:bg-violet-50/90 group-hover:shadow-[0_0_12px_rgba(124,58,237,0.12)] lg:h-10 lg:w-10">
            <img src={src} alt={`${name} logo`} className="w-full h-full object-contain rounded-[10px]" />
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
        group relative flex w-full items-center gap-2.5 overflow-hidden rounded-[16px] border p-2.5 transition-all duration-500 lg:gap-3 lg:rounded-[18px] lg:p-3
        hover:-translate-y-0.5 active:scale-[0.98]
        ${recommended
                    ? "bg-violet-50/90 border-violet-300/55 hover:bg-violet-100/90 hover:border-violet-400/70 shadow-sm shadow-violet-500/10 hover:shadow-md hover:shadow-violet-500/15"
                    : "bg-white/95 border-violet-200/45 hover:bg-white hover:border-violet-300/60 shadow-sm hover:shadow-md hover:shadow-violet-500/10"
                }
      `}
        >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-200/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

            <WalletLogo domain={domain} name={name} />

            <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold tracking-wide text-slate-800 transition-colors group-hover:text-slate-900 lg:text-[15px]">{name}</span>
                    {recommended && (
                        <span className="rounded-full border border-violet-300/60 bg-violet-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-violet-700 lg:px-2.5 lg:py-1 lg:text-[9px] lg:tracking-widest">
                            Recommended
                        </span>
                    )}
                </div>
            </div>
            <ArrowRight className={`h-[18px] w-[18px] shrink-0 transition-all duration-300 lg:h-5 lg:w-5 ${recommended ? 'text-violet-600 group-hover:translate-x-1' : 'text-slate-400 group-hover:text-violet-600 group-hover:translate-x-1'}`} />
        </button>
    );
}

function SocialButton({ name, domain, onClick, loading }: { name: string, domain: string, onClick: () => void, loading: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className="group flex w-full items-center justify-center gap-2 rounded-[14px] border border-violet-200/45 bg-white/95 p-2.5 shadow-sm transition-all duration-300 hover:border-violet-300/55 hover:bg-violet-50/80 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 lg:gap-3 lg:rounded-[16px] lg:p-3"
        >
            {loading ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin text-violet-600 lg:h-5 lg:w-5" />
            ) : (
                <>
                    <SocialLogo domain={domain} name={name} />
                    <span className="text-[13px] font-bold tracking-wide text-slate-600 transition-colors group-hover:text-slate-900 lg:text-[14px]">{name}</span>
                </>
            )}
        </button>
    );
}

function ProgressIndicator({ step }: { step: number }) {
    return (
        <div className="mb-3 flex items-center justify-center gap-1.5 lg:mb-4 lg:gap-2">
            <div className={`h-1.5 rounded-full transition-all duration-700 ${step >= 0 ? "w-7 bg-violet-600 shadow-sm shadow-violet-500/30 lg:w-8" : "w-2.5 bg-violet-200/80 lg:w-3"}`} />
            <div className={`h-1.5 rounded-full transition-all duration-700 ${step >= 1 ? "w-7 bg-violet-600 shadow-sm shadow-violet-500/30 lg:w-8" : "w-2.5 bg-violet-200/80 lg:w-3"}`} />
            <div className={`h-1.5 rounded-full transition-all duration-700 ${step >= 2 ? "w-7 bg-violet-600 shadow-sm shadow-violet-500/30 lg:w-8" : "w-2.5 bg-violet-200/80 lg:w-3"}`} />
        </div>
    );
}

function LinuxTerminal() {
    const { lines } = useTelemetry();
    const scrollRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [lines]);

    return (
        <div className="absolute bottom-12 left-12 z-20 hidden lg:flex flex-col w-[480px] rounded-xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(124,58,237,0.2)] border border-violet-200/45 bg-white/95 backdrop-blur-xl">
            {/* Title Bar */}
            <div className="flex items-center h-9 px-3.5 bg-violet-50/90 border-b border-violet-200/40 shrink-0 select-none">
                <div className="flex items-center gap-[7px]">
                    <div className="w-[11px] h-[11px] rounded-full bg-rose-300/90 border border-rose-400/40" />
                    <div className="w-[11px] h-[11px] rounded-full bg-amber-300/90 border border-amber-400/40" />
                    <div className="w-[11px] h-[11px] rounded-full bg-violet-400/80 border border-violet-500/35" />
                </div>
                <div className="flex-1 text-center">
                    <span className="text-[11px] font-mono text-slate-400 tracking-wide">dreyv@mainnet ~ telemetry</span>
                </div>
                <div className="w-[60px]" />
            </div>

            {/* Terminal Body */}
            <div className="bg-white relative">
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
                    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(124,58,237,0.06) 2px, rgba(124,58,237,0.06) 4px)`,
                }} />

                <div ref={scrollRef} className="p-4 pb-2 font-mono text-[11.5px] leading-[1.7] h-[200px] overflow-y-auto scrollbar-none relative z-10">
                    <div className="text-slate-400 mb-3 text-[10px]">Last login: {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} on ttys001</div>
                    <AnimatePresence initial={false}>
                        {lines.map((line, idx) => (
                            <motion.div
                                key={`${idx}-${line}`}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: idx === lines.length - 1 ? 1 : 0.55, y: 0 }}
                                transition={{ duration: 0.25, ease: "easeOut" }}
                                className="text-violet-700 font-medium"
                            >
                                {line}
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-violet-500/80 text-[10px]">$</span>
                        <motion.span
                            animate={{ opacity: [1, 1, 0, 0] }}
                            transition={{ duration: 1, repeat: Infinity, times: [0, 0.49, 0.5, 1] }}
                            className="inline-block w-[7px] h-[14px] bg-violet-500/80"
                        />
                    </div>
                </div>

                <div className="px-4 py-2 bg-violet-50/80 border-t border-violet-200/40 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                        <motion.div
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="w-1.5 h-1.5 rounded-full bg-violet-500"
                        />
                        <span className="text-[10px] font-mono font-bold text-violet-600/80 tracking-widest uppercase">telemetry</span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
                        <span>solana-mainnet</span>
                        <span>{lines.length} events</span>
                    </div>
                </div>
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
                className="mt-2 flex w-full items-center gap-2.5 rounded-[14px] border border-violet-200/45 bg-white/90 py-2 pl-3 pr-2.5 shadow-sm backdrop-blur-xl transition-all group hover:border-violet-300/60 hover:shadow-md hover:shadow-violet-500/10 lg:mt-4 lg:gap-3 lg:rounded-[16px] lg:py-2.5 lg:pl-4 lg:pr-3"
            >
                <Sparkles size={16} className="shrink-0 text-violet-600" />
                <span className="flex-1 text-left text-[13px] font-medium tracking-wide text-slate-500 transition-colors group-hover:text-slate-700 lg:text-[14px]">
                    Ask dreyv...
                </span>
                <div className="flex items-center gap-0.5 border-l border-violet-200/50 pl-2.5 font-mono text-[10px] text-slate-400 opacity-70 lg:gap-1 lg:pl-3">
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
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/25 backdrop-blur-sm p-4 font-sans"
                    >
                        <div className="absolute inset-0" onClick={() => setOpen(false)} />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            className="relative w-full max-w-2xl bg-white border border-violet-200/45 rounded-2xl shadow-[0_24px_60px_-20px_rgba(124,58,237,0.25)] overflow-hidden"
                        >
                            <div className="absolute inset-0 z-0 pointer-events-none rounded-2xl ring-1 ring-violet-200/30" />
                            <div className="relative z-10 flex flex-col">
                                <div className="flex items-center px-6 py-5 border-b border-violet-200/35 bg-violet-50/40">
                                    <Sparkles size={20} className="text-violet-600 mr-4 shrink-0" />
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
                                        className="flex-1 bg-transparent text-lg font-medium text-slate-900 placeholder:text-slate-400 outline-none font-sans"
                                    />
                                </div>
                                <div className="px-6 py-3 bg-white flex items-center justify-between text-[10px] text-slate-500">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                                        <span className="font-mono uppercase tracking-widest text-violet-700/90">AI agent listening</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span>Press <strong className="text-slate-700">Enter</strong> to execute</span>
                                        <span><strong className="text-slate-700">Esc</strong> to close</span>
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

function DreyvBackground() {
    return (
        <>
            <div className="absolute inset-0 z-0 bg-marketing-bg">
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-[0.22] pointer-events-none"
                    style={{ backgroundImage: `url('/images/auth_bg_minimal_arch_4k.png')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-violet-100/35 via-transparent to-fuchsia-50/25 pointer-events-none" />
                <div className="absolute top-[-14%] left-[-12%] h-[520px] w-[520px] rounded-full bg-violet-400/[0.11] blur-[120px] pointer-events-none" />
                <div className="absolute top-[18%] right-[-10%] h-[440px] w-[440px] rounded-full bg-fuchsia-400/[0.09] blur-[110px] pointer-events-none" />
                <div className="absolute inset-0 noise-overlay opacity-[0.028] pointer-events-none" />
                <div className="absolute inset-0 grid-pattern-marketing opacity-[0.55] pointer-events-none" />
            </div>

            <div className="hidden lg:flex absolute inset-y-0 left-0 w-[55%] xl:w-[60%] overflow-hidden z-0 pointer-events-none">
                <div className="absolute inset-0 opacity-[0.06] pointer-events-none flex items-center justify-center">
                    <Logo size={720} fillColor="#5a00e4" className="opacity-90" />
                </div>

                <div className="absolute top-12 left-12 flex flex-col items-start gap-3 z-20 overflow-visible">
                    <DreyvLogoLight priority className="drop-shadow-sm" />
                    <p className="text-[11px] text-violet-600 uppercase tracking-[0.3em] font-bold">
                        TreasuryOS
                    </p>
                </div>

                <LinuxTerminal />
            </div>

            <div className="absolute inset-y-0 right-0 w-full lg:w-[45%] xl:w-[40%] z-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <div className="absolute top-[28%] -translate-y-1/2 w-[560px] h-[560px] rounded-full bg-violet-400/[0.12] blur-[140px] pointer-events-none" />
                <div className="absolute top-[42%] w-[420px] h-[420px] rounded-full bg-fuchsia-300/[0.08] blur-[100px] pointer-events-none" />
            </div>

            <div className="hidden lg:block absolute inset-y-0 left-[55%] xl:left-[60%] w-px bg-gradient-to-b from-transparent via-violet-200/50 to-transparent z-10" />
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

    // Determine where to go after auth (supports ?redirect= param from middleware)
    const postAuthRedirect = sanitizeRedirect(searchParams.get('redirect'));

    // Handle OAuth completion: exchange Neon Auth session for local JWT
    useEffect(() => {
        if (searchParams.get('oauth') !== 'complete') return;

        let cancelled = false;
        const exchangeSession = async (attempt = 1) => {
            try {
                addLog('EXCHANGING_OAUTH_SESSION...');

                // The exchange-session endpoint finds the user via
                // multiple strategies (proxy, direct DB query, body).
                // No user info needed from the client.
                const res = await fetch('/api/auth/exchange-session', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                });

                if (res.ok && !cancelled) {
                    addLog('SESSION_ESTABLISHED');
                    sessionStorage.removeItem('keystone_oauth_pending');
                    // Use window.location for a full navigation so the
                    // middleware re-runs and sees the newly set cookie.
                    window.location.href = postAuthRedirect;
                    return;
                }

                // Retry once after a short delay (handles transient cookie race)
                if (attempt < 2 && !cancelled) {
                    addLog('RETRYING_SESSION_EXCHANGE...');
                    await new Promise(r => setTimeout(r, 1500));
                    return exchangeSession(attempt + 1);
                }

                // Fallback: if exchange failed, show error
                if (!cancelled) {
                    const data = await res.json().catch(() => ({}));
                    setOauthError(data.error || 'Session exchange failed. Please try signing in again.');
                    addLog('ERROR: SESSION_EXCHANGE_FAILED');
                }
            } catch {
                if (!cancelled) {
                    setOauthError('Session exchange failed. Please try signing in again.');
                    addLog('ERROR: SESSION_EXCHANGE_FAILED');
                }
            } finally {
                setSocialLoading(null);
                sessionStorage.removeItem('keystone_oauth_pending');
            }
        };

        exchangeSession();
        return () => { cancelled = true; };
    }, [searchParams, router, addLog, postAuthRedirect]);

    // Check if user already has a local JWT session (SIWS or exchanged)
    // and redirect to /app immediately.
    useEffect(() => {
        let cancelled = false;

        const checkExistingSession = async () => {
            try {
                // Check SIWS session first (local JWT)
                const siwsRes = await fetch('/api/auth/siws');
                const siwsData = await siwsRes.json().catch(() => null);
                if (!cancelled && siwsData?.user) {
                    window.location.href = postAuthRedirect;
                    return;
                }

                // Also try Neon Auth session via proxy
                const { data, error } = await authClient.getSession();
                if (!cancelled && !error && data?.session) {
                    window.location.href = postAuthRedirect;
                }
            } catch {
                // Ignore transient session check errors on auth page load.
            }
        };

        // Don't redirect if we're in the middle of exchanging
        if (searchParams.get('oauth') !== 'complete') {
            checkExistingSession();
        }

        return () => { cancelled = true; };
    }, [router, searchParams]);



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
            const timer = setTimeout(() => { window.location.href = postAuthRedirect; }, 2000);
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
            window.location.href = postAuthRedirect;
        }
    }, [isLoading, isAuthenticated, postAuthRedirect]);

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

    // Social OAuth via Neon Auth
    const handleSocialLogin = useCallback(async (provider: 'google' | 'discord') => {
        try {
            setSocialLoading(provider);
            setOauthError(null);
            addLog(`INITIATING_OAUTH_FLOW: ${provider.toUpperCase()}`);

            // Set state cookie before OAuth (proves the flow started here)
            await fetch('/api/auth/exchange-session', { credentials: 'include' });

            // Store the provider so we know this is a pending OAuth on return
            sessionStorage.setItem('keystone_oauth_pending', provider);

            await authClient.signIn.social({
                provider,
                callbackURL: `${window.location.origin}/auth?oauth=complete`,
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[Social Auth] ${provider} error:`, msg);
            setOauthError(msg || `Failed to sign in with ${provider}`);
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
        <div className="relative h-svh max-h-svh overflow-x-hidden overflow-y-hidden font-manrope text-slate-900 lg:h-dvh lg:max-h-dvh">
            <DreyvBackground />

            {/* Single-frame layout: fixed viewport height, no page scroll; content is compact + scales down on short screens. */}
            <div className="relative z-10 flex h-full min-h-0 w-full flex-col lg:flex-row">

                {/* Empty left side placeholder for desktop intent panel */}
                <div className="pointer-events-none hidden shrink-0 lg:block lg:w-[55%] xl:w-[60%]" />

                <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-2 lg:w-[45%] xl:w-[40%] lg:justify-center lg:px-4 lg:py-4">
                    <div className="flex w-full max-w-[min(100%,340px)] flex-col items-center [@media(max-height:640px)]:origin-top [@media(max-height:640px)]:scale-[0.96] sm:max-w-[372px] lg:max-w-[400px]">
                        <h1 className="sr-only">Sign in to dreyv</h1>

                        {/* Mobile branding — full lockup */}
                        <div className="relative z-20 mb-2 flex flex-col items-center pt-0.5 lg:hidden">
                            <DreyvLogoLight variant="auth" priority className="origin-center scale-[0.92] drop-shadow-sm sm:scale-[0.97] lg:scale-100" />
                            <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.3em] text-violet-600 lg:mt-2">
                                TreasuryOS
                            </p>
                        </div>

                        <div className="relative w-full overflow-hidden rounded-[20px] border border-violet-200/45 bg-white/92 p-3.5 shadow-[0_16px_48px_-14px_rgba(124,58,237,0.15)] backdrop-blur-xl lg:rounded-[30px] lg:p-5 lg:shadow-[0_16px_48px_-14px_rgba(124,58,237,0.16)]">
                            <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
                                <Logo size={230} fillColor="#5a00e4" className="rotate-[-12deg] opacity-[0.06]" />
                            </div>

                            <div className="absolute inset-0 opacity-[0.04] mix-blend-multiply pointer-events-none" style={{ backgroundImage: `url('data:image/svg+xml;utf8,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E')` }} />

                            <div className="absolute inset-0 bg-gradient-to-br from-violet-400/[0.07] via-transparent to-fuchsia-400/[0.05] pointer-events-none" />

                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-200/50 to-transparent" />

                            <div className="relative z-10">
                                <ProgressIndicator step={currentStep} />

                                {/* ─── Step 0: Connect Options ──────────────────────────── */}
                                {currentStep === 0 && !showWelcome && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700 lg:space-y-3.5">
                                        <div className="mb-3 space-y-1 text-center lg:mb-4 lg:space-y-2">
                                            <h2 className="text-xl font-black leading-tight tracking-tight text-slate-900 lg:text-2xl">Access Terminal</h2>
                                            <p className="text-[13px] font-medium tracking-wide text-slate-500 lg:text-[14px]">
                                                Authenticate connection securely
                                            </p>
                                        </div>

                                        {oauthError && (
                                            <div className="flex items-start gap-2.5 rounded-xl border border-red-200/80 bg-red-50 p-3 lg:gap-3 lg:p-3.5">
                                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                                                <p className="text-[12px] font-medium leading-snug text-red-800 lg:text-[13px]">{oauthError}</p>
                                            </div>
                                        )}

                                        <div className="space-y-1.5 lg:space-y-2">
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
                                            <div className="mt-2 flex items-center justify-center gap-2 py-1 text-[12px] font-semibold text-violet-600 lg:mt-3 lg:py-2 lg:text-[13px]">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Establishing secure protocol...</span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3 py-1 lg:gap-4 lg:py-2">
                                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-200/60 to-transparent" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Or Continue With</span>
                                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-200/60 to-transparent" />
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
                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-700 lg:space-y-5">
                                        <div className="mb-3 space-y-1 text-center lg:mb-4 lg:space-y-2">
                                            <h1 className="text-lg font-bold tracking-tight text-slate-900 lg:text-xl">Verify Identity</h1>
                                            <p className="text-[13px] font-medium tracking-wide text-slate-500 lg:text-[13px]">
                                                Sign message to authenticate
                                            </p>
                                        </div>

                                        <div className="relative overflow-hidden rounded-xl border border-violet-200/50 bg-violet-50/60 p-3 shadow-inner lg:rounded-[16px] lg:p-4">
                                            <div className="absolute right-0 top-0 p-2 opacity-[0.12]">
                                                <Shield className="h-14 w-14 text-violet-600 lg:h-16 lg:w-16" />
                                            </div>
                                            <div className="relative z-10 flex items-center gap-3.5 lg:gap-4">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-200/80 bg-violet-100 shadow-sm lg:h-11 lg:w-11">
                                                    <Wallet className="h-[18px] w-[18px] text-violet-600 lg:h-5 lg:w-5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="mb-1 flex items-center gap-2">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-violet-500 shadow-[0_0_6px_rgba(124,58,237,0.5)]" />
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600">Connected</p>
                                                    </div>
                                                    <p className="truncate font-mono text-[14px] font-medium text-slate-800 lg:text-[15px]">
                                                        {publicKey?.toBase58().slice(0, 10)}...{publicKey?.toBase58().slice(-8)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {step === "signing" && (
                                            <div className="flex flex-col items-center justify-center gap-2 py-2 lg:gap-4 lg:py-5">
                                                <div className="relative">
                                                    <div className="absolute inset-0 animate-pulse rounded-full bg-violet-400/25 blur-2xl" />
                                                    <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-200/80 bg-white shadow-[0_12px_40px_-12px_rgba(124,58,237,0.35)] lg:h-16 lg:w-16">
                                                        <PenLine className="h-6 w-6 animate-pulse text-violet-600 lg:h-7 lg:w-7" />
                                                    </div>
                                                </div>
                                                <p className="text-center text-[12px] font-medium text-violet-700 lg:text-[14px]">Awaiting signature approval...</p>
                                            </div>
                                        )}

                                        {step === "verifying" && (
                                            <div className="flex flex-col items-center justify-center gap-2 py-2 lg:gap-4 lg:py-5">
                                                <div className="relative">
                                                    <div className="absolute inset-0 animate-pulse rounded-full bg-violet-300/20 blur-2xl" />
                                                    <Loader2 className="relative z-10 h-9 w-9 animate-spin text-violet-600 lg:h-10 lg:w-10" />
                                                </div>
                                                <p className="text-center text-[12px] font-medium text-violet-700 lg:text-[14px]">Verifying signature cryptographically...</p>
                                            </div>
                                        )}

                                        {step === "error" && error && (
                                            <div className="relative overflow-hidden p-5 rounded-[16px] bg-red-50 border border-red-200/80 space-y-4">
                                                <div className="flex items-start gap-3 relative z-10">
                                                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                                    <p className="text-[13px] text-red-900 font-medium leading-relaxed">{error}</p>
                                                </div>
                                                <button
                                                    onClick={handleRetry}
                                                    className="w-full relative z-10 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-red-200 text-red-700 hover:bg-red-50 transition-colors text-[13px] font-bold shadow-sm"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                    Try Again
                                                </button>
                                            </div>
                                        )}

                                        {(step === "idle" || step === "connecting") && (
                                            <button
                                                type="button"
                                                onClick={() => signIn()}
                                                className={`${marketingPrimaryCta} w-full justify-center gap-2.5 rounded-2xl py-3 text-[14px] font-bold tracking-wide lg:gap-3 lg:py-4 lg:text-[15px]`}
                                            >
                                                <Lock className="h-[18px] w-[18px] shrink-0 lg:h-5 lg:w-5" />
                                                <span>Sign & Enter OS</span>
                                                <ArrowRight className="h-[18px] w-[18px] shrink-0 opacity-90 transition-transform group-hover:translate-x-0.5 lg:h-5 lg:w-5" />
                                            </button>
                                        )}

                                        <div className="pt-2 text-center lg:pt-2">
                                            <button
                                                type="button"
                                                onClick={() => { disconnect(); }}
                                                className="text-[11px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-violet-600"
                                            >
                                                Cancel & Switch Wallet
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* ─── Step 2: Welcome / Success ───────────────────────── */}
                                {showWelcome && (
                                    <div className="animate-in zoom-in-95 space-y-4 py-3 text-center duration-700 lg:space-y-5 lg:py-5">
                                        <div className="flex justify-center">
                                            <div className="relative">
                                                <div className="absolute inset-0 animate-pulse rounded-full bg-violet-400/25 blur-[28px] lg:blur-[30px]" />
                                                <div className="relative flex h-[5.25rem] w-[5.25rem] items-center justify-center rounded-[22px] border border-violet-200/70 bg-white shadow-[0_18px_44px_-12px_rgba(124,58,237,0.32)] lg:h-24 lg:w-24 lg:rounded-[24px] lg:shadow-[0_20px_50px_-15px_rgba(124,58,237,0.35)]">
                                                    <DreyvMark size={44} className="drop-shadow-[0_0_14px_rgba(139,92,246,0.45)] lg:h-[48px] lg:w-[48px]" />
                                                </div>
                                                <div className="absolute -right-2 -top-2 lg:-right-3 lg:-top-3">
                                                    <Sparkles className="h-5 w-5 animate-pulse text-violet-500 lg:h-6 lg:w-6" style={{ animationDuration: '2s' }} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1 lg:space-y-2">
                                            <h1 className="text-xl font-bold tracking-tight text-slate-900 lg:text-2xl">
                                                Access Granted
                                            </h1>
                                            <p className="text-[13px] font-medium tracking-wide text-slate-500 lg:text-[14px]">
                                                Identity verified. Preparing session...
                                            </p>
                                        </div>

                                        <div className="mx-auto inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200/70 bg-violet-50 px-5 py-2.5 text-[12px] font-bold uppercase tracking-widest text-violet-700 shadow-sm lg:gap-2.5 lg:px-6 lg:py-3 lg:text-[13px]">
                                            <Loader2 className="h-4 w-4 animate-spin text-violet-600 lg:h-5 lg:w-5" />
                                            Entering Protocol
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer elements */}
                        <div className="mt-3 flex shrink-0 cursor-default items-center justify-center gap-2 text-[9px] font-semibold uppercase tracking-widest text-slate-500 transition-colors hover:text-violet-700 lg:mt-6 lg:gap-3 lg:text-[10px]">
                            <Shield className="h-3.5 w-3.5" />
                            <span className="max-w-[18rem] text-center leading-snug lg:max-w-none">Zero Trust Security Architecture</span>
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
                <div className="min-h-screen bg-marketing-bg flex items-center justify-center font-manrope">
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-16 h-16 rounded-[20px] bg-white border border-violet-200/60 flex items-center justify-center shadow-[0_20px_50px_-12px_rgba(124,58,237,0.25)] relative overflow-hidden">
                            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-200/70 to-transparent" />
                            <DreyvMark size={32} className="animate-pulse opacity-90" />
                        </div>
                        <p className="text-slate-500 text-[11px] font-bold tracking-[0.2em] uppercase">Initializing Handshake...</p>
                    </div>
                </div>
            }>
                <AuthPageContent />
            </Suspense>
        </TelemetryProvider>
    );
}
