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
var STARTER_APP = `import { useVault, useFetch } from '@keystone-os/sdk';

export default function App() {
  const { tokens, balances } = useVault();

  return (
    <div className="p-6 bg-zinc-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold text-emerald-400 mb-4">My Mini-App</h1>
      <div className="space-y-2 font-mono">
        {tokens.map((t) => (
          <div key={t.symbol} className="flex justify-between border-b border-zinc-800 py-2">
            <span>{t.symbol}</span>
            <span>{t.balance.toLocaleString()}</span>
          </div>
        ))}
      </div>
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
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, "App.tsx"), STARTER_APP);
  fs.writeFileSync(
    path.join(targetDir, "keystone.lock.json"),
    JSON.stringify(LOCKFILE, null, 2)
  );
  fs.writeFileSync(
    path.join(targetDir, "README.md"),
    `# Keystone Mini-App

Built with \`@keystone-os/sdk\`. Open in Keystone Studio to run.
`
  );
  console.log(`Created Mini-App in ${targetDir}`);
  console.log("  - App.tsx");
  console.log("  - keystone.lock.json");
  console.log("  - README.md");
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
        const err = { file, line: lineNum, message: msg };
        if (options?.suggest) {
          err.suggestion = getSuggestion(err);
        }
        errors.push(err);
      }
    }
    const hasSdkImport = /from\s+['"]@keystone-os\/sdk['"]/.test(content);
    const hasForbidden = FORBIDDEN_PATTERNS.some((p) => new RegExp(p.pattern.source).test(content));
    if (!hasSdkImport && hasForbidden) {
      const err = {
        file,
        line: 1,
        message: "Use '@keystone-os/sdk' for fetch/vault/turnkey instead of raw APIs."
      };
      if (options?.suggest) {
        err.suggestion = `Add: import { useFetch, useVault } from '@keystone-os/sdk';`;
      }
      errors.push(err);
    }
  }
  const suggestions = options?.suggest ? errors.map((e) => e.suggestion).filter(Boolean) : void 0;
  return { ok: errors.length === 0, errors, suggestions };
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
async function uploadToArweave(bundlePath, manifestPath) {
  try {
    const Irys = (await import("@irys/sdk")).default;
    const irys = new Irys({ network: "mainnet", token: "solana" });
    const bundle = fs6.readFileSync(bundlePath, "utf-8");
    const manifest = fs6.readFileSync(manifestPath, "utf-8");
    const data = JSON.stringify({ bundle, manifest });
    const tx = await irys.upload(data);
    return tx?.id ?? null;
  } catch (err) {
    console.warn("[publish] Arweave upload skipped:", err instanceof Error ? err.message : err);
    return null;
  }
}
async function registerToRegistry(apiUrl, payload) {
  try {
    const res = await fetch(`${apiUrl.replace(/\/$/, "")}/api/studio/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  if (!fs6.existsSync(appPath)) {
    return { ok: false, error: "App.tsx not found. Run keystone init first." };
  }
  const code = fs6.readFileSync(appPath, "utf-8");
  const codeJson = JSON.stringify({ files: { "App.tsx": { content: code, language: "typescript" } } });
  const gatekeeper = runGatekeeper(targetDir);
  if (!gatekeeper.ok) {
    return {
      ok: false,
      error: `Gatekeeper failed (score: ${gatekeeper.securityScore}). Fix errors:
${gatekeeper.errors.map((e) => `  ${e.file}:${e.line} \u2014 ${e.message}`).join("\n")}`,
      securityScore: gatekeeper.securityScore
    };
  }
  const build = await runBuild({ dir: targetDir, outDir: path6.join(targetDir, ".keystone", "dist") });
  if (!build.ok) {
    return { ok: false, error: build.error };
  }
  const bundlePath = build.outputPath;
  const manifestPath = path6.join(path6.dirname(bundlePath), "manifest.json");
  const bundleContent = fs6.readFileSync(bundlePath, "utf-8");
  const codeHash = sha256Hex(bundleContent);
  let arweaveTxId = null;
  if (!options.skipArweave) {
    arweaveTxId = await uploadToArweave(bundlePath, manifestPath);
  }
  let appId;
  if (options.apiUrl) {
    const reg = await registerToRegistry(options.apiUrl, {
      name: options.name,
      description: options.description,
      code: codeJson,
      creatorWallet: options.creatorWallet,
      arweaveTxId: arweaveTxId ?? void 0,
      codeHash,
      securityScore: gatekeeper.securityScore,
      category: options.category ?? "utility"
    });
    appId = reg?.appId;
  }
  const finalAppId = appId ?? `app_${Date.now().toString(36)}`;
  let marketplaceRegisterUrl;
  if (options.registerMarketplace && options.apiUrl && arweaveTxId) {
    marketplaceRegisterUrl = `${options.apiUrl.replace(/\/$/, "")}/api/studio/marketplace/register`;
    try {
      await fetch(marketplaceRegisterUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: finalAppId,
          priceUsdc: options.priceUsdc ?? 0,
          ipfsCid: arweaveTxId,
          developerWallet: options.creatorWallet
        })
      });
    } catch {
    }
  }
  return {
    ok: true,
    appId: finalAppId,
    arweaveTxId: arweaveTxId ?? void 0,
    codeHash,
    securityScore: gatekeeper.securityScore,
    marketplaceRegisterUrl
  };
}

// src/index.ts
var program = new import_commander.Command();
program.name("keystone").description("CLI for Keystone Studio Mini-Apps \u2014 Sovereign OS 2026").version("0.2.0");
program.command("init [dir]").description("Scaffold a new Mini-App").action((dir) => {
  try {
    runInit(dir);
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
program.command("publish [dir]").description("Publish Mini-App: Gatekeeper \u2192 Arweave (Cold) \u2192 Registry (Hot)").requiredOption("-n, --name <name>", "App name").requiredOption("-d, --description <desc>", "App description").requiredOption("-w, --wallet <address>", "Creator wallet address").option("--api-url <url>", "Keystone OS API URL (e.g. https://keystone.example.com)").option("-c, --category <cat>", "Category (default: utility)", "utility").option("--skip-arweave", "Skip Arweave cold path upload").option("--register-marketplace", "Register on KeystoneMarket (requires api-url + Arweave)").option("--price-usdc <cents>", "Price in USDC cents for marketplace listing", (v) => parseInt(v, 10)).action(async (dir = ".", opts) => {
  try {
    const result = await runPublish({
      dir,
      name: opts.name,
      description: opts.description,
      creatorWallet: opts.wallet,
      apiUrl: opts.apiUrl,
      category: opts.category,
      skipArweave: opts.skipArweave,
      registerMarketplace: opts.registerMarketplace,
      priceUsdc: opts.priceUsdc
    });
    if (result.ok) {
      console.log("Published:", result.appId);
      if (result.arweaveTxId) console.log("Arweave:", result.arweaveTxId);
      if (result.codeHash) console.log("Code hash:", result.codeHash);
      if (result.securityScore !== void 0) console.log("Security score:", result.securityScore);
      if (result.marketplaceRegisterUrl) console.log("Marketplace register:", result.marketplaceRegisterUrl);
    } else {
      console.error(result.error);
      process.exit(1);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
});
program.parse();
