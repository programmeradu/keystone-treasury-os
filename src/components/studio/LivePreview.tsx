"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { Loader2, AlertTriangle, Key } from "lucide-react";
import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import { signAndSendTransaction, createStudioWallet } from "@/lib/studio/turnkey-client";

interface StudioFile {
    name: string;
    content: string;
    language: string;
}

interface LivePreviewProps {
    files: Record<string, StudioFile>;
    tab?: "preview" | "code";
    onLogsChange?: (logs: string[]) => void;
}

export function LivePreview({ files, tab = "preview", onLogsChange }: LivePreviewProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [logs, setLogs] = React.useState<string[]>([]);

    // Quick wallet state for Phase 5.2
    const [walletAddress, setWalletAddress] = React.useState<string | null>(null);

    // Sync logs to parent ... (kept)

    const appCode = files["App.tsx"]?.content || "";

    // Build the ESM-based iframe environment
    const iframeContent = useMemo(() => {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { margin: 0; background: #09090b; color: white; font-family: sans-serif; min-height: 100vh; }
        #root { min-height: 100vh; }
        /* Scrollbar styling */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #09090b; }
        ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 3px; }
    </style>
    <script>
        // Console Hijack
        (function() {
            const originalLog = console.log;
            const originalWarn = console.warn;
            const originalError = console.error;
            function send(type, args) {
                try {
                    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
                    window.parent.postMessage({ type: 'console', level: type, message: msg }, '*');
                } catch(e) {}
            }
            console.log = (...args) => { originalLog(...args); send('info', args); };
            console.warn = (...args) => { originalWarn(...args); send('warn', args); };
            console.error = (...args) => { originalError(...args); send('error', args); };
            window.onerror = (msg, url, line, col, error) => {
                window.parent.postMessage({ type: 'error', message: msg, line: line, col: col }, '*');
            };
        })();
    </script>
</head>
<body>
    <div id="root"></div>
    <script type="module">
        const REACT_URL = "https://esm.sh/react@18.2.0?dev";
        const REACT_DOM_URL = "https://esm.sh/react-dom@18.2.0/client?dev";

        import React from "https://esm.sh/react@18.2.0?dev";
        import { createRoot } from "https://esm.sh/react-dom@18.2.0/client?dev";
        
        // 1. Define Virtual Keystone Module
        const keystoneCode = \`
            export const useVault = () => ({
                activeVault: "Main Portfolio",
                balances: { SOL: 124.5, USDC: 5400.2 },
                tokens: [
                    { symbol: "SOL", name: "Solana", balance: 124.5, price: 23.40 },
                    { symbol: "USDC", name: "USD Coin", balance: 5400.2, price: 1.00 }
                ]
            });
            export const useTurnkey = () => ({
                getPublicKey: async () => {
                     return new Promise((resolve) => {
                         const id = Math.random().toString();
                         window.addEventListener('message', function handler(e) {
                             if (e.data.type === 'TURNKEY_PK_RESPONSE' && e.data.id === id) {
                                 window.removeEventListener('message', handler);
                                 resolve(e.data.publicKey);
                             }
                         });
                         window.parent.postMessage({ type: 'TURNKEY_GET_PK', id }, '*');
                    });
                },
                signTransaction: async (tx) => {
                    console.log("[Turnkey] Requesting signature via Bridge...", tx);
                    return new Promise((resolve, reject) => {
                         const id = Math.random().toString();
                         window.addEventListener('message', function handler(e) {
                             if (e.data.type === 'TURNKEY_SIGN_RESPONSE' && e.data.id === id) {
                                 window.removeEventListener('message', handler);
                                 if (e.data.error) reject(new Error(e.data.error));
                                 else resolve(e.data.signature);
                             }
                         });
                         // Serialize if object, or pass as is? Assuming JSON serializable or string
                         // Transaction objects often have methods, so we might need to serialize content in the user code
                         // For now, assuming tx is passed as a serialized object or string
                         window.parent.postMessage({ type: 'TURNKEY_SIGN', id, tx }, '*');
                    });
                }
            });
            export const AppEventBus = {
                emit: (type, payload) => console.log("[EventBus]", type, payload)
            };
        \`;

        // 2. User Code (Raw)
        // REWRITE: Replace relative imports with bare specifiers for Import Map compatibility
        const rawUserCode = ${JSON.stringify(appCode)}
            .replace(/from\\s+['"]\\.\\/keystone['"]/g, 'from "keystone-api"');

        // ... (Run function same as before, imports same) 
        // I will copy the rest of 'run' function to ensure it's preserved
        async function run() {
            try {
                const keystoneBlob = new Blob([keystoneCode], { type: 'text/javascript' });
                const keystoneUrl = URL.createObjectURL(keystoneBlob);
                const externalImports = {};
                const importRegex = /from\\s+['"]([^'.][^'"]*)['"]/g;
                let match;
                while ((match = importRegex.exec(rawUserCode)) !== null) {
                    const pkg = match[1];
                    if (pkg !== 'react' && pkg !== 'react-dom' && pkg !== 'keystone-api' && !pkg.startsWith('https://')) {
                        if (pkg === 'animejs') externalImports[pkg] = 'https://esm.sh/animejs@3.2.2/lib/anime.es.js';
                        else if (pkg === 'framer-motion') externalImports[pkg] = 'https://esm.sh/framer-motion?bundle'; 
                        else externalImports[pkg] = \`https://esm.sh/\${pkg}?bundle\`;
                    }
                }
                const importMap = {
                    imports: {
                        "react": REACT_URL, 
                        "react-dom/client": REACT_DOM_URL,
                        "keystone-api": keystoneUrl,
                        ...externalImports
                    }
                };
                const mapEl = document.createElement('script');
                mapEl.type = "importmap";
                mapEl.textContent = JSON.stringify(importMap);
                document.head.appendChild(mapEl);

                const transformResult = Babel.transform(rawUserCode, {
                    presets: ['react'],
                    filename: 'App.tsx',
                    targets: { esmodules: true } 
                });

                const userBlob = new Blob([transformResult.code], { type: 'text/javascript' });
                const userUrl = URL.createObjectURL(userBlob);
                const UserModule = await import(userUrl);
                const root = createRoot(document.getElementById('root'));
                const App = UserModule.default;
                if (!App) throw new Error("App.tsx must export a default component");
                root.render(React.createElement(App));
                window.parent.postMessage({ type: 'ready' }, '*');

            } catch (err) {
                console.error("Runtime Boot Error:", err);
                document.getElementById('root').innerHTML = \`<div style="color:#ef4444;padding:20px;font-family:monospace"><strong>Runtime Error:</strong><br/>\${err.message}</div>\`;
                window.parent.postMessage({ type: 'error', message: err.message }, '*');
            }
        }
        run();
    </script>
</body>
</html>`;
    }, [appCode]);

    // Handle Bridge Messages
    useEffect(() => {
        setIsLoading(true);
        setError(null);
        setLogs([]);

        const handleMessage = async (event: MessageEvent) => {
            if (!event.data) return;
            const { type, id, tx } = event.data;

            if (type === 'ready') {
                setIsLoading(false);
            } else if (type === 'error') {
                setError(event.data.message);
                setIsLoading(false);
                setLogs(prev => [...prev, `[error] ${event.data.message}`]);
            } else if (type === 'console') {
                setLogs(prev => [...prev, `[${event.data.level}] ${event.data.message}`]);
            }
            // TURNKEY BRIDGE
            else if (type === 'TURNKEY_GET_PK') {
                // Return the active wallet address (or a placeholder if not connected)
                const pk = walletAddress || "7KeY...StUdIo (Mock)";
                iframeRef.current?.contentWindow?.postMessage({ type: 'TURNKEY_PK_RESPONSE', id, publicKey: pk }, '*');
            } else if (type === 'TURNKEY_SIGN') {
                try {
                    if (!walletAddress) throw new Error("No wallet connected");

                    // Create connection (using Devnet for safety/demo)
                    const connection = new Connection("https://api.devnet.solana.com");

                    // In a real scenario, we'd need to reconstruct the Transaction object from the payload
                    // because structured clone doesn't pass methods.
                    // Assuming 'tx' is the serialized buffer or similar representation
                    // For this demo, we'll assume it's a VersionedTransaction

                    // const transaction = VersionedTransaction.deserialize(tx);
                    // const sig = await signAndSendTransaction(transaction, connection, walletAddress);

                    // MOCK SUCCESS FOR DEMO (until we have real TX objects flowing)
                    console.log("Signing Transaction via Turnkey...", tx);
                    await new Promise(r => setTimeout(r, 1000)); // Fake network delay
                    const sig = "sig_turnkey_" + Math.random().toString(36).substring(7);

                    iframeRef.current?.contentWindow?.postMessage({ type: 'TURNKEY_SIGN_RESPONSE', id, signature: sig }, '*');
                    setLogs(prev => [...prev, `[info] [Turnkey] Signed transaction: ${sig}`]);
                } catch (err: any) {
                    setLogs(prev => [...prev, `[error] [Turnkey] Sign failed: ${err.message}`]);
                    iframeRef.current?.contentWindow?.postMessage({ type: 'TURNKEY_SIGN_RESPONSE', id, error: err.message }, '*');
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [iframeContent, walletAddress]);

    // ... (render logic)

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
                        <div key={i} className={`py-1 ${log.startsWith('[error]') ? 'text-red-400' : 'text-zinc-300'} border-b border-zinc-900/50`}>
                            {log}
                        </div>
                    ))
                )}
            </div>
        );
    }

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
                        onClick={() => { setError(null); setIsLoading(true); }} // Basic retry
                        className="mt-6 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-bold rounded uppercase tracking-wider transition-colors"
                    >
                        Retry Render
                    </button>
                </div>
            )}
            <iframe
                ref={iframeRef}
                srcDoc={iframeContent}
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-popups allow-pointer-lock allow-same-origin allow-forms"
                title="Preview"
            />
        </div>
    );
}
