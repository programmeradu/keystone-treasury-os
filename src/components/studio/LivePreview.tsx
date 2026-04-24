"use client";

import React, { useEffect, useRef, useMemo, useCallback } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import {
    BridgeController,
    BridgeMethods,
    IFRAME_BRIDGE_CLIENT,
} from "@/lib/studio/bridge-protocol";
import {
    stubLitEncrypt,
    stubLitDecrypt,
    stubACEReport,
    stubMCPCall,
    stubJupiterQuote,
    stubJupiterSwap,
    stubImpactReport,
    stubTaxForensics,
    stubYieldOptimize,
    stubGaslessSubmit,
    stubSIWSSign,
    stubBlinkExport,
} from "@/lib/studio/bridge-stubs";

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
    const [retryKey, setRetryKey] = React.useState(0);

    // ─── Fetch real prices + logos in parent (iframe sandbox blocks external fetch) ──
    const MINTS: Record<string, string> = React.useMemo(() => ({
        SOL: 'So11111111111111111111111111111111111111112',
        USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    }), []);

    const [livePrices, setLivePrices] = React.useState<Record<string, number>>({});
    const [tokenLogos, setTokenLogos] = React.useState<Record<string, string>>({});
    const [liveHoldings, setLiveHoldings] = React.useState<{ symbol: string; name: string; balance: number; mint: string; decimals: number }[] | null>(null);

    // Fetch real wallet holdings when wallet is connected
    useEffect(() => {
        if (!walletAddress) {
            setLiveHoldings(null);
            return;
        }
        let cancelled = false;
        fetch(`/api/helius/das/wallet-holdings?address=${walletAddress}`, { signal: AbortSignal.timeout(10000) })
            .then(r => r.json())
            .then(json => {
                if (cancelled) return;
                const holdings = json?.holdings || [];
                const mintToSym: Record<string, string> = {};
                for (const [sym, mint] of Object.entries(MINTS)) mintToSym[mint] = sym;
                const mapped = holdings.map((h: any) => ({
                    symbol: mintToSym[h.mint] || h.symbol || 'UNKNOWN',
                    name: h.name || h.symbol || 'Unknown',
                    balance: Number(h.balance) / Math.pow(10, h.decimals || 0),
                    mint: h.mint,
                    decimals: h.decimals || 0,
                }));
                setLiveHoldings(mapped);
            })
            .catch(() => { if (!cancelled) setLiveHoldings(null); });
        return () => { cancelled = true; };
    }, [walletAddress, MINTS]);

    useEffect(() => {
        // Fetch prices
        const ids = Object.values(MINTS).join(',');
        fetch(`https://lite-api.jup.ag/price/v2?ids=${ids}`, { signal: AbortSignal.timeout(6000) })
            .then(r => r.json())
            .then(json => {
                const data = json?.data || {};
                const prices: Record<string, number> = {};
                for (const [sym, mint] of Object.entries(MINTS)) {
                    prices[sym] = parseFloat(data[mint]?.price) || 0;
                }
                setLivePrices(prices);
            })
            .catch(() => setLivePrices({ SOL: 23.40, USDC: 1.00, BONK: 0.000024, JUP: 1.12 }));

        // Fetch logos — get logoURIs from Jupiter token list, then convert to base64
        // (srcDoc iframes can’t load external images due to null origin)
        fetch('https://token.jup.ag/strict', { signal: AbortSignal.timeout(8000) })
            .then(r => r.json())
            .then(async (list: any[]) => {
                const mintToSym: Record<string, string> = {};
                for (const [sym, mint] of Object.entries(MINTS)) mintToSym[mint] = sym;
                const relevant = list.filter((t: any) => mintToSym[t.address] && t.logoURI);

                const logos: Record<string, string> = {};
                await Promise.allSettled(relevant.map(async (t: any) => {
                    try {
                        const res = await fetch(t.logoURI, { signal: AbortSignal.timeout(5000) });
                        if (!res.ok) return;
                        const blob = await res.blob();
                        const dataUri: string = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.readAsDataURL(blob);
                        });
                        logos[mintToSym[t.address]] = dataUri;
                    } catch { /* skip failed logos */ }
                }));
                setTokenLogos(logos);
            })
            .catch(() => { /* logos remain empty — fallback initials shown */ });
    }, [MINTS]);

    // Sync logs to parent
    useEffect(() => {
        onLogsChange?.(logs);
    }, [logs, onLogsChange]);

    const appCode = files["App.tsx"]?.content || "";

    // ─── Serialize user code safely for injection ────────────
    // SECURITY: JSON.stringify alone doesn't escape HTML special chars like </script>
    // which could break out of the <script> tag context. After JSON-serializing,
    // replace < and > with Unicode escapes so HTML parsing can't be hijacked.
    const userCodeJson = useMemo(() => {
        const normalized = appCode
            .replace(/from\s+['"]\.\/keystone['"]/g, 'from "@keystone-os/sdk"')
            .replace(/from\s+['"]keystone-api['"]/g, 'from "@keystone-os/sdk"');
        return JSON.stringify(normalized)
            .replace(/</g, '\\u003c')
            .replace(/>/g, '\\u003e');
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

            // Prices + logos injected from parent (iframe sandbox blocks external fetch/images)
            var _injectedPrices = ${JSON.stringify(livePrices)};
            var _injectedLogos = ${JSON.stringify(tokenLogos)};
            var _liveHoldings = ${JSON.stringify(liveHoldings)};
            var _walletConnected = ${JSON.stringify(!!walletAddress)};

            var useVault = function() {
                var tokens;
                if (_walletConnected && _liveHoldings && _liveHoldings.length > 0) {
                    // Real wallet data — use live holdings with live prices
                    tokens = _liveHoldings.map(function(h) {
                        return {
                            symbol: h.symbol,
                            name: h.name,
                            balance: h.balance,
                            price: _injectedPrices[h.symbol] || 0,
                            mint: h.mint,
                            logoURI: _injectedLogos[h.symbol] || '',
                        };
                    });
                } else {
                    // Demo mode — show example balances with live prices
                    tokens = [
                        { symbol: 'SOL',  name: 'Solana',   balance: 124.5,    price: _injectedPrices.SOL  || 0, mint: 'So11111111111111111111111111111111111111112',  logoURI: _injectedLogos.SOL  || '' },
                        { symbol: 'USDC', name: 'USD Coin', balance: 5400.2,   price: _injectedPrices.USDC || 1.00, mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', logoURI: _injectedLogos.USDC || '' },
                        { symbol: 'BONK', name: 'Bonk',     balance: 15000000, price: _injectedPrices.BONK || 0, mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', logoURI: _injectedLogos.BONK || '' },
                        { symbol: 'JUP',  name: 'Jupiter',  balance: 850,      price: _injectedPrices.JUP  || 0, mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',  logoURI: _injectedLogos.JUP  || '' },
                    ];
                }
                var balances = {};
                tokens.forEach(function(t) { balances[t.symbol] = t.balance; });
                return { activeVault: _walletConnected ? 'Connected Wallet' : 'Demo Portfolio', balances: balances, tokens: tokens };
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

            var useEncryptedSecret = function() {
                var encrypt = function(plaintext, keyId) { return keystoneBridge.call('lit.encryptSecret', { plaintext: plaintext, keyId: keyId || 'default' }); };
                var decrypt = function(ciphertext, keyId) { return keystoneBridge.call('lit.decryptSecret', { ciphertext: ciphertext, keyId: keyId || 'default' }); };
                return { encrypt: encrypt, decrypt: decrypt, loading: false, error: null };
            };

            var useACEReport = function(options) {
                var fetchReport = function() { return keystoneBridge.call('ace.report', { since: options && options.since ? options.since.toISOString() : undefined }); };
                return { report: [], loading: false, error: null, refetch: fetchReport };
            };

            var useAgentHandoff = function(fromAgent) {
                return { handoffTo: function(toAgent, context) { return keystoneBridge.call('agent.handoff', { fromAgent: fromAgent, toAgent: toAgent, context: context }); } };
            };

            var useMCPClient = function(serverUrl) {
                return { call: function(tool, params) { return keystoneBridge.call('mcp.call', { serverUrl: serverUrl, tool: tool, params: params || {} }); }, loading: false, error: null };
            };

            var useMCPServer = function(tools, handlers) {
                var registerTools = function() { keystoneBridge.notify('mcp.serve', { tools: tools }); };
                var handleCall = function(tool, params) { return handlers[tool] ? handlers[tool](params) : Promise.reject(new Error('Unknown tool')); };
                return { registerTools: registerTools, handleCall: handleCall };
            };

            var useSIWS = function() {
                return {
                    signIn: function() { return keystoneBridge.call('siws.sign', {}); },
                    verify: function(msg, sig) { return keystoneBridge.call('siws.verify', { message: msg, signature: sig }); },
                    session: null
                };
            };

            var useJupiterSwap = function() {
                return {
                    swap: function(params) { return keystoneBridge.call('jupiter.swap', params); },
                    getQuote: function(params) { return keystoneBridge.call('jupiter.quote', params); },
                    loading: false, error: null
                };
            };

            var useImpactReport = function() {
                return { simulate: function(tx) { return keystoneBridge.call('simulation.impactReport', { transaction: tx }); }, report: null, loading: false, error: null };
            };

            var useTaxForensics = function(options) {
                var _s = useState(null), result = _s[0], setResult = _s[1];
                var _l = useState(true), loading = _l[0], setLoading = _l[1];
                var _e = useState(null), error = _e[0], setError = _e[1];
                var fetchResult = useCallback(function() {
                    setLoading(true); setError(null);
                    return keystoneBridge.call('tax.forensics', { since: options && options.since ? options.since.toISOString() : undefined })
                        .then(function(data) { setResult(data); })
                        .catch(function(err) { setError(err.message); })
                        .finally(function() { setLoading(false); });
                }, []);
                useEffect(function() { fetchResult(); }, [fetchResult]);
                return { result: result, loading: loading, error: error, refetch: fetchResult };
            };

            var useYieldOptimizer = function(asset) {
                var _s = useState([]), paths = _s[0], setPaths = _s[1];
                var _l = useState(true), loading = _l[0], setLoading = _l[1];
                var _e = useState(null), error = _e[0], setError = _e[1];
                var fetchPaths = useCallback(function() {
                    setLoading(true); setError(null);
                    return keystoneBridge.call('yield.optimize', { asset: asset })
                        .then(function(data) { setPaths(data || []); })
                        .catch(function(err) { setError(err.message); setPaths([]); })
                        .finally(function() { setLoading(false); });
                }, [asset]);
                useEffect(function() { fetchPaths(); }, [fetchPaths]);
                return { paths: paths, loading: loading, error: error, refetch: fetchPaths };
            };

            var useGaslessTx = function() {
                return { submit: function(tx, desc) { return keystoneBridge.call('gasless.submit', { transaction: tx, description: desc }); }, loading: false, error: null };
            };

            // ─── Extended SDK v1.1 ───────────────────────────────

            var usePortfolio = function() {
                var vault = useVault();
                var totalValue = 0;
                var enriched = vault.tokens.map(function(t) {
                    var usdValue = t.balance * (t.price || 0);
                    totalValue += usdValue;
                    return { symbol: t.symbol, name: t.name, balance: t.balance, price: t.price, usdValue: usdValue, mint: t.mint, logoURI: t.logoURI, percentage: 0 };
                });
                enriched.forEach(function(t) { t.percentage = totalValue > 0 ? Math.round((t.usdValue / totalValue) * 10000) / 100 : 0; });
                return { tokens: enriched, totalValue: totalValue, loading: false };
            };

            var useTheme = function() {
                var _s = useState('dark'), theme = _s[0], setTheme = _s[1];
                return { theme: theme, setTheme: setTheme, isDark: theme === 'dark' };
            };

            var useTokenPrice = function(mint) {
                var _s = useState(null), price = _s[0], setPrice = _s[1];
                var _l = useState(true), loading = _l[0], setLoading = _l[1];
                var _e = useState(null), error = _e[0], setError = _e[1];
                useEffect(function() {
                    if (!mint) return;
                    setLoading(true);
                    keystoneBridge.call('proxy.fetch', { url: 'https://lite-api.jup.ag/price/v2?ids=' + mint, method: 'GET', headers: {} })
                        .then(function(data) { var p = data && data.data && data.data[mint]; setPrice(p ? parseFloat(p.price) : null); })
                        .catch(function(err) { setError(err.message); })
                        .finally(function() { setLoading(false); });
                }, [mint]);
                return { price: price, loading: loading, error: error };
            };

            var useNotification = function() {
                var _s = useState([]), notifications = _s[0], setNotifications = _s[1];
                var send = function(message, type) {
                    var n = { id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), message: message, type: type || 'info', time: new Date() };
                    setNotifications(function(prev) { return prev.concat([n]); });
                };
                var dismiss = function(id) { setNotifications(function(prev) { return prev.filter(function(n) { return n.id !== id; }); }); };
                var clearAll = function() { setNotifications([]); };
                var unreadCount = notifications.length;
                return { notifications: notifications, send: send, dismiss: dismiss, clearAll: clearAll, unreadCount: unreadCount };
            };

            var useStorage = function(namespace) {
                var ns = namespace || '__ks_storage';
                var refStore = useRef({});
                useEffect(function() {
                    try { var saved = window.__ksStorageData && window.__ksStorageData[ns]; if (saved) refStore.current = saved; } catch(e) {}
                }, []);
                var persist = function() { if (!window.__ksStorageData) window.__ksStorageData = {}; window.__ksStorageData[ns] = refStore.current; };
                return {
                    get: function(key) { return refStore.current[key] !== undefined ? refStore.current[key] : null; },
                    set: function(key, value) { refStore.current[key] = value; persist(); },
                    remove: function(key) { delete refStore.current[key]; persist(); },
                    keys: function() { return Object.keys(refStore.current); },
                    clear: function() { refStore.current = {}; persist(); },
                };
            };

            // Register as requireable module
            var exportsObj = {
                useVault: useVault,
                useTurnkey: useTurnkey,
                useFetch: useFetch,
                AppEventBus: AppEventBus,
                useEncryptedSecret: useEncryptedSecret,
                useACEReport: useACEReport,
                useAgentHandoff: useAgentHandoff,
                useMCPClient: useMCPClient,
                useMCPServer: useMCPServer,
                useSIWS: useSIWS,
                useJupiterSwap: useJupiterSwap,
                useImpactReport: useImpactReport,
                useTaxForensics: useTaxForensics,
                useYieldOptimizer: useYieldOptimizer,
                useGaslessTx: useGaslessTx,
                usePortfolio: usePortfolio,
                useTheme: useTheme,
                useTokenPrice: useTokenPrice,
                useNotification: useNotification,
                useStorage: useStorage
            };

            window.__keystoneSDK = Object.assign({}, exportsObj, { default: exportsObj });
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
        // ─── Error Boundary ──────────────────────────────────
        (function() {
            var _React = window.React;
            class KeystoneErrorBoundary extends _React.Component {
                constructor(props) {
                    super(props);
                    this.state = { hasError: false, error: null };
                }
                static getDerivedStateFromError(error) {
                    return { hasError: true, error: error };
                }
                componentDidCatch(error, info) {
                    var msg = (error && error.message) || String(error);
                    console.error('[ErrorBoundary]', msg);
                    keystoneBridge.notify('runtime.error', {
                        message: msg,
                        componentStack: info && info.componentStack ? info.componentStack.slice(0, 500) : undefined
                    });
                }
                render() {
                    if (this.state.hasError) {
                        var msg = this.state.error ? (this.state.error.message || String(this.state.error)) : 'Unknown error';
                        return _React.createElement('div', {
                            style: { color: '#ef4444', padding: '20px', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.6' }
                        },
                            _React.createElement('strong', { style: { color: '#f87171' } }, 'Component Error'),
                            _React.createElement('br'),
                            _React.createElement('span', { style: { color: '#fca5a5' } }, msg),
                            _React.createElement('br'),
                            _React.createElement('br'),
                            _React.createElement('button', {
                                onClick: function() { location.reload(); },
                                style: { color: '#a3a3a3', background: '#27272a', border: '1px solid #3f3f46', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }
                            }, 'Reload Preview')
                        );
                    }
                    return this.props.children;
                }
            }
            window.__KeystoneErrorBoundary = KeystoneErrorBoundary;
        })();
    </script>
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

                // 4. Mount with Error Boundary
                var root = ReactDOM.createRoot(document.getElementById('root'));
                root.render(
                    React.createElement(window.__KeystoneErrorBoundary, null,
                        React.createElement(App)
                    )
                );

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
    }, [userCodeJson, livePrices, tokenLogos, liveHoldings, walletAddress, retryKey]);

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

                        // Phase 2.1: Simulation Firewall implementation is pending.
            // Currently relies on the standard Solana web3 simulator via connection.simulateTransaction.
            // Future implementation will use a specialized mainnet-fork RPC provider
            // to present a human-readable state diff (impact report) before signing.
            // For now, mock signing with delay
            await new Promise(r => setTimeout(r, 800));
            const sig = "sig_turnkey_" + crypto.randomUUID().slice(0, 12);

            setLogs(prev => [...prev.slice(-500), `[info] [Turnkey] Signed: ${sig}`]);
            return { signature: sig };
        });

        // ─── Proxy Gate (Phase 2.3) ──────────────────────
        bridge.on(BridgeMethods.PROXY_REQUEST, async (params) => {
            const { observability, ...rest } = params as Record<string, unknown>;
            if (observability) {
                setLogs(prev => [...prev.slice(-500), `[info] [Observability] ${JSON.stringify(observability)}`]);
            }
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

        // ─── Sovereign OS 2026 — Full mock handlers (Phase 2) ──
        bridge.on(BridgeMethods.LIT_ENCRYPT, async (p) => {
            const params = p as { plaintext: string; keyId?: string };
            setLogs(prev => [...prev.slice(-500), `[lit] encrypt (keyId: ${params.keyId || 'default'})`]);
            return stubLitEncrypt(params);
        });
        bridge.on(BridgeMethods.LIT_DECRYPT, async (p) => {
            const params = p as { ciphertext: string; keyId?: string };
            setLogs(prev => [...prev.slice(-500), `[lit] decrypt (keyId: ${params.keyId || 'default'})`]);
            return stubLitDecrypt(params);
        });
        bridge.on(BridgeMethods.ACE_REPORT, async (p) => {
            const params = p as { since?: string };
            setLogs(prev => [...prev.slice(-500), `[ace] report requested`]);
            return stubACEReport(params);
        });
        bridge.on(BridgeMethods.ZKSP_VERIFY, async () => ({ verified: false }));
        bridge.on(BridgeMethods.AGENT_HANDOFF, async (p) => {
            const params = p as { fromAgent?: string; toAgent?: string };
            setLogs(prev => [...prev.slice(-500), `[agent] handoff ${params.fromAgent} → ${params.toAgent}`]);
            return { status: "handoff_received" };
        });
        bridge.on(BridgeMethods.MCP_CALL, async (p) => {
            const params = p as { serverUrl: string; tool: string; params?: Record<string, unknown> };
            setLogs(prev => [...prev.slice(-500), `[mcp] call ${params.tool} via ${params.serverUrl}`]);
            return stubMCPCall(params);
        });
        bridge.on(BridgeMethods.MCP_SERVE, async (p) => {
            setLogs(prev => [...prev.slice(-500), `[mcp] serve tools: ${((p as { tools?: unknown[] }).tools ?? []).length}`]);
            return null;
        });
        bridge.on(BridgeMethods.IMPACT_REPORT, async (p) => {
            const params = p as { transaction?: unknown };
            setLogs(prev => [...prev.slice(-500), `[simulation] impact report for tx`]);
            return stubImpactReport(params);
        });
        bridge.on(BridgeMethods.SIWS_SIGN, async () => {
            setLogs(prev => [...prev.slice(-500), `[siws] sign-in requested`]);
            return stubSIWSSign(walletAddress ?? null);
        });
        bridge.on(BridgeMethods.SIWS_VERIFY, async () => true);
        bridge.on(BridgeMethods.JUPITER_SWAP, async (p) => {
            const params = p as { inputMint: string; outputMint: string; amount: string; slippageBps?: number };
            setLogs(prev => [...prev.slice(-500), `[jupiter] swap ${params.amount} ${params.inputMint} → ${params.outputMint}`]);
            return stubJupiterSwap(params);
        });
        bridge.on(BridgeMethods.JUPITER_QUOTE, async (p) => {
            const params = p as { inputMint: string; outputMint: string; amount: string; slippageBps?: number };
            const isLive = !!walletAddress;
            setLogs(prev => [...prev.slice(-500), `[jupiter] quote ${params.amount} ${params.inputMint} → ${params.outputMint}${isLive ? " (LIVE)" : " (mock)"}`]);
            return stubJupiterQuote(params, isLive);
        });
        bridge.on(BridgeMethods.YIELD_OPTIMIZE, async (p) => {
            const params = p as { asset: string };
            const isLive = !!walletAddress;
            setLogs(prev => [...prev.slice(-500), `[yield] optimize for ${params.asset}${isLive ? " (LIVE)" : " (mock)"}`]);
            return stubYieldOptimize(params, isLive);
        });
        bridge.on(BridgeMethods.GASLESS_SUBMIT, async (p) => {
            const params = p as { transaction: unknown; description?: string };
            setLogs(prev => [...prev.slice(-500), `[gasless] submit: ${params.description || 'gasless tx'}`]);
            return stubGaslessSubmit(params);
        });
        bridge.on(BridgeMethods.BLINK_EXPORT, async (p) => {
            const params = p as { label?: string };
            setLogs(prev => [...prev.slice(-500), `[blink] export action: ${params.label}`]);
            return stubBlinkExport(params);
        });
        bridge.on(BridgeMethods.TAX_FORENSICS, async (p) => {
            const params = p as { since?: string };
            setLogs(prev => [...prev.slice(-500), `[tax] forensics requested`]);
            return stubTaxForensics(params);
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

    // ─── Console State ────────────────────────────────────
    const [consoleFilter, setConsoleFilter] = React.useState<"all" | "info" | "warn" | "error" | "event">("all");

    // ─── Render: Console Tab ────────────────────────────────
    if (tab === "code") {
        const filteredLogs = consoleFilter === "all"
            ? logs
            : logs.filter((log) => {
                if (consoleFilter === "info") return log.startsWith("[info]");
                if (consoleFilter === "warn") return log.startsWith("[warn]");
                if (consoleFilter === "error") return log.startsWith("[error]");
                if (consoleFilter === "event") return log.startsWith("[event]") || log.startsWith("[lit]") || log.startsWith("[mcp]") || log.startsWith("[jupiter]") || log.startsWith("[siws]");
                return true;
            });

        const errorCount = logs.filter((l) => l.startsWith("[error]")).length;
        const warnCount = logs.filter((l) => l.startsWith("[warn]")).length;

        return (
            <div className="h-full w-full bg-[#011627] flex flex-col font-mono text-xs">
                {/* Console Toolbar */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 shrink-0">
                    <div className="flex items-center gap-1">
                        {(["all", "info", "warn", "error", "event"] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setConsoleFilter(f)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                    consoleFilter === f
                                        ? f === "error" ? "bg-red-500/20 text-red-400"
                                        : f === "warn" ? "bg-yellow-500/20 text-yellow-400"
                                        : f === "event" ? "bg-cyan-500/20 text-cyan-400"
                                        : "bg-emerald-500/20 text-emerald-400"
                                        : "text-zinc-600 hover:text-zinc-400"
                                }`}
                            >
                                {f}
                                {f === "error" && errorCount > 0 && (
                                    <span className="ml-1 text-[9px]">({errorCount})</span>
                                )}
                                {f === "warn" && warnCount > 0 && (
                                    <span className="ml-1 text-[9px]">({warnCount})</span>
                                )}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setLogs([])}
                        className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-wider"
                    >
                        Clear
                    </button>
                </div>

                {/* Log entries */}
                <div className="flex-1 overflow-auto p-3">
                    {filteredLogs.length === 0 ? (
                        <div className="text-zinc-600 italic pt-4 text-center">
                            {logs.length === 0 ? "No logs yet \u2014 interact with your Mini-App" : `No ${consoleFilter} logs`}
                        </div>
                    ) : (
                        filteredLogs.map((log, i) => {
                            const isError = log.startsWith("[error]");
                            const isWarn = log.startsWith("[warn]");
                            const isEvent = log.startsWith("[event]") || log.startsWith("[lit]") || log.startsWith("[mcp]") || log.startsWith("[jupiter]");

                            return (
                                <div
                                    key={i}
                                    className={`py-1 border-b border-zinc-900/30 flex items-start gap-2 ${
                                        isError ? "text-red-400 bg-red-500/5"
                                        : isWarn ? "text-yellow-400"
                                        : isEvent ? "text-cyan-400"
                                        : "text-zinc-300"
                                    }`}
                                >
                                    <span className="text-zinc-700 shrink-0 select-none w-6 text-right">{i + 1}</span>
                                    <span className="break-all">{log}</span>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Status bar */}
                <div className="px-3 py-1 border-t border-zinc-800 text-[10px] text-zinc-600 flex items-center justify-between shrink-0">
                    <span>{logs.length} log entries</span>
                    <span>{errorCount > 0 ? `${errorCount} errors` : "No errors"}</span>
                </div>
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
                        onClick={() => { setError(null); setIsLoading(true); setRetryKey(k => k + 1); }}
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
                title="dreyv Mini-App Preview"
            />
        </div>
    );
}
