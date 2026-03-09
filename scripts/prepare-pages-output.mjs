import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const openNextAssets = resolve(root, ".open-next", "assets");
const openNextWorker = resolve(root, ".open-next", "worker.js");
const pagesOut = resolve(root, ".vercel", "output", "static");

if (!existsSync(openNextAssets) || !existsSync(openNextWorker)) {
  throw new Error("OpenNext output not found. Run opennextjs-cloudflare build first.");
}

rmSync(pagesOut, { recursive: true, force: true });
mkdirSync(pagesOut, { recursive: true });

// Copy static assets expected by Pages from OpenNext build output.
cpSync(openNextAssets, pagesOut, { recursive: true });

// Pages advanced mode reads this worker entrypoint at output root.
cpSync(openNextWorker, resolve(pagesOut, "_worker.js"));

console.log("Prepared Cloudflare Pages output at .vercel/output/static");
