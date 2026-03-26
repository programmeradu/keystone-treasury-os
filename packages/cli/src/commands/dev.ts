/**
 * keystone dev — Local development server for Mini-App preview.
 *
 * Spins up a local HTTP server that injects the Keystone SDK bridge client,
 * watches for file changes, and provides hot-reload preview matching the
 * Studio's LivePreview.tsx environment.
 *
 * [Phase 3] — CLI Enhancement
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as http from "node:http";

const DEFAULT_PORT = 4200;

// ─── SDK Module (mirrors LivePreview's VIRTUAL_SDK_MODULE) ──────────
// This is the vanilla JS version of the SDK that runs inside the dev preview.

function buildSDKModule(): string {
  return `
    var React = window.React;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var useCallback = React.useCallback;

    var useVault = function() {
      var tokens = [
        { symbol: 'SOL', name: 'Solana', balance: 124.5, price: 23.40, mint: 'So11111111111111111111111111111111111111112', logoURI: '' },
        { symbol: 'USDC', name: 'USD Coin', balance: 5400.2, price: 1.00, mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', logoURI: '' },
        { symbol: 'BONK', name: 'Bonk', balance: 15000000, price: 0.000024, mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', logoURI: '' },
        { symbol: 'JUP', name: 'Jupiter', balance: 850, price: 1.12, mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', logoURI: '' },
      ];
      var balances = {};
      tokens.forEach(function(t) { balances[t.symbol] = t.balance; });
      return { activeVault: 'Main Portfolio', balances: balances, tokens: tokens };
    };

    var useTurnkey = function() {
      return {
        getPublicKey: function() { return Promise.resolve('7KeY...DeCv (Local Dev)'); },
        signTransaction: function(tx, desc) {
          console.log('[Turnkey] Sign request:', desc || 'Sign transaction');
          return Promise.resolve({ signature: 'dev_sig_' + Math.random().toString(36).slice(2, 10) });
        },
      };
    };

    var useFetch = function(url, options) {
      options = options || {};
      var _s = useState(null), data = _s[0], setData = _s[1];
      var _e = useState(null), error = _e[0], setError = _e[1];
      var _l = useState(true), loading = _l[0], setLoading = _l[1];
      var fetchData = useCallback(function() {
        setLoading(true); setError(null);
        return fetch(url, { method: options.method || 'GET', headers: options.headers || {}, body: options.body ? JSON.stringify(options.body) : undefined })
          .then(function(r) { return r.json(); })
          .then(function(d) { setData(d); })
          .catch(function(err) { setError(err.message); })
          .finally(function() { setLoading(false); });
      }, [url]);
      useEffect(function() { fetchData(); }, [fetchData]);
      return { data: data, error: error, loading: loading, refetch: fetchData };
    };

    var AppEventBus = {
      emit: function(type, payload) { console.log('[EventBus]', type, payload); },
    };

    var useEncryptedSecret = function() {
      return { encrypt: function(p) { return Promise.resolve('enc_' + btoa(p)); }, decrypt: function(c) { return Promise.resolve(atob(c.replace('enc_', ''))); }, loading: false, error: null };
    };
    var useACEReport = function() { return { report: [], loading: false, error: null, refetch: function() { return Promise.resolve(); } }; };
    var useAgentHandoff = function(from) { return { handoffTo: function(to, ctx) { console.log('[Agent] Handoff', from, '->', to); return Promise.resolve({ status: 'ok' }); } }; };
    var useMCPClient = function(url) { return { call: function(tool, params) { console.log('[MCP]', tool, params); return Promise.resolve({ result: 'mock' }); }, loading: false, error: null }; };
    var useMCPServer = function(tools, handlers) { return { registerTools: function() {}, handleCall: function(t, p) { return handlers[t] ? handlers[t](p) : Promise.reject(new Error('Unknown tool')); } }; };
    var useSIWS = function() { return { signIn: function() { return Promise.resolve({ message: 'SIWS', signature: 'mock_sig' }); }, verify: function() { return Promise.resolve(true); }, session: null }; };
    var useJupiterSwap = function() {
      return {
        swap: function(p) { return Promise.resolve({ swapTransaction: 'mock_tx', lastValidBlockHeight: 250000000, prioritizationFeeLamports: 50000 }); },
        getQuote: function(p) { return Promise.resolve({ inputMint: p.inputMint, outputMint: p.outputMint, inAmount: p.amount, outAmount: String(parseFloat(p.amount) * 23.42), priceImpactPct: 0.12, routePlan: [] }); },
        loading: false, error: null
      };
    };
    var useImpactReport = function() {
      return { simulate: function(tx) { return Promise.resolve({ before: { activeVault: 'Main', balances: {}, tokens: [] }, after: { activeVault: 'Main', balances: {}, tokens: [] }, diff: [{ symbol: 'SOL', delta: -1.0, percentChange: -0.8 }, { symbol: 'USDC', delta: 23.4, percentChange: 0.43 }] }); }, report: null, loading: false, error: null };
    };
    var useTaxForensics = function() { return { result: null, loading: false, error: null, refetch: function() { return Promise.resolve(); } }; };
    var useYieldOptimizer = function() { return { paths: [], loading: false, error: null, refetch: function() { return Promise.resolve(); } }; };
    var useGaslessTx = function() { return { submit: function(tx) { return Promise.resolve({ signature: 'gasless_dev_' + Math.random().toString(36).slice(2, 8) }); }, loading: false, error: null }; };

    var usePortfolio = function() {
      var vault = useVault();
      return { data: { tokens: vault.tokens, totalValue: vault.tokens.reduce(function(s,t) { return s + t.balance * t.price; }, 0) }, isLoading: false, error: null, refetch: function() {} };
    };

    var useTheme = function() {
      return { isDark: true, theme: 'dark', toggleTheme: function() { console.log('[Theme] Toggle'); } };
    };

    var useTokenPrice = function(mint) {
      var prices = { 'So11111111111111111111111111111111111111112': 23.40, 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 1.00, 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 0.000024, 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 1.12 };
      return { price: prices[mint] || 0, loading: false };
    };

    var useNotification = function() {
      var _n = useState([]), notifications = _n[0], setNotifications = _n[1];
      return {
        notifications: notifications,
        send: function(title, opts) { var id = 'notif_' + Date.now().toString(36); setNotifications(function(p) { return [{ id: id, type: (opts && opts.type) || 'info', title: title, message: opts && opts.message, timestamp: Date.now(), read: false }].concat(p); }); return id; },
        dismiss: function(id) { setNotifications(function(p) { return p.filter(function(n) { return n.id !== id; }); }); },
        markRead: function(id) { setNotifications(function(p) { return p.map(function(n) { return n.id === id ? Object.assign({}, n, { read: true }) : n; }); }); },
        clearAll: function() { setNotifications([]); },
        unreadCount: notifications.filter(function(n) { return !n.read; }).length
      };
    };

    var useStorage = function(ns) {
      var prefix = ns ? 'ks_app_' + ns + '_' : 'ks_app_';
      return {
        get: function(k) { try { return localStorage.getItem(prefix + k); } catch(e) { return null; } },
        set: function(k, v) { try { localStorage.setItem(prefix + k, v); } catch(e) {} },
        remove: function(k) { try { localStorage.removeItem(prefix + k); } catch(e) {} },
        keys: function() { var r = []; try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(prefix) === 0) r.push(k.slice(prefix.length)); } } catch(e) {} return r; },
        clear: function() { try { var rm = []; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(prefix) === 0) rm.push(k); } rm.forEach(function(k) { localStorage.removeItem(k); }); } catch(e) {} }
      };
    };

    var exportsObj = {
      useVault: useVault, useTurnkey: useTurnkey, useFetch: useFetch, AppEventBus: AppEventBus,
      useEncryptedSecret: useEncryptedSecret, useACEReport: useACEReport, useAgentHandoff: useAgentHandoff,
      useMCPClient: useMCPClient, useMCPServer: useMCPServer, useSIWS: useSIWS, useJupiterSwap: useJupiterSwap,
      useImpactReport: useImpactReport, useTaxForensics: useTaxForensics, useYieldOptimizer: useYieldOptimizer,
      useGaslessTx: useGaslessTx, usePortfolio: usePortfolio, useTheme: useTheme, useTokenPrice: useTokenPrice,
      useNotification: useNotification, useStorage: useStorage
    };
    window.__keystoneSDK = Object.assign({}, exportsObj, { default: exportsObj });
    window.__keystoneSDK.__esModule = true;
  `;
}

function buildHTML(appCode: string): string {
  const normalizedCode = appCode
    .replace(/from\s+['"]\.\/keystone['"]/g, 'from "@keystone-os/sdk"')
    .replace(/from\s+['"]keystone-api['"]/g, 'from "@keystone-os/sdk"');

  const escapedCode = JSON.stringify(normalizedCode);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Keystone Dev Server</title>
  <script src="https://unpkg.com/react@18.2.0/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18.2.0/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone@7.26.2/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; background: #09090b; color: white; font-family: system-ui, -apple-system, sans-serif; min-height: 100vh; }
    #root { min-height: 100vh; }
  </style>
  <script>
    (function() { ${buildSDKModule()} })();
  </script>
  <script>
    (function() {
      var moduleMap = { 'react': window.React, 'react-dom': window.ReactDOM, 'react-dom/client': window.ReactDOM, '@keystone-os/sdk': window.__keystoneSDK };
      window.__ks_require = function(name) { if (moduleMap[name]) return moduleMap[name]; throw new Error('[Keystone] Module not found: ' + name); };
    })();
  </script>
</head>
<body>
  <div id="root"></div>
  <script>
    (function() {
      try {
        var rawCode = ${escapedCode};
        var compiled = Babel.transform(rawCode, { presets: ['typescript', 'react'], plugins: ['transform-modules-commonjs'], filename: 'App.tsx', retainLines: true });
        var _module = { exports: {} };
        var fn = new Function('require', 'module', 'exports', compiled.code);
        fn(window.__ks_require, _module, _module.exports);
        var App = _module.exports.default || _module.exports;
        if (typeof App !== 'function') throw new Error('App.tsx must export a default React component');
        ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
      } catch (err) {
        var rootEl = document.getElementById('root');
        rootEl.innerHTML = '<div style="color:#ef4444;padding:20px;font-family:monospace">' +
          '<strong style="color:#f87171">Runtime Error</strong><br/>' +
          '<span id="ks-err-msg" style="color:#fca5a5"></span></div>';
        document.getElementById('ks-err-msg').textContent = err.message || err;
        console.error(err);
      }
    })();
  </script>
  <script>
    // Auto-reload on file changes (poll-based)
    (function() {
      var lastHash = '';
      setInterval(function() {
        fetch('/__keystone_dev_hash')
          .then(function(r) { return r.text(); })
          .then(function(hash) {
            if (lastHash && hash !== lastHash) { location.reload(); }
            lastHash = hash;
          })
          .catch(function() {});
      }, 1000);
    })();
  </script>
</body>
</html>`;
}

// ─── Dev Server ─────────────────────────────────────────────────────

export interface DevOptions {
  port?: number;
  dir?: string;
}

export function runDev(options: DevOptions = {}): void {
  const dir = path.resolve(process.cwd(), options.dir || ".");
  const port = options.port || DEFAULT_PORT;

  const appPath = path.join(dir, "App.tsx");
  if (!fs.existsSync(appPath)) {
    console.error(`\n❌ No App.tsx found in ${dir}`);
    console.error("   Run 'keystone init' first to scaffold a Mini-App.\n");
    process.exit(1);
  }

  let contentHash = "";

  function getAppCode(): string {
    return fs.readFileSync(appPath, "utf-8");
  }

  function computeHash(content: string): string {
    // Simple hash — enough for change detection
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0;
    }
    return hash.toString(36);
  }

  // Watch for changes
  let watchTimer: NodeJS.Timeout | null = null;
  fs.watch(dir, { recursive: true }, () => {
    if (watchTimer) clearTimeout(watchTimer);
    watchTimer = setTimeout(() => {
      const code = getAppCode();
      contentHash = computeHash(code);
    }, 200);
  });

  // Initial hash
  contentHash = computeHash(getAppCode());

  const server = http.createServer((req, res) => {
    if (req.url === "/__keystone_dev_hash") {
      res.writeHead(200, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
      res.end(contentHash);
      return;
    }

    // Serve the preview HTML
    const appCode = getAppCode();
    contentHash = computeHash(appCode);
    const html = buildHTML(appCode);

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  });

  server.listen(port, () => {
    console.log(`\n🚀 Keystone Dev Server running at http://localhost:${port}`);
    console.log(`   Watching: ${appPath}`);
    console.log(`   Auto-reload: enabled (1s poll)`);
    console.log(`\n   Press Ctrl+C to stop.\n`);
  });
}
