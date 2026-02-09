"use client";

import React, { useEffect, useRef, useMemo, useCallback, useState } from "react";
import { Loader2, AlertTriangle, Sparkles } from "lucide-react";
import {
    BridgeController,
    BridgeMethods,
    IFRAME_BRIDGE_CLIENT,
} from "@/lib/studio/bridge-protocol";
import { FORESIGHT_SDK_MODULE } from "@/lib/foresight/sdk-components";

// ─── Types ──────────────────────────────────────────────────────────

interface ForesightPreviewProps {
    /** The generated TSX code for the ephemeral foresight UI */
    code: string;
    /** Current portfolio snapshot for the simulation engine */
    portfolio?: { symbol: string; amount: number; price: number }[];
    /** Optional callback when simulation runs */
    onSimulation?: (result: any) => void;
    /** Optional callback for logs */
    onLogsChange?: (logs: string[]) => void;
}

// ─── Component ──────────────────────────────────────────────────────

export function ForesightPreview({
    code,
    portfolio = [],
    onSimulation,
    onLogsChange,
}: ForesightPreviewProps) {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const bridgeRef = useRef<BridgeController | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        onLogsChange?.(logs);
    }, [logs, onLogsChange]);

    // Normalize imports from the foresight SDK
    const normalizedCode = useMemo(() => {
        return code
            .replace(/from\s+['"]@keystone-os\/foresight['"]/g, 'from "@keystone-os/foresight"')
            .replace(/from\s+['"]@keystone-os\/sdk['"]/g, 'from "@keystone-os/sdk"');
    }, [code]);

    const userCodeJson = useMemo(() => JSON.stringify(normalizedCode), [normalizedCode]);

    // ─── Build Ephemeral Iframe HTML ─────────────────────────────
    const iframeContent = useMemo(() => {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://unpkg.com/react@18.2.0/umd/react.development.js"><\/script>
    <script src="https://unpkg.com/react-dom@18.2.0/umd/react-dom.development.js"><\/script>
    <script src="https://unpkg.com/@babel/standalone@7.26.2/babel.min.js"><\/script>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <style>
        body { margin: 0; background: #09090b; color: white; font-family: ui-monospace, monospace; min-height: 100vh; }
        #root { min-height: 100vh; padding: 16px; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #09090b; }
        ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 3px; }
        input[type="range"] { -webkit-appearance: none; appearance: none; background: #27272a; border-radius: 2px; outline: none; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #10b981; cursor: pointer; border: 2px solid #09090b; }
    </style>
    <script>
        // Bridge + Console Hijack
        (function() {
            ${IFRAME_BRIDGE_CLIENT}
            window.keystoneBridge = keystoneBridge;
            var origLog = console.log, origWarn = console.warn, origError = console.error;
            function fwd(level, args) {
                try { keystoneBridge.notify('console.' + level, { message: args.map(function(a) { return typeof a === 'object' ? JSON.stringify(a) : String(a); }).join(' ') }); } catch(e) {}
            }
            console.log = function() { origLog.apply(console, arguments); fwd('log', Array.from(arguments)); };
            console.warn = function() { origWarn.apply(console, arguments); fwd('warn', Array.from(arguments)); };
            console.error = function() { origError.apply(console, arguments); fwd('error', Array.from(arguments)); };
            window.onerror = function(msg, url, line, col) { keystoneBridge.notify('runtime.error', { message: String(msg), line: line, col: col }); };
            window.onunhandledrejection = function(event) { keystoneBridge.notify('runtime.error', { message: 'Unhandled Promise: ' + String(event.reason) }); };
        })();
    <\/script>
    <script>
        // Keystone Base SDK (useVault mock for foresight)
        (function() {
            var React = window.React;
            window.__keystoneSDK = {
                useVault: function() { return { activeVault: "Foresight", balances: {}, tokens: [] }; },
                useTurnkey: function() { return { getPublicKey: function() { return 'foresight-mock'; }, signTransaction: function() { return { signature: 'sim' }; } }; },
                useFetch: function() { return { data: null, error: null, loading: false, refetch: function() {} }; },
                AppEventBus: { emit: function(type, payload) { console.log('[Foresight Event]', type, payload); } },
            };
            window.__keystoneSDK.__esModule = true;
        })();
    <\/script>
    <script>
        // Foresight SDK Components
        ${FORESIGHT_SDK_MODULE}
    <\/script>
    <script>
        // CommonJS Require Shim
        (function() {
            var moduleMap = {
                'react': window.React,
                'react-dom': window.ReactDOM,
                'react-dom/client': window.ReactDOM,
                '@keystone-os/sdk': window.__keystoneSDK,
                '@keystone-os/foresight': window.__keystoneForesight,
            };
            window.__ks_require = function(name) {
                if (moduleMap[name]) return moduleMap[name];
                throw new Error('[Foresight] Module not found: ' + name);
            };
        })();
    <\/script>
</head>
<body>
    <div id="root"></div>
    <script>
        (function() {
            try {
                var rawCode = ${userCodeJson};
                var compiled = Babel.transform(rawCode, {
                    presets: ['typescript', 'react'],
                    plugins: ['transform-modules-commonjs'],
                    filename: 'Foresight.tsx',
                    retainLines: true,
                });
                var _module = { exports: {} };
                var fn = new Function('require', 'module', 'exports', compiled.code);
                fn(window.__ks_require, _module, _module.exports);
                var App = _module.exports.default || _module.exports;
                if (typeof App !== 'function') {
                    throw new Error('Foresight component must export a default React component (got ' + typeof App + ')');
                }
                var root = ReactDOM.createRoot(document.getElementById('root'));
                root.render(React.createElement(App));
                keystoneBridge.notify('runtime.ready', { timestamp: Date.now() });
            } catch (err) {
                console.error('Foresight Boot Error:', err);
                document.getElementById('root').innerHTML =
                    '<div style="color:#ef4444;padding:20px;font-family:monospace;font-size:13px;line-height:1.6">' +
                    '<strong style="color:#f87171">Foresight Error</strong><br/>' +
                    '<span style="color:#fca5a5">' + (err.message || err) + '</span></div>';
                keystoneBridge.notify('runtime.error', { message: err.message || String(err) });
            }
        })();
    <\/script>
</body>
</html>`;
    }, [userCodeJson]);

    // ─── Bridge Setup ─────────────────────────────────────────────
    const setupBridge = useCallback(() => {
        bridgeRef.current?.stop();
        const bridge = new BridgeController(iframeRef);

        // Console handlers
        bridge.on(BridgeMethods.CONSOLE_LOG, async (params) => {
            setLogs(prev => [...prev.slice(-200), `[info] ${params.message}`]);
            return null;
        });
        bridge.on(BridgeMethods.CONSOLE_WARN, async (params) => {
            setLogs(prev => [...prev.slice(-200), `[warn] ${params.message}`]);
            return null;
        });
        bridge.on(BridgeMethods.CONSOLE_ERROR, async (params) => {
            setLogs(prev => [...prev.slice(-200), `[error] ${params.message}`]);
            return null;
        });

        // Lifecycle
        bridge.on(BridgeMethods.RUNTIME_READY, async () => {
            setIsLoading(false);
            setError(null);
            return { status: "ok" };
        });
        bridge.on(BridgeMethods.RUNTIME_ERROR, async (params) => {
            const msg = String(params.message || "Unknown foresight error");
            setError(msg);
            setIsLoading(false);
            setLogs(prev => [...prev.slice(-200), `[error] ${msg}`]);
            return null;
        });

        // ─── Foresight Simulation Bridge Method ──────────────────
        // This is the critical bridge: the iframe's useSimulation hook
        // calls keystoneBridge.call('foresight.simulate', body) which
        // routes here to the server-side /api/simulation endpoint.
        bridge.on("foresight.simulate" as any, async (params) => {
            setLogs(prev => [...prev.slice(-200), `[foresight] Running simulation...`]);

            const body = {
                portfolio: (params as any).portfolio?.length > 0
                    ? (params as any).portfolio
                    : portfolio,
                variables: (params as any).variables || [],
                timeframeMonths: (params as any).timeframeMonths || 12,
                granularity: (params as any).granularity || "monthly",
            };

            try {
                const res = await fetch("/api/simulation", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });

                if (!res.ok) {
                    const errBody = await res.json().catch(() => ({}));
                    throw new Error(errBody.error || `Simulation API returned ${res.status}`);
                }

                const result = await res.json();

                // Safety guardrail: flag misleading projections
                if (result.summary?.riskFlags?.includes("UNREALISTIC_YIELD_ASSUMPTION")) {
                    setLogs(prev => [...prev.slice(-200), `[foresight] ⚠ WARNING: Unrealistic yield assumption detected`]);
                }

                setLogs(prev => [...prev.slice(-200),
                    `[foresight] Simulation complete: ${result.projection?.length || 0} points, ` +
                    `delta: ${result.summary?.deltaPercent?.toFixed(1)}%`
                ]);

                onSimulation?.(result);
                return result;
            } catch (err: any) {
                setLogs(prev => [...prev.slice(-200), `[foresight] Simulation failed: ${err.message}`]);
                throw err;
            }
        });

        // Event bus (fire-and-forget)
        bridge.on(BridgeMethods.EVENT_EMIT, async (params) => {
            setLogs(prev => [...prev.slice(-200), `[event] ${(params as any).type}`]);
            return null;
        });

        bridge.start();
        bridgeRef.current = bridge;
    }, [portfolio, onSimulation]);

    // ─── Lifecycle ────────────────────────────────────────────────
    useEffect(() => {
        setIsLoading(true);
        setError(null);
        setLogs([]);
        setupBridge();
        return () => { bridgeRef.current?.stop(); };
    }, [iframeContent, setupBridge]);

    // ─── Render ─────────────────────────────────────────────────
    return (
        <div className="h-full w-full relative bg-[#09090b] rounded-xl overflow-hidden border border-border">
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#09090b] z-10">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Compiling Foresight...</p>
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#09090b]/95 z-20 p-8">
                    <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl max-w-md w-full">
                        <div className="flex items-center gap-3 mb-3 text-red-500">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="font-bold uppercase tracking-wider text-xs">Foresight Error</span>
                        </div>
                        <p className="text-sm text-zinc-300 font-mono break-words leading-relaxed">{error}</p>
                    </div>
                    <button
                        onClick={() => { setError(null); setIsLoading(true); }}
                        className="mt-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-bold rounded uppercase tracking-wider transition-colors"
                    >
                        Retry
                    </button>
                </div>
            )}
            <iframe
                ref={iframeRef}
                srcDoc={iframeContent}
                className="w-full h-full border-none"
                sandbox="allow-scripts"
                title="Keystone Foresight"
            />
        </div>
    );
}
