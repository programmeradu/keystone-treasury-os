"use client";

import React, { useEffect, useRef, useMemo, useCallback } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import {
    BridgeController,
    BridgeMethods,
    IFRAME_BRIDGE_CLIENT,
} from "@/lib/studio/bridge-protocol";

// ─── Types ──────────────────────────────────────────────────────────

interface StudioFile {
    name: string;
    content: string;
    language: string;
}

interface LivePreviewProps {
    files: Record<string, StudioFile>;
    tab?: "preview" | "code";
    onLogsChange?: (logs: string[]) => void;
    walletAddress?: string | null;
    appId?: string;
}

// ─── Component ──────────────────────────────────────────────────────

export function LivePreview({
    files,
    tab = "preview",
    onLogsChange,
    walletAddress = null,
    appId,
}: LivePreviewProps) {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const bridgeRef = useRef<BridgeController | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [logs, setLogs] = React.useState<string[]>([]);

    // Sync logs to parent
    useEffect(() => {
        onLogsChange?.(logs);
    }, [logs, onLogsChange]);

    const appCode = files["App.tsx"]?.content || "";

    // ─── Serialize user code safely for injection ────────────
    const userCodeJson = useMemo(() => {
        const normalized = appCode
            .replace(/from\s+['"]\.\/keystone['"]/g, 'from "@keystone-os/sdk"')
            .replace(/from\s+['"]keystone-api['"]/g, 'from "@keystone-os/sdk"');
        return JSON.stringify(normalized);
    }, [appCode]);

    // ─── Build iframe HTML ──────────────────────────────────
    // Strategy: React/ReactDOM as UMD globals, Babel compiles to CommonJS,
    // require() shim maps module names to globals. No import maps needed.
    const finalIframeContent = useMemo(() => {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://unpkg.com/react@18.2.0/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18.2.0/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone@7.26.2/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { margin: 0; background: #09090b; color: white; font-family: system-ui, -apple-system, sans-serif; min-height: 100vh; }
        #root { min-height: 100vh; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #09090b; }
        ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 3px; }
    </style>
    <script>
        // ─── Bridge + Console Hijack ─────────────────────────
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
    </script>
    <script>
        // ─── SDK (uses global React) ─────────────────────────
        (function() {
            var React = window.React;
            var useState = React.useState;
            var useEffect = React.useEffect;
            var useCallback = React.useCallback;
            var useRef = React.useRef;

            var useVault = function() {
                return {
                    activeVault: "Main Portfolio",
                    balances: { SOL: 124.5, USDC: 5400.2 },
                    tokens: [
                        { symbol: "SOL", name: "Solana", balance: 124.5, price: 23.40 },
                        { symbol: "USDC", name: "USD Coin", balance: 5400.2, price: 1.00 },
                        { symbol: "BONK", name: "Bonk", balance: 15000000, price: 0.000024 },
                        { symbol: "JUP", name: "Jupiter", balance: 850, price: 1.12 },
                    ],
                };
            };

            var useTurnkey = function() {
                return {
                    getPublicKey: function() {
                        return keystoneBridge.call('turnkey.getPublicKey');
                    },
                    signTransaction: function(tx, description) {
                        return keystoneBridge.call('turnkey.signTransaction', {
                            transaction: tx,
                            description: description || 'Sign transaction',
                        });
                    },
                };
            };

            var useFetch = function(url, options) {
                options = options || {};
                var _s = useState(null), data = _s[0], setData = _s[1];
                var _e = useState(null), error = _e[0], setError = _e[1];
                var _l = useState(true), loading = _l[0], setLoading = _l[1];

                var fetchData = useCallback(function() {
                    setLoading(true);
                    setError(null);
                    return keystoneBridge.call('proxy.fetch', {
                        url: url,
                        method: options.method || 'GET',
                        headers: options.headers || {},
                        body: options.body,
                    }).then(function(result) {
                        setData(result);
                    }).catch(function(err) {
                        setError(err.message);
                        console.error('[useFetch] ' + url + ': ' + err.message);
                    }).finally(function() {
                        setLoading(false);
                    });
                }, [url, options.method, options.body]);

                useEffect(function() { fetchData(); }, [fetchData]);
                return { data: data, error: error, loading: loading, refetch: fetchData };
            };

            var AppEventBus = {
                emit: function(type, payload) {
                    keystoneBridge.notify('event.emit', { type: type, payload: payload });
                    console.log('[EventBus]', type, payload);
                },
            };

            // Register as requireable module
            window.__keystoneSDK = {
                useVault: useVault,
                useTurnkey: useTurnkey,
                useFetch: useFetch,
                AppEventBus: AppEventBus,
                default: { useVault: useVault, useTurnkey: useTurnkey, useFetch: useFetch, AppEventBus: AppEventBus },
            };
            window.__keystoneSDK.__esModule = true;
        })();
    </script>
    <script>
        // ─── CommonJS Require Shim ───────────────────────────
        (function() {
            var moduleMap = {
                'react': window.React,
                'react-dom': window.ReactDOM,
                'react-dom/client': window.ReactDOM,
                '@keystone-os/sdk': window.__keystoneSDK,
            };
            window.__ks_require = function(name) {
                if (moduleMap[name]) return moduleMap[name];
                throw new Error('[Keystone] Module not found: ' + name + '. Add it to keystone.lock.json.');
            };
        })();
    </script>
</head>
<body>
    <div id="root"></div>
    <script>
        // ─── Boot ────────────────────────────────────────────
        (function() {
            try {
                // 1. Compile user TSX → CommonJS JS
                var rawCode = ${userCodeJson};
                var compiled = Babel.transform(rawCode, {
                    presets: ['typescript', 'react'],
                    plugins: ['transform-modules-commonjs'],
                    filename: 'App.tsx',
                    retainLines: true,
                });

                // 2. Execute compiled code with require shim
                var _module = { exports: {} };
                var _exports = _module.exports;
                var fn = new Function('require', 'module', 'exports', compiled.code);
                fn(window.__ks_require, _module, _exports);

                // 3. Get the default export
                var App = _module.exports.default || _module.exports;
                if (typeof App !== 'function') {
                    throw new Error('App.tsx must export a default React component (got ' + typeof App + ')');
                }

                // 4. Mount
                var root = ReactDOM.createRoot(document.getElementById('root'));
                root.render(React.createElement(App));

                keystoneBridge.notify('runtime.ready', { timestamp: Date.now() });
            } catch (err) {
                console.error('Runtime Boot Error:', err);
                document.getElementById('root').innerHTML =
                    '<div style="color:#ef4444;padding:20px;font-family:monospace;font-size:13px;line-height:1.6">' +
                    '<strong style="color:#f87171">Runtime Error</strong><br/>' +
                    '<span style="color:#fca5a5">' + (err.message || err) + '</span></div>';
                keystoneBridge.notify('runtime.error', { message: err.message || String(err) });
            }
        })();
    </script>
</body>
</html>`;
    }, [userCodeJson]);

    // ─── Setup Bridge Controller ────────────────────────────
    const setupBridge = useCallback(() => {
        // Tear down previous bridge
        bridgeRef.current?.stop();

        const bridge = new BridgeController(iframeRef);

        // ─── Console Handlers ─────────────────────────────
        bridge.on(BridgeMethods.CONSOLE_LOG, async (params) => {
            setLogs(prev => [...prev.slice(-500), `[info] ${params.message}`]);
            return null;
        });

        bridge.on(BridgeMethods.CONSOLE_WARN, async (params) => {
            setLogs(prev => [...prev.slice(-500), `[warn] ${params.message}`]);
            return null;
        });

        bridge.on(BridgeMethods.CONSOLE_ERROR, async (params) => {
            setLogs(prev => [...prev.slice(-500), `[error] ${params.message}`]);
            return null;
        });

        // ─── Runtime Lifecycle ────────────────────────────
        bridge.on(BridgeMethods.RUNTIME_READY, async () => {
            setIsLoading(false);
            setError(null);
            return { status: "ok" };
        });

        bridge.on(BridgeMethods.RUNTIME_ERROR, async (params) => {
            const msg = String(params.message || "Unknown runtime error");
            setError(msg);
            setIsLoading(false);
            setLogs(prev => [...prev.slice(-500), `[error] ${msg}`]);
            return null;
        });

        // ─── Turnkey Wallet Bridge ────────────────────────
        bridge.on(BridgeMethods.TURNKEY_GET_PK, async () => {
            const pk = walletAddress || "7KeY...StUdIo (Mock)";
            setLogs(prev => [...prev.slice(-500), `[info] [Turnkey] Public key requested: ${pk}`]);
            return pk;
        });

        bridge.on(BridgeMethods.TURNKEY_SIGN, async (params) => {
            if (!walletAddress) {
                throw new Error("No wallet connected. Open Vault Keys to create a signer.");
            }

            const description = String(params.description || "Sign transaction");
            setLogs(prev => [...prev.slice(-500), `[info] [Turnkey] Sign request: ${description}`]);

            // TODO Phase 2.1: Simulation Firewall — fork, simulate, present state diff
            // For now, mock signing with delay
            await new Promise(r => setTimeout(r, 800));
            const sig = "sig_turnkey_" + crypto.randomUUID().slice(0, 12);

            setLogs(prev => [...prev.slice(-500), `[info] [Turnkey] Signed: ${sig}`]);
            return { signature: sig };
        });

        // ─── Proxy Gate (Phase 2.3) ──────────────────────
        bridge.on(BridgeMethods.PROXY_REQUEST, async (params) => {
            const { url, method, headers, body } = params as {
                url: string;
                method?: string;
                headers?: Record<string, string>;
                body?: unknown;
            };

            const proxyRes = await fetch("/api/proxy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url,
                    method: method || "GET",
                    headers: headers || {},
                    body,
                    appId,
                }),
            });

            const result = await proxyRes.json();

            setLogs(prev => [...prev.slice(-500),
                `[info] [Proxy] ${method || "GET"} ${url} → ${proxyRes.status}`
            ]);

            if (!proxyRes.ok) {
                throw new Error(result.error || `Proxy returned ${proxyRes.status}`);
            }

            return result.data;
        });

        // ─── Event Bus ────────────────────────────────────
        bridge.on(BridgeMethods.EVENT_EMIT, async (params) => {
            setLogs(prev => [...prev.slice(-500), `[event] ${params.type}: ${JSON.stringify(params.payload)}`]);
            return null;
        });

        bridge.start();
        bridgeRef.current = bridge;
    }, [walletAddress, appId]);

    // ─── Lifecycle ──────────────────────────────────────────
    useEffect(() => {
        setIsLoading(true);
        setError(null);
        setLogs([]);
        setupBridge();

        return () => {
            bridgeRef.current?.stop();
        };
    }, [finalIframeContent, setupBridge]);

    // ─── Render: Console Tab ────────────────────────────────
    if (tab === "code") {
        return (
            <div className="h-full w-full bg-[#011627] p-4 overflow-auto font-mono text-xs">
                <div className="text-emerald-400 mb-4 uppercase tracking-widest text-[10px] font-bold border-b border-zinc-800 pb-2">
                    Console Output
                </div>
                {logs.length === 0 ? (
                    <div className="text-zinc-600 italic">No logs yet...</div>
                ) : (
                    logs.map((log, i) => (
                        <div
                            key={i}
                            className={`py-1 border-b border-zinc-900/50 ${
                                log.startsWith("[error]")
                                    ? "text-red-400"
                                    : log.startsWith("[warn]")
                                    ? "text-yellow-400"
                                    : log.startsWith("[event]")
                                    ? "text-cyan-400"
                                    : "text-zinc-300"
                            }`}
                        >
                            {log}
                        </div>
                    ))
                )}
            </div>
        );
    }

    // ─── Render: Preview Tab ────────────────────────────────
    return (
        <div className="h-full w-full relative bg-[#09090b]">
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#09090b] z-10 transition-opacity duration-300">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
                    <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Booting Kernel...</p>
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#09090b]/95 z-20 p-8 backdrop-blur-sm">
                    <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl max-w-md w-full">
                        <div className="flex items-center gap-3 mb-3 text-red-500">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="font-bold uppercase tracking-wider text-xs">Runtime Error</span>
                        </div>
                        <p className="text-sm text-zinc-300 font-mono break-words leading-relaxed">{error}</p>
                    </div>
                    <button
                        onClick={() => { setError(null); setIsLoading(true); }}
                        className="mt-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-bold rounded uppercase tracking-wider transition-colors"
                    >
                        Retry Render
                    </button>
                </div>
            )}
            <iframe
                ref={iframeRef}
                srcDoc={finalIframeContent}
                className="w-full h-full border-none"
                sandbox="allow-scripts"
                title="Keystone Mini-App Preview"
            />
        </div>
    );
}
