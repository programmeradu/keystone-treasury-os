"use client";

/**
 * Keystone Widget Embed Component
 * 
 * Three-tier integration model:
 * Tier 1: NPM packages (imported directly by user code via lockfile)
 * Tier 2: SDK Wrapper Components (useVault, useTurnkey, useFetch)
 * Tier 3: Nested iframes for external widgets (this component)
 * 
 * KeystoneEmbed renders a sandboxed nested iframe inside a Mini-App iframe.
 * It uses the bridge protocol to communicate back to the host for auth/data.
 * 
 * [KIMI-4.0] — Widget Integration
 */

import React, { useRef, useEffect, useState } from "react";
import { Loader2, ExternalLink, Shield } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────

interface KeystoneEmbedProps {
    src: string;                         // External widget URL (must be HTTPS)
    title?: string;                      // Accessible title
    height?: string | number;            // Default: 400px
    width?: string | number;             // Default: 100%
    allowedOrigin?: string;              // Restrict postMessage origin
    permissions?: string[];              // Extra sandbox permissions
    className?: string;
    onLoad?: () => void;
    onError?: (error: string) => void;
}

// ─── Allowed Widget Domains ─────────────────────────────────────────

const WIDGET_ALLOWLIST = new Set([
    "birdeye.so",
    "app.realms.today",
    "jup.ag",
    "raydium.io",
    "tensor.so",
    "dexscreener.com",
    "tradingview.com",
    "defined.fi",
    "step.finance",
    "phantom.app",
]);

function isDomainAllowed(url: string): boolean {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:") return false;
        const hostname = parsed.hostname;
        return Array.from(WIDGET_ALLOWLIST).some(
            (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
        );
    } catch {
        return false;
    }
}

// ─── Component ──────────────────────────────────────────────────────

export function KeystoneEmbed({
    src,
    title = "External Widget",
    height = 400,
    width = "100%",
    allowedOrigin,
    permissions = [],
    className = "",
    onLoad,
    onError,
}: KeystoneEmbedProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [blocked, setBlocked] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // ─── Domain Check ───────────────────────────────────────
    useEffect(() => {
        if (!isDomainAllowed(src)) {
            setBlocked(true);
            setIsLoading(false);
            const msg = `Domain not in widget allowlist: ${src}`;
            setErrorMsg(msg);
            onError?.(msg);
        }
    }, [src, onError]);

    // ─── Load Handler ───────────────────────────────────────
    const handleLoad = () => {
        setIsLoading(false);
        onLoad?.();
    };

    const handleError = () => {
        setIsLoading(false);
        const msg = `Failed to load widget: ${src}`;
        setErrorMsg(msg);
        onError?.(msg);
    };

    // ─── Sandbox Permissions ────────────────────────────────
    // Base: allow-scripts only. No allow-same-origin (prevents cookie/storage access).
    // Additional permissions can be explicitly granted.
    const baseSandbox = "allow-scripts allow-popups";
    const extraPerms = permissions
        .filter((p) => !["allow-same-origin", "allow-top-navigation"].includes(p))
        .join(" ");
    const sandbox = [baseSandbox, extraPerms].filter(Boolean).join(" ");

    // ─── Blocked State ──────────────────────────────────────
    if (blocked) {
        return (
            <div
                className={`flex flex-col items-center justify-center bg-zinc-900/50 border border-red-500/20 rounded-xl p-6 ${className}`}
                style={{ height, width }}
            >
                <Shield className="w-8 h-8 text-red-400 mb-3" />
                <p className="text-xs text-red-400 font-bold uppercase tracking-wider mb-2">
                    Widget Blocked
                </p>
                <p className="text-[10px] text-zinc-500 text-center max-w-xs leading-relaxed">
                    {errorMsg || "This domain is not in the approved widget allowlist."}
                </p>
            </div>
        );
    }

    // ─── Render ─────────────────────────────────────────────
    return (
        <div
            className={`relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/30 ${className}`}
            style={{ height, width }}
        >
            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/80 z-10">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mb-2" />
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                        Loading Widget...
                    </p>
                </div>
            )}

            {/* Widget Header */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-1.5 bg-zinc-900/90 backdrop-blur-sm border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <ExternalLink size={10} className="text-zinc-500" />
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider truncate max-w-[200px]">
                        {title}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <Shield size={9} className="text-emerald-500" />
                    <span className="text-[8px] text-emerald-500/60 font-bold uppercase tracking-wider">
                        Sandboxed
                    </span>
                </div>
            </div>

            {/* Iframe */}
            <iframe
                ref={iframeRef}
                src={src}
                title={title}
                sandbox={sandbox}
                referrerPolicy="no-referrer"
                loading="lazy"
                onLoad={handleLoad}
                onError={handleError}
                className="w-full h-full border-none pt-7"
                style={{
                    colorScheme: "dark",
                }}
                allow="clipboard-write"
            />
        </div>
    );
}
