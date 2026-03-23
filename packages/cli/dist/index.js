#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.ts
var import_commander = require("commander");

// src/commands/init.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var STARTER_APP = `import React, { useState } from 'react';
import {
  useVault,
  useJupiterSwap,
  useImpactReport,
  useTurnkey,
} from '@keystone-os/sdk';

export default function App() {
  const { tokens, activeVault } = useVault();
  const { getQuote, swap, loading: swapLoading, error: swapError } = useJupiterSwap();
  const { simulate, report } = useImpactReport();
  const { signTransaction } = useTurnkey();
  const [quote, setQuote] = useState(null);
  const [amount, setAmount] = useState('1000000');

  const handleGetQuote = async () => {
    const q = await getQuote({
      inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      amount,
      slippageBps: 50,
    });
    setQuote(q);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      {/* \u2500\u2500\u2500 Header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Sovereign OS Mini-App
        </h1>
        <p className="text-zinc-500 mt-1 text-sm">
          Vault: <span className="text-emerald-400">{activeVault}</span>
        </p>
      </div>

      {/* \u2500\u2500\u2500 Token Balances \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {tokens.map((t) => (
          <div
            key={t.symbol}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-lg font-semibold">{t.symbol}</p>
              <p className="text-xs text-zinc-500">{t.name}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-mono">{t.balance.toLocaleString()}</p>
              <p className="text-xs text-emerald-400">
                \${(t.balance * t.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* \u2500\u2500\u2500 Jupiter Swap \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-bold text-cyan-400 mb-4">\u26A1 Jupiter Swap</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-zinc-500 block mb-1">Amount (lamports)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-zinc-800 rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:border-emerald-500 outline-none"
            />
          </div>
          <button
            onClick={handleGetQuote}
            disabled={swapLoading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
          >
            {swapLoading ? 'Loading...' : 'Get Quote'}
          </button>
        </div>

        {quote && (
          <div className="mt-4 bg-zinc-800/50 rounded-lg p-4 text-sm font-mono">
            <p>Input: {quote.inAmount} \u2192 Output: {quote.outAmount}</p>
            <p className="text-zinc-500">Price Impact: {quote.priceImpactPct}%</p>
          </div>
        )}

        {swapError && (
          <p className="mt-3 text-red-400 text-sm">{swapError}</p>
        )}
      </div>

      {/* \u2500\u2500\u2500 Impact Report \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      {report && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-bold text-amber-400 mb-3">\u{1F4CA} Impact Report</h2>
          <div className="space-y-2 text-sm">
            {report.diff.map((d) => (
              <div key={d.symbol} className="flex justify-between">
                <span>{d.symbol}</span>
                <span className={d.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {d.delta >= 0 ? '+' : ''}{d.delta.toFixed(4)} ({d.percentChange.toFixed(2)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
`;
var LOCKFILE = {
  version: "1.0.0",
  packages: {
    react: {
      url: "https://esm.sh/react@19.0.0",
      types: "https://esm.sh/v135/@types/react@19.0.0/index.d.ts",
      external: true
    },
    "react-dom": {
      url: "https://esm.sh/react-dom@19.0.0",
      types: "https://esm.sh/v135/@types/react-dom@19.0.0/index.d.ts",
      external: true
    },
    "@keystone-os/sdk": {
      url: "https://esm.sh/@keystone-os/sdk",
      types: "https://esm.sh/@keystone-os/sdk",
      external: false
    }
  }
};
function runInit(dir) {
  const targetDir = path.resolve(process.cwd(), dir || ".");
  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    throw new Error(`Directory ${targetDir} is not empty.`);
  }
  const appName = path.basename(targetDir) || "my-keystone-app";
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, "App.tsx"), STARTER_APP);
  fs.writeFileSync(
    path.join(targetDir, "keystone.lock.json"),
    JSON.stringify(LOCKFILE, null, 2)
  );
  const config = {
    name: appName,
    description: `A Keystone mini-app`,
    wallet: "",
    cluster: "devnet",
    category: "utility",
    provider: "cloudflare"
  };
  fs.writeFileSync(
    path.join(targetDir, "keystone.config.json"),
    JSON.stringify(config, null, 2) + "\n"
  );
  fs.writeFileSync(
    path.join(targetDir, "README.md"),
    `# ${appName}

Built with \`@keystone-os/sdk\` \u2014 Keystone Sovereign OS.

## Quick Start
\`\`\`bash
# Preview locally
keystone dev

# Ship to marketplace (ONE command)
keystone ship
\`\`\`

## SDK Hooks Available
- **useVault** \u2014 Token balances
- **usePortfolio** \u2014 Portfolio data with USD values
- **useJupiterSwap** \u2014 Token swaps via Jupiter
- **useTheme** \u2014 Dark/light mode
- **useTokenPrice** \u2014 Live token prices
- **useNotification** \u2014 In-app notifications
- **useStorage** \u2014 Persistent key-value storage
- **useImpactReport** \u2014 Transaction simulation
- **useTurnkey** \u2014 Institutional signing

## Configuration
Edit \`keystone.config.json\` to set your wallet, app name, and cluster.
`
  );
  console.log(`
  Created Keystone Mini-App in ${targetDir}
`);
  console.log("  App.tsx              \u2014 Starter app with Vault + Jupiter Swap");
  console.log("  keystone.config.json \u2014 Project configuration");
  console.log("  keystone.lock.json   \u2014 Pinned dependency map");
  console.log("  README.md            \u2014 Getting started guide");
  console.log(`
Next steps:`);
  console.log(`  cd ${dir || "."}`);
  console.log(`  Edit keystone.config.json (set your wallet address)`);
  console.log(`  keystone dev          \u2014 Preview locally`);
  console.log(`  keystone ship         \u2014 Ship to marketplace
`);
}

// src/commands/validate.ts
var fs2 = __toESM(require("fs"));
var path2 = __toESM(require("path"));
var FORBIDDEN_PATTERNS = [
  { pattern: /\bfetch\s*\(/g, msg: "Direct fetch() is blocked. Use useFetch() from '@keystone-os/sdk'." },
  { pattern: /\blocalStorage\b/g, msg: "localStorage is blocked in sandbox." },
  { pattern: /\bsessionStorage\b/g, msg: "sessionStorage is blocked in sandbox." },
  { pattern: /\bdocument\.cookie\b/g, msg: "document.cookie is blocked in sandbox." },
  { pattern: /\bwindow\.parent\.postMessage\b/g, msg: "window.parent.postMessage is reserved for SDK." },
  { pattern: /\beval\s*\(/g, msg: "eval() is blocked by CSP." },
  { pattern: /\bnew\s+Function\s*\(/g, msg: "new Function() is blocked by CSP." }
];
var AST_PATTERNS = [
  {
    // Dynamic import() — can load arbitrary code
    pattern: /\bimport\s*\(\s*[^)]+\)/g,
    msg: "Dynamic import() is blocked in sandbox. Declare imports statically.",
    suggestion: "Use static imports: import { ... } from '@keystone-os/sdk';"
  },
  {
    // XMLHttpRequest — bypass proxy gate
    pattern: /\bnew\s+XMLHttpRequest\b/g,
    msg: "XMLHttpRequest is blocked. Use useFetch() from '@keystone-os/sdk'.",
    suggestion: "Replace with: const { data } = useFetch(url);"
  },
  {
    // WebSocket — non-proxied network access
    pattern: /\bnew\s+WebSocket\b/g,
    msg: "WebSocket is blocked in sandbox. Use useMCPClient() for real-time communication.",
    suggestion: "Replace with: const mcp = useMCPClient(serverUrl);"
  },
  {
    // Worker — spawn threads
    pattern: /\bnew\s+Worker\s*\(/g,
    msg: "Web Workers are blocked in sandbox."
  },
  {
    // SharedWorker
    pattern: /\bnew\s+SharedWorker\s*\(/g,
    msg: "SharedWorker is blocked in sandbox."
  },
  {
    // window.open — popup
    pattern: /\bwindow\.open\s*\(/g,
    msg: "window.open() is blocked in sandbox."
  },
  {
    // document.write — XSS vector
    pattern: /\bdocument\.write\s*\(/g,
    msg: "document.write() is blocked \u2014 XSS risk."
  },
  {
    // innerHTML assignment — XSS vector
    pattern: /\.innerHTML\s*=/g,
    msg: "Direct innerHTML assignment is a XSS risk. Use React's JSX for DOM manipulation.",
    suggestion: "Use React state and JSX instead of innerHTML."
  },
  {
    // Crypto mining detection
    pattern: /\bCoinHive\b|\bcoinhive\b|\bcryptominer\b/gi,
    msg: "Suspected crypto mining code detected."
  },
  {
    // Dangerous protocol URLs
    pattern: /['"`]javascript:/gi,
    msg: "javascript: protocol URLs are blocked \u2014 XSS risk."
  },
  {
    // Access to __proto__ — prototype pollution
    pattern: /\b__proto__\b/g,
    msg: "__proto__ access is blocked \u2014 prototype pollution risk."
  },
  {
    // Access to constructor.constructor — function creation bypass
    pattern: /\.constructor\s*\.\s*constructor/g,
    msg: "constructor.constructor chain is blocked \u2014 code execution bypass risk."
  }
];
function getSuggestion(error) {
  if (error.message.includes("fetch()")) {
    return `Replace fetch(url) with: const { data } = useFetch(url);`;
  }
  if (error.message.includes("localStorage")) {
    return `Use useEncryptedSecret() from '@keystone-os/sdk' for persistent storage.`;
  }
  if (error.message.includes("sessionStorage")) {
    return `Use in-memory state or useEncryptedSecret() from '@keystone-os/sdk'.`;
  }
  if (error.message.includes("document.cookie")) {
    return `Use useSIWS() from '@keystone-os/sdk' for session/auth.`;
  }
  if (error.message.includes("postMessage")) {
    return `Use AppEventBus.emit() from '@keystone-os/sdk' for host communication.`;
  }
  return void 0;
}
function runValidate(dir = ".", options) {
  const targetDir = path2.resolve(process.cwd(), dir);
  const errors = [];
  const warnings = [];
  const files = ["App.tsx", "app.tsx"];
  for (const file of files) {
    const filePath = path2.join(targetDir, file);
    if (!fs2.existsSync(filePath)) continue;
    const content = fs2.readFileSync(filePath, "utf-8");
    for (const { pattern, msg } of FORBIDDEN_PATTERNS) {
      const re = new RegExp(pattern.source, pattern.flags);
      let m;
      while ((m = re.exec(content)) !== null) {
        const lineNum = content.slice(0, m.index).split("\n").length;
        const err = { file, line: lineNum, message: msg, severity: "error" };
        if (options?.suggest) {
          err.suggestion = getSuggestion(err);
        }
        errors.push(err);
      }
    }
    for (const { pattern, msg, suggestion } of AST_PATTERNS) {
      const re = new RegExp(pattern.source, pattern.flags);
      let m;
      while ((m = re.exec(content)) !== null) {
        const lineNum = content.slice(0, m.index).split("\n").length;
        const entry = {
          file,
          line: lineNum,
          message: msg,
          severity: msg.includes("risk") ? "warning" : "error"
        };
        if (options?.suggest && suggestion) {
          entry.suggestion = suggestion;
        }
        if (entry.severity === "warning") {
          warnings.push(entry);
        } else {
          errors.push(entry);
        }
      }
    }
    const hasSdkImport = /from\s+['"]@keystone-os\/sdk['"]/.test(content);
    const hasForbidden = FORBIDDEN_PATTERNS.some((p) => new RegExp(p.pattern.source).test(content));
    if (!hasSdkImport && hasForbidden) {
      const err = {
        file,
        line: 1,
        message: "Use '@keystone-os/sdk' for fetch/vault/turnkey instead of raw APIs.",
        severity: "error"
      };
      if (options?.suggest) {
        err.suggestion = `Add: import { useFetch, useVault } from '@keystone-os/sdk';`;
      }
      errors.push(err);
    }
  }
  const suggestions = options?.suggest ? [...errors, ...warnings].map((e) => e.suggestion).filter(Boolean) : void 0;
  return { ok: errors.length === 0, errors, warnings, suggestions };
}

// src/commands/lockfile.ts
var fs3 = __toESM(require("fs"));
var path3 = __toESM(require("path"));
var ESM_SH_REGEX = /^https:\/\/esm\.sh\//;
var EXTERNAL_PARAM = "external=react,react-dom";
function validateLockfile(dir = ".") {
  const targetDir = path3.resolve(process.cwd(), dir);
  const lockPath = path3.join(targetDir, "keystone.lock.json");
  const errors = [];
  if (!fs3.existsSync(lockPath)) {
    return { ok: true, errors: [] };
  }
  const raw = fs3.readFileSync(lockPath, "utf-8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, errors: [{ package: "lockfile", message: "Invalid JSON" }] };
  }
  const packages = data.packages ?? {};
  const skipPackages = /* @__PURE__ */ new Set(["react", "react-dom", "react-dom/client", "@keystone-os/sdk"]);
  for (const [name, pkg] of Object.entries(packages)) {
    if (skipPackages.has(name)) continue;
    const url = pkg.url;
    if (!url || typeof url !== "string") continue;
    if (url.startsWith("blob:") || url.startsWith("file:")) continue;
    if (!ESM_SH_REGEX.test(url)) continue;
    if (!url.includes("?")) {
      errors.push({
        package: name,
        message: `esm.sh URL must include ?external=react,react-dom`,
        fix: `${url}?external=react,react-dom`
      });
    } else if (!url.includes(EXTERNAL_PARAM) && !url.includes("external=")) {
      const sep = url.includes("?") ? "&" : "?";
      errors.push({
        package: name,
        message: `esm.sh URL must include external=react,react-dom`,
        fix: `${url}${sep}external=react,react-dom`
      });
    }
  }
  return { ok: errors.length === 0, errors };
}

// src/commands/build.ts
var fs4 = __toESM(require("fs"));
var path4 = __toESM(require("path"));
async function runBuild(options = {}) {
  const targetDir = path4.resolve(process.cwd(), options.dir ?? ".");
  const outDir = options.outDir ?? path4.join(targetDir, "dist");
  const appPath = path4.join(targetDir, "App.tsx");
  if (!fs4.existsSync(appPath)) {
    return { ok: false, error: "App.tsx not found" };
  }
  const raw = fs4.readFileSync(appPath, "utf-8");
  let bundle = raw;
  fs4.mkdirSync(outDir, { recursive: true });
  const outputPath = path4.join(outDir, "app.bundle.js");
  fs4.writeFileSync(outputPath, bundle);
  const manifest = {
    version: "1.0.0",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    files: ["app.bundle.js"],
    coldPath: null
  };
  if (options.anchorArweave) {
    manifest.coldPath = `arweave://pending`;
  }
  const manifestPath = path4.join(outDir, "manifest.json");
  fs4.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return {
    ok: true,
    outputPath,
    manifest: manifestPath,
    arweaveTxId: options.anchorArweave ? void 0 : void 0
  };
}

// src/commands/publish.ts
var fs6 = __toESM(require("fs"));
var path6 = __toESM(require("path"));
var crypto = __toESM(require("crypto"));

// src/commands/gatekeeper.ts
var fs5 = __toESM(require("fs"));
var path5 = __toESM(require("path"));
var EXTRA_FORBIDDEN = [
  { pattern: /\binnerHTML\s*=/g, msg: "innerHTML assignment is blocked (XSS risk)." },
  { pattern: /\bdangerouslySetInnerHTML\b/g, msg: "dangerouslySetInnerHTML requires explicit allowlist." },
  { pattern: /\bwindow\.solana\b/g, msg: "Direct window.solana access is blocked. Use useTurnkey() from SDK." },
  { pattern: /\bwindow\.ethereum\b/g, msg: "Direct window.ethereum access is blocked. Use SDK hooks." }
];
function runGatekeeper(dir = ".") {
  const targetDir = path5.resolve(process.cwd(), dir);
  const validate = runValidate(dir);
  const lockfile = validateLockfile(dir);
  const errors = [
    ...validate.errors.map((e) => ({ file: e.file, line: e.line, message: e.message })),
    ...lockfile.errors.map((e) => ({ file: "keystone.lock.json", line: 1, message: `${e.package}: ${e.message}` }))
  ];
  const files = ["App.tsx", "app.tsx"];
  for (const file of files) {
    const filePath = path5.join(targetDir, file);
    if (!fs5.existsSync(filePath)) continue;
    const content = fs5.readFileSync(filePath, "utf-8");
    for (const { pattern, msg } of EXTRA_FORBIDDEN) {
      const re = new RegExp(pattern.source, pattern.flags);
      let m;
      while ((m = re.exec(content)) !== null) {
        const lineNum = content.slice(0, m.index).split("\n").length;
        errors.push({ file, line: lineNum, message: msg });
      }
    }
  }
  const totalErrors = errors.length;
  const securityScore = Math.max(0, Math.min(100, 100 - totalErrors * 10));
  return {
    ok: totalErrors === 0,
    securityScore,
    validate,
    lockfile,
    errors
  };
}

// src/commands/publish.ts
function sha256Hex(data) {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}
function getClusterUrl(cluster) {
  return cluster === "mainnet-beta" ? "https://api.mainnet-beta.solana.com" : "https://api.devnet.solana.com";
}
async function uploadToArweave(bundlePath, privateKey, cluster) {
  try {
    const Irys = (await import("@irys/sdk")).default;
    const bs58 = (await import("bs58")).default;
    const irysOpts = {
      network: cluster === "mainnet-beta" ? "mainnet" : "devnet",
      token: "solana"
    };
    if (privateKey) {
      irysOpts.key = bs58.decode(privateKey);
      irysOpts.config = { providerUrl: getClusterUrl(cluster) };
    }
    const irys = new Irys(irysOpts);
    if (cluster !== "mainnet-beta") {
      try {
        await irys.fund(irys.utils.toAtomic(0.01));
      } catch (e) {
        console.warn("[publish] Irys fund skipped:", e.message);
      }
    }
    const bundle = fs6.readFileSync(bundlePath, "utf-8");
    const tags = [
      { name: "Content-Type", value: "application/javascript" },
      { name: "App-Name", value: "Keystone-OS" },
      { name: "App-Version", value: "1.0" },
      { name: "Type", value: "mini-app-bundle" }
    ];
    const tx = await irys.upload(bundle, { tags });
    console.log(`  Arweave TX: ${tx?.id}`);
    return tx?.id ?? null;
  } catch (err) {
    console.warn("[publish] Arweave upload failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
async function registerOnChain(opts) {
  try {
    const { Connection, Keypair, Transaction, TransactionInstruction, PublicKey } = await import("@solana/web3.js");
    const bs58 = (await import("bs58")).default;
    const connection = new Connection(getClusterUrl(opts.cluster), "confirmed");
    const keypair = Keypair.fromSecretKey(bs58.decode(opts.privateKey));
    const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
    const memoData = JSON.stringify({
      protocol: "keystone-os",
      version: "1.0",
      action: "register_app",
      app_id: opts.appId,
      name: opts.name,
      description: opts.description.slice(0, 200),
      code_hash: opts.codeHash,
      arweave_cid: opts.arweaveTxId || null,
      creator: opts.creatorWallet,
      price_usdc: opts.priceUsdc || 0,
      timestamp: Date.now()
    });
    const memoInstruction = new TransactionInstruction({
      keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: true }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoData, "utf-8")
    });
    const tx = new Transaction().add(memoInstruction);
    tx.feePayer = keypair.publicKey;
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.sign(keypair);
    const txId = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed"
    });
    await connection.confirmTransaction({ signature: txId, blockhash, lastValidBlockHeight }, "confirmed");
    return { txId };
  } catch (err) {
    console.warn("[publish] On-chain registration failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
async function registerToRegistry(apiUrl, payload, auth) {
  try {
    const baseUrl = apiUrl.replace(/\/$/, "");
    const headers = { "Content-Type": "application/json" };
    if (auth?.bearerToken) {
      headers["Authorization"] = `Bearer ${auth.bearerToken}`;
    } else if (auth?.privateKey) {
      try {
        const nonceRes = await fetch(`${baseUrl}/api/studio/publish/auth`);
        if (nonceRes.ok) {
          const { nonce } = await nonceRes.json();
          const { Keypair } = await import("@solana/web3.js");
          const bs58 = (await import("bs58")).default;
          const nacl = await import("tweetnacl");
          const keypair = Keypair.fromSecretKey(bs58.decode(auth.privateKey));
          const messageBytes = new TextEncoder().encode(nonce);
          const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
          headers["X-Keystone-Wallet"] = keypair.publicKey.toBase58();
          headers["X-Keystone-Signature"] = bs58.encode(Buffer.from(signature));
          headers["X-Keystone-Nonce"] = nonce;
        }
      } catch (e) {
        console.warn("[publish] Wallet signature auth failed, trying without auth:", e.message);
      }
    }
    const res = await fetch(`${baseUrl}/api/studio/publish`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `Registry returned ${res.status}`);
    }
    const json = await res.json();
    return json?.appId ? { appId: json.appId } : null;
  } catch (err) {
    console.warn("[publish] Registry sync skipped:", err instanceof Error ? err.message : err);
    return null;
  }
}
async function runPublish(options) {
  const targetDir = path6.resolve(process.cwd(), options.dir ?? ".");
  const appPath = path6.join(targetDir, "App.tsx");
  const cluster = options.cluster ?? "devnet";
  if (!fs6.existsSync(appPath)) {
    return { ok: false, error: "App.tsx not found. Run keystone init first." };
  }
  const code = fs6.readFileSync(appPath, "utf-8");
  const codeJson = JSON.stringify({ files: { "App.tsx": { content: code, language: "typescript" } } });
  console.log("  [1/4] Running security gatekeeper...");
  const gatekeeper = runGatekeeper(targetDir);
  if (!gatekeeper.ok) {
    return {
      ok: false,
      error: `Gatekeeper failed (score: ${gatekeeper.securityScore}). Fix errors:
${gatekeeper.errors.map((e) => `  ${e.file}:${e.line} \u2014 ${e.message}`).join("\n")}`,
      securityScore: gatekeeper.securityScore
    };
  }
  console.log(`  Security: ${gatekeeper.securityScore}/100`);
  console.log("  [2/4] Building bundle...");
  const build = await runBuild({ dir: targetDir, outDir: path6.join(targetDir, ".keystone", "dist") });
  if (!build.ok) {
    return { ok: false, error: build.error };
  }
  const bundlePath = build.outputPath;
  const bundleContent = fs6.readFileSync(bundlePath, "utf-8");
  const codeHash = sha256Hex(bundleContent);
  console.log(`  Code hash: ${codeHash.slice(0, 16)}...`);
  let arweaveTxId = null;
  if (!options.skipArweave && options.privateKey) {
    console.log("  [3/4] Uploading to Arweave via Irys...");
    arweaveTxId = await uploadToArweave(bundlePath, options.privateKey, cluster);
    if (arweaveTxId) {
      console.log(`  Arweave: https://arweave.net/${arweaveTxId}`);
    }
  } else if (!options.skipArweave) {
    console.log("  [3/4] Arweave skipped (no private key provided)");
  } else {
    console.log("  [3/4] Arweave skipped (--skip-arweave)");
  }
  const finalAppId = `app_${Date.now().toString(36)}`;
  let solanaTxId;
  let explorerUrl;
  if (options.privateKey) {
    console.log("  [4/4] Registering on Solana...");
    const onChain = await registerOnChain({
      privateKey: options.privateKey,
      cluster,
      appId: finalAppId,
      name: options.name,
      description: options.description,
      codeHash,
      arweaveTxId: arweaveTxId ?? void 0,
      creatorWallet: options.creatorWallet,
      priceUsdc: options.priceUsdc
    });
    if (onChain) {
      solanaTxId = onChain.txId;
      explorerUrl = `https://explorer.solana.com/tx/${solanaTxId}?cluster=${cluster}`;
      console.log(`  Solana TX: ${solanaTxId}`);
    }
  } else {
    console.log("  [4/4] On-chain registration skipped (no private key)");
  }
  if (options.apiUrl) {
    await registerToRegistry(
      options.apiUrl,
      {
        name: options.name,
        description: options.description,
        code: codeJson,
        creatorWallet: options.creatorWallet,
        arweaveTxId: arweaveTxId ?? void 0,
        codeHash,
        securityScore: gatekeeper.securityScore,
        category: options.category ?? "utility"
      },
      {
        bearerToken: options.bearerToken,
        privateKey: options.privateKey
      }
    );
  }
  return {
    ok: true,
    appId: finalAppId,
    arweaveTxId: arweaveTxId ?? void 0,
    codeHash,
    securityScore: gatekeeper.securityScore,
    solanaTxId,
    explorerUrl
  };
}

// src/commands/dev.ts
var fs7 = __toESM(require("fs"));
var path7 = __toESM(require("path"));
var http = __toESM(require("http"));
var DEFAULT_PORT = 4200;
function buildSDKModule() {
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
function buildHTML(appCode) {
  const normalizedCode = appCode.replace(/from\s+['"]\.\/keystone['"]/g, 'from "@keystone-os/sdk"').replace(/from\s+['"]keystone-api['"]/g, 'from "@keystone-os/sdk"');
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
          '<span id="cli-err" style="color:#fca5a5"></span></div>';
        document.getElementById('cli-err').textContent = err.message || String(err);
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
function runDev(options = {}) {
  const dir = path7.resolve(process.cwd(), options.dir || ".");
  const port = options.port || DEFAULT_PORT;
  const appPath = path7.join(dir, "App.tsx");
  if (!fs7.existsSync(appPath)) {
    console.error(`
\u274C No App.tsx found in ${dir}`);
    console.error("   Run 'keystone init' first to scaffold a Mini-App.\n");
    process.exit(1);
  }
  let contentHash = "";
  function getAppCode() {
    return fs7.readFileSync(appPath, "utf-8");
  }
  function computeHash(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = (hash << 5) - hash + content.charCodeAt(i) | 0;
    }
    return hash.toString(36);
  }
  let watchTimer = null;
  fs7.watch(dir, { recursive: true }, () => {
    if (watchTimer) clearTimeout(watchTimer);
    watchTimer = setTimeout(() => {
      const code = getAppCode();
      contentHash = computeHash(code);
    }, 200);
  });
  contentHash = computeHash(getAppCode());
  const server = http.createServer((req, res) => {
    if (req.url === "/__keystone_dev_hash") {
      res.writeHead(200, { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" });
      res.end(contentHash);
      return;
    }
    const appCode = getAppCode();
    contentHash = computeHash(appCode);
    const html = buildHTML(appCode);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  });
  server.listen(port, () => {
    console.log(`
\u{1F680} Keystone Dev Server running at http://localhost:${port}`);
    console.log(`   Watching: ${appPath}`);
    console.log(`   Auto-reload: enabled (1s poll)`);
    console.log(`
   Press Ctrl+C to stop.
`);
  });
}

// src/commands/generate.ts
var fs8 = __toESM(require("fs"));
var path8 = __toESM(require("path"));
async function callLLMDirect(prompt, provider, apiKey, model) {
  let endpoint;
  let headers;
  let body;
  const systemPrompt = `You are "The Architect" \u2014 a Keystone OS Mini-App code generator.

RULES:
- Generate a SINGLE App.tsx file using React + TypeScript
- Import ONLY from '@keystone-os/sdk' and 'react'
- Available SDK hooks: useVault, useJupiterSwap, useImpactReport, useTurnkey,
  useNotifications, useGovernance, useFetch, useTheme, useKeystoneEvent,
  useYieldRouter, useTaxEngine, useAnalytics, useSovereignAuth,
  useMultiSig, usePortfolio, useAlerts
- NO fetch(), axios, ethers, @solana/web3.js, localStorage, or Node.js APIs
- Use Tailwind CSS classes for styling (dark theme: bg-zinc-950, text-white)

OUTPUT: Return ONLY raw JSON (no markdown blocks) in this format:
{
  "files": { "App.tsx": "...full code..." },
  "explanation": "Brief description of what was built"
}`;
  if (provider === "groq") {
    endpoint = "https://api.groq.com/openai/v1/chat/completions";
    headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    };
    body = JSON.stringify({
      model: model || "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4e3
    });
  } else if (provider === "cloudflare") {
    const parts = apiKey.split(":");
    const accountId = parts[0];
    const cfToken = parts.slice(1).join(":");
    endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
    headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfToken}`
    };
    body = JSON.stringify({
      model: model || "@cf/qwen/qwen3-30b-a3b-fp8",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4e3
    });
  } else if (provider === "openai") {
    endpoint = "https://api.openai.com/v1/chat/completions";
    headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    };
    body = JSON.stringify({
      model: model || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4e3,
      response_format: { type: "json_object" }
    });
  } else if (provider === "ollama") {
    const host = apiKey || "http://localhost:11434";
    endpoint = `${host}/v1/chat/completions`;
    headers = { "Content-Type": "application/json" };
    body = JSON.stringify({
      model: model || "qwen2.5-coder:7b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    });
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  const res = await fetch(endpoint, { method: "POST", headers, body });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`${provider} API error (${res.status}): ${err.slice(0, 200)}`);
  }
  const json = await res.json();
  let content = json.choices?.[0]?.message?.content || "{}";
  content = content.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(content);
  return {
    files: parsed.files || {},
    explanation: parsed.explanation || ""
  };
}
async function callServerGenerate(prompt, apiUrl, aiConfig) {
  const res = await fetch(`${apiUrl.replace(/\/$/, "")}/api/studio/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      ...aiConfig && { aiConfig }
    })
  });
  if (!res.ok) {
    throw new Error(`Server returned ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.error) {
    throw new Error(json.error === "no_api_key" ? json.details : json.error);
  }
  return { files: json.files || {}, explanation: json.explanation || "" };
}
async function runGenerate(options) {
  const targetDir = path8.resolve(process.cwd(), options.dir ?? ".");
  const appPath = path8.join(targetDir, "App.tsx");
  if (fs8.existsSync(appPath) && !options.force) {
    return {
      ok: false,
      error: "App.tsx already exists. Use --force to overwrite, or delete it first."
    };
  }
  let result;
  let usedProvider = "server";
  try {
    if (options.provider && options.apiKey) {
      usedProvider = options.provider;
      result = await callLLMDirect(
        options.prompt,
        options.provider,
        options.apiKey,
        options.model || ""
      );
    } else if (options.apiUrl) {
      result = await callServerGenerate(
        options.prompt,
        options.apiUrl,
        options.apiKey ? { provider: options.provider || "groq", apiKey: options.apiKey, model: options.model || "" } : void 0
      );
    } else if (process.env.GROQ_API_KEY) {
      usedProvider = "groq";
      result = await callLLMDirect(
        options.prompt,
        "groq",
        process.env.GROQ_API_KEY,
        options.model || "llama-3.3-70b-versatile"
      );
    } else if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_TOKEN) {
      usedProvider = "cloudflare";
      result = await callLLMDirect(
        options.prompt,
        "cloudflare",
        `${process.env.CLOUDFLARE_ACCOUNT_ID}:${process.env.CLOUDFLARE_AI_TOKEN}`,
        options.model || "@cf/qwen/qwen3-30b-a3b-fp8"
      );
    } else {
      return {
        ok: false,
        error: "No AI provider configured. Options:\n  --provider groq --api-key gsk_...     (direct)\n  --provider cloudflare --api-key id:token (direct)\n  --api-url http://localhost:3000        (server mode)\n  Set GROQ_API_KEY or CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_AI_TOKEN env vars"
      };
    }
    for (const [fileName, content] of Object.entries(result.files)) {
      const filePath = path8.join(targetDir, fileName);
      fs8.mkdirSync(path8.dirname(filePath), { recursive: true });
      fs8.writeFileSync(filePath, typeof content === "string" ? content : content.content || "", "utf-8");
    }
    return {
      ok: true,
      files: result.files,
      explanation: result.explanation,
      provider: usedProvider
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      provider: usedProvider
    };
  }
}

// src/commands/deploy.ts
var fs9 = __toESM(require("fs"));
var path9 = __toESM(require("path"));
var import_node_child_process = require("child_process");
var import_node_util = require("util");
var execAsync = (0, import_node_util.promisify)(import_node_child_process.exec);
async function runDeploy(options) {
  const targetDir = path9.resolve(process.cwd(), options.dir ?? ".");
  const cluster = options.cluster ?? "devnet";
  const programName = options.programName ?? "keystone_app";
  try {
    await execAsync("solana --version");
  } catch {
    return {
      ok: false,
      error: 'Solana CLI not found. Install it:\n  sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"\n  export PATH="~/.local/share/solana/install/active_release/bin:$PATH"'
    };
  }
  const soPath = options.soPath || path9.join(targetDir, ".keystone", "dist", `${programName}.so`) || path9.join(targetDir, "target", "deploy", `${programName}.so`);
  if (!fs9.existsSync(soPath)) {
    return {
      ok: false,
      error: `Compiled program not found at: ${soPath}
  Run 'keystone build' first, or provide --so-path.`
    };
  }
  try {
    await execAsync(`solana config set --url ${getClusterUrl2(cluster)}`);
  } catch (err) {
    return { ok: false, error: `Failed to set cluster: ${err.message}` };
  }
  try {
    const { stdout } = await execAsync("solana balance");
    const balance = parseFloat(stdout.trim().split(" ")[0]);
    if (balance < 0.5 && cluster !== "localnet") {
      console.warn(
        `Warning: Low deployer balance (${balance} SOL). Deploy may fail.
` + (cluster === "devnet" ? "  Run: solana airdrop 2" : "  Fund your wallet before deploying.")
      );
    }
  } catch {
  }
  try {
    let deployCmd = `solana program deploy "${soPath}"`;
    if (options.programKeypair) {
      deployCmd += ` --program-id "${options.programKeypair}"`;
    }
    if (options.keypair) {
      deployCmd += ` --keypair "${options.keypair}"`;
    }
    console.log(`Deploying to ${cluster}...`);
    const { stdout, stderr } = await execAsync(deployCmd, {
      cwd: targetDir,
      timeout: 18e4
      // 3 min timeout
    });
    const programIdMatch = stdout.match(/Program Id:\s*(\w+)/);
    const programId = programIdMatch?.[1];
    if (!programId) {
      return {
        ok: false,
        error: `Deploy succeeded but could not parse program ID:
${stdout}`
      };
    }
    let idlUploaded = false;
    if (!options.skipIdl) {
      const idlPath = path9.join(
        targetDir,
        "target",
        "idl",
        `${programName}.json`
      );
      if (fs9.existsSync(idlPath)) {
        try {
          await execAsync(
            `anchor idl init --filepath "${idlPath}" ${programId}`,
            { cwd: targetDir, timeout: 6e4 }
          );
          idlUploaded = true;
        } catch (idlErr) {
          console.warn(`IDL upload skipped: ${idlErr.message}`);
        }
      }
    }
    const txMatch = stdout.match(/Signature:\s*(\w+)/);
    return {
      ok: true,
      programId,
      cluster,
      txSignature: txMatch?.[1],
      idlUploaded
    };
  } catch (err) {
    return {
      ok: false,
      error: err.stderr || err.message || "Deployment failed",
      cluster
    };
  }
}
function getClusterUrl2(cluster) {
  switch (cluster) {
    case "mainnet-beta":
      return "https://api.mainnet-beta.solana.com";
    case "devnet":
      return "https://api.devnet.solana.com";
    case "testnet":
      return "https://api.testnet.solana.com";
    case "localnet":
      return "http://localhost:8899";
    default:
      return "https://api.devnet.solana.com";
  }
}

// src/commands/ship.ts
var path11 = __toESM(require("path"));
var fs11 = __toESM(require("fs"));

// src/commands/config.ts
var fs10 = __toESM(require("fs"));
var path10 = __toESM(require("path"));
var CONFIG_FILE = "keystone.config.json";
function loadConfig(dir) {
  const searchDir = dir ? path10.resolve(dir) : process.cwd();
  const configPath = path10.join(searchDir, CONFIG_FILE);
  if (!fs10.existsSync(configPath)) {
    return {};
  }
  try {
    const raw = fs10.readFileSync(configPath, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`[config] Failed to parse ${CONFIG_FILE}:`, e.message);
    return {};
  }
}
function saveConfig(config, dir) {
  const searchDir = dir ? path10.resolve(dir) : process.cwd();
  const configPath = path10.join(searchDir, CONFIG_FILE);
  fs10.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}
function mergeConfig(config, flags) {
  const merged = { ...config };
  for (const [key, value] of Object.entries(flags)) {
    if (value !== void 0 && value !== null && value !== "") {
      merged[key] = value;
    }
  }
  return merged;
}

// src/commands/ship.ts
async function runShip(options) {
  const dir = path11.resolve(process.cwd(), options.dir || ".");
  const appPath = path11.join(dir, "App.tsx");
  if (!fs11.existsSync(appPath)) {
    return { ok: false, error: "No App.tsx found. Run `keystone init` to get started." };
  }
  const config = loadConfig(dir);
  const merged = mergeConfig(config, {
    name: options.name,
    description: options.description,
    wallet: options.wallet,
    privateKey: options.privateKey,
    cluster: options.cluster
  });
  const appName = merged.name || path11.basename(dir);
  const description = merged.description || `Built with Keystone CLI`;
  const wallet = merged.wallet;
  if (!wallet) {
    return {
      ok: false,
      error: [
        "No wallet address found.",
        "",
        "Set it in keystone.config.json:",
        '  { "wallet": "YOUR_WALLET_ADDRESS" }',
        "",
        "Or pass it as a flag:",
        "  keystone ship --wallet YOUR_WALLET_ADDRESS"
      ].join("\n")
    };
  }
  console.log(`
  Shipping "${appName}" to Keystone Marketplace
`);
  console.log("  [1/4] Running security gatekeeper...");
  const gatekeeper = runGatekeeper(dir);
  if (!gatekeeper.ok) {
    return {
      ok: false,
      securityScore: gatekeeper.securityScore,
      error: `Security check failed (${gatekeeper.securityScore}/100):
${gatekeeper.errors.map((e) => `    ${e.file}:${e.line} \u2014 ${e.message}`).join("\n")}`
    };
  }
  console.log(`         Score: ${gatekeeper.securityScore}/100`);
  console.log("  [2/4] Building bundle...");
  const build = await runBuild({ dir, outDir: path11.join(dir, ".keystone", "dist") });
  if (!build.ok) {
    return { ok: false, error: `Build failed: ${build.error}` };
  }
  console.log(`         Output: ${path11.basename(build.outputPath)}`);
  const publishResult = await runPublish({
    dir,
    name: appName,
    description,
    creatorWallet: wallet,
    privateKey: merged.privateKey || options.privateKey,
    bearerToken: merged.apiKey,
    cluster: merged.cluster || options.cluster || "devnet",
    skipArweave: options.skipArweave,
    apiUrl: options.apiUrl || merged.apiUrl,
    category: merged.category
  });
  if (!publishResult.ok) {
    return { ok: false, error: publishResult.error };
  }
  return {
    ok: true,
    appId: publishResult.appId,
    arweaveTxId: publishResult.arweaveTxId,
    solanaTxId: publishResult.solanaTxId,
    explorerUrl: publishResult.explorerUrl,
    securityScore: gatekeeper.securityScore,
    codeHash: publishResult.codeHash
  };
}

// src/commands/register.ts
async function runRegister(options) {
  const apiUrl = (options.apiUrl || "https://keystone.stauniverse.tech").replace(/\/$/, "");
  const payload = {};
  if (options.label) payload.label = options.label;
  if (options.wallet) payload.walletAddress = options.wallet;
  try {
    const res = await fetch(`${apiUrl}/api/studio/publish/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { ok: false, error: err.error || `Registration failed (${res.status})` };
    }
    const data = await res.json();
    const config = loadConfig(options.dir);
    config.wallet = data.walletAddress;
    config.apiKey = data.developerToken;
    if (!config.apiUrl) config.apiUrl = apiUrl;
    saveConfig(config, options.dir);
    return {
      ok: true,
      walletAddress: data.walletAddress,
      developerToken: data.developerToken,
      mode: data.mode
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Registration failed"
    };
  }
}

// src/index.ts
var program = new import_commander.Command();
program.name("keystone").description("CLI for Keystone Studio Mini-Apps \u2014 Sovereign OS 2026").version("1.0.0");
program.command("init [dir]").description("Scaffold a new Mini-App").action((dir) => {
  try {
    runInit(dir);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
});
program.command("dev [dir]").description("Start local dev server with Keystone SDK sandbox").option("-p, --port <port>", "Port number (default: 4200)", (v) => parseInt(v, 10)).action((dir = ".", opts) => {
  try {
    runDev({ dir, port: opts.port });
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
});
program.command("generate").description("AI-generate a Mini-App from a natural language prompt").requiredOption("-p, --prompt <prompt>", "What to build (e.g. 'Build a Jupiter swap widget')").option("--provider <provider>", "LLM provider: groq, cloudflare, openai, ollama").option("--api-key <key>", "API key (or accountId:token for Cloudflare)").option("--model <model>", "Model override (default: auto per provider)").option("--api-url <url>", "Use a running Keystone server instead of direct LLM").option("-f, --force", "Overwrite existing App.tsx").option("-d, --dir <dir>", "Target directory (default: current)", ".").action(async (opts) => {
  try {
    console.log("\nKeystone Architect -- Generating Mini-App...\n");
    const result = await runGenerate({
      prompt: opts.prompt,
      dir: opts.dir,
      provider: opts.provider,
      apiKey: opts.apiKey,
      model: opts.model,
      apiUrl: opts.apiUrl,
      force: opts.force
    });
    if (result.ok) {
      console.log("Generated files:");
      for (const name of Object.keys(result.files || {})) {
        console.log(`  + ${name}`);
      }
      if (result.explanation) {
        console.log(`
${result.explanation}`);
      }
      console.log(`
Provider: ${result.provider}`);
      console.log("\nNext steps:");
      console.log("  keystone validate   # Check safety");
      console.log("  keystone dev        # Preview locally");
      console.log("  keystone publish    # Deploy to marketplace\n");
    } else {
      console.error(`
Generation failed: ${result.error}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
});
program.command("validate [dir]").description("Validate Mini-App against Glass Safety Standard (Ouroboros Loop)").option("--suggest", "Output suggested fixes for each error").action((dir = ".", opts) => {
  const result = runValidate(dir, { suggest: opts.suggest });
  if (result.ok) {
    const lockResult = validateLockfile(dir);
    if (lockResult.ok) {
      console.log("Validation passed.");
    } else {
      for (const e of lockResult.errors) {
        console.error(`[lockfile] ${e.package}: ${e.message}`);
        if (e.fix) console.error(`  Fix: ${e.fix}`);
      }
      process.exit(1);
    }
  } else {
    for (const e of result.errors) {
      console.error(`${e.file}:${e.line} \u2014 ${e.message}`);
      if (opts.suggest && e.suggestion) {
        console.error(`  Suggestion: ${e.suggestion}`);
      }
    }
    process.exit(1);
  }
});
program.command("lockfile [dir]").description("Validate pinned import maps (?external=react,react-dom)").action((dir = ".") => {
  const result = validateLockfile(dir);
  if (result.ok) {
    console.log("Lockfile valid.");
  } else {
    for (const e of result.errors) {
      console.error(`${e.package}: ${e.message}`);
      if (e.fix) console.error(`  Fix: ${e.fix}`);
    }
    process.exit(1);
  }
});
program.command("build [dir]").description("Build Mini-App (optional Arweave cold path)").option("--anchor-arweave", "Anchor build to Arweave for atomic rollbacks").option("-o, --out-dir <dir>", "Output directory").action(async (dir = ".", opts) => {
  try {
    const result = await runBuild({ dir, anchorArweave: opts.anchorArweave, outDir: opts.outDir });
    if (result.ok) {
      console.log("Build complete:", result.outputPath);
      if (opts.anchorArweave) {
        console.log("Cold path: manifest.json (Arweave upload requires arweave CLI)");
      }
    } else {
      console.error(result.error);
      process.exit(1);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
});
program.command("publish [dir]").description("Publish Mini-App: Gatekeeper \u2192 Arweave \u2192 On-Chain Registry").requiredOption("-n, --name <name>", "App name").requiredOption("-d, --description <desc>", "App description").requiredOption("-w, --wallet <address>", "Creator wallet address").option("--private-key <key>", "Base58 private key for signing (Arweave + Solana)").option("--cluster <cluster>", "Solana cluster: devnet or mainnet-beta", "devnet").option("--api-url <url>", "Keystone OS API URL (e.g. https://keystone.example.com)").option("-c, --category <cat>", "Category (default: utility)", "utility").option("--skip-arweave", "Skip Arweave cold path upload").option("--register-marketplace", "Register on KeystoneMarket").option("--price-usdc <cents>", "Price in USDC cents", (v) => parseInt(v, 10)).action(async (dir = ".", opts) => {
  try {
    const result = await runPublish({
      dir,
      name: opts.name,
      description: opts.description,
      creatorWallet: opts.wallet,
      privateKey: opts.privateKey,
      cluster: opts.cluster,
      apiUrl: opts.apiUrl,
      category: opts.category,
      skipArweave: opts.skipArweave,
      registerMarketplace: opts.registerMarketplace,
      priceUsdc: opts.priceUsdc
    });
    if (result.ok) {
      console.log("\nPublished to Keystone OS!");
      console.log(`
  App ID: ${result.appId}`);
      if (result.arweaveTxId) console.log(`  Arweave: https://arweave.net/${result.arweaveTxId}`);
      if (result.codeHash) console.log(`  Hash: ${result.codeHash}`);
      if (result.securityScore !== void 0) console.log(`  Security: ${result.securityScore}/100`);
      if (result.solanaTxId) console.log(`  Solana TX: ${result.solanaTxId}`);
      if (result.explorerUrl) console.log(`  Explorer: ${result.explorerUrl}`);
      console.log("\n");
    } else {
      console.error(`
Publish Failed:`);
      console.error(result.error);
      process.exit(1);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
});
program.command("deploy [dir]").description("Deploy compiled Solana program to devnet/mainnet").option("--cluster <cluster>", "Target cluster: devnet, mainnet-beta, testnet, localnet", "devnet").option("--program-name <name>", "Program name (default: keystone_app)", "keystone_app").option("--keypair <path>", "Deployer keypair path").option("--program-keypair <path>", "Program keypair for deterministic address").option("--so-path <path>", "Path to compiled .so file").option("--skip-idl", "Skip IDL upload").action(async (dir = ".", opts) => {
  try {
    console.log(`
Deploying to ${opts.cluster || "devnet"}...
`);
    const result = await runDeploy({
      dir,
      cluster: opts.cluster,
      programName: opts.programName,
      keypair: opts.keypair,
      programKeypair: opts.programKeypair,
      soPath: opts.soPath,
      skipIdl: opts.skipIdl
    });
    if (result.ok) {
      console.log("\nDeployment successful!");
      console.log(`  Program ID: ${result.programId}`);
      console.log(`  Cluster: ${result.cluster}`);
      if (result.txSignature) console.log(`  Tx: ${result.txSignature}`);
      if (result.idlUploaded) console.log("  IDL: Uploaded");
      console.log(`
  Explorer: https://explorer.solana.com/address/${result.programId}?cluster=${result.cluster}
`);
    } else {
      console.error(`
Deploy failed: ${result.error}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
});
program.command("ship [dir]").description("Ship mini-app to marketplace (validate + build + publish in one step)").option("-n, --name <name>", "App name (overrides config)").option("-d, --description <desc>", "App description (overrides config)").option("-w, --wallet <address>", "Creator wallet (overrides config)").option("--private-key <key>", "Base58 private key for signing").option("--cluster <cluster>", "Solana cluster: devnet or mainnet-beta").option("--api-url <url>", "Keystone OS API URL (e.g. https://keystone.example.com)").option("--skip-arweave", "Skip Arweave upload").option("-y, --yes", "Skip confirmation prompts").action(async (dir = ".", opts) => {
  try {
    const result = await runShip({ dir, ...opts });
    if (result.ok) {
      console.log("\n  Shipped to Keystone Marketplace!");
      console.log(`
  App ID:   ${result.appId}`);
      if (result.arweaveTxId) console.log(`  Arweave:  https://arweave.net/${result.arweaveTxId}`);
      if (result.codeHash) console.log(`  Hash:     ${result.codeHash}`);
      if (result.securityScore !== void 0) console.log(`  Security: ${result.securityScore}/100`);
      if (result.solanaTxId) console.log(`  Solana:   ${result.solanaTxId}`);
      if (result.explorerUrl) console.log(`  Explorer: ${result.explorerUrl}`);
      console.log("\n");
    } else {
      console.error(`
  Ship failed:
  ${result.error}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
});
program.command("register").description("Register as a developer \u2014 get a wallet + publish token (via Turnkey or BYO key)").option("-w, --wallet <address>", "Use your own wallet (BYO mode)").option("-l, --label <label>", "Developer label (default: 'default')").option("--api-url <url>", "Keystone API URL", "https://keystone.stauniverse.tech").option("-d, --dir <dir>", "Directory to save config", ".").action(async (opts) => {
  try {
    console.log("\n  Keystone Developer Registration\n");
    if (opts.wallet) {
      console.log(`  Mode: BYO Key (${opts.wallet.slice(0, 8)}...)`);
    } else {
      console.log("  Mode: Turnkey-managed wallet (auto-provisioned)");
    }
    console.log("");
    const result = await runRegister({
      dir: opts.dir,
      wallet: opts.wallet,
      label: opts.label,
      apiUrl: opts.apiUrl
    });
    if (result.ok) {
      console.log("  Registration successful!\n");
      console.log(`  Wallet:  ${result.walletAddress}`);
      console.log(`  Token:   ${result.developerToken.slice(0, 8)}...${result.developerToken.slice(-4)}`);
      console.log(`  Mode:    ${result.mode}`);
      console.log("\n  Saved to keystone.config.json");
      console.log("\n  You can now publish:");
      console.log("    keystone ship\n");
    } else {
      console.error(`  Registration failed: ${result.error}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
});
program.command("config [dir]").description("Create or edit keystone.config.json").option("-n, --name <name>", "Set app name").option("-w, --wallet <address>", "Set wallet address").option("--cluster <cluster>", "Set cluster").option("--provider <provider>", "Set AI provider").option("--show", "Display current config").action((dir = ".", opts) => {
  const config = loadConfig(dir);
  if (opts.show) {
    console.log("\n  keystone.config.json:\n");
    console.log(JSON.stringify(config, null, 2));
    console.log("");
    return;
  }
  if (opts.name) config.name = opts.name;
  if (opts.wallet) config.wallet = opts.wallet;
  if (opts.cluster) config.cluster = opts.cluster;
  if (opts.provider) config.provider = opts.provider;
  saveConfig(config, dir);
  console.log("\n  Config saved to keystone.config.json\n");
});
program.command("status [dir]").description("Show project info and publish state").action((dir = ".") => {
  const config = loadConfig(dir);
  const path12 = require("path");
  const fs12 = require("fs");
  const targetDir = path12.resolve(process.cwd(), dir);
  const hasApp = fs12.existsSync(path12.join(targetDir, "App.tsx"));
  const hasBundle = fs12.existsSync(path12.join(targetDir, ".keystone", "dist", "app.bundle.js"));
  const hasLock = fs12.existsSync(path12.join(targetDir, "keystone.lock.json"));
  console.log("\n  Keystone Project Status\n");
  console.log(`  Name:      ${config.name || "(not set)"}`);
  console.log(`  Wallet:    ${config.wallet || "(not set)"}`);
  console.log(`  Cluster:   ${config.cluster || "devnet"}`);
  console.log(`  Category:  ${config.category || "utility"}`);
  console.log(`  Provider:  ${config.provider || "(not set)"}`);
  console.log("");
  console.log(`  App.tsx:   ${hasApp ? "Found" : "Missing (run keystone init)"}`);
  console.log(`  Bundle:    ${hasBundle ? "Built" : "Not built (run keystone build)"}`);
  console.log(`  Lockfile:  ${hasLock ? "Valid" : "Missing"}`);
  console.log("");
});
program.parse();
